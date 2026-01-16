# How to Install Android Studio on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Android Studio, Android Development, Mobile, Tutorial

Description: Complete guide to installing Android Studio and setting up Android development on Ubuntu.

---

Android Studio is the official Integrated Development Environment (IDE) for Android app development, built on JetBrains' IntelliJ IDEA. This comprehensive guide walks you through installing Android Studio on Ubuntu, configuring the development environment, and getting started with Android development.

## System Requirements

Before installing Android Studio, ensure your Ubuntu system meets the minimum requirements:

### Minimum Requirements

- **OS**: Ubuntu 20.04 LTS (64-bit) or later
- **RAM**: 8 GB minimum (16 GB recommended)
- **Disk Space**: 8 GB minimum (SSD recommended for better performance)
- **Screen Resolution**: 1280 x 800 minimum
- **CPU**: x86_64 CPU architecture with support for Intel VT-x or AMD-V virtualization

### Recommended Specifications

```bash
# Check your system specifications
# View CPU information
lscpu | grep -E "Architecture|CPU|Model name|Virtualization"

# Check available RAM
free -h

# Check available disk space
df -h /

# Verify 64-bit architecture
uname -m
# Output should be: x86_64
```

## Installing Dependencies

Android Studio requires several dependencies to function properly. Install them before proceeding with the IDE installation.

### Install Required Packages

```bash
# Update package lists
sudo apt update

# Install essential dependencies
# - lib32z1: 32-bit zlib compression library (required for Android SDK tools)
# - lib32stdc++6: 32-bit GNU Standard C++ Library
# - libc6-i386: 32-bit shared libraries for AMD64
# - lib32ncurses6: 32-bit ncurses library (terminal handling)
# - unzip: For extracting archives
# - wget/curl: For downloading files
sudo apt install -y \
    lib32z1 \
    lib32stdc++6 \
    libc6-i386 \
    lib32ncurses6 \
    unzip \
    wget \
    curl \
    git

# Install Java Development Kit (JDK)
# Android Studio bundles its own JDK, but having system JDK is useful
sudo apt install -y openjdk-17-jdk

# Verify Java installation
java -version
javac -version
```

### Set JAVA_HOME Environment Variable

```bash
# Find the Java installation path
sudo update-alternatives --config java

# Add JAVA_HOME to your profile
# Open bashrc for editing
echo 'export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64' >> ~/.bashrc
echo 'export PATH=$PATH:$JAVA_HOME/bin' >> ~/.bashrc

# Reload the configuration
source ~/.bashrc

# Verify JAVA_HOME is set
echo $JAVA_HOME
```

## Installing Android Studio

There are two primary methods to install Android Studio on Ubuntu: using Snap (recommended for most users) or manual installation (for more control).

### Method 1: Install via Snap (Recommended)

Snap provides automatic updates and sandboxed installation, making it the easiest method.

```bash
# Install Android Studio via Snap
# The --classic flag allows the snap to access system resources
sudo snap install android-studio --classic

# Verify the installation
snap list android-studio

# Launch Android Studio
android-studio
```

### Method 2: Manual Installation

Manual installation gives you more control over the installation location and version.

```bash
# Create a directory for Android development tools
mkdir -p ~/Android

# Download the latest Android Studio
# Visit https://developer.android.com/studio for the latest version
cd /tmp
wget https://redirector.gvt1.com/edgedl/android/studio/ide-zips/2024.2.1.11/android-studio-2024.2.1.11-linux.tar.gz

# Verify the download (optional but recommended)
# Compare with checksum from download page
sha256sum android-studio-*.tar.gz

# Extract the archive to /opt (system-wide) or ~/Android (user-specific)
# Option A: System-wide installation (requires sudo)
sudo tar -xzf android-studio-*.tar.gz -C /opt/

# Option B: User-specific installation
tar -xzf android-studio-*.tar.gz -C ~/Android/

# Create a symbolic link for easy access (for system-wide installation)
sudo ln -sf /opt/android-studio/bin/studio.sh /usr/local/bin/android-studio

# Launch Android Studio
# For system-wide installation:
/opt/android-studio/bin/studio.sh

# For user-specific installation:
~/Android/android-studio/bin/studio.sh
```

