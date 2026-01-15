# How to Set Up CI/CD Pipelines for React Native with GitHub Actions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, CI/CD, GitHub Actions, DevOps, Automation, Mobile Development

Description: Learn how to set up automated CI/CD pipelines for React Native apps using GitHub Actions for iOS and Android builds.

---

## Introduction

Mobile app development has evolved significantly over the years, and with frameworks like React Native enabling cross-platform development, the need for robust CI/CD (Continuous Integration/Continuous Deployment) pipelines has become more critical than ever. In this comprehensive guide, we will explore how to set up automated CI/CD pipelines for React Native applications using GitHub Actions.

Whether you are a solo developer or part of a large team, implementing CI/CD will streamline your development workflow, catch bugs early, and ensure consistent, reliable releases to both the App Store and Google Play Store.

## Why CI/CD Matters for Mobile Development

Before diving into the technical implementation, let us understand why CI/CD is essential for mobile development:

### 1. Faster Feedback Loops

With automated testing on every pull request, developers receive immediate feedback on their code changes. This helps identify issues early in the development cycle, reducing the cost and time required to fix bugs.

### 2. Consistent Build Quality

Manual builds are prone to human error. CI/CD ensures that every build follows the same process, resulting in consistent and reproducible artifacts.

### 3. Reduced Time to Market

Automated pipelines eliminate the manual steps involved in building, testing, and deploying apps. This significantly reduces the time from code commit to app store release.

### 4. Improved Team Collaboration

When the build and deployment process is automated, team members can focus on writing code rather than managing releases. This improves productivity and collaboration.

### 5. Code Quality Enforcement

CI/CD pipelines can enforce code quality standards through linting, type checking, and test coverage requirements. Pull requests that do not meet these standards are automatically rejected.

## GitHub Actions Overview

GitHub Actions is a powerful automation platform integrated directly into GitHub repositories. It allows you to create custom workflows triggered by various events such as pushes, pull requests, releases, and scheduled times.

### Key Concepts

**Workflows**: YAML files that define automated processes, stored in `.github/workflows/` directory.

**Jobs**: A workflow consists of one or more jobs that run in parallel by default.

**Steps**: Each job contains a sequence of steps that execute commands or actions.

**Actions**: Reusable units of code that can be shared across workflows.

**Runners**: Virtual machines that execute your workflows. GitHub provides hosted runners for Linux, macOS, and Windows.

### Basic Workflow Structure

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm install
      - name: Run tests
        run: npm test
```

## Setting Up Your React Native Project

Before creating CI/CD workflows, ensure your React Native project is properly configured:

### Project Prerequisites

1. **Node.js and npm/yarn** - Ensure consistent versions across environments
2. **React Native CLI or Expo** - Depending on your project setup
3. **Xcode** (for iOS builds) - Required for building iOS apps
4. **Android Studio** (for Android builds) - Required for building Android apps
5. **Code signing certificates** - For distribution builds

### Package.json Scripts

Ensure your `package.json` includes the necessary scripts:

```json
{
  "scripts": {
    "start": "react-native start",
    "android": "react-native run-android",
    "ios": "react-native run-ios",
    "test": "jest",
    "test:coverage": "jest --coverage",
    "lint": "eslint . --ext .js,.jsx,.ts,.tsx",
    "lint:fix": "eslint . --ext .js,.jsx,.ts,.tsx --fix",
    "typecheck": "tsc --noEmit",
    "build:android": "cd android && ./gradlew assembleRelease",
    "build:ios": "xcodebuild -workspace ios/MyApp.xcworkspace -scheme MyApp -configuration Release"
  }
}
```

## Running Tests on Pull Requests

The first step in any CI/CD pipeline is running automated tests. This ensures that new code changes do not break existing functionality.

### Test Workflow Configuration

Create a file `.github/workflows/test.yml`:

```yaml
name: Test

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  lint-and-typecheck:
    name: Lint and Type Check
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Run TypeScript type check
        run: npm run typecheck

  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run Jest tests
        run: npm run test:coverage

      - name: Upload coverage report
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: ./coverage/lcov.info
          fail_ci_if_error: true

  e2e-tests:
    name: E2E Tests
    runs-on: macos-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Detox CLI
        run: npm install -g detox-cli

      - name: Install macOS dependencies
        run: |
          brew tap wix/brew
          brew install applesimutils

      - name: Build Detox
        run: detox build --configuration ios.sim.release

      - name: Run Detox tests
        run: detox test --configuration ios.sim.release --cleanup
