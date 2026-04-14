# Validation Summary: How to Use Dapr with Ktor Kotlin Framework

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kotlin 1.9.21
- Ktor 2.3.6 (JetBrains async web framework)
- Dapr Java SDK 1.10.0
- kotlinx-coroutines-reactor 1.7.3
- kotlinx.serialization (JSON)
- Gradle Kotlin DSL

## Sources Consulted
- Dapr Java SDK source and Maven Central (https://central.sonatype.com/artifact/io.dapr/dapr-sdk)
- Dapr Java SDK DaprClient API — `getState()` returns `Mono<State<T>>`, `saveState()` returns `Mono<Void>`, `publishEvent()` returns `Mono<Void>`
- Ktor official documentation — server serialization (https://ktor.io/docs/server-serialization.html)
- Ktor Gradle plugin portal (https://plugins.gradle.org/plugin/io.ktor.plugin)
- Ktor server engines documentation (https://ktor.io/docs/server-engines.html)
- kotlinx.coroutines reactor module docs — `awaitSingle()` (https://kotlinlang.org/api/kotlinx.coroutines/kotlinx-coroutines-reactor/kotlinx.coroutines.reactor/await-single.html)
- kotlinx.coroutines reactor module docs — `awaitSingleOrNull()` (https://kotlinlang.org/api/kotlinx.coroutines/kotlinx-coroutines-reactor/kotlinx.coroutines.reactor/await-single-or-null.html)
- Maven Central — ktor-server-content-negotiation-jvm 2.3.6, kotlinx-coroutines-reactor 1.7.3

## Issues Found

### 1. Critical: `awaitSingle()` on `Mono<Void>` causes runtime exception
- **What was wrong:** `saveState()` and `publishEvent()` in the Dapr Java SDK return `Mono<Void>`, which completes without emitting a value. Calling `.awaitSingle()` on a `Mono<Void>` always throws `NoSuchElementException` at runtime because `awaitSingle()` expects exactly one emitted element.
- **What was changed:** Replaced `.awaitSingle()` with `.awaitSingleOrNull()` on all `saveState()` and `publishEvent()` calls (4 occurrences across ProductRoutes.kt and DaprRoutes.kt code blocks). Added `import kotlinx.coroutines.reactor.awaitSingleOrNull` to both files.
- **Why:** `awaitSingleOrNull()` correctly handles `Mono<Void>` by returning `null` when the Mono completes empty, instead of throwing an exception. `awaitSingle()` remains correct for `getState()` since `Mono<State<T>>` does emit a value.

### 2. Missing Kotlin serialization Gradle plugin
- **What was wrong:** The `build.gradle.kts` plugins block was missing `kotlin("plugin.serialization")`, which is required for the `@Serializable` annotation on the `Product` data class to generate serializers at compile time. Without it, the project would fail to compile or serialize/deserialize would fail at runtime.
- **What was changed:** Added `kotlin("plugin.serialization") version "1.9.21"` to the plugins block.
- **Why:** The Kotlin serialization compiler plugin must be applied for `@Serializable` annotations to work with kotlinx.serialization.

### 3. Unused import in Application.kt
- **What was wrong:** `import kotlinx.coroutines.reactor.awaitSingle` was present in the Application.kt code block but never used in that file (no `awaitSingle()` calls exist there).
- **What was changed:** Removed the unused import from Application.kt.
- **Why:** Unused imports are misleading and suggest the import is needed in that file.

### 4. Updated Summary section
- **What was wrong:** The summary only mentioned `awaitSingle()` without distinguishing when to use `awaitSingleOrNull()`.
- **What was changed:** Updated the summary to mention both functions and explain when to use each one.
- **Why:** Since the post now uses both functions, the summary should help readers understand the distinction.

## Review Notes
- The Dapr Java SDK version 1.10.0 is functional but outdated — the latest stable version is 1.17.2. The code patterns remain valid for newer versions.
- The `DaprClient` implements `AutoCloseable` but the post does not close it on application shutdown. This is acceptable for a tutorial (the client lives for the app's lifetime), but production code should register a shutdown hook via Ktor's `ApplicationStopped` event.
- The approach of storing all products in a single "all-products" state key and loading/saving the entire list is a simplification for tutorial purposes. In production, Dapr's state query API or a proper database would be more appropriate.
- Ktor 3.x is now available, but the 2.x APIs shown remain supported. The post's version choices are consistent with each other (Kotlin 1.9.21, Ktor 2.3.6, coroutines 1.7.3).