### Create Desktop Entry (Manual Installation)

```bash
# Create a desktop entry for easy launching
cat > ~/.local/share/applications/android-studio.desktop << 'EOF'
[Desktop Entry]
Version=1.0
Type=Application
Name=Android Studio
Comment=Android Development IDE
# Adjust the path based on your installation location
Exec=/opt/android-studio/bin/studio.sh
Icon=/opt/android-studio/bin/studio.png
Categories=Development;IDE;
Terminal=false
StartupNotify=true
StartupWMClass=jetbrains-studio
EOF

# Make the desktop entry executable
chmod +x ~/.local/share/applications/android-studio.desktop

# Update desktop database
update-desktop-database ~/.local/share/applications/
```

## Initial SDK Setup

When you first launch Android Studio, the Setup Wizard will guide you through the initial configuration.

### First Launch Configuration

1. **Import Settings**: Choose "Do not import settings" for a fresh installation
2. **Setup Type**: Select "Standard" for recommended settings or "Custom" for more control
3. **UI Theme**: Choose between Darcula (dark) or Light theme
4. **SDK Components**: The wizard will download necessary SDK components

### Configure Android SDK Path

```bash
# Set Android SDK environment variables
# Add these to your ~/.bashrc or ~/.profile

# Android SDK location (default when installed via Setup Wizard)
echo 'export ANDROID_HOME=$HOME/Android/Sdk' >> ~/.bashrc
echo 'export ANDROID_SDK_ROOT=$HOME/Android/Sdk' >> ~/.bashrc

# Add Android tools to PATH
echo 'export PATH=$PATH:$ANDROID_HOME/emulator' >> ~/.bashrc
echo 'export PATH=$PATH:$ANDROID_HOME/platform-tools' >> ~/.bashrc
echo 'export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin' >> ~/.bashrc
echo 'export PATH=$PATH:$ANDROID_HOME/build-tools/34.0.0' >> ~/.bashrc

# Reload configuration
source ~/.bashrc

# Verify the configuration
echo $ANDROID_HOME
which adb
```

### Install Additional SDK Packages

```bash
# Use sdkmanager to install additional components
# List available packages
sdkmanager --list

# Install specific platform version (e.g., Android 14 - API 34)
sdkmanager "platforms;android-34"

# Install build tools
sdkmanager "build-tools;34.0.0"

# Install system images for emulator
# For x86_64 systems with Google APIs
sdkmanager "system-images;android-34;google_apis;x86_64"

# Install Google Play system image (for apps requiring Google Play)
sdkmanager "system-images;android-34;google_apis_playstore;x86_64"

# Install Android SDK Platform-Tools (includes adb, fastboot)
sdkmanager "platform-tools"

# Install additional useful packages
sdkmanager "extras;google;usb_driver"
sdkmanager "extras;google;google_play_services"

# Accept all licenses
yes | sdkmanager --licenses
```

## AVD Manager and Emulators

The Android Virtual Device (AVD) Manager allows you to create and manage virtual devices for testing your applications.

### Creating Virtual Devices via GUI

1. Open Android Studio
2. Go to **Tools > Device Manager** (or click the Device Manager icon)
3. Click **Create Device**
4. Select a device definition (e.g., Pixel 7)
5. Choose a system image (download if necessary)
6. Configure AVD settings and click **Finish**

### Creating Virtual Devices via Command Line

```bash
# List available device definitions
avdmanager list device

# List available system images
sdkmanager --list | grep "system-images"

# Create a new AVD
# Syntax: avdmanager create avd -n <name> -k <system-image> -d <device>
avdmanager create avd \
    -n Pixel_7_API_34 \
    -k "system-images;android-34;google_apis;x86_64" \
    -d "pixel_7"

# List created AVDs
avdmanager list avd

# Start the emulator from command line
emulator -avd Pixel_7_API_34

# Start emulator with specific options
# -no-snapshot: Start fresh without loading snapshot
# -wipe-data: Reset user data
# -gpu auto: Automatic GPU acceleration detection
emulator -avd Pixel_7_API_34 -gpu auto -no-snapshot-load

# Start emulator in background
emulator -avd Pixel_7_API_34 &
```

