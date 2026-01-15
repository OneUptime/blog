# How to Automate React Native Builds with Fastlane

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, Fastlane, Automation, iOS, Android, Build Automation, DevOps

Description: Learn how to automate React Native build and deployment processes using Fastlane for iOS and Android.

---

Building and deploying React Native applications manually can be tedious, error-prone, and time-consuming. Between managing code signing certificates, incrementing version numbers, building release binaries, and uploading to app stores, the process involves dozens of steps that are ripe for automation. This is where Fastlane comes in.

In this comprehensive guide, we will walk through setting up Fastlane for your React Native project, configuring lanes for both iOS and Android, implementing automatic versioning, managing code signing, and integrating with CI/CD pipelines.

## Introduction to Fastlane

Fastlane is an open-source platform that simplifies Android and iOS deployment. It handles tedious tasks like generating screenshots, dealing with code signing, and releasing your application. With Fastlane, you can define your deployment process in Ruby scripts called "lanes" that automate every step of the build and release process.

### Why Use Fastlane?

- **Consistency**: Every build follows the exact same process, eliminating human error
- **Speed**: Automate repetitive tasks that would take hours manually
- **Documentation**: Your build process is documented in code
- **Team Collaboration**: Everyone uses the same deployment process
- **CI/CD Integration**: Seamlessly integrates with popular CI/CD platforms

### Core Fastlane Tools

Fastlane provides several tools out of the box:

- **deliver**: Upload screenshots, metadata, and your app to the App Store
- **supply**: Upload your Android app and its metadata to Google Play
- **snapshot**: Automate taking localized screenshots of your iOS app
- **screengrab**: Automate taking localized screenshots of your Android app
- **gym**: Build and package your iOS apps
- **gradle**: Build Android apps using Gradle
- **match**: Sync your certificates and profiles across your team
- **pilot**: Upload your app to TestFlight
- **cert**: Automatically create and maintain iOS code signing certificates
- **sigh**: Create, renew, download, and repair provisioning profiles

## Prerequisites

Before we begin, ensure you have the following installed:

```bash
# Install Xcode Command Line Tools
xcode-select --install

# Install Ruby (if not using system Ruby)
brew install ruby

# Install Fastlane
gem install fastlane

# Or using Homebrew
brew install fastlane
```

For Android builds, you will also need:

```bash
# Set ANDROID_HOME environment variable
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
```

## Project Structure

After setting up Fastlane, your React Native project will have the following structure:

```
my-react-native-app/
├── android/
│   └── fastlane/
│       ├── Appfile
│       ├── Fastfile
│       └── Pluginfile
├── ios/
│   └── fastlane/
│       ├── Appfile
│       ├── Fastfile
│       ├── Matchfile
│       └── Pluginfile
├── package.json
└── ...
```

## Fastlane Setup for React Native

### Initializing Fastlane for iOS

Navigate to your iOS directory and initialize Fastlane:

```bash
cd ios
fastlane init
```

Fastlane will ask you several questions about your project. Choose the option that best fits your needs. For most React Native projects, selecting "Manual setup" gives you the most flexibility.

### Initializing Fastlane for Android

Navigate to your Android directory and initialize Fastlane:

```bash
cd android
fastlane init
```

Follow the prompts to configure your Android setup, including providing your package name and Google Play credentials.

## iOS Lane Configuration

Let's create a comprehensive Fastfile for iOS. This file defines all the lanes (automated workflows) for your iOS builds.

### Basic iOS Fastfile

Create or update `ios/fastlane/Fastfile`:

```ruby
default_platform(:ios)

platform :ios do
  # Configuration
  APP_IDENTIFIER = "com.yourcompany.yourapp"
  XCODEPROJ = "YourApp.xcodeproj"
  XCWORKSPACE = "YourApp.xcworkspace"
  SCHEME = "YourApp"

  before_all do
    # Ensure we're on a clean git state
    ensure_git_status_clean unless ENV['SKIP_GIT_CHECK']
  end

  desc "Install CocoaPods dependencies"
  lane :install_pods do
    cocoapods(
      podfile: "./Podfile",
      try_repo_update_on_error: true
    )
  end

  desc "Run tests"
  lane :test do
    install_pods
    scan(
      workspace: XCWORKSPACE,
      scheme: SCHEME,
      devices: ["iPhone 15"],
      clean: true
    )
  end

  desc "Build development version"
  lane :build_dev do
    install_pods

    gym(
      workspace: XCWORKSPACE,
      scheme: SCHEME,
      configuration: "Debug",
      export_method: "development",
      output_directory: "./build",
      output_name: "YourApp-dev.ipa"
    )
  end

  desc "Build release version"
  lane :build_release do
    install_pods

    gym(
      workspace: XCWORKSPACE,
      scheme: SCHEME,
      configuration: "Release",
      export_method: "app-store",
      output_directory: "./build",
      output_name: "YourApp.ipa",
      include_bitcode: false,
      include_symbols: true
    )
  end

  desc "Deploy to TestFlight"
  lane :beta do
    # Sync code signing
    sync_code_signing(type: "appstore")

    # Increment build number
    increment_build_number(
      build_number: latest_testflight_build_number + 1,
      xcodeproj: XCODEPROJ
    )

    # Build the app
    build_release

    # Upload to TestFlight
    upload_to_testflight(
      skip_waiting_for_build_processing: true,
      apple_id: ENV['APPLE_ID'],
      skip_submission: true
    )

    # Clean up
    clean_build_artifacts
  end

  desc "Deploy to App Store"
  lane :release do
    # Sync code signing
    sync_code_signing(type: "appstore")

    # Build the app
    build_release

    # Upload to App Store
    deliver(
      submit_for_review: false,
      automatic_release: false,
      force: true,
      skip_metadata: true,
      skip_screenshots: true
    )
  end

  error do |lane, exception|
    # Handle errors
    UI.error("Error in lane #{lane}: #{exception.message}")
  end
end
```

### iOS Appfile Configuration

Create or update `ios/fastlane/Appfile`:

```ruby
app_identifier("com.yourcompany.yourapp")
apple_id(ENV["APPLE_ID"])
team_id(ENV["TEAM_ID"])
itc_team_id(ENV["ITC_TEAM_ID"])

# For App Store Connect API
# json_key_file(ENV["APP_STORE_CONNECT_API_KEY_PATH"])

for_platform :ios do
  for_lane :beta do
    app_identifier("com.yourcompany.yourapp")
  end

  for_lane :release do
    app_identifier("com.yourcompany.yourapp")
  end
end
```

## Android Lane Configuration

Now let's set up Fastlane for Android builds.

### Basic Android Fastfile

Create or update `android/fastlane/Fastfile`:

