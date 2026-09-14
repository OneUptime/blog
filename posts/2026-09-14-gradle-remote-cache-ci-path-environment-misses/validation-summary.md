# Validation Summary: Why Gradle Remote Cache Hits Locally but Misses in CI: Paths, Environment Inputs, and Non-Relocatable Tasks

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Gradle Build Cache
- Gradle Kotlin DSL
- Gradle Provider API
- Java toolchains
- CI/CD build environments

## Sources Consulted
- [Gradle Build Cache](https://docs.gradle.org/current/userguide/build_cache.html)
- [Debugging and diagnosing Build Cache misses](https://docs.gradle.org/current/userguide/build_cache_debugging.html)
- [Important Build Cache concepts](https://docs.gradle.org/current/userguide/build_cache_concepts.html)
- [Incremental build and task input/output declarations](https://docs.gradle.org/current/userguide/incremental_build.html)
- [Gradle command-line interface](https://docs.gradle.org/current/userguide/command_line_interface.html)
- [Solving common Build Cache problems](https://docs.gradle.org/current/userguide/common_caching_problems.html)
- [ProviderFactory API](https://docs.gradle.org/current/javadoc/org/gradle/api/provider/ProviderFactory.html)

## Issues Found
- The discussion of compiler identity implied that an executable path could stand in for a meaningful toolchain difference. Replaced it with Gradle's documented Java-version tracking behavior: the major version is tracked, vendor and implementation are tracked when specified through toolchains, and the minor version is not tracked. This makes the cache-key caveat precise and avoids suggesting that absolute executable paths should be normalized or compared as toolchain identity.

## Review Notes
- The Kotlin task declaration is intentionally partial and correctly identifies that a deterministic `@TaskAction` is still required.
- The command uses current Gradle options and the documented `org.gradle.caching.debug` system property.
- Path sensitivity, local-versus-remote cache lookup behavior, environment providers, generated-input stability, and overlapping-output guidance agree with current Gradle documentation.
