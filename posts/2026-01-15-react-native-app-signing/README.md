# How to Configure App Signing for iOS and Android in React Native

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, App Signing, iOS, Android, Code Signing, Certificates, Mobile Development

Description: Learn how to properly configure code signing for iOS and Android React Native apps for distribution.

---

Code signing is one of the most critical yet often misunderstood aspects of mobile app development. Whether you are preparing your React Native app for the App Store, Google Play, or enterprise distribution, understanding how to properly configure app signing is essential. This comprehensive guide walks you through everything you need to know about configuring code signing for both iOS and Android platforms in your React Native applications.

## Why Code Signing Matters

Code signing serves as the foundation of trust in the mobile ecosystem. When users download your app, they need assurance that the app genuinely comes from you and has not been tampered with since you built it. Code signing provides this guarantee through cryptographic verification.

### Security Benefits

Code signing protects your users in several ways:

1. **Identity Verification**: Code signing certificates are issued only after verifying the identity of the developer or organization, ensuring users know who created the app.

2. **Integrity Protection**: Any modification to a signed app invalidates the signature, making it impossible for malicious actors to inject code into your application without detection.

3. **Trust Chain**: Both Apple and Google maintain strict requirements for code signing, creating a chain of trust from the developer to the end user.

4. **Update Authentication**: The system verifies that app updates come from the same developer who published the original app, preventing unauthorized updates.

### Platform Requirements

Both Apple and Google require apps to be signed before distribution:

- **iOS**: All apps must be signed with a valid Apple Developer certificate and provisioning profile
- **Android**: All APKs and App Bundles must be signed with a keystore before upload to Google Play

Failing to properly configure code signing will prevent your app from being installed on devices or accepted by app stores.

## iOS Code Signing Concepts

iOS code signing involves multiple interconnected components that work together to establish trust. Understanding these concepts is crucial before diving into configuration.

### Certificates

A certificate is a digital document that binds your identity to a public key. Apple issues two main types of certificates for app development:

**Development Certificates** are used during the development phase. They allow you to install and debug apps on physical devices registered to your Apple Developer account. Development-signed apps can only run on specific devices.

**Distribution Certificates** are used for App Store submissions and enterprise distribution. These certificates are required when building release versions of your app for public distribution.

Each certificate contains:
- Your public key
- Your identity information (name, team ID)
- Apple's signature validating the certificate
- An expiration date (typically one year)

### Provisioning Profiles

A provisioning profile links your certificate, app identifier, and device capabilities together. Think of it as a permission slip that tells iOS what your app is allowed to do and where it can run.

Provisioning profiles come in several types:

**Development Profiles** are tied to specific device UDIDs and development certificates. They enable testing on registered devices during development.

**Ad Hoc Profiles** allow distribution to a limited number of registered devices (up to 100 per device type per year) outside the App Store. Useful for beta testing.

**App Store Profiles** are used exclusively for App Store distribution. They do not contain device lists since App Store apps can run on any device.

**Enterprise Profiles** are available only to organizations enrolled in the Apple Developer Enterprise Program. They allow internal distribution without device limits.

### App Identifiers

An App ID uniquely identifies your application within Apple's ecosystem. It consists of two parts:

1. **Team ID**: A 10-character alphanumeric string assigned by Apple to your developer account
2. **Bundle ID**: A reverse domain notation identifier you choose (e.g., `com.yourcompany.yourapp`)

The combination creates a unique identifier like `ABC123DEF4.com.yourcompany.yourapp`.

### Entitlements

Entitlements are key-value pairs that grant your app access to specific capabilities and services. Common entitlements include:

- Push notifications
- App Groups (for sharing data between apps)
- iCloud
- Associated Domains
- HealthKit
- Apple Pay

Entitlements must be configured in both your provisioning profile and your app's code signature.

## Creating iOS Certificates

Let us walk through the process of creating the certificates needed for your React Native iOS app.

### Generating a Certificate Signing Request

Before Apple can issue you a certificate, you need to generate a Certificate Signing Request (CSR):

```bash
# Open Keychain Access on your Mac
# From the menu: Keychain Access > Certificate Assistant > Request a Certificate From a Certificate Authority

# Fill in:
# - User Email Address: your@email.com
# - Common Name: Your Name or Company Name
# - CA Email Address: Leave empty
# - Request is: Saved to disk

# This creates a .certSigningRequest file
```