### Configure Emulator Settings

```bash
# Edit AVD configuration for better performance
# AVD configs are stored in ~/.android/avd/<avd-name>.avd/config.ini

# Example: Increase RAM and enable hardware keyboard
cat >> ~/.android/avd/Pixel_7_API_34.avd/config.ini << 'EOF'
hw.keyboard=yes
hw.ramSize=4096
hw.gpu.enabled=yes
hw.gpu.mode=auto
disk.dataPartition.size=8G
EOF
```

## KVM Acceleration

KVM (Kernel-based Virtual Machine) significantly improves emulator performance on Linux. It's essential for a smooth development experience.

### Check KVM Support

```bash
# Check if your CPU supports virtualization
# Look for 'vmx' (Intel) or 'svm' (AMD)
grep -E "(vmx|svm)" /proc/cpuinfo

# If you see output, your CPU supports virtualization
# If no output, check BIOS settings to enable VT-x/AMD-V

# Check if KVM modules are loaded
lsmod | grep kvm
# Should show: kvm_intel or kvm_amd, and kvm
```

### Install and Configure KVM

```bash
# Install KVM and related packages
sudo apt install -y \
    qemu-kvm \
    libvirt-daemon-system \
    libvirt-clients \
    bridge-utils \
    cpu-checker

# Check if KVM acceleration is available
kvm-ok
# Expected output: "KVM acceleration can be used"

# Add your user to the kvm group
# This allows running the emulator without root privileges
sudo adduser $USER kvm

# Verify group membership
groups $USER

# Set correct permissions on /dev/kvm
sudo chown root:kvm /dev/kvm
sudo chmod 660 /dev/kvm

# Log out and log back in for group changes to take effect
# Or use this command to apply changes immediately (new shell)
newgrp kvm

# Verify KVM is accessible
ls -la /dev/kvm
```

### Troubleshoot KVM Issues

```bash
# If KVM is not working, check for common issues

# 1. Verify virtualization is enabled in BIOS
dmesg | grep -i kvm

# 2. Check for conflicting virtualization software
# VirtualBox and VMware can conflict with KVM
lsmod | grep -E "(vbox|vmware)"

# 3. If using VirtualBox, enable nested virtualization or use software rendering
# For nested virtualization in VirtualBox:
# VBoxManage modifyvm "VM_NAME" --nested-hw-virt on

# 4. Check KVM module errors
sudo dmesg | grep -i "kvm\|vmx\|svm"

# 5. Reinstall KVM if necessary
sudo apt install --reinstall qemu-kvm libvirt-daemon-system
```

## Command-Line Tools

Android development includes powerful command-line tools for building, testing, and debugging applications.

### Essential Command-Line Tools

```bash
# ADB (Android Debug Bridge) - Device communication
adb devices              # List connected devices
adb shell               # Open shell on device
adb install app.apk     # Install APK
adb uninstall com.app   # Uninstall app
adb logcat              # View device logs
adb push local remote   # Copy file to device
adb pull remote local   # Copy file from device

# Emulator control
adb emu kill            # Kill emulator
adb reboot              # Reboot device

# AAPT2 (Android Asset Packaging Tool) - APK analysis
aapt2 dump badging app.apk    # Show APK information
aapt2 dump permissions app.apk # Show app permissions

# Apksigner - Sign APKs
apksigner sign --ks keystore.jks app.apk
apksigner verify app.apk

# Zipalign - Optimize APK alignment
zipalign -v 4 input.apk output.apk
```

### Using Gradle from Command Line

