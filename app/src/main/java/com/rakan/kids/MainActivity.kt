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
 * The interface lives in assets/app (HTML + CSS + JS) inside one WebView.
 * Everything only Android can do — pinning the screen, reading the /Rakan folders,
 * permissions, storing parent settings — lives here and reaches the page through
 * the `Rakan` JavaScript object.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var web: WebView
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var pinned = false

    /**
     * Set while the parent is being sent to a system settings screen.
     * Lock task mode blocks starting other activities, so pinning is released first
     * and restored when they come back.
     */
    private var leavingForSettings = false

    /** Where the parent drops content. Also what a Drive sync app should write into. */
    private val rootDir: File
        get() = File(Environment.getExternalStorageDirectory(), "Rakan")

    private val videosDir: File get() = File(rootDir, "videos")
    private val photosDir: File get() = File(rootDir, "photos")
    private val soundsDir: File get() = File(rootDir, "sounds")

    /** One tree per recorded voice, plus the shared Quran and app folders. */
    private val soundFolders: List<String> =
        listOf("mom", "dad").flatMap { v ->
            listOf(
                "sounds/$v/letters/ar", "sounds/$v/letters/en",
                "sounds/$v/numbers", "sounds/$v/manners", "sounds/$v/prayer"
            )
        } + listOf("sounds/quran", "sounds/app")

    private var tts: TextToSpeech? = null
    private var ttsReady = false

    private val fileChooser = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val cb = filePathCallback
        filePathCallback = null
        if (cb == null) return@registerForActivityResult
        val uri = result.data?.data
        if (result.resultCode == RESULT_OK && uri != null) cb.onReceiveValue(arrayOf(uri))
        else cb.onReceiveValue(null)
    }

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) {
        web.evaluateJavascript("window.onRakanPermissionResult && window.onRakanPermissionResult()", null)
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        WindowCompat.setDecorFitsSystemWindows(window, false)
        hideSystemBars()
        ensureFolders()

        web = WebView(this)
        setContentView(web)

        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            allowFileAccess = false
            allowContentAccess = false
            cacheMode = WebSettings.LOAD_NO_CACHE
            textZoom = 100
        }
        web.setBackgroundColor(ContextCompat.getColor(this, R.color.rakan_sky))
        web.isLongClickable = false
        web.setOnLongClickListener { true }

        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView, request: WebResourceRequest
            ): WebResourceResponse? = serve(request.url)

            override fun shouldOverrideUrlLoading(
                view: WebView, request: WebResourceRequest
            ): Boolean = request.url.host != "rakan.local"
        }

        web.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                view: WebView,
                callback: ValueCallback<Array<Uri>>,
                params: FileChooserParams
            ): Boolean {
                filePathCallback?.onReceiveValue(null)
                filePathCallback = callback
                // The picker is another activity, so pinning has to come off first.
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

        // The built-in reader: letters, numbers and the guidance cards all speak
        // without the parent having recorded anything yet.
        tts = TextToSpeech(this) { status ->
            if (status == TextToSpeech.SUCCESS) {
                val t = tts ?: return@TextToSpeech
                val arabic = try { t.setLanguage(Locale("ar")) } catch (e: Exception) { TextToSpeech.LANG_MISSING_DATA }
                ttsReady = arabic != TextToSpeech.LANG_MISSING_DATA && arabic != TextToSpeech.LANG_NOT_SUPPORTED
                t.setSpeechRate(0.85f)
                t.setPitch(1.25f)
                web.post {
                    web.evaluateJavascript("window.onRakanTts && window.onRakanTts($ttsReady)", null)
                }
            }
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                web.evaluateJavascript("window.rakanBack && window.rakanBack()", null)
            }
        })
    }

    override fun onResume() {
        super.onResume()
        hideSystemBars()
        if (leavingForSettings) {
            // Back from a system screen — pin again and let the page refresh its state.
            leavingForSettings = false
            web.postDelayed({
                startPinning()
                web.evaluateJavascript("window.onRakanPermissionResult && window.onRakanPermissionResult()", null)
            }, 400)
        } else {
            startPinning()
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) hideSystemBars()
    }

    override fun onDestroy() {
        try { tts?.stop(); tts?.shutdown() } catch (e: Exception) { }
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
        try { stopLockTask() } catch (e: Exception) { }
        pinned = false
    }

    /** Leaves lock task mode, then opens a system screen the parent asked for. */
    private fun openExternal(build: () -> Intent) {
        runOnUiThread {
            leavingForSettings = true
            stopPinning()
            web.postDelayed({
                try {
                    val i = build()
                    i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    startActivity(i)
                } catch (e: Exception) {
                    leavingForSettings = false
                    startPinning()
                }
            }, 250)
        }
    }

    private fun ensureFolders() {
        try {
            videosDir.mkdirs()
            photosDir.mkdirs()
            soundFolders.forEach { File(rootDir, it).mkdirs() }
            // A note so the folders are self-explanatory in any file manager.
            val readme = File(soundsDir, "اقرأني.txt")
            if (!readme.exists()) {
                readme.writeText(
                    buildString {
                        appendLine("مجلدات الصوت الخاصة بتطبيق راكان")
                        appendLine("=================================")
                        appendLine()
                        appendLine("فيه ثلاث أصوات ممكن التطبيق ينطق بيها، وبتختار كل واحد فين من الإعدادات:")
                        appendLine("  • صوت التطبيق : قارئ أندرويد المدمّج — شغال من غير ما تسجّل حاجة")
                        appendLine("  • ماما        : تسجيلاتك في مجلد mom")
                        appendLine("  • بابا        : تسجيلاتك في مجلد dad")
                        appendLine()
                        appendLine("mom/ و dad/ جوه كل واحد منهم:")
                        appendLine("  letters/ar  : الحروف العربية — 1.mp3 إلى 28.mp3 بترتيب أ ب ت ث ج ح خ د ...")
                        appendLine("  letters/en  : الحروف الإنجليزية — 1.mp3 إلى 26.mp3 بترتيب A B C D ...")
                        appendLine("  numbers     : الأرقام — 1.mp3 إلى 20.mp3")
                        appendLine("  manners     : جُمل الأخلاق — 1.mp3 وهكذا بترتيب ظهورها في التطبيق")
                        appendLine("  prayer      : خطوات الصلاة — 1.mp3 إلى 7.mp3")
                        appendLine()
                        appendLine("quran : المصحف المعلّم — باسم رقم السورة: 001.mp3 ... 114.mp3")
                        appendLine("app   : welcome.mp3 (الترحيب) و bravo.mp3 (التشجيع) و timeup.mp3 (انتهاء الوقت)")
                        appendLine()
                        appendLine("الصيغ المقبولة: mp3 أو m4a أو ogg أو wav")
                        appendLine("مش لازم تملا كل حاجة — أي ملف ناقص التطبيق بيستخدم صوته المدمّج مكانه.")
                    }
                )
            }
        } catch (e: Exception) {
            // No storage permission yet; folders get created once it is granted.
        }
    }

    /** Serves the bundled interface plus anything under the parent's /Rakan folder. */
    private fun serve(url: Uri): WebResourceResponse? {
        if (url.host != "rakan.local") return null
        val path = url.path ?: return null
        return try {
            if (path.startsWith("/media/")) {
                val rel = URLDecoder.decode(path.removePrefix("/media/"), "UTF-8")
                if (rel.isEmpty() || rel.contains("..")) return null
                val file = File(rootDir, rel)
                if (!file.exists() || !file.isFile) return null
                if (!file.canonicalPath.startsWith(rootDir.canonicalPath)) return null
                WebResourceResponse(mimeOf(file.name), null, FileInputStream(file))
            } else {
                val asset = "app" + (if (path == "/") "/index.html" else path)
                WebResourceResponse(mimeOf(asset), "UTF-8", assets.open(asset))
            }
        } catch (e: Exception) {
            null
        }
    }

    private fun mimeOf(name: String): String {
        return when (name.substringAfterLast('.', "").lowercase()) {
            "html" -> "text/html"
            "js" -> "application/javascript"
            "css" -> "text/css"
            "svg" -> "image/svg+xml"
            "json" -> "application/json"
            "mp3" -> "audio/mpeg"
            "m4a" -> "audio/mp4"
            "ogg" -> "audio/ogg"
            "wav" -> "audio/wav"
            "mp4" -> "video/mp4"
            else -> MimeTypeMap.getSingleton()
                .getMimeTypeFromExtension(name.substringAfterLast('.', "").lowercase())
                ?: "application/octet-stream"
        }
    }

    private fun hasMediaAccess(): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && Environment.isExternalStorageManager()) return true
        val perms = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            arrayOf(Manifest.permission.READ_MEDIA_IMAGES, Manifest.permission.READ_MEDIA_VIDEO)
        } else {
            arrayOf(Manifest.permission.READ_EXTERNAL_STORAGE)
        }
        return perms.all { ContextCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED }
    }

    private fun listMediaFiles(kind: String): JSONArray {
        val out = JSONArray()
        val dir = if (kind == "videos") videosDir else photosDir
        val exts = if (kind == "videos") setOf("mp4", "m4v", "webm", "mkv", "3gp")
        else setOf("jpg", "jpeg", "png", "webp", "gif", "bmp", "heic")
        val files = try { dir.listFiles() } catch (e: Exception) { null } ?: return out
        files.filter { it.isFile && it.extension.lowercase() in exts }
            .sortedByDescending { it.lastModified() }
            .forEach { f ->
                out.put(JSONObject().apply {
                    put("name", f.name)
                    put("title", f.nameWithoutExtension)
                    put("url", "https://rakan.local/media/$kind/" + Uri.encode(f.name))
                })
            }
        return out
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

        /**
         * Finds a sound by base name, whatever audio extension it was saved with.
         * Returns the url to play, or "" when nothing is there.
         */
        @JavascriptInterface
        fun soundUrl(relNoExt: String): String {
            if (relNoExt.contains("..")) return ""
            for (ext in listOf("mp3", "m4a", "ogg", "wav", "opus", "aac")) {
                val f = File(rootDir, "$relNoExt.$ext")
                try {
                    if (f.exists() && f.isFile && f.canonicalPath.startsWith(rootDir.canonicalPath)) {
                        val rel = f.absolutePath.removePrefix(rootDir.absolutePath).trimStart('/')
                        return "https://rakan.local/media/" + rel.split("/").joinToString("/") { Uri.encode(it) }
                    }
                } catch (e: Exception) {
                    return ""
                }
            }
            return ""
        }

        /** How many audio files sit in a folder — used to show progress in settings. */
        @JavascriptInterface
        fun countSounds(rel: String): Int {
            if (rel.contains("..")) return 0
            val exts = setOf("mp3", "m4a", "ogg", "wav", "opus", "aac")
            return try {
                File(rootDir, rel).listFiles()?.count { it.isFile && it.extension.lowercase() in exts } ?: 0
            } catch (e: Exception) { 0 }
        }

        @JavascriptInterface
        fun hasAccess(): Boolean = hasMediaAccess()

        @JavascriptInterface
        fun requestAccess() {
            runOnUiThread {
                val perms = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
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
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) { requestAccess(); return }
            openExternal {
                Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION).apply {
                    data = Uri.parse("package:$packageName")
                }
            }
        }

        /** App info page — the fallback when the direct permission screen is blocked. */
        @JavascriptInterface
        fun openAppSettings() {
            openExternal {
                Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.parse("package:$packageName")
                }
            }
        }

        @JavascriptInterface
        fun openPinningSettings() {
            openExternal { Intent(Settings.ACTION_SECURITY_SETTINGS) }
        }

        @JavascriptInterface
        fun makeFolders() { runOnUiThread { ensureFolders() } }

        /* ---------- the app's own voice ---------- */

        @JavascriptInterface
        fun ttsReady(): Boolean = ttsReady

        /** Speaks text with the device reader. Arabic by default, "en" for the English letters. */
        @JavascriptInterface
        fun speak(text: String, lang: String) {
            val t = tts ?: return
            runOnUiThread {
                try {
                    t.setLanguage(if (lang == "en") Locale.ENGLISH else Locale("ar"))
                    t.speak(text, TextToSpeech.QUEUE_FLUSH, null, "rakan")
                } catch (e: Exception) { }
            }
        }

        @JavascriptInterface
        fun stopSpeaking() {
            runOnUiThread { try { tts?.stop() } catch (e: Exception) { } }
        }

        /* ---------- updates ---------- */

        @JavascriptInterface
        fun buildNumber(): Int = BuildConfig.BUILD_NUMBER

        @JavascriptInterface
        fun versionName(): String = BuildConfig.VERSION_NAME

        /**
         * Asks GitHub for the newest published build and reports back to the page.
         * Works for a public repository; a private one answers 404, and the page
         * then just offers to open the releases page.
         */
        @JavascriptInterface
        fun checkUpdate(owner: String, repo: String) {
            Thread {
                var latest = -1
                var link = "https://github.com/$owner/$repo/releases/latest"
                var error = ""
                var conn: HttpURLConnection? = null
                try {
                    conn = (URL("https://api.github.com/repos/$owner/$repo/releases/latest")
                        .openConnection() as HttpURLConnection).apply {
                        requestMethod = "GET"
                        connectTimeout = 8000
                        readTimeout = 8000
                        setRequestProperty("Accept", "application/vnd.github+json")
                        setRequestProperty("User-Agent", "Rakan")
                    }
                    if (conn.responseCode == 200) {
                        val body = conn.inputStream.bufferedReader().use { it.readText() }
                        val o = JSONObject(body)
                        link = o.optString("html_url", link)
                        latest = Regex("\\d+").find(o.optString("tag_name", ""))?.value?.toIntOrNull() ?: -1
                    } else if (conn.responseCode == 404) {
                        error = "private"
                    } else {
                        error = "http-" + conn.responseCode
                    }
                } catch (e: Exception) {
                    error = "network"
                } finally {
                    try { conn?.disconnect() } catch (e: Exception) { }
                }
                val payload = JSONObject().apply {
                    put("latest", latest)
                    put("current", BuildConfig.BUILD_NUMBER)
                    put("url", link)
                    put("error", error)
                }.toString()
                runOnUiThread {
                    web.evaluateJavascript(
                        "window.onRakanUpdate && window.onRakanUpdate(" + JSONObject.quote(payload) + ")", null
                    )
                }
            }.start()
        }

        /** Opens a link outside the app — releases page, nothing else. */
        @JavascriptInterface
        fun openUrl(url: String) {
            if (!url.startsWith("https://")) return
            openExternal { Intent(Intent.ACTION_VIEW, Uri.parse(url)) }
        }

        @JavascriptInterface
        fun isPinned(): Boolean = pinned

        @JavascriptInterface
        fun getPrefs(): String =
            getSharedPreferences("rakan", MODE_PRIVATE).getString("state", "") ?: ""

        @JavascriptInterface
        fun setPrefs(json: String) {
            getSharedPreferences("rakan", MODE_PRIVATE).edit().putString("state", json).apply()
        }

        /** Unpins the screen and hands the phone back to the parent. */
        @JavascriptInterface
        fun exitApp() {
            runOnUiThread {
                stopPinning()
                finishAndRemoveTask()
            }
        }
    }
}