Alternatively, you can generate a CSR from the command line:

```bash
# Generate a new private key and CSR
openssl req -new -newkey rsa:2048 -nodes \
  -keyout ios_distribution.key \
  -out ios_distribution.csr \
  -subj "/emailAddress=your@email.com/CN=Your Name/C=US"
```

### Creating Certificates in Apple Developer Portal

Navigate to the Apple Developer Portal and follow these steps:

1. Go to **Certificates, Identifiers & Profiles**
2. Click the **+** button to create a new certificate
3. Select the certificate type:
   - **Apple Development** for development
   - **Apple Distribution** for App Store and Ad Hoc distribution
4. Upload your CSR file
5. Download the generated certificate (.cer file)
6. Double-click to install it in your Keychain

### Using Xcode for Certificate Management

Xcode can automatically manage certificates for you:

1. Open your React Native project in Xcode (open the `.xcworkspace` file)
2. Select your project in the navigator
3. Select your target
4. Go to the **Signing & Capabilities** tab
5. Check **Automatically manage signing**
6. Select your team from the dropdown

Xcode will automatically create and download the necessary certificates and provisioning profiles.

### Manual Certificate Installation

If you received a certificate from another team member or need to install manually:

```bash
# Install certificate from command line
security import certificate.cer -k ~/Library/Keychains/login.keychain-db

# Or double-click the .cer file to install via Keychain Access
```

## iOS Provisioning Profiles

Provisioning profiles tie everything together and must be configured correctly for your app to run.

### Creating Provisioning Profiles

In the Apple Developer Portal:

1. Go to **Profiles** in the sidebar
2. Click **+** to create a new profile
3. Select the profile type based on your needs
4. Select your App ID
5. Select the certificate(s) to include
6. For development/ad hoc, select the devices to include
7. Name your profile descriptively
8. Download and install the profile

### Installing Provisioning Profiles

Provisioning profiles can be installed in several ways:

```bash
# Install via command line
mkdir -p ~/Library/MobileDevice/Provisioning\ Profiles
cp your_profile.mobileprovision ~/Library/MobileDevice/Provisioning\ Profiles/

# Or drag the .mobileprovision file onto Xcode
# Or double-click the file to install automatically
```

### Configuring React Native iOS Project

In your React Native project, open `ios/YourApp.xcworkspace` in Xcode and configure signing:

```ruby
# ios/Podfile - Ensure your deployment target is set
platform :ios, '13.0'
```

For manual signing, configure your `project.pbxproj` or use Xcode:

1. Select your project in Xcode
2. Go to **Build Settings**
3. Search for "Code Signing"
4. Configure:
   - **Code Signing Identity**: Select your certificate
   - **Development Team**: Your team ID
   - **Provisioning Profile**: Select appropriate profile

### Fastlane Match for Team Signing

For teams, Fastlane Match provides a elegant solution for sharing certificates:

```ruby
# Gemfile
gem 'fastlane'

# fastlane/Matchfile
git_url("https://github.com/your-org/certificates")
storage_mode("git")
type("appstore")
app_identifier(["com.yourcompany.yourapp"])
username("your@email.com")
```

```bash
# Initialize match (run once)
fastlane match init

# Generate and store certificates
fastlane match development
fastlane match appstore

# On CI or new machines, fetch existing certificates
fastlane match development --readonly
fastlane match appstore --readonly
```

## Keychain Management

The macOS Keychain stores your certificates and private keys securely. Proper keychain management is essential, especially in CI/CD environments.

### Creating a Dedicated Keychain

For CI/CD, create a separate keychain to avoid conflicts:

```bash
# Create a new keychain
security create-keychain -p "$KEYCHAIN_PASSWORD" build.keychain

# Set it as the default keychain
security default-keychain -s build.keychain

# Unlock the keychain
security unlock-keychain -p "$KEYCHAIN_PASSWORD" build.keychain

# Set keychain timeout (0 = no timeout)
security set-keychain-settings -t 3600 -u build.keychain

# Add to search list
security list-keychains -d user -s build.keychain login.keychain
```

### Importing Certificates into Keychain