```bash
# Navigate to your project directory
cd ~/AndroidStudioProjects/MyApp

# Build debug APK
./gradlew assembleDebug

# Build release APK
./gradlew assembleRelease

# Build and install on connected device
./gradlew installDebug

# Run tests
./gradlew test                    # Unit tests
./gradlew connectedAndroidTest    # Instrumented tests

# Clean build
./gradlew clean

# View all available tasks
./gradlew tasks

# Build with verbose output
./gradlew assembleDebug --info

# Build with stack trace on error
./gradlew assembleDebug --stacktrace

# Parallel build for faster compilation
./gradlew assembleDebug --parallel

# Offline build (uses cached dependencies)
./gradlew assembleDebug --offline
```

### Useful SDK Manager Commands

```bash
# Update all installed packages
sdkmanager --update

# Install multiple packages at once
sdkmanager "platforms;android-34" "platforms;android-33" "build-tools;34.0.0"

# Uninstall a package
sdkmanager --uninstall "platforms;android-30"

# Show installed packages
sdkmanager --list_installed

# Install packages in a specific SDK location
sdkmanager --sdk_root=/custom/path "platforms;android-34"
```

## Creating Your First Project

Let's create a simple Android project to verify your installation is working correctly.

### Create Project via Android Studio

1. Open Android Studio
2. Click **New Project**
3. Select **Empty Activity** template
4. Configure your project:
   - **Name**: HelloAndroid
   - **Package name**: com.example.helloandroid
   - **Save location**: ~/AndroidStudioProjects/HelloAndroid
   - **Language**: Kotlin (recommended) or Java
   - **Minimum SDK**: API 24 (Android 7.0)
5. Click **Finish**

### Create Project via Command Line

```bash
# Create project directory
mkdir -p ~/AndroidStudioProjects/HelloAndroid
cd ~/AndroidStudioProjects/HelloAndroid

# Initialize with Gradle
# Create settings.gradle.kts
cat > settings.gradle.kts << 'EOF'
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "HelloAndroid"
include(":app")
EOF

# Create build.gradle.kts (project level)
cat > build.gradle.kts << 'EOF'
// Top-level build file where you can add configuration options common to all sub-projects/modules.
plugins {
    id("com.android.application") version "8.2.0" apply false
    id("org.jetbrains.kotlin.android") version "1.9.20" apply false
}
EOF

# Create app directory structure
mkdir -p app/src/main/java/com/example/helloandroid
mkdir -p app/src/main/res/layout
mkdir -p app/src/main/res/values

# Create app/build.gradle.kts
cat > app/build.gradle.kts << 'EOF'
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.example.helloandroid"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.example.helloandroid"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
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
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.11.0")
    implementation("androidx.activity:activity-ktx:1.8.2")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
}
EOF

# Create AndroidManifest.xml
cat > app/src/main/AndroidManifest.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.Material3.Light">
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>
EOF

# Create MainActivity.kt
cat > app/src/main/java/com/example/helloandroid/MainActivity.kt << 'EOF'
package com.example.helloandroid

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity

/**
 * Main entry point of the application.
 * This activity displays a simple "Hello Android" message.
 */
class MainActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
    }
}
EOF

# Create activity_main.xml layout
cat > app/src/main/res/layout/activity_main.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    xmlns:tools="http://schemas.android.com/tools"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    tools:context=".MainActivity">

    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Hello Android!"
        android:textSize="24sp"
        app:layout_constraintBottom_toBottomOf="parent"
        app:layout_constraintEnd_toEndOf="parent"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintTop_toTopOf="parent" />

</androidx.constraintlayout.widget.ConstraintLayout>
EOF

# Create strings.xml
cat > app/src/main/res/values/strings.xml << 'EOF'
<resources>
    <string name="app_name">Hello Android</string>
</resources>
EOF

# Create gradle.properties
cat > gradle.properties << 'EOF'
# Project-wide Gradle settings
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
kotlin.code.style=official
android.nonTransitiveRClass=true
EOF

echo "Project created successfully!"
```

## Building APKs

Learn how to build debug and release APKs for distribution.

### Build Debug APK

