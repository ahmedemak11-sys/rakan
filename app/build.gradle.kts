plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// GitHub Actions sets this on every build, so each APK carries its build number
// and the app can tell the parent which one they are on.
val buildNo: Int = (System.getenv("GITHUB_RUN_NUMBER") ?: "0").toIntOrNull() ?: 0

android {
    namespace = "com.rakan.kids"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.rakan.kids"
        minSdk = 24
        targetSdk = 34
        versionCode = buildNo + 1
        versionName = "1.$buildNo"
    }

    // A fixed debug keystore committed to the repo, so every build on every
    // machine (GitHub Actions included) signs with the SAME certificate.
    // Without this, Gradle's auto-generated debug key differs on every CI
    // run, and Android refuses to install an update over the old app
    // ("App not installed — conflicts with an existing package").
    signingConfigs {
        getByName("debug") {
            storeFile = file("debug.keystore")
            storePassword = "android"
            keyAlias = "androiddebugkey"
            keyPassword = "android"
        }
    }

    buildTypes {
        debug {
            isMinifyEnabled = false
        }
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }

    lint {
        abortOnError = false
        checkReleaseBuilds = false
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.activity:activity-ktx:1.9.1")
}
