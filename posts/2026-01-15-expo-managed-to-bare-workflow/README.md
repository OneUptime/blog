# How to Migrate from Expo Managed Workflow to Bare Workflow

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, Expo, Migration, Bare Workflow, Mobile Development, iOS, Android

Description: A step-by-step guide to migrating your Expo managed workflow project to bare workflow for more native control and customization.

---

## Introduction

Expo has revolutionized React Native development by providing a managed workflow that abstracts away native code complexity. However, as your application grows, you may encounter scenarios where you need direct access to native iOS and Android code. This is where migrating from Expo's managed workflow to the bare workflow becomes necessary.

In this comprehensive guide, we will walk through the entire migration process, from understanding when migration is appropriate to handling post-migration configurations and troubleshooting common issues.

## Understanding Managed vs Bare Workflow

### Managed Workflow

The managed workflow is Expo's default approach where:

- All native code is hidden and managed by Expo
- You write only JavaScript/TypeScript code
- Building is handled through Expo's build service (EAS Build)
- Limited to Expo SDK modules and compatible third-party libraries
- Over-the-air updates are seamlessly integrated
- No Xcode or Android Studio required for basic development

```javascript
// Example: A typical managed workflow app.json
{
  "expo": {
    "name": "MyApp",
    "slug": "my-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.example.myapp"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FFFFFF"
      },
      "package": "com.example.myapp"
    }
  }
}
```

### Bare Workflow

The bare workflow provides:

- Full access to native iOS and Android project files
- Ability to add any native module or library
- Direct modification of native configurations
- Complete control over the build process
- Integration with native SDKs and services
- Requires Xcode for iOS and Android Studio for Android development

```plaintext
# Bare workflow project structure
my-app/
├── android/                 # Native Android project
│   ├── app/
│   │   ├── src/
│   │   └── build.gradle
│   ├── build.gradle
│   └── settings.gradle
├── ios/                     # Native iOS project
│   ├── MyApp/
│   │   ├── AppDelegate.m
│   │   └── Info.plist
│   ├── MyApp.xcodeproj/
│   └── Podfile
├── src/                     # Your JavaScript/TypeScript code
├── app.json
├── package.json
└── index.js
```

## When to Migrate to Bare Workflow

Consider migrating when you need:

### 1. Native Module Integration

```javascript
// Some native modules require bare workflow
// Example: react-native-firebase with custom configurations
import { firebase } from '@react-native-firebase/app';
import analytics from '@react-native-firebase/analytics';

// Custom native module that requires linking
import { NativeModules } from 'react-native';
const { CustomNativeModule } = NativeModules;
```

### 2. Custom Native Code

When you need to write platform-specific native code:

```objectivec
// iOS - Custom native module (Objective-C)
// MyCustomModule.m
#import <React/RCTBridgeModule.h>

@interface MyCustomModule : NSObject <RCTBridgeModule>
@end

@implementation MyCustomModule

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(doSomethingNative:(NSString *)param
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    // Native implementation
    resolve(@"Success");
}

@end
```

```java
// Android - Custom native module (Java)
// MyCustomModule.java
package com.myapp;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

public class MyCustomModule extends ReactContextBaseJavaModule {
    public MyCustomModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "MyCustomModule";
    }

    @ReactMethod
    public void doSomethingNative(String param, Promise promise) {
        // Native implementation
        promise.resolve("Success");
    }
}
```

### 3. Advanced Build Configurations

- Custom build flavors or schemes
- ProGuard rules modifications
- Custom entitlements for iOS
- Specific SDK version requirements

### 4. Third-Party SDK Requirements

Some SDKs require native integration:

- Push notification services with custom handling
- Analytics platforms with native tracking
- Payment processors with native security requirements
- AR/VR frameworks

## Pre-Migration Checklist

Before starting the migration, ensure you complete this checklist:

### 1. Backup Your Project

```bash
# Create a complete backup
cp -r my-expo-app my-expo-app-backup

# Or create a git branch
git checkout -b pre-migration-backup
git add .
git commit -m "Backup before bare workflow migration"
git checkout main
```

### 2. Update Dependencies

```bash
# Update Expo SDK to the latest version
npx expo install expo@latest

# Update all Expo-related packages
npx expo install --fix
```

### 3. Audit Your Dependencies

```bash
# Check for incompatible packages
npx expo-doctor

# Review your package.json for native module requirements
cat package.json | grep -E "(react-native-|@react-native)"
```