```bash
cd ~/AndroidStudioProjects/HelloAndroid

# Build debug APK
./gradlew assembleDebug

# The APK will be located at:
# app/build/outputs/apk/debug/app-debug.apk

# Install on connected device
./gradlew installDebug

# Or use adb directly
adb install app/build/outputs/apk/debug/app-debug.apk
```

### Build Release APK

```bash
# Generate a signing key (one-time setup)
# This creates a keystore for signing release builds
keytool -genkey -v \
    -keystore ~/android-keystore/release.jks \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -alias release-key \
    -storepass your_store_password \
    -keypass your_key_password \
    -dname "CN=Your Name, OU=Your Unit, O=Your Organization, L=City, S=State, C=US"

# Configure signing in app/build.gradle.kts
# Add this inside the android { } block:
cat >> app/build.gradle.kts << 'EOF'

android {
    signingConfigs {
        create("release") {
            storeFile = file(System.getProperty("user.home") + "/android-keystore/release.jks")
            storePassword = System.getenv("KEYSTORE_PASSWORD") ?: "your_store_password"
            keyAlias = "release-key"
            keyPassword = System.getenv("KEY_PASSWORD") ?: "your_key_password"
        }
    }
    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
}
EOF

# Build release APK
./gradlew assembleRelease

# The signed APK will be at:
# app/build/outputs/apk/release/app-release.apk

# Verify the APK is signed correctly
apksigner verify --verbose app/build/outputs/apk/release/app-release.apk
```

### Build App Bundle (AAB)

```bash
# Build Android App Bundle for Play Store distribution
./gradlew bundleRelease

# The AAB will be at:
# app/build/outputs/bundle/release/app-release.aab

# Convert AAB to APK for testing (requires bundletool)
# Download bundletool from: https://github.com/google/bundletool/releases
java -jar bundletool.jar build-apks \
    --bundle=app/build/outputs/bundle/release/app-release.aab \
    --output=app-release.apks \
    --ks=~/android-keystore/release.jks \
    --ks-pass=pass:your_store_password \
    --ks-key-alias=release-key \
    --key-pass=pass:your_key_password

# Install APKs on device
java -jar bundletool.jar install-apks --apks=app-release.apks
```

## Device Debugging (ADB)

Android Debug Bridge (ADB) is essential for debugging and testing on physical devices.

### Connect Physical Device

```bash
# 1. Enable Developer Options on your Android device:
#    Settings > About Phone > Tap "Build Number" 7 times

# 2. Enable USB Debugging:
#    Settings > Developer Options > USB Debugging

# 3. Connect device via USB and verify connection
adb devices
# Output should show your device with "device" status

# If device shows "unauthorized":
# - Check your phone for USB debugging authorization prompt
# - Accept the connection on your device

# List devices with more detail
adb devices -l
```

### Configure USB Rules (Required for most devices)

```bash
# Create udev rules for Android devices
# This allows non-root users to access Android devices

sudo cat > /etc/udev/rules.d/51-android.rules << 'EOF'
# Google
SUBSYSTEM=="usb", ATTR{idVendor}=="18d1", MODE="0666", GROUP="plugdev"
# Samsung
SUBSYSTEM=="usb", ATTR{idVendor}=="04e8", MODE="0666", GROUP="plugdev"
# Xiaomi
SUBSYSTEM=="usb", ATTR{idVendor}=="2717", MODE="0666", GROUP="plugdev"
# OnePlus
SUBSYSTEM=="usb", ATTR{idVendor}=="2a70", MODE="0666", GROUP="plugdev"
# Huawei
SUBSYSTEM=="usb", ATTR{idVendor}=="12d1", MODE="0666", GROUP="plugdev"
# Sony
SUBSYSTEM=="usb", ATTR{idVendor}=="054c", MODE="0666", GROUP="plugdev"
# LG
SUBSYSTEM=="usb", ATTR{idVendor}=="1004", MODE="0666", GROUP="plugdev"
# Motorola
SUBSYSTEM=="usb", ATTR{idVendor}=="22b8", MODE="0666", GROUP="plugdev"
# Generic Android
SUBSYSTEM=="usb", ATTR{idVendor}=="0bb4", MODE="0666", GROUP="plugdev"
EOF

# Set correct permissions
sudo chmod a+r /etc/udev/rules.d/51-android.rules

# Add user to plugdev group
sudo usermod -aG plugdev $USER

# Reload udev rules
sudo udevadm control --reload-rules
sudo udevadm trigger

# Restart ADB server
adb kill-server
adb start-server
adb devices
```