```

### Testing Best Practices

1. **Run tests in parallel** - Split tests across multiple jobs to reduce total execution time
2. **Use test caching** - Cache test results for unchanged files when possible
3. **Set timeout limits** - Prevent hung tests from blocking the pipeline
4. **Generate test reports** - Upload test results as artifacts for debugging

## iOS Build Workflow

Building iOS apps requires macOS runners and proper code signing configuration. Let us create a comprehensive iOS build workflow.

### iOS Build Configuration

Create `.github/workflows/ios-build.yml`:

```yaml
name: iOS Build

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:
    inputs:
      build_type:
        description: 'Build type (debug/release)'
        required: true
        default: 'release'
        type: choice
        options:
          - debug
          - release

env:
  DEVELOPER_DIR: /Applications/Xcode_15.0.app/Contents/Developer

jobs:
  ios-build:
    name: Build iOS App
    runs-on: macos-14
    timeout-minutes: 60

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2'
          bundler-cache: true

      - name: Cache CocoaPods
        uses: actions/cache@v4
        with:
          path: ios/Pods
          key: ${{ runner.os }}-pods-${{ hashFiles('**/Podfile.lock') }}
          restore-keys: |
            ${{ runner.os }}-pods-

      - name: Install npm dependencies
        run: npm ci

      - name: Install CocoaPods dependencies
        working-directory: ios
        run: |
          bundle install
          bundle exec pod install

      - name: Setup code signing
        env:
          BUILD_CERTIFICATE_BASE64: ${{ secrets.IOS_BUILD_CERTIFICATE_BASE64 }}
          BUILD_CERTIFICATE_PASSWORD: ${{ secrets.IOS_BUILD_CERTIFICATE_PASSWORD }}
          BUILD_PROVISION_PROFILE_BASE64: ${{ secrets.IOS_PROVISION_PROFILE_BASE64 }}
          KEYCHAIN_PASSWORD: ${{ secrets.KEYCHAIN_PASSWORD }}
        run: |
          # Create variables for file paths
          CERTIFICATE_PATH=$RUNNER_TEMP/build_certificate.p12
          PROVISION_PROFILE_PATH=$RUNNER_TEMP/build_pp.mobileprovision
          KEYCHAIN_PATH=$RUNNER_TEMP/app-signing.keychain-db

          # Decode and write files
          echo -n "$BUILD_CERTIFICATE_BASE64" | base64 --decode -o $CERTIFICATE_PATH
          echo -n "$BUILD_PROVISION_PROFILE_BASE64" | base64 --decode -o $PROVISION_PROFILE_PATH

          # Create temporary keychain
          security create-keychain -p "$KEYCHAIN_PASSWORD" $KEYCHAIN_PATH
          security set-keychain-settings -lut 21600 $KEYCHAIN_PATH
          security unlock-keychain -p "$KEYCHAIN_PASSWORD" $KEYCHAIN_PATH

          # Import certificate to keychain
          security import $CERTIFICATE_PATH -P "$BUILD_CERTIFICATE_PASSWORD" \
            -A -t cert -f pkcs12 -k $KEYCHAIN_PATH
          security list-keychain -d user -s $KEYCHAIN_PATH

          # Apply provisioning profile
          mkdir -p ~/Library/MobileDevice/Provisioning\ Profiles
          cp $PROVISION_PROFILE_PATH ~/Library/MobileDevice/Provisioning\ Profiles/

      - name: Build iOS app
        working-directory: ios
        run: |
          xcodebuild -workspace MyApp.xcworkspace \
            -scheme MyApp \
            -configuration Release \
            -sdk iphoneos \
            -archivePath $RUNNER_TEMP/MyApp.xcarchive \
            archive \
            CODE_SIGN_STYLE=Manual \
            DEVELOPMENT_TEAM=${{ secrets.APPLE_TEAM_ID }} \
            PROVISIONING_PROFILE_SPECIFIER="${{ secrets.IOS_PROVISION_PROFILE_NAME }}"

      - name: Export IPA
        run: |
          xcodebuild -exportArchive \
            -archivePath $RUNNER_TEMP/MyApp.xcarchive \
            -exportOptionsPlist ios/ExportOptions.plist \
            -exportPath $RUNNER_TEMP/build

      - name: Upload IPA artifact
        uses: actions/upload-artifact@v4
        with:
          name: ios-app-${{ github.sha }}
          path: ${{ runner.temp }}/build/*.ipa
          retention-days: 14

      - name: Cleanup keychain
        if: always()
        run: |
          security delete-keychain $RUNNER_TEMP/app-signing.keychain-db
```

### ExportOptions.plist Configuration

Create an `ios/ExportOptions.plist` file for IPA export:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>teamID</key>
    <string>YOUR_TEAM_ID</string>
    <key>uploadSymbols</key>
    <true/>
    <key>compileBitcode</key>
    <false/>
</dict>
</plist>
```

## Android Build Workflow

Android builds are typically faster and can run on Linux runners, making them more cost-effective.

### Android Build Configuration

Create `.github/workflows/android-build.yml`:

```yaml
name: Android Build

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:
    inputs:
      build_type:
        description: 'Build type'
        required: true
        default: 'release'
        type: choice
        options:
          - debug
          - release

jobs:
  android-build:
    name: Build Android App
    runs-on: ubuntu-latest
    timeout-minutes: 45

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

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
          cache: 'gradle'

      - name: Setup Android SDK
        uses: android-actions/setup-android@v3

      - name: Cache Gradle packages
        uses: actions/cache@v4
        with:
          path: |
            ~/.gradle/caches
            ~/.gradle/wrapper
          key: ${{ runner.os }}-gradle-${{ hashFiles('**/*.gradle*', '**/gradle-wrapper.properties') }}
          restore-keys: |
            ${{ runner.os }}-gradle-

      - name: Install npm dependencies
        run: npm ci

      - name: Setup Android signing
        env:
          ANDROID_KEYSTORE_BASE64: ${{ secrets.ANDROID_KEYSTORE_BASE64 }}
          ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          ANDROID_KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
          ANDROID_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
        run: |
          # Decode keystore
          echo "$ANDROID_KEYSTORE_BASE64" | base64 --decode > android/app/release.keystore

          # Create keystore.properties
          cat > android/keystore.properties << EOF
          storeFile=release.keystore
          storePassword=$ANDROID_KEYSTORE_PASSWORD
          keyAlias=$ANDROID_KEY_ALIAS
          keyPassword=$ANDROID_KEY_PASSWORD
          EOF

      - name: Make gradlew executable
        run: chmod +x android/gradlew

      - name: Build Release APK
        working-directory: android
        run: ./gradlew assembleRelease --no-daemon

      - name: Build Release AAB (App Bundle)
        working-directory: android
        run: ./gradlew bundleRelease --no-daemon

      - name: Upload APK artifact
        uses: actions/upload-artifact@v4
        with:
          name: android-apk-${{ github.sha }}
          path: android/app/build/outputs/apk/release/*.apk
          retention-days: 14

      - name: Upload AAB artifact
        uses: actions/upload-artifact@v4
        with:
          name: android-aab-${{ github.sha }}
          path: android/app/build/outputs/bundle/release/*.aab
          retention-days: 14

      - name: Cleanup signing files
        if: always()
        run: |
          rm -f android/app/release.keystore
          rm -f android/keystore.properties
```

### Android Gradle Configuration

Update your `android/app/build.gradle` to support CI signing:

```groovy
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()

if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    // ... other configurations

    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

## Code Signing Setup

Code signing is crucial for distributing mobile apps. Here is how to set up signing certificates for both platforms.

### iOS Code Signing

#### Step 1: Generate Certificates and Profiles

1. Log in to [Apple Developer Portal](https://developer.apple.com)
2. Create a Distribution Certificate
3. Create an App ID for your application
4. Create a Provisioning Profile (App Store or Ad Hoc)

#### Step 2: Export and Encode Certificates

```bash
# Export certificate to .p12 file from Keychain Access
# Then encode it for GitHub secrets

base64 -i Certificates.p12 | pbcopy
# Paste this value as IOS_BUILD_CERTIFICATE_BASE64 secret

base64 -i YourApp.mobileprovision | pbcopy
# Paste this value as IOS_PROVISION_PROFILE_BASE64 secret
```

#### Step 3: Configure GitHub Secrets

Add the following secrets to your GitHub repository:

- `IOS_BUILD_CERTIFICATE_BASE64` - Base64 encoded .p12 certificate
- `IOS_BUILD_CERTIFICATE_PASSWORD` - Password for the .p12 file
- `IOS_PROVISION_PROFILE_BASE64` - Base64 encoded provisioning profile
- `IOS_PROVISION_PROFILE_NAME` - Name of the provisioning profile
- `APPLE_TEAM_ID` - Your Apple Developer Team ID
- `KEYCHAIN_PASSWORD` - A secure password for the temporary keychain

### Android Code Signing

#### Step 1: Generate Keystore

```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore release.keystore \
  -alias my-key-alias \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

#### Step 2: Encode Keystore

```bash
base64 -i release.keystore | pbcopy
# Paste this value as ANDROID_KEYSTORE_BASE64 secret
```

#### Step 3: Configure GitHub Secrets

Add the following secrets to your GitHub repository:

- `ANDROID_KEYSTORE_BASE64` - Base64 encoded keystore file
- `ANDROID_KEYSTORE_PASSWORD` - Keystore password
- `ANDROID_KEY_ALIAS` - Key alias name
- `ANDROID_KEY_PASSWORD` - Key password

## Environment Variables Management

Managing environment variables securely is essential for CI/CD pipelines.

### Using GitHub Secrets

GitHub Secrets provide a secure way to store sensitive information:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    env:
      API_URL: ${{ secrets.API_URL }}
      API_KEY: ${{ secrets.API_KEY }}
    steps:
      - name: Create .env file
        run: |
          cat > .env << EOF
          API_URL=${{ secrets.API_URL }}
          API_KEY=${{ secrets.API_KEY }}
          ENVIRONMENT=production
          EOF
```

### Environment-Specific Configurations

Create different workflows or use environment protection rules:

```yaml
jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: Deploy to staging
        env:
          API_URL: ${{ vars.STAGING_API_URL }}
        run: echo "Deploying to staging"

  deploy-production:
    runs-on: ubuntu-latest
    environment: production
    needs: deploy-staging
    steps:
      - name: Deploy to production
        env:
          API_URL: ${{ vars.PRODUCTION_API_URL }}
        run: echo "Deploying to production"
```

### React Native Environment Configuration

Use `react-native-config` or similar packages to manage environment variables:

```javascript
// metro.config.js
const { getDefaultConfig } = require('@react-native/metro-config');

module.exports = (async () => {
  const config = await getDefaultConfig(__dirname);
  return {
    ...config,
    resolver: {
      ...config.resolver,
      sourceExts: [...config.resolver.sourceExts, 'env'],
    },
  };
})();
```

## Caching Dependencies

Caching significantly reduces build times by reusing previously downloaded dependencies.

### Comprehensive Caching Strategy

```yaml
jobs:
  build:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4

      # Cache npm dependencies
      - name: Cache npm dependencies
        uses: actions/cache@v4
        with:
          path: |
            ~/.npm
            node_modules
          key: ${{ runner.os }}-npm-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-npm-

      # Cache CocoaPods
      - name: Cache CocoaPods
        uses: actions/cache@v4
        with:
          path: |
            ios/Pods
            ~/Library/Caches/CocoaPods
          key: ${{ runner.os }}-pods-${{ hashFiles('**/Podfile.lock') }}
          restore-keys: |
            ${{ runner.os }}-pods-

      # Cache Gradle
      - name: Cache Gradle
        uses: actions/cache@v4
        with:
          path: |
            ~/.gradle/caches
            ~/.gradle/wrapper
            android/.gradle
          key: ${{ runner.os }}-gradle-${{ hashFiles('**/*.gradle*', '**/gradle-wrapper.properties') }}
          restore-keys: |
            ${{ runner.os }}-gradle-

      # Cache Ruby gems (for Fastlane)
      - name: Cache Ruby gems
        uses: actions/cache@v4
        with:
          path: vendor/bundle
          key: ${{ runner.os }}-gems-${{ hashFiles('**/Gemfile.lock') }}
          restore-keys: |
            ${{ runner.os }}-gems-