### 4. Document Current Configurations

Create a document listing:

```markdown
## Current App Configuration

### Environment Variables
- API_URL: https://api.example.com
- ANALYTICS_KEY: xxx

### Expo Config Plugins
- expo-notifications
- expo-camera
- expo-location

### Third-Party Services
- Push notifications: Expo Push
- Analytics: Expo Analytics
- Error tracking: Sentry (Expo integration)

### Build Settings
- iOS minimum version: 13.0
- Android minimum SDK: 21
- Target SDK: 34
```

### 5. Verify Development Environment

```bash
# Check Node.js version (recommended: 18.x or higher)
node --version

# Check npm/yarn version
npm --version

# Verify Xcode installation (macOS only)
xcodebuild -version

# Verify Android SDK
echo $ANDROID_HOME
```

## Running Expo Prebuild

The `expo prebuild` command generates native iOS and Android project files from your managed project.

### Basic Prebuild

```bash
# Navigate to your project directory
cd my-expo-app

# Run prebuild to generate native projects
npx expo prebuild
```

### Prebuild Options

```bash
# Clean prebuild - removes existing native directories first
npx expo prebuild --clean

# Platform-specific prebuild
npx expo prebuild --platform ios
npx expo prebuild --platform android

# Skip dependency installation
npx expo prebuild --no-install

# Use a specific template
npx expo prebuild --template expo-template-bare-minimum
```

### What Prebuild Does

1. **Generates Native Directories**
   - Creates `ios/` directory with Xcode project
   - Creates `android/` directory with Android Studio project

2. **Applies Configuration**
   - Converts `app.json`/`app.config.js` to native configurations
   - Sets up bundle identifiers and package names
   - Configures icons, splash screens, and permissions

3. **Runs Config Plugins**
   - Executes all Expo config plugins
   - Applies native modifications defined by plugins

```javascript
// Example app.config.js with plugins
export default {
  expo: {
    name: "MyApp",
    slug: "my-app",
    plugins: [
      "expo-camera",
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png",
          color: "#ffffff",
          sounds: ["./assets/notification-sound.wav"],
        },
      ],
      [
        "expo-build-properties",
        {
          ios: {
            deploymentTarget: "13.0",
          },
          android: {
            minSdkVersion: 21,
            compileSdkVersion: 34,
            targetSdkVersion: 34,
          },
        },
      ],
    ],
  },
};
```

## Understanding the Ejected Structure

After running `expo prebuild`, your project structure transforms significantly.

### iOS Directory Structure

```plaintext
ios/
├── MyApp/
│   ├── AppDelegate.h
│   ├── AppDelegate.mm
│   ├── Images.xcassets/
│   │   ├── AppIcon.appiconset/
│   │   └── SplashScreen.imageset/
│   ├── Info.plist
│   ├── LaunchScreen.storyboard
│   ├── MyApp-Bridging-Header.h
│   ├── MyApp.entitlements
│   ├── SplashScreen.storyboard
│   ├── Supporting/
│   │   └── Expo.plist
│   └── main.m
├── MyApp.xcodeproj/
│   ├── project.pbxproj
│   └── xcshareddata/
├── MyApp.xcworkspace/
│   └── contents.xcworkspacedata
├── Podfile
├── Podfile.lock
└── Pods/
```

### Key iOS Files

```objectivec
// AppDelegate.mm - Main application delegate
#import "AppDelegate.h"
#import <React/RCTBundleURLProvider.h>
#import <React/RCTLinkingManager.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application
    didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"main";
  self.initialProps = @{};
  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self bundleURL];
}

- (NSURL *)bundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

@end
```

### Android Directory Structure

```plaintext
android/
├── app/
│   ├── build.gradle
│   ├── proguard-rules.pro
│   └── src/
│       ├── debug/
│       │   └── java/com/myapp/ReactNativeFlipper.java
│       ├── main/
│       │   ├── AndroidManifest.xml
│       │   ├── java/com/myapp/
│       │   │   ├── MainActivity.java
│       │   │   └── MainApplication.java
│       │   └── res/
│       │       ├── drawable/
│       │       ├── mipmap-*/
│       │       └── values/
│       └── release/
│           └── java/com/myapp/ReactNativeFlipper.java
├── build.gradle
├── gradle/
│   └── wrapper/
├── gradle.properties
├── gradlew
├── gradlew.bat
└── settings.gradle
```