### Wireless Debugging

```bash
# Enable wireless debugging (Android 11+)
# 1. Connect device via USB first
# 2. Enable "Wireless debugging" in Developer Options

# Method 1: Pair using pairing code (Android 11+)
adb pair <device-ip>:<pairing-port>
# Enter the pairing code shown on device

# Connect after pairing
adb connect <device-ip>:<port>

# Method 2: Traditional wireless debugging
# Connect device via USB
adb tcpip 5555

# Disconnect USB cable
# Connect wirelessly
adb connect <device-ip>:5555

# Verify connection
adb devices

# Disconnect wireless device
adb disconnect <device-ip>:5555
```

### Useful ADB Debugging Commands

```bash
# View real-time logs
adb logcat

# Filter logs by tag
adb logcat -s "MyAppTag"

# Filter by priority (V, D, I, W, E, F)
adb logcat *:E  # Show only errors and fatal

# Clear log buffer
adb logcat -c

# Save logs to file
adb logcat -d > device_logs.txt

# View app-specific logs
adb logcat --pid=$(adb shell pidof -s com.example.helloandroid)

# Take screenshot
adb exec-out screencap -p > screenshot.png

# Record screen
adb shell screenrecord /sdcard/recording.mp4
# Press Ctrl+C to stop, then pull the file
adb pull /sdcard/recording.mp4

# Get device information
adb shell getprop ro.product.model
adb shell getprop ro.build.version.release
adb shell getprop ro.build.version.sdk

# Check battery status
adb shell dumpsys battery

# View running processes
adb shell ps -A | grep com.example

# Kill an app
adb shell am force-stop com.example.helloandroid

# Clear app data
adb shell pm clear com.example.helloandroid

# Start an activity
adb shell am start -n com.example.helloandroid/.MainActivity

# Send broadcast
adb shell am broadcast -a android.intent.action.BOOT_COMPLETED

# Input text
adb shell input text "Hello"

# Simulate key press
adb shell input keyevent KEYCODE_HOME
adb shell input keyevent KEYCODE_BACK
```

## Performance Optimization

Optimize Android Studio and your development environment for better performance.

### Increase Android Studio Memory

```bash
# Edit Android Studio VM options
# Location varies by installation method

# For Snap installation:
mkdir -p ~/.config/Google/AndroidStudio/
cat > ~/.config/Google/AndroidStudio/studio64.vmoptions << 'EOF'
# Custom VM options for Android Studio
# Increase maximum heap size to 4GB (adjust based on your RAM)
-Xmx4096m

# Set initial heap size
-Xms1024m

# Use G1 garbage collector for better performance
-XX:+UseG1GC

# Reduce GC pause times
-XX:MaxGCPauseMillis=200

# Enable string deduplication to save memory
-XX:+UseStringDeduplication

# Reserved code cache size
-XX:ReservedCodeCacheSize=512m

# Optimize compiler
-XX:+UseCompressedOops
-XX:+UseCompressedClassPointers

# File encoding
-Dfile.encoding=UTF-8
EOF

# For manual installation, edit:
# /opt/android-studio/bin/studio64.vmoptions
# or create: ~/.android-studio/studio64.vmoptions
```

### Optimize Gradle Build