```ruby
default_platform(:android)

platform :android do
  # Configuration
  PACKAGE_NAME = "com.yourcompany.yourapp"

  before_all do
    # Ensure we're on a clean git state
    ensure_git_status_clean unless ENV['SKIP_GIT_CHECK']
  end

  desc "Run tests"
  lane :test do
    gradle(
      task: "test",
      build_type: "Debug"
    )
  end

  desc "Build debug APK"
  lane :build_debug do
    gradle(
      task: "assemble",
      build_type: "Debug"
    )
  end

  desc "Build release APK"
  lane :build_release_apk do
    gradle(
      task: "assemble",
      build_type: "Release",
      properties: {
        "android.injected.signing.store.file" => ENV["KEYSTORE_PATH"],
        "android.injected.signing.store.password" => ENV["KEYSTORE_PASSWORD"],
        "android.injected.signing.key.alias" => ENV["KEY_ALIAS"],
        "android.injected.signing.key.password" => ENV["KEY_PASSWORD"]
      }
    )
  end

  desc "Build release AAB (Android App Bundle)"
  lane :build_release_aab do
    gradle(
      task: "bundle",
      build_type: "Release",
      properties: {
        "android.injected.signing.store.file" => ENV["KEYSTORE_PATH"],
        "android.injected.signing.store.password" => ENV["KEYSTORE_PASSWORD"],
        "android.injected.signing.key.alias" => ENV["KEY_ALIAS"],
        "android.injected.signing.key.password" => ENV["KEY_PASSWORD"]
      }
    )
  end

  desc "Deploy to Internal Testing Track"
  lane :internal do
    # Increment version code
    increment_version_code(
      gradle_file_path: "app/build.gradle"
    )

    # Build AAB
    build_release_aab

    # Upload to Play Store Internal Testing
    upload_to_play_store(
      track: "internal",
      aab: "app/build/outputs/bundle/release/app-release.aab",
      skip_upload_metadata: true,
      skip_upload_images: true,
      skip_upload_screenshots: true
    )
  end

  desc "Deploy to Beta Track"
  lane :beta do
    # Increment version code
    increment_version_code(
      gradle_file_path: "app/build.gradle"
    )

    # Build AAB
    build_release_aab

    # Upload to Play Store Beta
    upload_to_play_store(
      track: "beta",
      aab: "app/build/outputs/bundle/release/app-release.aab",
      skip_upload_metadata: true,
      skip_upload_images: true,
      skip_upload_screenshots: true
    )
  end

  desc "Deploy to Production"
  lane :release do
    # Build AAB
    build_release_aab

    # Upload to Play Store Production
    upload_to_play_store(
      track: "production",
      aab: "app/build/outputs/bundle/release/app-release.aab",
      skip_upload_metadata: true,
      skip_upload_images: true,
      skip_upload_screenshots: true,
      rollout: "0.1" # 10% rollout
    )
  end

  desc "Promote from Beta to Production"
  lane :promote_to_production do
    upload_to_play_store(
      track: "beta",
      track_promote_to: "production",
      skip_upload_aab: true,
      skip_upload_metadata: true,
      skip_upload_images: true,
      skip_upload_screenshots: true
    )
  end

  error do |lane, exception|
    UI.error("Error in lane #{lane}: #{exception.message}")
  end
end
```

### Android Appfile Configuration

Create or update `android/fastlane/Appfile`:

```ruby
json_key_file(ENV["GOOGLE_PLAY_JSON_KEY_PATH"])
package_name("com.yourcompany.yourapp")
```

## Automatic Versioning

Managing version numbers manually is error-prone. Let's automate this process.

### iOS Version Management

Add these lanes to your iOS Fastfile:

```ruby
desc "Increment patch version (1.0.0 -> 1.0.1)"
lane :bump_patch do
  increment_version_number(
    bump_type: "patch",
    xcodeproj: XCODEPROJ
  )
  version = get_version_number(xcodeproj: XCODEPROJ)
  commit_version_bump(message: "Bump iOS version to #{version}")
end

desc "Increment minor version (1.0.0 -> 1.1.0)"
lane :bump_minor do
  increment_version_number(
    bump_type: "minor",
    xcodeproj: XCODEPROJ
  )
  version = get_version_number(xcodeproj: XCODEPROJ)
  commit_version_bump(message: "Bump iOS version to #{version}")
end

desc "Increment major version (1.0.0 -> 2.0.0)"
lane :bump_major do
  increment_version_number(
    bump_type: "major",
    xcodeproj: XCODEPROJ
  )
  version = get_version_number(xcodeproj: XCODEPROJ)
  commit_version_bump(message: "Bump iOS version to #{version}")
end

desc "Set specific version"
lane :set_version do |options|
  increment_version_number(
    version_number: options[:version],
    xcodeproj: XCODEPROJ
  )
  commit_version_bump(message: "Set iOS version to #{options[:version]}")
end
```

### Android Version Management

For Android, install the versioning plugin:

```bash
fastlane add_plugin versioning_android
```

Add these lanes to your Android Fastfile:

```ruby
desc "Increment version code"
lane :bump_version_code do
  increment_version_code(
    gradle_file_path: "app/build.gradle"
  )
  version_code = android_get_version_code(gradle_file: "app/build.gradle")
  git_commit(
    path: "app/build.gradle",
    message: "Bump Android versionCode to #{version_code}"
  )
end

desc "Increment version name (patch)"
lane :bump_version_name do |options|
  increment_version_name(
    gradle_file_path: "app/build.gradle",
    bump_type: options[:type] || "patch"
  )
  version_name = android_get_version_name(gradle_file: "app/build.gradle")
  git_commit(
    path: "app/build.gradle",
    message: "Bump Android versionName to #{version_name}"
  )
end

desc "Set specific version name"
lane :set_version_name do |options|
  android_set_version_name(
    version_name: options[:version],
    gradle_file: "app/build.gradle"
  )
  git_commit(
    path: "app/build.gradle",
    message: "Set Android versionName to #{options[:version]}"
  )
end
```

### Unified Versioning Script

For keeping iOS and Android versions in sync, create a script in your project root:

```ruby
# fastlane/Fastfile (root level)
desc "Bump version on both platforms"
lane :bump_version do |options|
  type = options[:type] || "patch"

  # Bump iOS version
  Dir.chdir("../ios") do
    sh("fastlane bump_#{type}")
  end

  # Bump Android version
  Dir.chdir("../android") do
    sh("fastlane bump_version_name type:#{type}")
    sh("fastlane bump_version_code")
  end
end
```

## Code Signing with Match

Match is Fastlane's approach to code signing that stores all certificates and provisioning profiles in a Git repository. This makes it easy to share signing credentials across a team and automate the signing process.

### Setting Up Match

First, create a private Git repository to store your certificates. Then initialize Match:

```bash
cd ios
fastlane match init
```

This creates a `Matchfile`. Configure it:

```ruby
# ios/fastlane/Matchfile
git_url(ENV["MATCH_GIT_URL"])
storage_mode("git")

type("appstore") # The default type, can be: appstore, adhoc, enterprise, development

app_identifier(["com.yourcompany.yourapp"])
username(ENV["APPLE_ID"])
team_id(ENV["TEAM_ID"])

# Optional: Encrypt the repository
# git_branch("master")
# readonly(true) # Set to true on CI

# For multiple apps or extensions
# app_identifier([
#   "com.yourcompany.yourapp",
#   "com.yourcompany.yourapp.notification-service"
# ])
```

### Generating Certificates with Match

```bash
# Generate development certificates and profiles
fastlane match development

# Generate App Store certificates and profiles
fastlane match appstore

# Generate Ad Hoc certificates and profiles
fastlane match adhoc
```

### Using Match in Lanes

```ruby
desc "Sync development certificates"
lane :sync_dev_certs do
  match(
    type: "development",
    readonly: is_ci
  )
end

desc "Sync App Store certificates"
lane :sync_appstore_certs do
  match(
    type: "appstore",
    readonly: is_ci
  )
end

desc "Sync all certificates"
lane :sync_all_certs do
  match(type: "development", readonly: is_ci)
  match(type: "adhoc", readonly: is_ci)
  match(type: "appstore", readonly: is_ci)
end
```

### Automatic Code Signing in Build Lane

Update your build lane to automatically handle code signing:

```ruby
desc "Build release with automatic signing"
lane :build_release do
  # Fetch certificates
  sync_code_signing(
    type: "appstore",
    readonly: is_ci
  )

  # Update project settings
  update_code_signing_settings(
    use_automatic_signing: false,
    path: XCODEPROJ,
    profile_name: ENV["sigh_com.yourcompany.yourapp_appstore_profile-name"],
    code_sign_identity: "iPhone Distribution",
    bundle_identifier: APP_IDENTIFIER
  )

  # Build
  gym(
    workspace: XCWORKSPACE,
    scheme: SCHEME,
    configuration: "Release",
    export_method: "app-store",
    export_options: {
      provisioningProfiles: {
        APP_IDENTIFIER => ENV["sigh_com.yourcompany.yourapp_appstore_profile-name"]
      }
    }
  )
end
```