### Key Android Files

```java
// MainApplication.java - Main application class
package com.myapp;

import android.app.Application;
import android.content.res.Configuration;
import androidx.annotation.NonNull;

import com.facebook.react.PackageList;
import com.facebook.react.ReactApplication;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint;
import com.facebook.react.defaults.DefaultReactNativeHost;
import com.facebook.soloader.SoLoader;

import expo.modules.ApplicationLifecycleDispatcher;
import expo.modules.ReactNativeHostWrapper;

import java.util.List;

public class MainApplication extends Application implements ReactApplication {
  private final ReactNativeHost mReactNativeHost = new ReactNativeHostWrapper(
    this,
    new DefaultReactNativeHost(this) {
      @Override
      public boolean getUseDeveloperSupport() {
        return BuildConfig.DEBUG;
      }

      @Override
      protected List<ReactPackage> getPackages() {
        @SuppressWarnings("UnnecessaryLocalVariable")
        List<ReactPackage> packages = new PackageList(this).getPackages();
        return packages;
      }

      @Override
      protected String getJSMainModuleName() {
        return "index";
      }

      @Override
      protected boolean isNewArchEnabled() {
        return BuildConfig.IS_NEW_ARCHITECTURE_ENABLED;
      }

      @Override
      protected Boolean isHermesEnabled() {
        return BuildConfig.IS_HERMES_ENABLED;
      }
  });

  @Override
  public ReactNativeHost getReactNativeHost() {
    return mReactNativeHost;
  }

  @Override
  public void onCreate() {
    super.onCreate();
    SoLoader.init(this, false);
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      DefaultNewArchitectureEntryPoint.load();
    }
    ApplicationLifecycleDispatcher.onApplicationCreate(this);
  }

  @Override
  public void onConfigurationChanged(@NonNull Configuration newConfig) {
    super.onConfigurationChanged(newConfig);
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig);
  }
}
```

## Updating Native Configurations

After prebuild, you will need to customize native configurations for your specific requirements.

### iOS Configuration Updates

#### Info.plist Modifications

```xml
<!-- ios/MyApp/Info.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- App Transport Security for development -->
    <key>NSAppTransportSecurity</key>
    <dict>
        <key>NSAllowsArbitraryLoads</key>
        <true/>
        <key>NSExceptionDomains</key>
        <dict>
            <key>localhost</key>
            <dict>
                <key>NSExceptionAllowsInsecureHTTPLoads</key>
                <true/>
            </dict>
        </dict>
    </dict>

    <!-- Permission descriptions -->
    <key>NSCameraUsageDescription</key>
    <string>This app requires camera access to take photos.</string>
    <key>NSPhotoLibraryUsageDescription</key>
    <string>This app requires photo library access to select images.</string>
    <key>NSLocationWhenInUseUsageDescription</key>
    <string>This app requires location access to show nearby places.</string>
    <key>NSMicrophoneUsageDescription</key>
    <string>This app requires microphone access for audio recording.</string>

    <!-- URL Schemes -->
    <key>CFBundleURLTypes</key>
    <array>
        <dict>
            <key>CFBundleURLSchemes</key>
            <array>
                <string>myapp</string>
            </array>
        </dict>
    </array>

    <!-- Background modes -->
    <key>UIBackgroundModes</key>
    <array>
        <string>fetch</string>
        <string>remote-notification</string>
    </array>
</dict>
</plist>
```

#### Podfile Configuration