```bash
# Edit ~/.gradle/gradle.properties for global settings
mkdir -p ~/.gradle
cat > ~/.gradle/gradle.properties << 'EOF'
# Enable Gradle daemon for faster builds
org.gradle.daemon=true

# Increase Gradle JVM memory
org.gradle.jvmargs=-Xmx4096m -XX:+UseG1GC -XX:+UseStringDeduplication

# Enable parallel execution
org.gradle.parallel=true

# Enable build caching
org.gradle.caching=true

# Enable configuration caching (Gradle 7.0+)
org.gradle.configuration-cache=true

# Use build cache
android.enableBuildCache=true

# Optimize Kotlin incremental compilation
kotlin.incremental=true
kotlin.incremental.java=true

# Enable non-transitive R classes
android.nonTransitiveRClass=true

# Reduce memory usage
android.enableJetifier=false
EOF
```

### Optimize Emulator Performance

```bash
# Use hardware acceleration (GPU)
emulator -avd Pixel_7_API_34 -gpu host

# Or use SwiftShader for software rendering (if GPU issues)
emulator -avd Pixel_7_API_34 -gpu swiftshader_indirect

# Reduce emulator RAM usage
emulator -avd Pixel_7_API_34 -memory 2048

# Disable unnecessary features
emulator -avd Pixel_7_API_34 \
    -no-boot-anim \    # Disable boot animation
    -no-audio \        # Disable audio
    -no-snapshot-save  # Don't save snapshot on exit

# Run headless emulator (for CI/testing)
emulator -avd Pixel_7_API_34 -no-window -no-audio
```

### Configure File Watchers and Indexing

```bash
# Increase inotify watchers limit
# Required when Android Studio shows "External file changes sync may be slow"

# Check current limit
cat /proc/sys/fs/inotify/max_user_watches

# Increase the limit temporarily
sudo sysctl fs.inotify.max_user_watches=524288

# Make the change permanent
echo "fs.inotify.max_user_watches=524288" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## Troubleshooting

Common issues and their solutions when working with Android Studio on Ubuntu.

### Android Studio Won't Start

```bash
# Check for error logs
cat ~/.cache/Google/AndroidStudio*/log/idea.log | tail -100

# Or for older versions:
cat ~/.AndroidStudio*/system/log/idea.log | tail -100

# Common fix: Delete corrupted caches
rm -rf ~/.cache/Google/AndroidStudio*
rm -rf ~/.local/share/Google/AndroidStudio*

# For Snap installation, reset completely:
snap remove android-studio
rm -rf ~/Android/Sdk  # Be careful, this deletes SDK
snap install android-studio --classic

# Fix broken desktop entry
gtk-update-icon-cache
update-desktop-database ~/.local/share/applications/
```

### SDK Manager Issues

```bash
# Fix "SDK location not found" error
# Ensure ANDROID_HOME is set correctly
echo $ANDROID_HOME

# Fix SDK manager permissions
sudo chown -R $USER:$USER ~/Android/Sdk

# Fix "Failed to find package" errors
# Clear SDK cache and retry
rm -rf ~/.android/cache
sdkmanager --update

# Fix license issues
yes | sdkmanager --licenses

# Use proxy if behind firewall
sdkmanager --no_https --proxy=http --proxy_host=<host> --proxy_port=<port> "platforms;android-34"
```

### Emulator Problems

```bash
# "HAXM is not installed" or "/dev/kvm not found"
# Install and configure KVM (see KVM section above)
sudo apt install qemu-kvm
sudo adduser $USER kvm
sudo chmod 666 /dev/kvm

# Emulator crashes on startup
# Check for GPU issues
emulator -avd <avd-name> -gpu swiftshader_indirect

# "Emulator: emulator: ERROR: x86 emulation currently requires hardware acceleration"
# Enable VT-x/AMD-V in BIOS settings

# Emulator is extremely slow
# Ensure KVM is working
egrep -c '(vmx|svm)' /proc/cpuinfo  # Should return > 0
kvm-ok                               # Should say KVM can be used

# Wipe emulator data if corrupted
emulator -avd <avd-name> -wipe-data

# Delete and recreate AVD
avdmanager delete avd -n <avd-name>
avdmanager create avd -n <avd-name> -k "system-images;android-34;google_apis;x86_64"
```

### Gradle Build Failures

```bash
# Clear Gradle cache
rm -rf ~/.gradle/caches
rm -rf ~/.gradle/daemon
rm -rf .gradle  # In project directory