## Building Release Versions

### Complete iOS Release Lane

```ruby
desc "Complete iOS release build"
lane :build_ios_release do |options|
  # Clean derived data
  clear_derived_data

  # Install dependencies
  cocoapods(
    podfile: "./Podfile",
    try_repo_update_on_error: true
  )

  # Sync certificates
  match(type: "appstore", readonly: is_ci)

  # Set version if provided
  if options[:version]
    increment_version_number(
      version_number: options[:version],
      xcodeproj: XCODEPROJ
    )
  end

  # Increment build number
  increment_build_number(
    build_number: options[:build] || (latest_testflight_build_number + 1),
    xcodeproj: XCODEPROJ
  )

  # Build
  gym(
    workspace: XCWORKSPACE,
    scheme: SCHEME,
    configuration: "Release",
    export_method: "app-store",
    output_directory: "./build",
    output_name: "YourApp.ipa",
    clean: true,
    include_symbols: true,
    include_bitcode: false,
    xcargs: "-allowProvisioningUpdates"
  )

  # Return path to IPA
  lane_context[SharedValues::IPA_OUTPUT_PATH]
end
```

### Complete Android Release Lane

```ruby
desc "Complete Android release build"
lane :build_android_release do |options|
  # Clean project
  gradle(task: "clean")

  # Set version if provided
  if options[:version]
    android_set_version_name(
      version_name: options[:version],
      gradle_file: "app/build.gradle"
    )
  end

  # Increment version code
  increment_version_code(
    gradle_file_path: "app/build.gradle"
  )

  # Build AAB
  gradle(
    task: "bundle",
    build_type: "Release",
    print_command: true,
    properties: {
      "android.injected.signing.store.file" => ENV["KEYSTORE_PATH"],
      "android.injected.signing.store.password" => ENV["KEYSTORE_PASSWORD"],
      "android.injected.signing.key.alias" => ENV["KEY_ALIAS"],
      "android.injected.signing.key.password" => ENV["KEY_PASSWORD"]
    }
  )

  # Return path to AAB
  lane_context[SharedValues::GRADLE_AAB_OUTPUT_PATH]
end
```

## Uploading to TestFlight

TestFlight is Apple's beta testing platform. Here is how to automate uploads:

```ruby
desc "Deploy to TestFlight"
lane :deploy_testflight do |options|
  # Build release
  build_ios_release(
    version: options[:version],
    build: options[:build]
  )

  # Upload to TestFlight
  pilot(
    ipa: lane_context[SharedValues::IPA_OUTPUT_PATH],
    skip_waiting_for_build_processing: options[:skip_waiting] || false,
    distribute_external: options[:external] || false,
    notify_external_testers: options[:notify] || false,
    changelog: options[:changelog] || "Bug fixes and improvements",
    groups: options[:groups] || ["Internal Testers"],
    reject_build_waiting_for_review: true
  )

  # Notify team
  if ENV["SLACK_URL"]
    slack(
      message: "New iOS build uploaded to TestFlight!",
      success: true,
      payload: {
        "Version" => get_version_number(xcodeproj: XCODEPROJ),
        "Build" => get_build_number(xcodeproj: XCODEPROJ)
      }
    )
  end
end
```

### App Store Connect API Key

For CI/CD environments, use an API key instead of username/password:

```ruby
desc "Setup App Store Connect API"
lane :setup_asc_api do
  app_store_connect_api_key(
    key_id: ENV["ASC_KEY_ID"],
    issuer_id: ENV["ASC_ISSUER_ID"],
    key_filepath: ENV["ASC_KEY_PATH"],
    duration: 1200,
    in_house: false
  )
end

desc "Deploy to TestFlight with API Key"
lane :deploy_testflight_api do |options|
  # Setup API key
  setup_asc_api

  # Build and upload
  build_ios_release(version: options[:version])

  upload_to_testflight(
    skip_waiting_for_build_processing: true
  )
end
```