```ruby
# ios/Podfile
require File.join(File.dirname(`node --print "require.resolve('expo/package.json')"`), "scripts/autolinking")
require File.join(File.dirname(`node --print "require.resolve('react-native/package.json')"`), "scripts/react_native_pods")

require 'json'
podfile_properties = JSON.parse(File.read(File.join(__dir__, 'Podfile.properties.json'))) rescue {}

ENV['RCT_NEW_ARCH_ENABLED'] = podfile_properties['newArchEnabled'] == 'true' ? '1' : '0'
ENV['EX_DEV_CLIENT_NETWORK_INSPECTOR'] = podfile_properties['EX_DEV_CLIENT_NETWORK_INSPECTOR']

platform :ios, podfile_properties['ios.deploymentTarget'] || '13.4'
install! 'cocoapods',
  :deterministic_uuids => false

prepare_react_native_project!

target 'MyApp' do
  use_expo_modules!
  config = use_native_modules!

  use_frameworks! :linkage => podfile_properties['ios.useFrameworks'].to_sym if podfile_properties['ios.useFrameworks']
  use_frameworks! :linkage => ENV['USE_FRAMEWORKS'].to_sym if ENV['USE_FRAMEWORKS']

  use_react_native!(
    :path => config[:reactNativePath],
    :hermes_enabled => podfile_properties['expo.jsEngine'] == nil || podfile_properties['expo.jsEngine'] == 'hermes',
    :app_path => "#{Pod::Config.instance.installation_root}/..",
    :privacy_file_aggregation_enabled => podfile_properties['apple.privacyManifestAggregationEnabled'] != 'false',
  )

  # Add custom pods here
  # pod 'Firebase/Analytics'
  # pod 'Firebase/Crashlytics'

  post_install do |installer|
    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false,
      :ccache_enabled => podfile_properties['apple.ccacheEnabled'] == 'true',
    )

    # Custom post-install configurations
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.4'
      end
    end
  end
end
```

### Android Configuration Updates

#### AndroidManifest.xml

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- Permissions -->
    <uses-permission android:name="android.permission.INTERNET"/>
    <uses-permission android:name="android.permission.CAMERA"/>
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
    <uses-permission android:name="android.permission.RECORD_AUDIO"/>
    <uses-permission android:name="android.permission.VIBRATE"/>
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>

    <!-- For push notifications -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>

    <application
        android:name=".MainApplication"
        android:label="@string/app_name"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:allowBackup="true"
        android:theme="@style/AppTheme"
        android:supportsRtl="true"
        android:networkSecurityConfig="@xml/network_security_config">

        <activity
            android:name=".MainActivity"
            android:configChanges="keyboard|keyboardHidden|orientation|screenLayout|screenSize|smallestScreenSize|uiMode"
            android:launchMode="singleTask"
            android:windowSoftInputMode="adjustResize"
            android:theme="@style/Theme.App.SplashScreen"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>

            <!-- Deep linking -->
            <intent-filter>
                <action android:name="android.intent.action.VIEW"/>
                <category android:name="android.intent.category.DEFAULT"/>
                <category android:name="android.intent.category.BROWSABLE"/>
                <data android:scheme="myapp"/>
            </intent-filter>
        </activity>
    </application>
</manifest>
```

#### build.gradle (App Level)

```groovy
// android/app/build.gradle
apply plugin: "com.android.application"
apply plugin: "org.jetbrains.kotlin.android"
apply plugin: "com.facebook.react"

def projectRoot = rootDir.getAbsoluteFile().getParentFile().getAbsolutePath()

react {
    entryFile = file(["node", "-e", "require('expo/scripts/resolveAppEntry')", projectRoot, "android", "absolute"].execute(null, rootDir).text.trim())
    reactNativeDir = new File(["node", "--print", "require.resolve('react-native/package.json')"].execute(null, rootDir).text.trim()).getParentFile().getAbsoluteFile()
    hermesCommand = new File(["node", "--print", "require.resolve('react-native/package.json')"].execute(null, rootDir).text.trim()).getParentFile().getAbsolutePath() + "/sdks/hermesc/%OS-BIN%/hermesc"
    codegenDir = new File(["node", "--print", "require.resolve('@react-native/codegen/package.json', { paths: [require.resolve('react-native/package.json')] })"].execute(null, rootDir).text.trim()).getParentFile().getAbsoluteFile()

    // Use Expo CLI to bundle the app, this ensures the Metro config
    // works correctly with Expo projects.
    cliFile = new File(["node", "--print", "require.resolve('@expo/cli', { paths: [require.resolve('expo/package.json')] })"].execute(null, rootDir).text.trim())
    bundleCommand = "export:embed"
}

android {
    ndkVersion rootProject.ext.ndkVersion
    buildToolsVersion rootProject.ext.buildToolsVersion
    compileSdk rootProject.ext.compileSdkVersion

    namespace 'com.myapp'
    defaultConfig {
        applicationId 'com.myapp'
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1
        versionName "1.0.0"
    }

    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (project.hasProperty('MYAPP_RELEASE_STORE_FILE')) {
                storeFile file(MYAPP_RELEASE_STORE_FILE)
                storePassword MYAPP_RELEASE_STORE_PASSWORD
                keyAlias MYAPP_RELEASE_KEY_ALIAS
                keyPassword MYAPP_RELEASE_KEY_PASSWORD
            }
        }
    }

    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
            shrinkResources true
        }
    }

    packagingOptions {
        pickFirst "lib/x86/libc++_shared.so"
        pickFirst "lib/x86_64/libc++_shared.so"
        pickFirst "lib/armeabi-v7a/libc++_shared.so"
        pickFirst "lib/arm64-v8a/libc++_shared.so"
    }
}