```bash
# Import a .p12 certificate (includes private key)
security import certificate.p12 \
  -k build.keychain \
  -P "$P12_PASSWORD" \
  -T /usr/bin/codesign \
  -T /usr/bin/security

# Allow codesign to access the keychain without prompts
security set-key-partition-list -S apple-tool:,apple:,codesign: \
  -s -k "$KEYCHAIN_PASSWORD" build.keychain
```

### Exporting Certificates for Backup

Always maintain secure backups of your certificates:

```bash
# Export certificate with private key as .p12
security export -k login.keychain -t identities -f pkcs12 \
  -o backup_certificate.p12 -P "$BACKUP_PASSWORD"
```

### Cleaning Up Keychains

After CI/CD builds, clean up:

```bash
# Delete the build keychain
security delete-keychain build.keychain

# Reset to default keychain
security default-keychain -s login.keychain
```

## Android Keystore Creation

Android uses keystores to sign apps. A keystore is a binary file containing one or more private keys and their associated certificates.

### Understanding Keystores

Android distinguishes between two types of keystores in modern development:

**Upload Keystore**: Used to sign the app bundle before uploading to Google Play. Google Play uses this to verify uploads come from you.

**App Signing Key**: Managed by Google Play App Signing. This key signs the final APKs delivered to users. Google stores this key securely.

### Generating a New Keystore

Use the `keytool` utility included with Java:

```bash
# Generate a new keystore with a new key pair
keytool -genkeypair \
  -v \
  -storetype PKCS12 \
  -keystore my-upload-key.keystore \
  -alias my-key-alias \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# You will be prompted for:
# - Keystore password
# - Key password (can be same as keystore)
# - Your name (CN)
# - Organizational unit (OU)
# - Organization (O)
# - City/Locality (L)
# - State/Province (ST)
# - Country code (C)
```

For non-interactive generation (useful in scripts):

```bash
keytool -genkeypair \
  -v \
  -storetype PKCS12 \
  -keystore my-upload-key.keystore \
  -alias my-key-alias \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -dname "CN=Your Name, OU=Your Unit, O=Your Organization, L=City, ST=State, C=US" \
  -storepass "$STORE_PASSWORD" \
  -keypass "$KEY_PASSWORD"
```

### Viewing Keystore Information

Inspect your keystore contents:

```bash
# List entries in the keystore
keytool -list -v -keystore my-upload-key.keystore

# Export the certificate (public key) for verification
keytool -export -alias my-key-alias \
  -keystore my-upload-key.keystore \
  -file my-certificate.cer
```

### Storing the Keystore Securely

Place your keystore in a secure location:

```bash
# For local development
mv my-upload-key.keystore android/app/

# Or store in a secure location outside the repository
mv my-upload-key.keystore ~/.android/keystores/
```

Never commit your keystore to version control. Add it to `.gitignore`:

```gitignore
# android/.gitignore
*.keystore
*.jks
```

## Signing Configurations in Gradle

Configure your Android project to use the keystore for signing release builds.

### Setting Up gradle.properties

Store keystore credentials securely in `gradle.properties`:

```properties
# android/gradle.properties

# For local development only - do not commit this file with actual values
MYAPP_UPLOAD_STORE_FILE=my-upload-key.keystore
MYAPP_UPLOAD_KEY_ALIAS=my-key-alias
MYAPP_UPLOAD_STORE_PASSWORD=*****
MYAPP_UPLOAD_KEY_PASSWORD=*****
```

### Configuring build.gradle

Modify your app's `build.gradle` to use the signing configuration:

```groovy
// android/app/build.gradle

android {
    ...

    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (project.hasProperty('MYAPP_UPLOAD_STORE_FILE')) {
                storeFile file(MYAPP_UPLOAD_STORE_FILE)
                storePassword MYAPP_UPLOAD_STORE_PASSWORD
                keyAlias MYAPP_UPLOAD_KEY_ALIAS
                keyPassword MYAPP_UPLOAD_KEY_PASSWORD
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
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Environment Variable Configuration

For more secure configurations, use environment variables:

```groovy
// android/app/build.gradle

android {
    signingConfigs {
        release {
            storeFile file(System.getenv("KEYSTORE_FILE") ?: "placeholder.keystore")
            storePassword System.getenv("KEYSTORE_PASSWORD") ?: ""
            keyAlias System.getenv("KEY_ALIAS") ?: ""
            keyPassword System.getenv("KEY_PASSWORD") ?: ""
        }
    }
}
```

### Building a Signed Release

Build your signed release bundle:

```bash
# Navigate to android directory
cd android