## Uploading to Play Console

Google Play Console requires a service account JSON key for API access.

### Setting Up Google Play API Access

1. Go to Google Play Console > Setup > API access
2. Create a service account
3. Grant necessary permissions
4. Download the JSON key file

### Android Upload Lanes

```ruby
desc "Deploy to Internal Testing"
lane :deploy_internal do |options|
  # Build release
  build_android_release(version: options[:version])

  # Upload to Internal Testing
  upload_to_play_store(
    track: "internal",
    aab: lane_context[SharedValues::GRADLE_AAB_OUTPUT_PATH],
    release_status: "draft",
    skip_upload_metadata: true,
    skip_upload_images: true,
    skip_upload_screenshots: true
  )

  # Notify team
  if ENV["SLACK_URL"]
    slack(
      message: "New Android build uploaded to Internal Testing!",
      success: true
    )
  end
end

desc "Deploy to Beta"
lane :deploy_beta do |options|
  build_android_release(version: options[:version])

  upload_to_play_store(
    track: "beta",
    aab: lane_context[SharedValues::GRADLE_AAB_OUTPUT_PATH],
    release_status: "completed",
    skip_upload_metadata: true,
    skip_upload_images: true,
    skip_upload_screenshots: true
  )
end

desc "Deploy to Production with staged rollout"
lane :deploy_production do |options|
  rollout = options[:rollout] || 0.1 # Default 10%

  build_android_release(version: options[:version])

  upload_to_play_store(
    track: "production",
    aab: lane_context[SharedValues::GRADLE_AAB_OUTPUT_PATH],
    release_status: "inProgress",
    rollout: rollout.to_s,
    skip_upload_metadata: true,
    skip_upload_images: true,
    skip_upload_screenshots: true
  )
end

desc "Increase production rollout"
lane :increase_rollout do |options|
  rollout = options[:rollout] || 0.5 # Default 50%

  upload_to_play_store(
    track: "production",
    version_code: options[:version_code],
    release_status: "inProgress",
    rollout: rollout.to_s,
    skip_upload_aab: true,
    skip_upload_metadata: true,
    skip_upload_images: true,
    skip_upload_screenshots: true
  )
end

desc "Complete production rollout"
lane :complete_rollout do
  upload_to_play_store(
    track: "production",
    release_status: "completed",
    skip_upload_aab: true,
    skip_upload_metadata: true,
    skip_upload_images: true,
    skip_upload_screenshots: true
  )
end
```

## Environment Management

Managing different environments (development, staging, production) is crucial for mobile apps.

### Environment Configuration Files

Create environment-specific configuration:

```ruby
# ios/fastlane/Fastfile

ENVIRONMENTS = {
  "development" => {
    bundle_id: "com.yourcompany.yourapp.dev",
    app_name: "YourApp Dev",
    scheme: "YourApp-Dev"
  },
  "staging" => {
    bundle_id: "com.yourcompany.yourapp.staging",
    app_name: "YourApp Staging",
    scheme: "YourApp-Staging"
  },
  "production" => {
    bundle_id: "com.yourcompany.yourapp",
    app_name: "YourApp",
    scheme: "YourApp"
  }
}

desc "Build for specific environment"
lane :build_env do |options|
  env = options[:env] || "production"
  config = ENVIRONMENTS[env]

  UI.user_error!("Unknown environment: #{env}") unless config

  match(
    type: "appstore",
    app_identifier: config[:bundle_id],
    readonly: is_ci
  )

  gym(
    workspace: XCWORKSPACE,
    scheme: config[:scheme],
    configuration: "Release",
    export_method: "app-store"
  )
end
```

### Using .env Files

Fastlane supports `.env` files for environment variables:

