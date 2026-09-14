# How to Debug Missing Native Symbols in Sentry for iOS, Android, Flutter, and Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Sentry, Debugging, Apple, Android, Flutter

Description: Diagnose missing Sentry symbols by matching build identifiers and platform artifacts across iOS, Android, Flutter, and Windows.

---

Uploading a directory of debug files is not enough to prove that Sentry can symbolicate a particular crash. The event must identify the loaded binary, the matching debug information must be available to the correct project, and the artifact must contain the information needed for that frame.

Start with one unresolved application frame and its debug image. Match identifiers before changing release names or uploading the same directory again.

## Build an artifact map for the failing event

Sentry supports several debug-file formats, including Mach-O and dSYM information, ELF files, PE and PDB files, and ProGuard mappings. The formats solve different problems. See [Sentry's debug-file overview](https://docs.sentry.io/platforms/native/data-management/debug-files/).

| Platform or frame | Artifact to investigate |
| --- | --- |
| iOS native application frame | Matching dSYM from the distributed build |
| Android Java or Kotlin frame | R8 or ProGuard mapping for that build variant |
| Android NDK frame | Matching ELF debug information or unstripped native library |
| Flutter obfuscated Dart frame | Debug information from the exact Flutter build |
| Flutter native plugin frame | Underlying iOS or Android native symbols |
| Windows native frame | Matching PDB and relevant executable or library |

A Flutter crash may contain several categories at once. A successful R8 mapping upload cannot symbolicate a C++ frame, and an iOS dSYM does not replace missing Dart obfuscation information.

## Inspect the file before uploading it

The build-oriented `sentry-cli` includes commands to inspect debug files and search for identifiers:

```bash
sentry-cli debug-files check ./artifacts/libpayments.so.debug
sentry-cli debug-files find DEBUG_IDENTIFIER_FROM_EVENT
```

Replace the example artifact and identifier with the values from the failing build. The check reports detected identifiers, architecture, available debug features, and basic usability. It does not prove that the file matches the event or has reached the right project. See the [Sentry CLI debug-file reference](https://docs.sentry.io/cli/dif/).

Record the event's debug ID, code ID where available, module name, architecture, and release. Compare those values with the preserved build artifacts. Rebuilding the same source revision can produce different binaries and identifiers, so prefer the original CI artifacts over a new local build.

## iOS: use the archive that produced the distributed app

For Apple builds, inspect the dSYM and application binary UUIDs:

```bash
dwarfdump --uuid ./MyApp.xcarchive/dSYMs/MyApp.app.dSYM
dwarfdump --uuid ./MyApp.xcarchive/Products/Applications/MyApp.app/MyApp
```

Compare the appropriate architecture slice with the crash's loaded image. Confirm that the release configuration generated dSYMs and that the upload step uses the archive for the distributed build. An extension, framework, or native dependency may have its own symbols; uploading only the main application dSYM can leave those frames unresolved.

Sentry's [Apple dSYM guide](https://docs.sentry.io/platforms/apple/dsym/) covers symbol generation and uploading. For older builds affected by historical store-side transformations, obtain the corresponding symbols from the distribution artifacts when available; a newly generated local dSYM cannot be assumed equivalent.

## Android: separate managed mappings from native symbols

For Java and Kotlin, inspect the R8 or ProGuard mapping and the build variant that produced it. The Sentry Gradle plugin manages the mapping identifier and upload integration. Confirm that the production flavor actually executes those tasks and that CI credentials reach that job.

Native symbols are configured separately. For a project that already installs a compatible Sentry Android Gradle plugin, the Groovy configuration can include:

```groovy
sentry {
    org = "example-org"
    projectName = "android-app"
    authToken = System.getenv("SENTRY_AUTH_TOKEN")

    includeProguardMapping = true
    autoUploadProguardMapping = true
    uploadNativeSymbols = true
    autoUploadNativeSymbols = true
    includeNativeSources = false
}
```

The [official Gradle plugin documentation](https://docs.sentry.io/platforms/android/configuration/gradle/) distinguishes mapping upload, native symbol upload, and optional source upload. Enabling symbol upload cannot restore debug information that was never preserved. Keep unstripped libraries or split debug companions for every ABI you ship.

Inspect the upload log for the specific release flavor, not just an earlier debug build. If an app bundle contains multiple ABIs, verify that the affected architecture's symbols are present.

## Flutter: preserve the output of the exact obfuscated build

Default Flutter errors can have readable Dart stacks without separate uploads, but builds using split debug information or obfuscation need the generated files. Native frames still need the relevant platform artifacts. Sentry recommends its Dart plugin to gather and upload the appropriate files. See [Flutter debug symbols](https://docs.sentry.io/platforms/dart/guides/flutter/debug-symbols/).

For example, preserve the directory produced by this release build:

```bash
flutter build appbundle --release --obfuscate \
  --split-debug-info=build/sentry-symbols
```

Run the configured Sentry Dart plugin after that build in the same CI workspace, following the plugin instructions linked from the official Flutter guide. Retain the debug directory alongside the app bundle if upload happens in a later job. Keep artifacts separated by build and architecture so a subsequent build does not overwrite the symbols still needed for the release being deployed.

When only some frames remain unreadable, classify them first. Missing Dart information, an Android native library, and an iOS plugin dSYM are separate repair tasks.

## Windows: keep matching PDBs with the executable

For native Windows applications, preserve the PDBs and corresponding EXE or DLL files from the release build. A filename match such as `MyApp.pdb` is insufficient; compare the debug identifier and architecture. Public or stripped symbols may provide less information than full private debug files.

Use `debug-files check` on candidate PDBs, and inspect the event's debug image before deciding which file to upload. System library frames may require appropriate symbol sources; uploading your application PDB will not add symbols for every operating-system module. Sentry documents supported [debug files and symbol servers](https://docs.sentry.io/platforms/native/data-management/debug-files/).

## Verify upload and a new crash end to end

Upload the reviewed artifacts to the intended organization and project:

```bash
# Supply SENTRY_AUTH_TOKEN through the CI secret store.
sentry-cli debug-files upload \
  --org example-org \
  --project desktop-app \
  ./artifacts/symbols
```

If source context is required, decide separately whether uploading source bundles is permitted. Symbol names and source-code lines are related but distinct capabilities.

Verify the expected identifier in the project's debug-file inventory. Then generate a controlled crash from the same distributed build and inspect a fresh event. Do not assume historical events will automatically be reprocessed after an upload; available reprocessing behavior can depend on platform and project configuration.

Make symbol retention and upload part of the release pipeline. A useful completion record includes the binary's identifier, architecture, artifact checksum, target project, and successful fresh-event verification. That record makes the next missing-symbol report an identity check rather than a guessing exercise.

## References

- [Debug information files](https://docs.sentry.io/platforms/native/data-management/debug-files/)
- [Build CLI debug-file commands](https://docs.sentry.io/cli/dif/)
- [Apple dSYMs](https://docs.sentry.io/platforms/apple/dsym/)
- [Android Gradle plugin](https://docs.sentry.io/platforms/android/configuration/gradle/)
- [Flutter debug symbols](https://docs.sentry.io/platforms/dart/guides/flutter/debug-symbols/)