# Build release AAB (App Bundle) - recommended for Play Store
./gradlew bundleRelease

# Or build release APK
./gradlew assembleRelease

# Output locations:
# AAB: android/app/build/outputs/bundle/release/app-release.aab
# APK: android/app/build/outputs/apk/release/app-release.apk
```

### Verifying the Signature

Confirm your app is signed correctly:

```bash
# For APK
jarsigner -verify -verbose -certs app-release.apk

# For AAB (using bundletool)
bundletool validate --bundle=app-release.aab

# Check signing certificate details
keytool -printcert -jarfile app-release.apk
```

## Key Security Best Practices

Protecting your signing keys is paramount. A compromised key could allow attackers to distribute malicious updates to your users.

### Secure Storage

Follow these guidelines for key storage:

1. **Never commit keys to version control**: Add keystores and certificates to `.gitignore`
2. **Use encrypted storage**: Store keys in encrypted vaults or secure credential managers
3. **Limit access**: Only team members who need signing access should have key access
4. **Use separate keys for different environments**: Development, staging, and production should use different keys

### Password Management

Implement strong password practices:

```bash
# Generate a strong random password
openssl rand -base64 32

# Store passwords in a secure vault like:
# - 1Password
# - HashiCorp Vault
# - AWS Secrets Manager
# - Azure Key Vault
# - Google Secret Manager
```

### Key Backup Strategy

Implement a robust backup strategy:

1. **Create encrypted backups** of your keystores and certificates
2. **Store backups in multiple secure locations** (different physical locations)
3. **Document the recovery process** for your team
4. **Test restoration periodically** to ensure backups are valid
5. **Use Google Play App Signing** to delegate key security to Google

### Access Control

Implement proper access controls:

```yaml
# Example: Using HashiCorp Vault policies
path "secret/mobile/signing/*" {
  capabilities = ["read"]
}

path "secret/mobile/signing/production/*" {
  capabilities = ["read"]
  # Restrict to specific CI/CD service accounts
  allowed_parameters = {
    "service" = ["ci-service"]
  }
}
```

## CI/CD Signing Setup

Automating code signing in CI/CD pipelines requires careful handling of secrets.

### GitHub Actions Configuration

```yaml
# .github/workflows/build.yml
name: Build and Sign

on:
  push:
    branches: [main]

jobs:
  build-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Apple Certificate
        env:
          BUILD_CERTIFICATE_BASE64: ${{ secrets.BUILD_CERTIFICATE_BASE64 }}
          P12_PASSWORD: ${{ secrets.P12_PASSWORD }}
          KEYCHAIN_PASSWORD: ${{ secrets.KEYCHAIN_PASSWORD }}
        run: |
          # Create variables
          CERTIFICATE_PATH=$RUNNER_TEMP/build_certificate.p12
          KEYCHAIN_PATH=$RUNNER_TEMP/app-signing.keychain-db

          # Import certificate from secrets
          echo -n "$BUILD_CERTIFICATE_BASE64" | base64 --decode -o $CERTIFICATE_PATH

          # Create temporary keychain
          security create-keychain -p "$KEYCHAIN_PASSWORD" $KEYCHAIN_PATH
          security set-keychain-settings -lut 21600 $KEYCHAIN_PATH
          security unlock-keychain -p "$KEYCHAIN_PASSWORD" $KEYCHAIN_PATH

          # Import certificate to keychain
          security import $CERTIFICATE_PATH -P "$P12_PASSWORD" \
            -A -t cert -f pkcs12 -k $KEYCHAIN_PATH
          security list-keychain -d user -s $KEYCHAIN_PATH

      - name: Install Provisioning Profile
        env:
          PROVISIONING_PROFILE_BASE64: ${{ secrets.PROVISIONING_PROFILE_BASE64 }}
        run: |
          PP_PATH=$RUNNER_TEMP/build_pp.mobileprovision
          echo -n "$PROVISIONING_PROFILE_BASE64" | base64 --decode -o $PP_PATH
          mkdir -p ~/Library/MobileDevice/Provisioning\ Profiles
          cp $PP_PATH ~/Library/MobileDevice/Provisioning\ Profiles

      - name: Build iOS
        run: |
          cd ios
          xcodebuild -workspace YourApp.xcworkspace \
            -scheme YourApp \
            -configuration Release \
            -archivePath $RUNNER_TEMP/YourApp.xcarchive \
            archive

  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup JDK
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'

      - name: Decode Keystore
        env:
          KEYSTORE_BASE64: ${{ secrets.KEYSTORE_BASE64 }}
        run: |
          echo "$KEYSTORE_BASE64" | base64 --decode > android/app/my-upload-key.keystore

      - name: Build Android
        env:
          MYAPP_UPLOAD_STORE_FILE: my-upload-key.keystore
          MYAPP_UPLOAD_KEY_ALIAS: ${{ secrets.KEY_ALIAS }}
          MYAPP_UPLOAD_STORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
          MYAPP_UPLOAD_KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}
        run: |
          cd android
          ./gradlew bundleRelease
