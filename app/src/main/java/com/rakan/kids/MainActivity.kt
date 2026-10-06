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
import java.net.URLDecoder

/**
 * Rakan — a kid-safe launcher-style app.
 *
 * The whole interface lives in assets/app (HTML + CSS + JS) and runs inside one WebView.
 * Everything Android alone can do — pinning the screen, reading the /Rakan folders,
 * permissions, storing parent settings — lives here and is exposed to the page
 * through the `Rakan` JavaScript object.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var web: WebView
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var pinned = false

    /** Where the parent drops content. Also what a Drive sync app should write into. */
    private val rootDir: File
        get() = File(Environment.getExternalStorageDirectory(), "Rakan")

    private val videosDir: File get() = File(rootDir, "videos")
    private val photosDir: File get() = File(rootDir, "photos")

    private val fileChooser = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val cb = filePathCallback
        filePathCallback = null
        if (cb == null) return@registerForActivityResult
        val data = result.data
        val uri = data?.data
        if (result.resultCode == RESULT_OK && uri != null) {
            cb.onReceiveValue(arrayOf(uri))
        } else {
            cb.onReceiveValue(null)
        }
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
        WebView.setWebContentsDebuggingEnabled(false)
        web.setBackgroundColor(ContextCompat.getColor(this, R.color.rakan_sky))
        web.isLongClickable = false
        web.setOnLongClickListener { true }

        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView, request: WebResourceRequest
            ): WebResourceResponse? = serve(request.url)

            override fun shouldOverrideUrlLoading(
                view: WebView, request: WebResourceRequest
            ): Boolean {
                // The child never leaves the app.
                return request.url.host != "rakan.local"
            }
        }

        web.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                view: WebView,
                callback: ValueCallback<Array<Uri>>,
                params: FileChooserParams
            ): Boolean {
                filePathCallback?.onReceiveValue(null)
                filePathCallback = callback
                return try {
                    fileChooser.launch(params.createIntent())
                    true
                } catch (e: Exception) {
                    filePathCallback = null
                    false
                }
            }
        }

        web.addJavascriptInterface(Bridge(), "Rakan")
        web.loadUrl("https://rakan.local/index.html")

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                // Back is handled inside the page; it never closes the app.
                web.evaluateJavascript("window.rakanBack && window.rakanBack()", null)
            }
        })
    }

    override fun onResume() {
        super.onResume()
        hideSystemBars()
        startPinning()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) hideSystemBars()
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
            // ignore
        }
        pinned = false
    }

    private fun ensureFolders() {
        try {
            if (!videosDir.exists()) videosDir.mkdirs()
            if (!photosDir.exists()) photosDir.mkdirs()
        } catch (e: Exception) {
            // Without storage permission yet; folders get created after it is granted.
        }
    }

    /** Serves the bundled interface and the parent's media under one virtual origin. */
    private fun serve(url: Uri): WebResourceResponse? {
        if (url.host != "rakan.local") return null
        val path = url.path ?: return null
        return try {
            if (path.startsWith("/media/")) {
                val rest = URLDecoder.decode(path.removePrefix("/media/"), "UTF-8")
                val slash = rest.indexOf('/')
                if (slash <= 0) return null
                val kind = rest.substring(0, slash)
                val name = rest.substring(slash + 1)
                if (name.contains("..")) return null
                val dir = if (kind == "videos") videosDir else photosDir
                val file = File(dir, name)
                if (!file.exists() || !file.canonicalPath.startsWith(dir.canonicalPath)) return null
                WebResourceResponse(mimeOf(name), null, FileInputStream(file))
            } else {
                val asset = "app" + (if (path == "/") "/index.html" else path)
                WebResourceResponse(mimeOf(asset), "UTF-8", assets.open(asset))
            }
        } catch (e: Exception) {
            null
        }
    }

    private fun mimeOf(name: String): String {
        val ext = name.substringAfterLast('.', "").lowercase()
        return when (ext) {
            "html" -> "text/html"
            "js" -> "application/javascript"
            "css" -> "text/css"
            "svg" -> "image/svg+xml"
            "json" -> "application/json"
            else -> MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext) ?: "application/octet-stream"
        }
    }

    private fun hasMediaAccess(): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && Environment.isExternalStorageManager()) return true
        val perms = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            arrayOf(Manifest.permission.READ_MEDIA_IMAGES, Manifest.permission.READ_MEDIA_VIDEO)
        } else {
            arrayOf(Manifest.permission.READ_EXTERNAL_STORAGE)
        }
        return perms.all {
            ContextCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED
        }
    }

    private fun listMediaFiles(kind: String): JSONArray {
        val out = JSONArray()
        val dir = if (kind == "videos") videosDir else photosDir
        val exts = if (kind == "videos")
            setOf("mp4", "m4v", "webm", "mkv", "3gp")
        else
            setOf("jpg", "jpeg", "png", "webp", "gif", "bmp")
        val files = try { dir.listFiles() } catch (e: Exception) { null } ?: return out
        files.filter { it.isFile && it.extension.lowercase() in exts }
            .sortedByDescending { it.lastModified() }
            .forEach { f ->
                val o = JSONObject()
                o.put("name", f.name)
                o.put("title", f.nameWithoutExtension)
                o.put("url", "https://rakan.local/media/$kind/" + Uri.encode(f.name))
                out.put(o)
            }
        return out
    }

    inner class Bridge {

        @JavascriptInterface
        fun platform(): String = "android"

        @JavascriptInterface
        fun listMedia(kind: String): String = listMediaFiles(kind).toString()

        @JavascriptInterface
        fun folderPath(kind: String): String =
            (if (kind == "videos") videosDir else photosDir).absolutePath

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

        /** Opens the system page for "All files access" — the reliable route on Android 11+. */
        @JavascriptInterface
        fun requestAllFilesAccess() {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
                requestAccess()
                return
            }
            runOnUiThread {
                try {
                    val i = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION)
                    i.data = Uri.parse("package:$packageName")
                    startActivity(i)
                } catch (e: Exception) {
                    try {
                        startActivity(Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION))
                    } catch (ignored: Exception) {
                    }
                }
            }
        }

        @JavascriptInterface
        fun makeFolders() {
            runOnUiThread { ensureFolders() }
        }

        @JavascriptInterface
        fun isPinned(): Boolean = pinned

        @JavascriptInterface
        fun openPinningSettings() {
            runOnUiThread {
                try {
                    startActivity(Intent(Settings.ACTION_SECURITY_SETTINGS))
                } catch (e: Exception) {
                }
            }
        }

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