```

### Cache Optimization Tips

1. **Use specific cache keys** - Include lock file hashes for precise cache matching
2. **Implement restore keys** - Allow partial cache matches when exact matches fail
3. **Cache derived data** - For iOS, consider caching Xcode derived data
4. **Monitor cache sizes** - GitHub has cache size limits; optimize what you cache

## Build Artifacts Handling

Managing build artifacts efficiently ensures your CI/CD outputs are accessible and organized.

### Artifact Upload Configuration

```yaml
- name: Upload iOS build
  uses: actions/upload-artifact@v4
  with:
    name: ios-build-${{ github.run_number }}
    path: |
      ios/build/MyApp.ipa
      ios/build/MyApp.app.dSYM.zip
    retention-days: 30
    compression-level: 9

- name: Upload Android build
  uses: actions/upload-artifact@v4
  with:
    name: android-build-${{ github.run_number }}
    path: |
      android/app/build/outputs/apk/release/*.apk
      android/app/build/outputs/bundle/release/*.aab
      android/app/build/outputs/mapping/release/mapping.txt
    retention-days: 30
```

### Downloading Artifacts in Subsequent Jobs

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      artifact-name: android-build-${{ github.run_number }}
    steps:
      - name: Build app
        run: ./gradlew assembleRelease
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: android-build-${{ github.run_number }}
          path: android/app/build/outputs/apk/release/*.apk

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Download artifact
        uses: actions/download-artifact@v4
        with:
          name: ${{ needs.build.outputs.artifact-name }}
          path: ./release
```

## Automated Releases

Automate the release process to create consistent, versioned releases.

### Release Workflow

Create `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  create-release:
    name: Create Release
    runs-on: ubuntu-latest
    outputs:
      upload_url: ${{ steps.create_release.outputs.upload_url }}
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Generate changelog
        id: changelog
        uses: metcalfc/changelog-generator@v4.1.0
        with:
          myToken: ${{ secrets.GITHUB_TOKEN }}

      - name: Create Release
        id: create_release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref_name }}
          release_name: Release ${{ github.ref_name }}
          body: |
            ## Changes in this Release
            ${{ steps.changelog.outputs.changelog }}
          draft: false
          prerelease: false

  build-ios:
    name: Build iOS
    needs: create-release
    runs-on: macos-14
    steps:
      # ... iOS build steps from earlier

      - name: Upload iOS to Release
        uses: actions/upload-release-asset@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          upload_url: ${{ needs.create-release.outputs.upload_url }}
          asset_path: ./build/MyApp.ipa
          asset_name: MyApp-${{ github.ref_name }}.ipa
          asset_content_type: application/octet-stream

  build-android:
    name: Build Android
    needs: create-release
    runs-on: ubuntu-latest
    steps:
      # ... Android build steps from earlier

      - name: Upload APK to Release
        uses: actions/upload-release-asset@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          upload_url: ${{ needs.create-release.outputs.upload_url }}
          asset_path: ./android/app/build/outputs/apk/release/app-release.apk
          asset_name: MyApp-${{ github.ref_name }}.apk
          asset_content_type: application/vnd.android.package-archive

      - name: Upload AAB to Release
        uses: actions/upload-release-asset@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          upload_url: ${{ needs.create-release.outputs.upload_url }}
          asset_path: ./android/app/build/outputs/bundle/release/app-release.aab
          asset_name: MyApp-${{ github.ref_name }}.aab
          asset_content_type: application/octet-stream
```

## Deployment to App Stores

The final step is deploying your apps to the App Store and Google Play Store.

### iOS App Store Deployment

```yaml
deploy-ios:
  name: Deploy to App Store
  needs: build-ios
  runs-on: macos-14
  steps:
    - name: Checkout repository
      uses: actions/checkout@v4

    - name: Download iOS artifact
      uses: actions/download-artifact@v4
      with:
        name: ios-app-${{ github.sha }}
        path: ./build

    - name: Setup Ruby
      uses: ruby/setup-ruby@v1
      with:
        ruby-version: '3.2'
        bundler-cache: true

    - name: Install Fastlane
      run: gem install fastlane

    - name: Upload to App Store Connect
      env:
        APP_STORE_CONNECT_API_KEY_ID: ${{ secrets.APP_STORE_CONNECT_API_KEY_ID }}
        APP_STORE_CONNECT_API_ISSUER_ID: ${{ secrets.APP_STORE_CONNECT_API_ISSUER_ID }}
        APP_STORE_CONNECT_API_KEY_CONTENT: ${{ secrets.APP_STORE_CONNECT_API_KEY_CONTENT }}
      run: |
        fastlane deliver --ipa ./build/*.ipa \
          --skip_screenshots \
          --skip_metadata \
          --submit_for_review false
```

### Android Play Store Deployment

```yaml
deploy-android:
  name: Deploy to Play Store
  needs: build-android
  runs-on: ubuntu-latest
  steps:
    - name: Checkout repository
      uses: actions/checkout@v4

    - name: Download Android artifact
      uses: actions/download-artifact@v4
      with:
        name: android-aab-${{ github.sha }}
        path: ./build

    - name: Setup Ruby
      uses: ruby/setup-ruby@v1
      with:
        ruby-version: '3.2'
        bundler-cache: true

    - name: Install Fastlane
      run: gem install fastlane

    - name: Create service account JSON
      env:
        PLAY_STORE_SERVICE_ACCOUNT_JSON: ${{ secrets.PLAY_STORE_SERVICE_ACCOUNT_JSON }}
      run: echo "$PLAY_STORE_SERVICE_ACCOUNT_JSON" > service-account.json

    - name: Upload to Play Store
      run: |
        fastlane supply --aab ./build/*.aab \
          --track internal \
          --json_key service-account.json \
          --skip_upload_apk \
          --skip_upload_metadata \
          --skip_upload_images \
          --skip_upload_screenshots

    - name: Cleanup
      if: always()
      run: rm -f service-account.json
```

### Fastlane Configuration

Create a `Fastfile` in your project root:

```ruby
default_platform(:ios)

platform :ios do
  desc "Upload to App Store Connect"
  lane :deploy do
    api_key = app_store_connect_api_key(
      key_id: ENV["APP_STORE_CONNECT_API_KEY_ID"],
      issuer_id: ENV["APP_STORE_CONNECT_API_ISSUER_ID"],
      key_content: ENV["APP_STORE_CONNECT_API_KEY_CONTENT"]
    )

    upload_to_app_store(
      api_key: api_key,
      skip_screenshots: true,
      skip_metadata: true,
      submit_for_review: false,
      precheck_include_in_app_purchases: false
    )
  end
end

platform :android do
  desc "Upload to Play Store"
  lane :deploy do
    upload_to_play_store(
      track: 'internal',
      release_status: 'draft',
      aab: '../android/app/build/outputs/bundle/release/app-release.aab'
    )
  end
end
```

## Best Practices and Tips

### 1. Use Matrix Builds for Multiple Configurations

```yaml
jobs:
  build:
    strategy:
      matrix:
        os: [macos-14, ubuntu-latest]
        node-version: [18, 20]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
```

### 2. Implement Concurrency Controls

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

### 3. Use Reusable Workflows

Create `.github/workflows/reusable-build.yml`:

```yaml
name: Reusable Build

on:
  workflow_call:
    inputs:
      platform:
        required: true
        type: string
    secrets:
      SIGNING_KEY:
        required: true

jobs:
  build:
    runs-on: ${{ inputs.platform == 'ios' && 'macos-14' || 'ubuntu-latest' }}
    steps:
      - name: Build ${{ inputs.platform }}
        run: echo "Building for ${{ inputs.platform }}"
```

### 4. Implement Proper Error Handling

```yaml
steps:
  - name: Build app
    id: build
    continue-on-error: true
    run: npm run build

  - name: Handle build failure
    if: steps.build.outcome == 'failure'
    run: |
      echo "Build failed, sending notification..."
      # Send notification to Slack or email
```

### 5. Add Build Status Badges

Add to your README.md:

```markdown
![CI](https://github.com/username/repo/actions/workflows/test.yml/badge.svg)
![iOS Build](https://github.com/username/repo/actions/workflows/ios-build.yml/badge.svg)
![Android Build](https://github.com/username/repo/actions/workflows/android-build.yml/badge.svg)
```

### 6. Monitor Workflow Performance

- Review workflow run times regularly
- Identify bottlenecks in your pipeline
- Optimize slow steps or parallelize where possible
- Use GitHub Actions insights for analytics

### 7. Security Best Practices

- Never hardcode secrets in workflow files
- Use environment protection rules for production deployments
- Regularly rotate signing keys and credentials
- Audit third-party actions before use
- Pin actions to specific versions or commit SHAs

### 8. Cost Optimization

- Use self-hosted runners for frequent builds
- Run quick jobs on Linux when possible
- Implement caching aggressively
- Cancel redundant workflow runs
- Use smaller runner sizes when appropriate

## Troubleshooting Common Issues

### iOS Build Failures

1. **Code signing errors**: Verify certificates and profiles are not expired
2. **CocoaPods issues**: Clear the cache and reinstall pods
3. **Xcode version mismatch**: Specify the correct Xcode version in your workflow

### Android Build Failures

1. **SDK license issues**: Accept licenses programmatically
2. **Memory errors**: Increase Gradle heap size
3. **Keystore problems**: Verify base64 encoding is correct

### General Issues

1. **Timeout errors**: Increase the timeout value for long-running jobs
2. **Caching issues**: Clear caches if builds behave unexpectedly
3. **Permission errors**: Check repository and environment permissions

## Conclusion

Setting up CI/CD pipelines for React Native applications using GitHub Actions is a worthwhile investment that pays dividends in productivity, code quality, and release reliability. By following this guide, you have learned how to:

- Configure automated testing on pull requests
- Build iOS and Android apps in the cloud
- Manage code signing securely
- Handle environment variables properly
- Optimize builds with caching
- Create automated releases
- Deploy to app stores

Remember that CI/CD is not a one-time setup but an ongoing process. Continuously monitor your pipelines, optimize for speed and reliability, and adapt to new requirements as your project evolves.

With these foundations in place, your team can focus on building great features while the automation handles the repetitive tasks of building, testing, and deploying your React Native applications.

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Fastlane Documentation](https://docs.fastlane.tools/)
- [Apple Developer Documentation](https://developer.apple.com/documentation/)
- [Android Developer Documentation](https://developer.android.com/docs)