```

### Fastlane Integration

Fastlane simplifies CI/CD signing significantly:

```ruby
# fastlane/Fastfile
default_platform(:ios)

platform :ios do
  desc "Build and sign iOS app"
  lane :build do
    # Fetch certificates using match
    match(
      type: "appstore",
      readonly: is_ci,
      keychain_name: ENV["MATCH_KEYCHAIN_NAME"],
      keychain_password: ENV["MATCH_KEYCHAIN_PASSWORD"]
    )

    # Build the app
    build_app(
      workspace: "YourApp.xcworkspace",
      scheme: "YourApp",
      export_method: "app-store"
    )
  end
end

platform :android do
  desc "Build and sign Android app"
  lane :build do
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
end
```

### Secrets Management

Encode your secrets for CI/CD:

```bash
# Encode keystore to base64 for GitHub Secrets
base64 -i my-upload-key.keystore | pbcopy

# Encode iOS certificate
base64 -i certificate.p12 | pbcopy

# Encode provisioning profile
base64 -i profile.mobileprovision | pbcopy
```

## Google Play App Signing

Google Play App Signing is a service that manages your app's signing key securely.

### Enabling App Signing by Google Play

When you first upload your app to Google Play Console:

1. Go to **Release > Setup > App signing**
2. Choose how to manage your app signing key:
   - **Let Google generate your key** (recommended for new apps)
   - **Export and upload your key** (for existing apps)
   - **Upload your existing key** (for migration)

### Benefits of Google Play App Signing

1. **Key Security**: Google stores your app signing key in secure infrastructure
2. **Key Recovery**: If you lose your upload key, you can request a new one
3. **Key Upgrades**: Google can upgrade your app's cryptographic signature
4. **Smaller Downloads**: Enables optimized APK delivery

### Upload Key vs App Signing Key

Understanding the distinction:

- **Upload Key**: You maintain this key locally. Used to sign app bundles before uploading.
- **App Signing Key**: Managed by Google. Used to sign the final APKs users download.

### Resetting Your Upload Key

If your upload key is compromised:

1. Go to **Release > Setup > App signing** in Google Play Console
2. Click **Request upload key reset**
3. Generate a new upload key and provide the certificate
4. Google will review and approve the request
5. Use the new upload key for future uploads

```bash
# Generate a new upload key
keytool -genkeypair \
  -v \
  -storetype PKCS12 \
  -keystore new-upload-key.keystore \
  -alias upload \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# Export the certificate to submit to Google
keytool -export -rfc \
  -keystore new-upload-key.keystore \
  -alias upload \
  -file upload_certificate.pem
```

## Troubleshooting Signing Issues

Code signing errors are common. Here are solutions to the most frequent problems.

### iOS Signing Issues

**"No signing certificate found"**

```bash
# Verify certificates are installed
security find-identity -v -p codesigning

# If empty, install your certificate:
security import certificate.p12 -k ~/Library/Keychains/login.keychain-db -P "$PASSWORD"
```

**"Provisioning profile doesn't include signing certificate"**

The certificate in your profile does not match your installed certificate. Solutions:
1. Download a new provisioning profile that includes your certificate
2. Or regenerate your certificate and update the profile

**"The executable was signed with invalid entitlements"**

Your entitlements file does not match the provisioning profile:

```bash
# Extract entitlements from provisioning profile
security cms -D -i profile.mobileprovision | \
  plutil -extract Entitlements xml1 -o entitlements.plist -