```bash
# ios/fastlane/.env.default
APPLE_ID=your@email.com
TEAM_ID=XXXXXXXXXX
MATCH_GIT_URL=git@github.com:yourcompany/certificates.git

# ios/fastlane/.env.staging
APP_IDENTIFIER=com.yourcompany.yourapp.staging
SCHEME=YourApp-Staging

# ios/fastlane/.env.production
APP_IDENTIFIER=com.yourcompany.yourapp
SCHEME=YourApp
```

Use the environment file:

```bash
fastlane beta --env staging
fastlane release --env production
```

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/mobile-deploy.yml`:

```yaml
name: Mobile Deploy

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:
    inputs:
      platform:
        description: 'Platform to deploy'
        required: true
        default: 'both'
        type: choice
        options:
          - ios
          - android
          - both

jobs:
  deploy-ios:
    if: github.event.inputs.platform == 'ios' || github.event.inputs.platform == 'both' || startsWith(github.ref, 'refs/tags/')
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2'
          bundler-cache: true
          working-directory: ios

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Setup App Store Connect API Key
        env:
          ASC_KEY_CONTENT: ${{ secrets.ASC_KEY_CONTENT }}
        run: |
          mkdir -p ~/private_keys
          echo "$ASC_KEY_CONTENT" > ~/private_keys/AuthKey.p8

      - name: Deploy to TestFlight
        env:
          MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
          MATCH_GIT_URL: ${{ secrets.MATCH_GIT_URL }}
          ASC_KEY_ID: ${{ secrets.ASC_KEY_ID }}
          ASC_ISSUER_ID: ${{ secrets.ASC_ISSUER_ID }}
          ASC_KEY_PATH: ~/private_keys/AuthKey.p8
        run: |
          cd ios
          bundle exec fastlane deploy_testflight_api

  deploy-android:
    if: github.event.inputs.platform == 'android' || github.event.inputs.platform == 'both' || startsWith(github.ref, 'refs/tags/')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2'
          bundler-cache: true
          working-directory: android

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Install dependencies
        run: npm ci

      - name: Decode Keystore
        env:
          ENCODED_KEYSTORE: ${{ secrets.ENCODED_KEYSTORE }}
        run: |
          echo $ENCODED_KEYSTORE | base64 --decode > android/app/release.keystore

      - name: Setup Google Play credentials
        env:
          GOOGLE_PLAY_JSON: ${{ secrets.GOOGLE_PLAY_JSON }}
        run: |
          echo "$GOOGLE_PLAY_JSON" > android/google-play-key.json

      - name: Deploy to Play Store
        env:
          KEYSTORE_PATH: ${{ github.workspace }}/android/app/release.keystore
          KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
          KEY_ALIAS: ${{ secrets.KEY_ALIAS }}
          KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}
          GOOGLE_PLAY_JSON_KEY_PATH: ${{ github.workspace }}/android/google-play-key.json
        run: |
          cd android
          bundle exec fastlane deploy_internal
```

### Bitrise Integration

Create `bitrise.yml`:

```yaml
format_version: "11"
default_step_lib_source: https://github.com/bitrise-io/bitrise-steplib.git

workflows:
  deploy-ios:
    steps:
      - activate-ssh-key@4:
          run_if: '{{getenv "SSH_RSA_PRIVATE_KEY" | ne ""}}'
      - git-clone@8: {}
      - nvm@1:
          inputs:
            - node_version: "20"
      - npm@1:
          inputs:
            - command: ci
      - cocoapods-install@2: {}
      - fastlane@3:
          inputs:
            - lane: deploy_testflight
            - work_dir: ios

  deploy-android:
    steps:
      - activate-ssh-key@4:
          run_if: '{{getenv "SSH_RSA_PRIVATE_KEY" | ne ""}}'
      - git-clone@8: {}
      - nvm@1:
          inputs:
            - node_version: "20"
      - npm@1:
          inputs:
            - command: ci
      - fastlane@3:
          inputs:
            - lane: deploy_internal
            - work_dir: android
