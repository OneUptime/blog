# Fix Gradle CI Cache Misses from Paths and Environment Inputs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gradle, Build Cache, CI/CD, Java, Troubleshooting

Description: Compare Gradle task fingerprints across developer and CI environments, fix non-relocatable file inputs, and distinguish key drift from remote-cache access failures.

---

A local `FROM-CACHE` message does not prove the remote cache works in CI. The local Gradle User Home may contain the result, the CI job may calculate a different key, or the remote service may reject the request. Diagnose those possibilities separately before changing the cache configuration.

A useful first objective is to compare one expensive task for the same commit on both machines, with the same Wrapper, plugin versions, target configuration, and intended Java toolchain.

## Confirm the Local Hit Really Is Remote

Use a disposable checkout and a fresh Gradle User Home, or temporarily disable the local build-cache backend in a diagnostic configuration. Keep dependency-download costs separate from task-output restoration when interpreting elapsed time.

Inspect `--info` output for the selected cache backend, connection failures, and whether caching was disabled for the task. An existing workspace output can produce `UP-TO-DATE` without any remote request. A locally restored output can produce `FROM-CACHE` without exercising the network. [Gradle build cache](https://docs.gradle.org/current/userguide/build_cache.html).

If both environments calculate the same task key but only one restores it, inspect remote URL, credentials, read permissions, entry retention, backend errors, and cache namespace. Key normalization cannot fix an unauthorized GET.

## Compare Task Fingerprints

Capture detailed cache-key diagnostics for one task:

```bash
./gradlew :service:compileJava \
  --build-cache \
  --no-configuration-cache \
  -Dorg.gradle.caching.debug=true \
  --info > gradle-cache-local.log 2>&1
```

Run the equivalent command in CI and save its log under restricted artifact access. Replace the task path with one in your build. Diagnostic output can reveal paths, configuration values, and other internal information; review it before sharing.

Gradle documents this debug property for inspecting implementation fingerprints, input-property hashes, and file fingerprints. Compare the first differing property rather than merely noting that the final keys differ. [Cache debugging guide](https://docs.gradle.org/current/userguide/build_cache_debugging.html).

A different implementation fingerprint suggests a Wrapper, plugin, `buildSrc`, or task implementation change. A changed scalar input points toward configuration or environment. A changed file fingerprint points toward content, path sensitivity, generated inputs, or checkout differences.

## Make File Inputs Relocatable Where Semantics Allow

A custom generator may run under `/Users/alice/work/service` locally and `/home/runner/work/service/service` in CI. If its input files use absolute path sensitivity, identical file contents still have different identities.

For a task whose result depends on file contents and paths relative to the input directory, declare that relationship explicitly:

```kotlin
import org.gradle.api.DefaultTask
import org.gradle.api.file.DirectoryProperty
import org.gradle.api.file.RegularFileProperty
import org.gradle.api.provider.Property
import org.gradle.api.tasks.CacheableTask
import org.gradle.api.tasks.Input
import org.gradle.api.tasks.InputDirectory
import org.gradle.api.tasks.OutputFile
import org.gradle.api.tasks.PathSensitive
import org.gradle.api.tasks.PathSensitivity

@CacheableTask
abstract class GenerateCatalog : DefaultTask() {
    @get:InputDirectory
    @get:PathSensitive(PathSensitivity.RELATIVE)
    abstract val sourceDirectory: DirectoryProperty

    @get:Input
    abstract val schemaVersion: Property<String>

    @get:OutputFile
    abstract val catalogFile: RegularFileProperty

    // Implement the deterministic task action in the build-logic plugin.
}
```

This is the input/output declaration portion of a task, not a complete executable generator. The action must write the declared output and avoid embedding machine-specific paths.

Gradle describes absolute path-sensitive inputs as non-relocatable, including file properties without an appropriate path-sensitivity declaration. Choose `RELATIVE`, `NAME_ONLY`, or `NONE` according to actual behavior; ignoring paths when filenames affect output creates incorrect hits. [Path sensitivity and relocatability](https://docs.gradle.org/current/userguide/build_cache_concepts.html#relocatability).

## Model Environment Inputs Instead of Hiding Them

If a generator reads `SCHEMA_VERSION`, connect it to the declared property during configuration:

```kotlin
tasks.register<GenerateCatalog>("generateCatalog") {
    sourceDirectory.set(layout.projectDirectory.dir("schemas"))
    schemaVersion.set(providers.environmentVariable("SCHEMA_VERSION").orElse("v1"))
    catalogFile.set(layout.buildDirectory.file("generated/catalog.json"))
}
```

A different schema version should cause a miss. A different CI job ID should not, unless the output intentionally includes that job ID. Remove unnecessary volatile metadata from reusable outputs rather than excluding a real output dependency from the key.

Likewise, Java compiler differences can be meaningful even when they do not all affect the cache key. Gradle tracks the Java major version and, when specified through toolchains, the vendor and implementation, but not the minor version. Align the Java toolchain configuration and plugin versions before trying to normalize environment differences away.

## Inspect Generated Inputs and Checkout Behavior

A generator that writes a timestamp into source files can invalidate every downstream compilation. An archive with unstable entry ordering can change byte-level inputs. Different checkout line-ending settings can also change files even at the same Git commit.

Compare generated file contents and digests before and after moving the checkout. Check whether the task writes absolute paths into its output. Input normalization alone does not make an output portable if that output embeds the original machine's location.

Avoid overlapping output directories between unrelated tasks. That can make ownership unclear and compromise caching or incremental behavior. [Gradle cache concepts](https://docs.gradle.org/current/userguide/build_cache_concepts.html).

## Verify in Two Directories and Two Environments

Populate the cache from one directory and restore into another with identical logical inputs. Then change a meaningful input and confirm a miss. Repeat with a different harmless root path and confirm reuse.

Finally test the remote path on a fresh CI worker. Keep the result specific: the keys now match, the server accepted the read, and the restored outputs work in the relocated checkout. This validates both transport and task modeling without sacrificing correctness merely to increase hit rate.

## References

- [Gradle build-cache configuration](https://docs.gradle.org/current/userguide/build_cache.html)
- [Fingerprint debugging](https://docs.gradle.org/current/userguide/build_cache_debugging.html)
- [Relocatability and input normalization](https://docs.gradle.org/current/userguide/build_cache_concepts.html)
- [Task input/output declarations](https://docs.gradle.org/current/userguide/incremental_build.html)