```

**Keychain access issues in CI**

```bash
# Ensure keychain is unlocked and codesign can access it
security unlock-keychain -p "$PASSWORD" build.keychain
security set-key-partition-list -S apple-tool:,apple:,codesign: \
  -s -k "$PASSWORD" build.keychain
```

### Android Signing Issues

**"Key was created with errors"**

Verify your keystore is valid:

```bash
keytool -list -v -keystore my-upload-key.keystore
```

**"The APK failed to install"**

Check if the APK is signed:

```bash
# Verify signature
apksigner verify --print-certs app-release.apk

# Or using jarsigner
jarsigner -verify -verbose app-release.apk
```

**"Keystore password was incorrect"**

Ensure you are using the correct password. Passwords are case-sensitive.

**"No key with alias found in keystore"**

List available aliases:

```bash
keytool -list -keystore my-upload-key.keystore
```

**"Your Android App Bundle is signed with the wrong key"**

You are using a different key than previously uploaded. Solutions:
1. Use the original upload key
2. If lost, request an upload key reset through Google Play Console

### Debugging Signing Configuration

Enable verbose output to diagnose issues:

```bash
# iOS - Verbose build
xcodebuild -workspace YourApp.xcworkspace \
  -scheme YourApp \
  -configuration Release \
  CODE_SIGN_VERBOSE=YES \
  archive

# Android - Debug signing
./gradlew assembleRelease --info --debug 2>&1 | grep -i sign
```

## Rotating Signing Keys

Key rotation may be necessary due to security incidents, policy changes, or key expiration.

### iOS Certificate Rotation

iOS certificates typically expire after one year. Plan for rotation:

1. **Before expiration**: Generate a new certificate
2. **Update provisioning profiles**: Include the new certificate
3. **Test thoroughly**: Ensure the app signs and installs correctly
4. **Update CI/CD**: Replace certificate secrets
5. **Revoke old certificate**: After confirming the new one works

```bash
# Check certificate expiration
security find-certificate -c "Apple Distribution" -p | \
  openssl x509 -noout -enddate
```

### Android Key Rotation

Android supports key rotation through APK Signature Scheme v3:

```bash
# Using apksigner with lineage for key rotation
apksigner sign \
  --ks new-keystore.jks \
  --ks-key-alias new-alias \
  --lineage lineage.bin \
  --next-signer --ks old-keystore.jks \
  --ks-key-alias old-alias \
  app.apk
```

For apps using Google Play App Signing, contact Google Play support for app signing key upgrades.

### Creating a Key Rotation Plan

Document your rotation procedure:

1. **Inventory**: List all keys, their locations, and expiration dates
2. **Calendar**: Set reminders 60 days before expiration
3. **Procedure**: Document step-by-step rotation process
4. **Testing**: Define test cases to verify new keys work
5. **Rollback**: Plan for reverting if issues arise
6. **Communication**: Notify team members of the rotation

## Conclusion

Properly configuring code signing for your React Native app is essential for distributing your application securely. While the process involves multiple components and can seem complex initially, understanding the fundamentals of certificates, keystores, and provisioning profiles will serve you well throughout your mobile development career.

Key takeaways:

1. **Plan ahead**: Set up signing infrastructure early in development
2. **Automate with CI/CD**: Use tools like Fastlane and GitHub Actions to streamline signing
3. **Secure your keys**: Treat signing keys as critical secrets
4. **Use Google Play App Signing**: Let Google manage your app signing key for Android
5. **Document everything**: Maintain clear documentation for your team
6. **Monitor expiration**: Calendar reminders prevent last-minute scrambles

By following the practices outlined in this guide, you will have a robust, secure, and maintainable code signing setup for your React Native applications. Remember that security is an ongoing process, so regularly review and update your signing configurations as best practices evolve.

## Additional Resources

- [Apple Code Signing Guide](https://developer.apple.com/support/code-signing/)
- [Android App Signing Documentation](https://developer.android.com/studio/publish/app-signing)
- [Fastlane Match Documentation](https://docs.fastlane.tools/actions/match/)
- [Google Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756)
- [React Native Signed APK Guide](https://reactnative.dev/docs/signed-apk-android)