dependencies {
    implementation("com.facebook.react:react-android")
    implementation("com.facebook.react:flipper-integration")

    if (hermesEnabled.toBoolean()) {
        implementation("com.facebook.react:hermes-android")
    } else {
        implementation jscFlavor
    }
}
```

## Handling Expo Modules After Migration

Most Expo modules continue to work in the bare workflow. Here is how to manage them properly.

### Continuing to Use Expo Modules

```javascript
// You can still use Expo modules after migration
import * as Camera from 'expo-camera';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

// Example usage remains the same
const takePicture = async () => {
  const { status } = await Camera.requestCameraPermissionsAsync();
  if (status === 'granted') {
    // Camera is ready to use
  }
};
```

### expo-dev-client for Development

```bash
# Install expo-dev-client for development builds
npx expo install expo-dev-client

# Create a development build
npx expo run:ios
npx expo run:android

# Or use EAS Build for development
eas build --profile development --platform ios
eas build --profile development --platform android
```

### Configuring EAS Build for Bare Workflow

```json
// eas.json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "buildConfiguration": "Debug"
      },
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "buildConfiguration": "Release"
      },
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "ios": {
        "buildConfiguration": "Release"
      },
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

## Managing Native Dependencies

### Installing Native Libraries

```bash
# For libraries with auto-linking support
npm install react-native-maps
cd ios && pod install && cd ..

# For libraries requiring manual linking (rare in modern RN)
npx react-native link react-native-some-library
```

### Manual Linking Example

Sometimes you need to manually link libraries. Here is an example:

```java
// android/app/src/main/java/com/myapp/MainApplication.java
import com.somethirdparty.SomePackage; // Add import

public class MainApplication extends Application implements ReactApplication {
    @Override
    protected List<ReactPackage> getPackages() {
        @SuppressWarnings("UnnecessaryLocalVariable")
        List<ReactPackage> packages = new PackageList(this).getPackages();
        packages.add(new SomePackage()); // Add package
        return packages;
    }
}
```

### Handling Native Module Conflicts

```groovy
// android/app/build.gradle - Resolving version conflicts
configurations.all {
    resolutionStrategy {
        force 'com.google.android.gms:play-services-base:18.2.0'
        force 'com.google.android.gms:play-services-maps:18.2.0'
    }
}
```

## iOS Specific Configuration

### Xcode Project Settings

Open your project in Xcode and configure:

1. **Signing & Capabilities**
   - Select your development team
   - Configure bundle identifier
   - Add capabilities (Push Notifications, Background Modes, etc.)

2. **Build Settings**
   ```
   PRODUCT_BUNDLE_IDENTIFIER = com.yourcompany.yourapp
   DEVELOPMENT_TEAM = YOUR_TEAM_ID
   CODE_SIGN_STYLE = Automatic
   ```

### Adding iOS-Specific Native Code

```objectivec
// ios/MyApp/MyCustomBridge.m
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface MyCustomBridge : RCTEventEmitter <RCTBridgeModule>
@end

@implementation MyCustomBridge

RCT_EXPORT_MODULE();

- (NSArray<NSString *> *)supportedEvents {
    return @[@"onCustomEvent"];
}

RCT_EXPORT_METHOD(triggerNativeFeature:(NSString *)param
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        // Your native iOS code here
        NSDictionary *result = @{
            @"success": @YES,
            @"message": @"Feature triggered successfully"
        };
        resolve(result);
    } @catch (NSException *exception) {
        reject(@"error", exception.reason, nil);
    }
}

@end
```

### CocoaPods Management

```bash
# Navigate to iOS directory
cd ios

# Install pods
pod install

# Update pods
pod update

# Clean and reinstall
pod deintegrate
pod install

# If you encounter issues
rm -rf Pods Podfile.lock
pod install --repo-update
```

## Android Specific Configuration

### Gradle Configuration