```

## Common Lanes and Plugins

### Useful Plugins

Install common plugins:

```bash
# Version management
fastlane add_plugin versioning
fastlane add_plugin versioning_android

# Firebase App Distribution
fastlane add_plugin firebase_app_distribution

# Badge for app icons
fastlane add_plugin badge

# Slack notifications
fastlane add_plugin slack
```

### Firebase App Distribution Lane

```ruby
desc "Deploy to Firebase App Distribution"
lane :deploy_firebase do |options|
  # Build the app
  gym(
    workspace: XCWORKSPACE,
    scheme: SCHEME,
    configuration: "Release",
    export_method: "ad-hoc"
  )

  # Upload to Firebase
  firebase_app_distribution(
    app: ENV["FIREBASE_APP_ID"],
    groups: options[:groups] || "internal-testers",
    release_notes: options[:notes] || "New build",
    firebase_cli_token: ENV["FIREBASE_TOKEN"]
  )
end
```

### Common Utility Lanes

```ruby
desc "Clean all build artifacts"
lane :clean do
  clear_derived_data
  sh("rm -rf ../build")
  sh("rm -rf ~/Library/Developer/Xcode/Archives/*")
end

desc "Register new devices"
lane :register_devices do
  register_devices(
    devices_file: "./devices.txt"
  )
  match(type: "development", force_for_new_devices: true)
  match(type: "adhoc", force_for_new_devices: true)
end

desc "Create screenshots"
lane :screenshots do
  capture_screenshots(
    workspace: XCWORKSPACE,
    scheme: "YourAppUITests",
    output_directory: "./screenshots",
    clear_previous_screenshots: true
  )
  frame_screenshots(
    path: "./screenshots"
  )
end

desc "Sync metadata from App Store"
lane :sync_metadata do
  download_metadata
end

desc "Upload metadata to App Store"
lane :upload_metadata do
  deliver(
    skip_binary_upload: true,
    skip_screenshots: true,
    force: true
  )
end

desc "Check for outdated dependencies"
lane :check_dependencies do
  sh("bundle outdated")
  sh("pod outdated")
end
```

### Complete Cross-Platform Deploy Lane

```ruby
# Root Fastfile

desc "Deploy both platforms"
lane :deploy_all do |options|
  version = options[:version]

  # Deploy iOS
  Dir.chdir("ios") do
    sh("bundle exec fastlane deploy_testflight version:#{version}")
  end

  # Deploy Android
  Dir.chdir("android") do
    sh("bundle exec fastlane deploy_internal version:#{version}")
  end

  # Create git tag
  add_git_tag(tag: "v#{version}")
  push_git_tags

  # Notify team
  slack(
    message: "Version #{version} deployed to both platforms!",
    success: true
  )
end
```

## Best Practices

1. **Keep Fastfiles DRY**: Extract common logic into private lanes or helper methods
2. **Use Environment Variables**: Never hardcode sensitive information
3. **Version Control**: Keep Fastfile in version control, but exclude `.env` files with secrets
4. **Readonly Certificates on CI**: Always use `readonly: true` for Match on CI to prevent accidental certificate regeneration
5. **Incremental Builds**: Use caching in CI to speed up builds
6. **Error Handling**: Implement proper error handling and notifications
7. **Documentation**: Document custom lanes and their parameters
8. **Testing**: Test your lanes in a non-production environment first

## Conclusion

Fastlane transforms the tedious process of building and deploying React Native apps into a streamlined, automated workflow. By investing time in setting up proper lanes for both iOS and Android, you create a reliable, repeatable process that saves hours of manual work and reduces the risk of human error.

Start with basic lanes and gradually add more automation as your needs grow. The initial setup effort pays dividends with every release, allowing your team to focus on building great features instead of wrestling with build configurations and app store uploads.

Remember to keep your Fastlane setup updated, as both Fastlane and the app stores frequently introduce new features and requirements. Regular maintenance ensures your automation continues to work smoothly as your project evolves.
