# Validation Summary: How to Build Kotlin Multiplatform Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kotlin Multiplatform (KMP) 1.9.22
- Gradle Kotlin DSL (Android Gradle Plugin 8.2.0)
- Ktor client 2.3.7 (core, content-negotiation, kotlinx-json, android, darwin, cio, js engines)
- kotlinx.coroutines 1.7.3 / Flows / StateFlow
- kotlinx.serialization 1.6.2
- Kotlin/Native (iOS targets: iosArm64, iosSimulatorArm64)
- Kotlin/JS (IR backend, webpack)
- Android Jetpack Security (EncryptedSharedPreferences, MasterKey)
- Android Jetpack Compose (Material3)
- SwiftUI / Combine / Swift Concurrency
- iOS Keychain (Security framework via kotlinx.cinterop)
- CocoaPods integration plugin
- XCFramework distribution

## Sources Consulted
- Kotlin Multiplatform docs — hierarchical project structure & default hierarchy template (https://kotlinlang.org/docs/multiplatform-hierarchy.html)
- What's new in Kotlin 1.9.20 — Default Hierarchy Template (https://kotlinlang.org/docs/whatsnew1920.html)
- Kotlin/Native CocoaPods integration (https://kotlinlang.org/docs/native-cocoapods.html)
- Build final native binaries / XCFramework (https://kotlinlang.org/docs/multiplatform-build-native-binaries.html)
- Ktor client dependencies (https://ktor.io/docs/client-dependencies.html) and engines (https://ktor.io/docs/client-engines.html)
- Maven Central — Ktor 2.3.7 artifact IDs
- Kotlin Gradle compiler options (`kotlinOptions` vs `compilerOptions`) (https://kotlinlang.org/docs/gradle-compiler-options.html)
- Connecting to platform APIs from Kotlin/Native (https://kotlinlang.org/docs/multiplatform/multiplatform-connect-to-apis.html)
- SKIE — Flow / StateFlow as Swift AsyncSequence (https://skie.touchlab.co/features/)
- KMP-NativeCoroutines wrappers for Swift async usage of Kotlin Flow

## Issues Found
1. **`AuthUseCase.getToken()` was called but never defined.** `UserViewModel.checkAuthStatus()` called `authUseCase.getToken()`, but `AuthUseCase` only exposed `login`, `isLoggedIn`, and `logout`. Added `suspend fun getToken(): String? = tokenStorage.getToken()` to `AuthUseCase` so the existing call site resolves.

2. **`FakeTokenStorage : TokenStorageInterface` referenced an interface that didn't exist.** The original `TokenStorage` was declared as an `expect class`, which can't be subclassed in `commonTest`. Rewrote the section to introduce a `TokenStorage` interface in `commonMain` and make `FakeTokenStorage` implement it. Also added a one-line explanation of why the abstraction is needed.

3. **CocoaPods snippet was missing the `kotlin("native.cocoapods")` plugin.** The `cocoapods { ... }` DSL is provided by a separate plugin that is not bundled with `kotlin("multiplatform")`. Added the plugin to the `plugins { }` block in the CocoaPods snippet.

4. **Manual `val iosMain by creating { dependsOn(commonMain) }` conflicts with Kotlin 1.9.20+ default hierarchy template.** Since the template auto-creates `iosMain` (with `iosArm64Main`/`iosSimulatorArm64Main` already depending on it), `by creating` would fail and the explicit `dependsOn(iosMain)` wiring is redundant. Switched to `val iosMain by getting` to attach the Darwin Ktor engine, and removed the redundant manual wiring with a short comment explaining the template.

5. **Swift `for await state in viewModel.uiState` does not compile without a Flow→AsyncSequence wrapper.** Vanilla Kotlin/Native does not expose `StateFlow` as Swift's `AsyncSequence`. The prose already hinted at "helper wrappers" but the code looked drop-in. Added an inline comment naming SKIE / KMP-NativeCoroutines as the libraries that generate the `for await` bridge.

6. **iOS `KeychainHelper` used non-existent helpers (`toCFDictionary`, `toNSData`, `NSData.fromCFData`, `toByteArray`).** None of these are in `kotlinx.cinterop` or `platform.Foundation`. Rather than rewriting the example into a full CF/NSData interop block, added a clear note above the helper class stating the conversion helpers must be implemented by the reader (or replaced with a library like Multiplatform Settings) so readers don't expect the code to compile as-is.

## Review Notes
- `androidTarget { compilations.all { kotlinOptions { jvmTarget = "17" } } }` is valid for Kotlin 1.9.22 but uses the deprecated `kotlinOptions` DSL. The migration target is `compilerOptions { jvmTarget.set(JvmTarget.JVM_17) }`. Left as-is since the post pins to 1.9.22 where it still works, but flagging for a future refresh.
- `Build.ID` on Android returns a build fingerprint, not a unique device identifier — same value across all devices on the same OS build. `Settings.Secure.ANDROID_ID` would be a better choice for a real device ID, but `Build.ID` compiles and matches the example's "just illustrate the pattern" framing.
- The `assembleXCFramework` Gradle task only exists when `XCFramework("SharedKit")` is explicitly configured and each target's `framework { ... }` block calls `xcFramework.add(this)`. The post's iOS framework configuration snippet does not do this, so as written `./gradlew :shared:assembleXCFramework` would not exist. Did not edit because the CocoaPods section (which is the more idiomatic distribution path) is shown later and works on its own; readers using XCFramework should consult the official Kotlin docs.
- `kotlin.mpp.applyDefaultHierarchyTemplate=true` is the default in 1.9.22, which is what makes the simplified `iosMain by getting` work. No `gradle.properties` change is needed.
- `CoroutineScope(Dispatchers.Default)` inside `UserViewModel` is never cancelled, which would leak coroutines if the view model is recreated. Acceptable for an example, but a real implementation should expose a `close()` / lifecycle integration.
- The post uses `js(IR)` for the web target. This is valid in 1.9.22, where IR is the only remaining backend; `js { ... }` would behave identically. No change needed.
- The Swift `case is UserUiState.Initial` syntax relies on Kotlin/Native exposing each `object`/`data class` member of the sealed class as a distinct Objective-C class. That is how the K/N exporter behaves in practice, so the snippet is fine, but the exact generated class names can vary by configuration — readers who hit symbol-name issues should check the generated framework headers.