```groovy
// android/build.gradle (Project Level)
buildscript {
    ext {
        buildToolsVersion = "34.0.0"
        minSdkVersion = 23
        compileSdkVersion = 34
        targetSdkVersion = 34
        ndkVersion = "25.1.8937393"
        kotlinVersion = "1.9.22"
    }
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath("com.android.tools.build:gradle")
        classpath("com.facebook.react:react-native-gradle-plugin")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin")
        // Add other plugins as needed
        // classpath 'com.google.gms:google-services:4.4.0'
        // classpath 'com.google.firebase:firebase-crashlytics-gradle:2.9.9'
    }
}
```

### Adding Android-Specific Native Code

```java
// android/app/src/main/java/com/myapp/MyCustomModule.java
package com.myapp;

import androidx.annotation.NonNull;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

public class MyCustomModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;

    public MyCustomModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    @NonNull
    public String getName() {
        return "MyCustomModule";
    }

    @ReactMethod
    public void triggerNativeFeature(String param, Promise promise) {
        try {
            // Your native Android code here
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putString("message", "Feature triggered successfully");
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("error", e.getMessage());
        }
    }
}
```

```java
// android/app/src/main/java/com/myapp/MyCustomPackage.java
package com.myapp;

import androidx.annotation.NonNull;
import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class MyCustomPackage implements ReactPackage {
    @NonNull
    @Override
    public List<NativeModule> createNativeModules(@NonNull ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new MyCustomModule(reactContext));
        return modules;
    }

    @NonNull
    @Override
    public List<ViewManager> createViewManagers(@NonNull ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }
}
```

### ProGuard Rules for Release Builds

```proguard
# android/app/proguard-rules.pro

# React Native
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.react.** { *; }

# Expo
-keep class expo.modules.** { *; }

# Keep custom native modules
-keep class com.myapp.** { *; }

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
-keepnames class okhttp3.internal.publicsuffix.PublicSuffixDatabase

# Retrofit (if used)
-keepattributes Signature
-keepattributes Exceptions
-keepclassmembers,allowshrinking,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}

# Glide (if used for images)
-keep public class * implements com.bumptech.glide.module.GlideModule
-keep class * extends com.bumptech.glide.module.AppGlideModule {
    <init>(...);
}
```

## Testing After Migration

### Running Development Builds

```bash
# iOS development build
npx expo run:ios

# Android development build
npx expo run:android

# With specific device/simulator
npx expo run:ios --device "iPhone 15 Pro"
npx expo run:android --device "Pixel_6_API_34"
```

### Running Tests

```bash
# Run Jest tests
npm test

# Run with coverage
npm test -- --coverage

# Run e2e tests (if configured with Detox)
detox build --configuration ios.sim.debug
detox test --configuration ios.sim.debug
```

### Build Verification

```bash
# iOS release build verification
cd ios
xcodebuild -workspace MyApp.xcworkspace \
  -scheme MyApp \
  -configuration Release \
  -sdk iphoneos \
  archive -archivePath build/MyApp.xcarchive

# Android release build verification
cd android
./gradlew assembleRelease

# Or for app bundle
./gradlew bundleRelease
```

### Testing Checklist

```markdown
## Post-Migration Testing Checklist

### Core Functionality
- [ ] App launches without crashes
- [ ] Navigation works correctly
- [ ] All screens render properly
- [ ] Data fetching and API calls work
- [ ] State management functions correctly

### Native Features
- [ ] Camera functionality works
- [ ] Location services work
- [ ] Push notifications are received
- [ ] Deep linking works
- [ ] Background tasks execute

### Platform-Specific
#### iOS
- [ ] App works on physical device
- [ ] App works on simulator
- [ ] Face ID/Touch ID works (if applicable)
- [ ] Apple Pay works (if applicable)

#### Android
- [ ] App works on physical device
- [ ] App works on emulator
- [ ] Fingerprint authentication works (if applicable)
- [ ] Google Pay works (if applicable)

### Performance
- [ ] App startup time is acceptable
- [ ] Scrolling is smooth
- [ ] Animations are fluid
- [ ] Memory usage is reasonable

### Release Builds
- [ ] iOS Archive builds successfully
- [ ] Android Release APK builds successfully
- [ ] Android App Bundle builds successfully
```

## Common Issues and Solutions

### Issue 1: Pod Install Fails