# Force Gradle to re-download dependencies
./gradlew build --refresh-dependencies

# Fix "Could not determine Java version" error
# Ensure JAVA_HOME is set correctly
echo $JAVA_HOME
java -version

# Fix out of memory errors
# Edit gradle.properties
echo "org.gradle.jvmargs=-Xmx4096m" >> gradle.properties

# Clean and rebuild
./gradlew clean
./gradlew build --stacktrace

# Fix corrupted .gradle directory
rm -rf ~/.gradle/wrapper/dists
./gradlew wrapper
```

### ADB Connection Issues

```bash
# Device not recognized
# Kill and restart ADB server
adb kill-server
adb start-server

# Check USB connection
lsusb | grep -i android

# Fix unauthorized device
# Revoke USB debugging authorizations on device
# Settings > Developer Options > Revoke USB debugging authorizations
# Then reconnect and accept the prompt

# Fix permission denied
# Install proper udev rules (see Device Debugging section)
sudo udevadm control --reload-rules
sudo udevadm trigger

# Multiple devices conflict
adb -s <device-serial> <command>

# Device offline
adb devices  # Check status
adb reconnect offline
```

### Display and Rendering Issues

```bash
# Fix blank/black screen in Android Studio
# Add this to studio64.vmoptions:
echo "-Dsun.java2d.opengl=true" >> ~/.config/Google/AndroidStudio/studio64.vmoptions

# Or try software rendering:
echo "-Dsun.java2d.opengl=false" >> ~/.config/Google/AndroidStudio/studio64.vmoptions

# Fix UI scaling issues on HiDPI displays
# Edit studio64.vmoptions:
echo "-Dsun.java2d.uiScale=2.0" >> ~/.config/Google/AndroidStudio/studio64.vmoptions

# Fix Wayland-related issues
# Force X11 instead of Wayland
export GDK_BACKEND=x11
android-studio
```

## Keeping Android Studio Updated

```bash
# Update via Snap (automatic updates enabled by default)
sudo snap refresh android-studio

# Check for updates manually
snap info android-studio

# For manual installation, download new version and replace
# Backup your settings first:
cp -r ~/.config/Google/AndroidStudio* ~/backup/

# Update SDK components
sdkmanager --update

# Update Gradle wrapper in projects
./gradlew wrapper --gradle-version=8.5
```

## Summary

You now have a fully configured Android development environment on Ubuntu. Here's a quick reference of the key components:

| Component | Purpose | Command/Location |
|-----------|---------|------------------|
| Android Studio | IDE | `android-studio` or via launcher |
| Android SDK | Development kit | `~/Android/Sdk` |
| ADB | Device debugging | `adb` |
| Emulator | Virtual devices | `emulator -avd <name>` |
| Gradle | Build system | `./gradlew` |
| SDK Manager | Package management | `sdkmanager` |
| AVD Manager | Virtual device management | `avdmanager` |

With these tools properly configured, you're ready to develop, test, and deploy Android applications on Ubuntu.

---

**Monitor Your Android Applications with OneUptime**

Once your Android app is deployed to production, monitoring its performance and availability becomes crucial. [OneUptime](https://oneuptime.com) provides comprehensive monitoring solutions for mobile applications:

- **API Monitoring**: Monitor the backend APIs your Android app depends on with real-time uptime checks and performance metrics
- **Error Tracking**: Capture and analyze crashes and errors from your Android application in production
- **Performance Monitoring**: Track response times, latency, and throughput of your app's network requests
- **Alerting**: Get instant notifications via email, SMS, Slack, or PagerDuty when issues affect your users
- **Status Pages**: Keep your users informed about service status with customizable public status pages
- **Incident Management**: Coordinate incident response with built-in on-call scheduling and escalation policies

With OneUptime monitoring your Android application infrastructure, you can ensure a reliable experience for your users and respond quickly when issues arise. Visit [oneuptime.com](https://oneuptime.com) to get started with free monitoring for your Android projects.
