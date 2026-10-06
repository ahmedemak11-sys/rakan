plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// GitHub Actions sets this on every build, so the app knows which build it is
// and can tell when a newer one has been published.
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
        buildConfigField("int", "BUILD_NUMBER", "$buildNo")
    }

    buildFeatures {
        buildConfig = true
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
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.activity:activity-ktx:1.9.1")
    implementation("androidx.webkit:webkit:1.11.0")
}