```bash
# Error: CocoaPods could not find compatible versions
# Solution: Update CocoaPods and clear cache
sudo gem install cocoapods
cd ios
pod cache clean --all
rm -rf Pods Podfile.lock
pod install --repo-update
```

### Issue 2: Android Build Fails with SDK Version Mismatch

```groovy
// Solution: Align SDK versions in android/build.gradle
ext {
    buildToolsVersion = "34.0.0"
    minSdkVersion = 23
    compileSdkVersion = 34
    targetSdkVersion = 34
}
```

### Issue 3: Metro Bundler Connection Issues

```bash
# Error: Could not connect to development server
# Solution: Clear Metro cache and restart
npx expo start --clear

# Or manually clear
rm -rf node_modules/.cache
watchman watch-del-all
npm start -- --reset-cache
```

### Issue 4: Native Module Not Found

```javascript
// Error: Native module 'SomeModule' not found
// Solution: Ensure auto-linking is working

// 1. Reinstall dependencies
rm -rf node_modules
npm install

// 2. For iOS, reinstall pods
cd ios && pod install

// 3. For Android, clean and rebuild
cd android && ./gradlew clean
```

### Issue 5: iOS Signing Issues

```bash
# Error: Code signing error
# Solution: Reset signing in Xcode
# 1. Open ios/MyApp.xcworkspace in Xcode
# 2. Select project in navigator
# 3. Go to Signing & Capabilities
# 4. Select your team
# 5. Ensure "Automatically manage signing" is checked
```

### Issue 6: Android Manifest Merge Conflicts

```xml
<!-- Error: Manifest merger failed -->
<!-- Solution: Add tools namespace and resolve conflicts -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">

    <application
        tools:replace="android:allowBackup,android:theme">
        <!-- ... -->
    </application>
</manifest>
```

### Issue 7: Expo Modules Not Working

```bash
# Error: expo-* module not working after migration
# Solution: Ensure expo modules are properly linked

# 1. Check expo-modules-autolinking
npx expo-modules-autolinking resolve

# 2. Verify expo modules in package.json
cat package.json | grep expo

# 3. Rebuild native projects
npx expo prebuild --clean
```

### Issue 8: JavaScript Bundle Not Loading

```javascript
// Error: No bundle URL present
// Solution: Check Metro configuration

// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure proper source extensions
config.resolver.sourceExts = ['jsx', 'js', 'ts', 'tsx', 'json'];

module.exports = config;
```

### Issue 9: Hermes Engine Issues

```groovy
// Error: Hermes-related crashes
// Solution: Toggle Hermes in gradle.properties

// android/gradle.properties
hermesEnabled=true
// or disable if causing issues
// hermesEnabled=false
```

```ruby
# iOS: Check Podfile.properties.json
# ios/Podfile.properties.json
{
  "expo.jsEngine": "hermes"
}
```

### Issue 10: EAS Build Failures

```json
// Error: EAS Build fails
// Solution: Check eas.json configuration and credentials

// eas.json
{
  "build": {
    "production": {
      "ios": {
        "credentialsSource": "local",
        "buildConfiguration": "Release"
      },
      "android": {
        "credentialsSource": "local",
        "buildType": "app-bundle"
      }
    }
  }
}
```

```bash
# Clear EAS cache and rebuild
eas build:configure
eas credentials
eas build --platform all --clear-cache
```

## Conclusion

Migrating from Expo's managed workflow to bare workflow is a significant step that unlocks the full potential of React Native development. While the process requires careful planning and execution, the benefits of having full native code access far outweigh the initial setup complexity.

Key takeaways from this guide:

1. **Plan Before Migrating**: Understand your requirements and ensure bare workflow is necessary for your use case.

2. **Use Expo Prebuild**: The `expo prebuild` command automates much of the migration process and maintains compatibility with Expo modules.

3. **Maintain Both Worlds**: You can continue using Expo modules and EAS Build even in a bare workflow project.

4. **Test Thoroughly**: After migration, comprehensive testing across both platforms is essential.

5. **Keep Documentation Updated**: Maintain documentation of your native configurations for team reference.

Remember that the bare workflow requires more maintenance than managed workflow, including keeping native dependencies updated and handling platform-specific issues. However, this trade-off provides the flexibility needed for advanced mobile applications.

If you encounter issues not covered in this guide, the Expo documentation, React Native documentation, and community forums are excellent resources for troubleshooting specific scenarios.

Happy coding, and welcome to the bare workflow!
