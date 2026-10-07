package com.rakan.kids

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.Settings
import android.speech.tts.TextToSpeech
import android.webkit.JavascriptInterface
import android.webkit.MimeTypeMap
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileInputStream
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLDecoder
import java.util.Locale

/**
 * Rakan — a kid-safe launcher-style app.
 *
 * The whole interface lives in assets/app (HTML + CSS + JS) inside one WebView.
 * Everything only Android can do — pinning the screen, reading the /Rakan folders,
 * permissions, speaking, storing parent settings — lives here and reaches the page
 * through the `Rakan` JavaScript object.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var web: WebView
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var pinned = false

    /**
     * Set while the parent is being sent to a system screen. Lock task mode blocks
     * starting other activities, so pinning is released first and restored on return.
     */
    private var leavingForSettings = false

    private var tts: TextToSpeech? = null
    private var ttsReady = false

    /** Where the parent drops content. Also what a Drive sync app should write into. */
    private val rootDir: File
        get() = File(Environment.getExternalStorageDirectory(), "Rakan")

    private val videosDir: File
        get() = File(rootDir, "videos")

    private val photosDir: File
        get() = File(rootDir, "photos")

    private val soundsDir: File
        get() = File(rootDir, "sounds")

    private val fileChooser = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val cb = filePathCallback
        filePathCallback = null
        if (cb != null) {
            val uri = result.data?.data
            if (result.resultCode == RESULT_OK && uri != null) {
                cb.onReceiveValue(arrayOf(uri))
            } else {
                cb.onReceiveValue(null)
            }
        }
    }

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) {
        notifyPage()
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        WindowCompat.setDecorFitsSystemWindows(window, false)
        hideSystemBars()
        ensureFolders()

        web = WebView(this)
        setContentView(web)

        val s = web.settings
        s.javaScriptEnabled = true
        s.domStorageEnabled = true
        s.mediaPlaybackRequiresUserGesture = false
        s.allowFileAccess = false
        s.allowContentAccess = false
        s.cacheMode = WebSettings.LOAD_NO_CACHE

        web.setBackgroundColor(ContextCompat.getColor(this, R.color.rakan_sky))
        web.isLongClickable = false
        web.setOnLongClickListener { true }

        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? {
                return serve(request.url)
            }

            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest
            ): Boolean {
                return request.url.host != "rakan.local"
            }
        }

        web.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                view: WebView,
                callback: ValueCallback<Array<Uri>>,
                params: FileChooserParams
            ): Boolean {
                val old = filePathCallback
                old?.onReceiveValue(null)
                filePathCallback = callback
                leavingForSettings = true
                stopPinning()
                return try {
                    fileChooser.launch(params.createIntent())
                    true
                } catch (e: Exception) {
                    filePathCallback = null
                    leavingForSettings = false
                    false
                }
            }
        }

        web.addJavascriptInterface(Bridge(), "Rakan")
        web.loadUrl("https://rakan.local/index.html")

        setupTts()

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                web.evaluateJavascript("window.rakanBack && window.rakanBack()", null)
            }
        })
    }

    /** The built-in reader, so letters and guidance speak before anything is recorded. */
    private fun setupTts() {
        val listener = TextToSpeech.OnInitListener { status ->
            val engine = tts
            if (status == TextToSpeech.SUCCESS && engine != null) {
                var res = TextToSpeech.LANG_NOT_SUPPORTED
                try {
                    res = engine.setLanguage(Locale("ar"))
                    engine.setSpeechRate(0.85f)
                    engine.setPitch(1.2f)
                } catch (e: Exception) {
                    res = TextToSpeech.LANG_NOT_SUPPORTED
                }
                ttsReady = res >= TextToSpeech.LANG_AVAILABLE
                val ready = ttsReady
                web.post {
                    web.evaluateJavascript(
                        "window.onRakanTts && window.onRakanTts(" + ready + ")", null
                    )
                }
            }
        }
        tts = try {
            TextToSpeech(this, listener)
        } catch (e: Exception) {
            null
        }
    }

    private fun notifyPage() {
        web.evaluateJavascript("window.onRakanPermissionResult && window.onRakanPermissionResult()", null)
    }

    override fun onResume() {
        super.onResume()
        hideSystemBars()
        if (hasMediaAccess()) ensureFolders()
        if (leavingForSettings) {
            leavingForSettings = false
            web.postDelayed({
                startPinning()
                notifyPage()
            }, 400L)
        } else {
            startPinning()
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) hideSystemBars()
    }

    override fun onDestroy() {
        try {
            tts?.stop()
            tts?.shutdown()
        } catch (e: Exception) {
            // nothing to clean up
        }
        tts = null
        super.onDestroy()
    }

    private fun hideSystemBars() {
        val c = WindowInsetsControllerCompat(window, window.decorView)
        c.hide(WindowInsetsCompat.Type.systemBars())
        c.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
    }

    private fun startPinning() {
        if (pinned) return
        try {
            startLockTask()
            pinned = true
        } catch (e: Exception) {
            // Screen pinning is off in system settings; the app still runs normally.
        }
    }

    private fun stopPinning() {
        if (!pinned) return
        try {
            stopLockTask()
        } catch (e: Exception) {
            // already out of lock task
        }
        pinned = false
    }

    /** Leaves lock task mode, then opens a system screen the parent asked for. */
    private fun openExternal(intent: Intent) {
        runOnUiThread {
            leavingForSettings = true
            stopPinning()
            web.postDelayed({
                try {
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    startActivity(intent)
                } catch (e: Exception) {
                    leavingForSettings = false
                    startPinning()
                }
            }, 250L)
        }
    }

    private fun ensureFolders() {
        try {
            videosDir.mkdirs()
            photosDir.mkdirs()
            val voices = arrayOf("mom", "dad")
            val parts = arrayOf("letters/ar", "letters/en", "numbers", "manners", "prayer")
            for (v in voices) {
                for (p in parts) {
                    File(soundsDir, v + "/" + p).mkdirs()
                }
            }
            File(soundsDir, "quran").mkdirs()
            File(soundsDir, "app").mkdirs()

            val readme = File(soundsDir, "اقرأني.txt")
            if (!readme.exists()) {
                val text = StringBuilder()
                text.append("مجلدات الصوت الخاصة بتطبيق راكان\n")
                text.append("=================================\n\n")
                text.append("فيه ثلاث أصوات، وبتختار كل قسم بأي صوت من الإعدادات:\n")
                text.append("  • صوت التطبيق : قارئ أندرويد المدمّج — شغال من غير تسجيل\n")
                text.append("  • ماما        : تسجيلاتك في مجلد mom\n")
                text.append("  • بابا        : تسجيلاتك في مجلد dad\n\n")
                text.append("جوه mom/ و dad/:\n")
                text.append("  letters/ar  : 1.mp3 إلى 28.mp3 بترتيب أ ب ت ث ج ح خ د ...\n")
                text.append("  letters/en  : 1.mp3 إلى 26.mp3 بترتيب A B C D ...\n")
                text.append("  numbers     : 1.mp3 إلى 20.mp3\n")
                text.append("  manners     : 1.mp3 وهكذا بترتيب الجُمل في التطبيق\n")
                text.append("  prayer      : 1.mp3 إلى 7.mp3\n\n")
                text.append("quran : المصحف المعلّم — برقم السورة: 001.mp3 ... 114.mp3\n")
                text.append("app   : welcome.mp3 و bravo.mp3 و timeup.mp3\n\n")
                text.append("الصيغ المقبولة: mp3 أو m4a أو ogg أو wav\n")
                text.append("أي ملف ناقص، التطبيق بيستخدم صوته المدمّج مكانه.\n")
                readme.writeText(text.toString())
            }
        } catch (e: Exception) {
            // No storage permission yet; folders get created once it is granted.
        }
    }

    /** Serves the bundled interface plus anything under the parent's /Rakan folder. */
    private fun serve(url: Uri): WebResourceResponse? {
        if (url.host != "rakan.local") return null
        val path = url.path ?: return null
        try {
            if (path.startsWith("/media/")) {
                val rel = URLDecoder.decode(path.substring(7), "UTF-8")
                if (rel.isEmpty() || rel.contains("..")) return null
                val file = File(rootDir, rel)
                if (!file.exists() || !file.isFile) return null
                if (!file.canonicalPath.startsWith(rootDir.canonicalPath)) return null
                return WebResourceResponse(mimeOf(file.name), null, FileInputStream(file))
            }
            val asset = if (path == "/") "app/index.html" else "app" + path
            return WebResourceResponse(mimeOf(asset), "UTF-8", assets.open(asset))
        } catch (e: Exception) {
            return null
        }
    }

    private fun mimeOf(name: String): String {
        val ext = name.substringAfterLast('.', "").lowercase(Locale.US)
        if (ext == "html") return "text/html"
        if (ext == "js") return "application/javascript"
        if (ext == "css") return "text/css"
        if (ext == "svg") return "image/svg+xml"
        if (ext == "json") return "application/json"
        if (ext == "mp3") return "audio/mpeg"
        if (ext == "m4a") return "audio/mp4"
        if (ext == "ogg") return "audio/ogg"
        if (ext == "wav") return "audio/wav"
        if (ext == "mp4") return "video/mp4"
        val guess = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext)
        return guess ?: "application/octet-stream"
    }

    private fun hasMediaAccess(): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            if (Environment.isExternalStorageManager()) return true
        }
        val perms: Array<String> = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            arrayOf(Manifest.permission.READ_MEDIA_IMAGES, Manifest.permission.READ_MEDIA_VIDEO)
        } else {
            arrayOf(Manifest.permission.READ_EXTERNAL_STORAGE)
        }
        for (p in perms) {
            if (ContextCompat.checkSelfPermission(this, p) != PackageManager.PERMISSION_GRANTED) {
                return false
            }
        }
        return true
    }

    private fun listMediaFiles(kind: String): JSONArray {
        val out = JSONArray()
        val dir = if (kind == "videos") videosDir else photosDir
        val exts: List<String> = if (kind == "videos") {
            listOf("mp4", "m4v", "webm", "mkv", "3gp")
        } else {
            listOf("jpg", "jpeg", "png", "webp", "gif", "bmp", "heic")
        }
        val files = try {
            dir.listFiles()
        } catch (e: Exception) {
            null
        } ?: return out

        val wanted = ArrayList<File>()
        for (f in files) {
            if (f.isFile && exts.contains(f.extension.lowercase(Locale.US))) wanted.add(f)
        }
        wanted.sortByDescending { it.lastModified() }
        for (f in wanted) {
            val o = JSONObject()
            o.put("name", f.name)
            o.put("title", f.nameWithoutExtension)
            o.put("url", "https://rakan.local/media/" + kind + "/" + Uri.encode(f.name))
            out.put(o)
        }
        return out
    }

    /** Build number this APK came from, taken from the version name "1.N". */
    private fun currentBuild(): Int {
        return try {
            val name = packageManager.getPackageInfo(packageName, 0).versionName ?: "1.0"
            name.substringAfterLast('.').toIntOrNull() ?: 0
        } catch (e: Exception) {
            0
        }
    }

    inner class Bridge {

        @JavascriptInterface
        fun platform(): String = "android"

        @JavascriptInterface
        fun listMedia(kind: String): String = listMediaFiles(kind).toString()

        @JavascriptInterface
        fun folderPath(kind: String): String = File(rootDir, kind).absolutePath

        @JavascriptInterface
        fun rootPath(): String = rootDir.absolutePath

        /** Finds a sound by base name, whatever audio extension it was saved with. */
        @JavascriptInterface
        fun soundUrl(relNoExt: String): String {
            if (relNoExt.contains("..")) return ""
            val exts = listOf("mp3", "m4a", "ogg", "wav", "opus", "aac")
            for (ext in exts) {
                val f = File(rootDir, relNoExt + "." + ext)
                try {
                    if (f.exists() && f.isFile && f.canonicalPath.startsWith(rootDir.canonicalPath)) {
                        val parts = (relNoExt + "." + ext).split("/")
                        val encoded = StringBuilder()
                        for (p in parts) {
                            if (encoded.isNotEmpty()) encoded.append("/")
                            encoded.append(Uri.encode(p))
                        }
                        return "https://rakan.local/media/" + encoded.toString()
                    }
                } catch (e: Exception) {
                    return ""
                }
            }
            return ""
        }

        /** How many audio files sit in a folder — shown in settings. */
        @JavascriptInterface
        fun countSounds(rel: String): Int {
            if (rel.contains("..")) return 0
            return try {
                val files = File(rootDir, rel).listFiles() ?: return 0
                val exts = listOf("mp3", "m4a", "ogg", "wav", "opus", "aac")
                var n = 0
                for (f in files) {
                    if (f.isFile && exts.contains(f.extension.lowercase(Locale.US))) n++
                }
                n
            } catch (e: Exception) {
                0
            }
        }

        @JavascriptInterface
        fun hasAccess(): Boolean {
            val ok = hasMediaAccess()
            if (ok) ensureFolders()
            return ok
        }

        @JavascriptInterface
        fun requestAccess() {
            runOnUiThread {
                val perms: Array<String> = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    arrayOf(Manifest.permission.READ_MEDIA_IMAGES, Manifest.permission.READ_MEDIA_VIDEO)
                } else {
                    arrayOf(Manifest.permission.READ_EXTERNAL_STORAGE)
                }
                permissionLauncher.launch(perms)
            }
        }

        /** The reliable route on Android 11+: the system "All files access" page. */
        @JavascriptInterface
        fun requestAllFilesAccess() {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
                requestAccess()
                return
            }
            val i = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION)
            i.data = Uri.parse("package:" + packageName)
            openExternal(i)
        }

        /** App info page — the fallback when the direct permission screen is blocked. */
        @JavascriptInterface
        fun openAppSettings() {
            val i = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
            i.data = Uri.parse("package:" + packageName)
            openExternal(i)
        }

        @JavascriptInterface
        fun openPinningSettings() {
            openExternal(Intent(Settings.ACTION_SECURITY_SETTINGS))
        }

        @JavascriptInterface
        fun makeFolders(): Boolean {
            ensureFolders()
            return videosDir.isDirectory && photosDir.isDirectory
        }

        @JavascriptInterface
        fun isPinned(): Boolean = pinned

        /* ---------- parent settings ---------- */

        @JavascriptInterface
        fun getPrefs(): String {
            val p = getSharedPreferences("rakan", MODE_PRIVATE)
            return p.getString("state", "") ?: ""
        }

        @JavascriptInterface
        fun setPrefs(json: String) {
            val p = getSharedPreferences("rakan", MODE_PRIVATE)
            p.edit().putString("state", json).apply()
        }

        /* ---------- the app's own voice ---------- */

        @JavascriptInterface
        fun ttsReady(): Boolean = ttsReady

        @JavascriptInterface
        fun speak(text: String, lang: String) {
            val engine = tts ?: return
            runOnUiThread {
                try {
                    if (lang == "en") {
                        engine.setLanguage(Locale.ENGLISH)
                    } else {
                        engine.setLanguage(Locale("ar"))
                    }
                    engine.speak(text, TextToSpeech.QUEUE_FLUSH, null, "rakan")
                } catch (e: Exception) {
                    // nothing to say
                }
            }
        }

        @JavascriptInterface
        fun stopSpeaking() {
            runOnUiThread {
                try {
                    tts?.stop()
                } catch (e: Exception) {
                    // already quiet
                }
            }
        }

        /* ---------- updates ---------- */

        @JavascriptInterface
        fun buildNumber(): Int = currentBuild()

        @JavascriptInterface
        fun versionName(): String {
            return try {
                packageManager.getPackageInfo(packageName, 0).versionName ?: "1.0"
            } catch (e: Exception) {
                "1.0"
            }
        }

        /**
         * Asks GitHub for the newest published build and reports back to the page.
         * Works for a public repository; a private one answers 404, and the page
         * then just offers to open the releases page.
         */
        @JavascriptInterface
        fun checkUpdate(owner: String, repo: String) {
            val current = currentBuild()
            val thread = Thread {
                var latest = -1
                var link = "https://github.com/" + owner + "/" + repo + "/releases/latest"
                var error = ""
                var conn: HttpURLConnection? = null
                try {
                    val u = URL("https://api.github.com/repos/" + owner + "/" + repo + "/releases/latest")
                    val c = u.openConnection() as HttpURLConnection
                    conn = c
                    c.requestMethod = "GET"
                    c.connectTimeout = 8000
                    c.readTimeout = 8000
                    c.setRequestProperty("Accept", "application/vnd.github+json")
                    c.setRequestProperty("User-Agent", "Rakan")
                    val code = c.responseCode
                    if (code == 200) {
                        val body = c.inputStream.bufferedReader().use { it.readText() }
                        val o = JSONObject(body)
                        link = o.optString("html_url", link)
                        val tag = o.optString("tag_name", "")
                        val digits = StringBuilder()
                        for (ch in tag) {
                            if (ch.isDigit()) digits.append(ch)
                        }
                        latest = digits.toString().toIntOrNull() ?: -1
                    } else if (code == 404) {
                        error = "private"
                    } else {
                        error = "http"
                    }
                } catch (e: Exception) {
                    error = "network"
                } finally {
                    try {
                        conn?.disconnect()
                    } catch (e: Exception) {
                        // ignore
                    }
                }
                val payload = JSONObject()
                payload.put("latest", latest)
                payload.put("current", current)
                payload.put("url", link)
                payload.put("error", error)
                val quoted = JSONObject.quote(payload.toString())
                runOnUiThread {
                    web.evaluateJavascript(
                        "window.onRakanUpdate && window.onRakanUpdate(" + quoted + ")", null
                    )
                }
            }
            thread.start()
        }

        /** Opens a link outside the app — the releases page, nothing else. */
        @JavascriptInterface
        fun openUrl(url: String) {
            if (!url.startsWith("https://")) return
            openExternal(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
        }

        /** Unpins the screen and hands the phone back to the parent. */
        @JavascriptInterface
        fun exitApp() {
            runOnUiThread {
                stopPinning()
                finishAndRemoveTask()
            }
        }

        /**
         * Downloads rakan.apk from the newest GitHub release and opens the system
         * installer. Android always asks the parent to confirm the install.
         */
        @JavascriptInterface
        fun installUpdate(owner: String, repo: String) {
            val thread = Thread {
                var apk: File? = null
                try {
                    val dir = File(cacheDir, "updates")
                    dir.mkdirs()
                    val target = File(dir, "rakan.apk")
                    val api = URL("https://api.github.com/repos/" + owner + "/" + repo + "/releases/latest")
                    val c1 = api.openConnection() as HttpURLConnection
                    c1.connectTimeout = 10000
                    c1.readTimeout = 10000
                    c1.setRequestProperty("Accept", "application/vnd.github+json")
                    c1.setRequestProperty("User-Agent", "Rakan")
                    var assetUrl = ""
                    if (c1.responseCode == 200) {
                        val body = c1.inputStream.bufferedReader().use { it.readText() }
                        val assets = JSONObject(body).optJSONArray("assets")
                        if (assets != null) {
                            for (i in 0 until assets.length()) {
                                val a = assets.getJSONObject(i)
                                if (a.optString("name") == "rakan.apk") {
                                    assetUrl = a.optString("browser_download_url")
                                }
                            }
                        }
                    }
                    c1.disconnect()
                    if (assetUrl.isEmpty()) throw Exception("no asset")

                    val c2 = URL(assetUrl).openConnection() as HttpURLConnection
                    c2.connectTimeout = 15000
                    c2.readTimeout = 30000
                    c2.instanceFollowRedirects = true
                    c2.setRequestProperty("User-Agent", "Rakan")
                    if (c2.responseCode != 200) throw Exception("download")
                    val total = c2.contentLength
                    var done = 0L
                    var lastPct = -1
                    c2.inputStream.use { input ->
                        target.outputStream().use { output ->
                            val buf = ByteArray(32768)
                            while (true) {
                                val n = input.read(buf)
                                if (n < 0) break
                                output.write(buf, 0, n)
                                done += n
                                if (total > 0) {
                                    val pct = (done * 100 / total).toInt()
                                    if (pct != lastPct && pct % 5 == 0) {
                                        lastPct = pct
                                        sendDownload("progress", pct)
                                    }
                                }
                            }
                        }
                    }
                    c2.disconnect()
                    apk = target
                } catch (e: Exception) {
                    sendDownload("error", 0)
                }
                val file = apk
                if (file != null) {
                    runOnUiThread { launchInstaller(file) }
                }
            }
            thread.start()
        }
    }

    private fun sendDownload(state: String, pct: Int) {
        val o = JSONObject()
        o.put("state", state)
        o.put("pct", pct)
        val quoted = JSONObject.quote(o.toString())
        runOnUiThread {
            web.evaluateJavascript(
                "window.onRakanDownload && window.onRakanDownload(" + quoted + ")", null
            )
        }
    }

    private fun launchInstaller(file: File) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !packageManager.canRequestPackageInstalls()) {
            sendDownload("permission", 0)
            val i = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES)
            i.data = Uri.parse("package:" + packageName)
            openExternal(i)
            return
        }
        try {
            val uri = FileProvider.getUriForFile(this, packageName + ".fileprovider", file)
            val i = Intent(Intent.ACTION_VIEW)
            i.setDataAndType(uri, "application/vnd.android.package-archive")
            i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            sendDownload("installing", 100)
            openExternal(i)
        } catch (e: Exception) {
            sendDownload("error", 0)
        }
    }
}
