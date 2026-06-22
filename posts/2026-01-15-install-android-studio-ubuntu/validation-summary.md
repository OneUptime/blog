# Validation Summary: How to Install Android Studio on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- Android Studio (IntelliJ IDEA based IDE)
- Ubuntu / APT package management
- Snap packaging
- OpenJDK 17
- Android SDK, sdkmanager, avdmanager
- Android Emulator (AVD) and KVM acceleration
- ADB (Android Debug Bridge) and udev rules
- Gradle / Android Gradle Plugin (Kotlin DSL)
- Kotlin / AndroidX libraries
- apksigner, zipalign, aapt2, keytool, bundletool

## Sources Consulted
- Android Studio install docs — https://developer.android.com/studio/install
- Android command-line tools / sdkmanager — https://developer.android.com/tools/sdkmanager
- avdmanager / emulator command-line reference — https://developer.android.com/studio/run/emulator-commandline
- ADB documentation — https://developer.android.com/tools/adb
- Android emulator acceleration (KVM) — https://developer.android.com/studio/run/emulator-acceleration
- Android Gradle Plugin / Gradle properties — https://developer.android.com/build and https://developer.android.com/build/optimize-your-build
- bundletool — https://developer.android.com/tools/bundletool
- Ubuntu package archive (lib32* / qemu-kvm / cpu-checker) — https://packages.ubuntu.com
- Bash manual (tilde expansion, line continuation, redirection) — https://www.gnu.org/software/bash/manual/

## Issues Found
1. **`sudo cat > /etc/udev/rules.d/51-android.rules` would fail (Device Debugging section).** The output redirection (`>`) is performed by the user's shell *before* `sudo` runs, so writing to the root-owned `/etc/udev/rules.d/` directory fails with "Permission denied". Changed to `sudo tee /etc/udev/rules.d/51-android.rules > /dev/null << 'EOF'`, which is the correct idiom for writing a privileged file from a heredoc.

2. **Broken inline comments in the emulator command (Optimize Emulator Performance section).** The block placed `# comment` text after a `\` line-continuation (`-no-boot-anim \    # Disable boot animation`). In bash the backslash escapes the trailing space rather than the newline, so the comment terminates the command and the following lines run as separate (failing) commands. Moved the per-flag explanations to comment lines above the command and left a clean multi-line `emulator` invocation.

3. **`android.enableBuildCache=true` is invalid (Optimize Gradle Build section).** This property was deprecated in Android Gradle Plugin 4.1 and removed in AGP 7.0; the post itself uses AGP 8.2.0, so this line would produce an error/warning. Removed the property and its comment. The modern `org.gradle.caching=true` (already present in the same file) is the correct replacement.

4. **`--ks=~/android-keystore/release.jks` would not resolve (bundletool / Build App Bundle section).** Bash only performs tilde expansion at the start of a word, not after `--ks=`, so bundletool would receive a literal `~` and fail to find the keystore. Changed to `--ks=$HOME/android-keystore/release.jks`, since variable expansion occurs regardless of position.

## Review Notes
- The manual download URL (`redirector.gvt1.com/.../2024.2.1.11/...`) is the host that `dl.google.com` redirects to and points to a real Ladybug build; the surrounding text correctly directs readers to https://developer.android.com/studio for the current version, so the pinned version will simply age over time (expected for this kind of guide).
- The 32-bit libraries (`lib32z1`, `lib32stdc++6`, `libc6-i386`, `lib32ncurses6`) are still installable on supported Ubuntu releases and are a long-standing recommendation; modern SDK tooling is 64-bit, so they are largely belt-and-suspenders but harmless.
- The troubleshooting section uses `sudo chmod 666 /dev/kvm` while the main KVM section uses the tighter `660` with `root:kvm` ownership. Both work; 666 is world-writable and slightly less secure but acceptable for a quick fix — left as-is since it is functionally correct.
- Gradle `org.gradle.configuration-cache=true` is valid for Gradle 7.0+; some plugins may not yet be configuration-cache compatible, which can surface warnings, but the property itself is correct.
- Theme reference `Theme.Material3.Light`, AndroidX dependency versions, `namespace`/`compileSdk = 34`/`minSdk = 24` and JDK 17 compile options are all consistent and current for the AGP 8.2 / Kotlin 1.9.20 stack used in the sample project.
