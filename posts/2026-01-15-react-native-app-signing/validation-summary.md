# Validation Summary: How to Configure App Signing for iOS and Android in React Native

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- React Native (iOS and Android app distribution)
- iOS code signing: certificates, provisioning profiles, App IDs, entitlements
- Apple Developer Portal / Xcode signing
- macOS Keychain (`security` CLI)
- OpenSSL (CSR generation)
- Fastlane / Fastlane Match
- Android keystores (`keytool`, `apksigner`, `jarsigner`, `bundletool`)
- Gradle signing configurations (`build.gradle`, `gradle.properties`)
- Google Play App Signing (upload key vs app signing key)
- GitHub Actions CI/CD
- HashiCorp Vault (access control example)

## Sources Consulted
- Apple Code Signing Guide — https://developer.apple.com/support/code-signing/
- Android App Signing Documentation — https://developer.android.com/studio/publish/app-signing
- apksigner reference (key rotation / lineage) — https://developer.android.com/studio/command-line/apksigner
- Installing an Apple certificate on macOS runners for Xcode development (GitHub Actions) — https://docs.github.com/en/actions/use-cases-and-examples/deploying/installing-an-apple-certificate-on-macos-runners-for-xcode-development
- Fastlane Match Documentation — https://docs.fastlane.tools/actions/match/
- Google Play App Signing — https://support.google.com/googleplay/android-developer/answer/9842756

## Issues Found
1. **Incorrect apksigner key rotation command order (fixed).** In the "Android Key Rotation" section, the `apksigner sign` command listed the signers in the wrong order — it signed with `new-keystore.jks` first and supplied `old-keystore.jks` via `--next-signer`. Per the official apksigner documentation, signers must be listed in lineage order (old signer first, new signer via `--next-signer`), e.g. `apksigner sign --ks release.jks --next-signer --ks release2.jks --lineage <file> app.apk`. As written, the signer order would not match the lineage and the command would fail. Fixed by reversing the signer order so the old key is first and the new key follows `--next-signer`. Also added the missing `apksigner rotate` command that creates the `lineage.bin` file the original snippet referenced but never showed how to produce.

## Review Notes
- The GitHub Actions iOS keychain workflow (`security create-keychain`, `set-keychain-settings -lut 21600`, `security import ... -A -t cert -f pkcs12`, `set-key-partition-list`, `list-keychain -d user -s`, and `base64 --decode -o`) matches GitHub's official "Installing an Apple certificate on macOS runners" documentation verbatim and is correct for `macos-latest` runners.
- The iOS concepts (development vs distribution certificates, provisioning profile types, Ad Hoc 100-devices-per-device-type-per-year limit, App ID = Team ID prefix + Bundle ID, ~1-year certificate expiry) are accurate.
- Android `keytool -genkeypair` with `-storetype PKCS12`, `-validity 10000`, and the Gradle `signingConfigs`/`buildTypes` setup follow current React Native and Android guidance.
- `keytool -export` is a legacy alias for `-exportcert`; it still works but `-exportcert` is the modern preferred form. Not changed as it is not an error.
- The post mixes `jarsigner -verify` and `apksigner verify` for signature verification. Both work; `apksigner verify` is Google's recommended tool for APKs, and the post already includes it.
- Google Play App Signing distinctions (upload key vs app signing key, upload key reset flow) are accurate.
- No version-specific information is outdated as of the validation date.
