# Gradle `FROM-CACHE` vs `UP-TO-DATE` vs Configuration Cache: What Was Actually Reused?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gradle, Java, Build Cache, Performance, CI/CD

Description: Interpret Gradle reuse correctly by separating workspace up-to-date checks, restored task outputs, configuration reuse, and dependency downloads.

---

A Gradle build can reuse its configuration, restore one task from cache, and leave another task up to date in the same invocation. Those messages refer to different layers of work. Combining them into one “cache hit” metric makes performance problems harder to explain.

Start with the question each mechanism answers: is configuration reusable, are the required outputs already present, or can missing outputs be restored from a previous execution?

## Map the Messages to Reused Work

| Signal | What was reused | What it does not establish |
| --- | --- | --- |
| `UP-TO-DATE` | Existing outputs accepted using task input/output history | No remote-cache download is implied |
| `FROM-CACHE` | Task outputs restored from a build cache | It does not identify local versus remote by itself |
| Configuration cache reused | Previously calculated build configuration and task graph | Task outputs may still need execution |
| Dependency download skipped | Previously fetched dependency artifacts | Compile or test outputs need not be cached |

Gradle's incremental-build mechanism compares declared task inputs and outputs with recorded state. Task output caching extends reuse beyond the current workspace by storing results under input-derived keys. [Incremental builds](https://docs.gradle.org/current/userguide/incremental_build.html), [Build cache](https://docs.gradle.org/current/userguide/build_cache.html).

## Observe Workspace Reuse First

In a simple Java project with the Gradle Wrapper and a cacheable `compileJava` task, run:

```bash
./gradlew compileJava --no-build-cache --no-configuration-cache --info
./gradlew compileJava --no-build-cache --no-configuration-cache --info
```

The first invocation compiles if outputs are absent or stale. The second can report `UP-TO-DATE` when nothing relevant changed and the outputs remain valid.

This is useful even with build caching disabled. Gradle does not need a remote cache to avoid rebuilding identical work in the same checkout.

If the second invocation always executes, investigate unstable inputs, changed outputs, custom task configuration, and untracked behavior before adding a remote service. A remote cache does not repair an incorrectly modeled task.

## Remove Outputs to Observe Build-Cache Restoration

Populate the build cache, remove the project's outputs using its normal clean task, and request the same work again:

```bash
./gradlew clean
./gradlew compileJava --build-cache --no-configuration-cache --info
./gradlew clean
./gradlew compileJava --build-cache --no-configuration-cache --info
```

The second compilation request can report `FROM-CACHE` if the first populated a compatible cache entry. This sequence is a diagnostic procedure, not a promise that every task in every project is cacheable.

Gradle's build cache is opt-in through `--build-cache` or `org.gradle.caching=true`. A local cache alone can produce `FROM-CACHE`; inspect information logs or build diagnostics to determine which backend supplied the entry. [Enabling and configuring the build cache](https://docs.gradle.org/current/userguide/build_cache.html).

A clean task typically removes project outputs, not the entire Gradle User Home. It can therefore create the exact condition required to demonstrate restoration without discarding downloaded dependencies.

## Observe Configuration Reuse Independently

Now keep the requested task list stable and enable configuration caching:

```bash
./gradlew compileJava --configuration-cache --build-cache
./gradlew compileJava --configuration-cache --build-cache
```

Configuration caching stores the configured task graph and checks its configuration inputs before reuse. That can avoid evaluating build scripts and configuring tasks again. It is separate from executing those tasks or restoring their outputs. [Configuration cache](https://docs.gradle.org/current/userguide/configuration_cache.html).

A configuration hit with a source edit can still require compilation. A configuration miss caused by a build-script change can still allow some task outputs to come from cache if their effective inputs are unchanged.

Changing the requested task set also changes the experiment. Comparing `clean build` with `test` does not isolate configuration reuse because those invocations request different work.

## Account for Non-Cacheable and Empty Tasks

Lifecycle tasks often have no actions of their own. Other tasks may be skipped, have no source, or intentionally remain non-cacheable because copying their outputs costs less than storing and transferring them.

Do not turn every non-`FROM-CACHE` line into an incident. Identify the expensive tasks and determine whether their implementations declare complete inputs and outputs. Custom task types must opt into output caching appropriately; adding a cache flag to the command line does not automatically make arbitrary side effects safe to replay.

Test tasks deserve particular care. A cached test result is reused evidence for the modeled test inputs. Tests depending on an uncontrolled remote service or current time may need those dependencies modeled or caching disabled.

## Measure Time at the Appropriate Layer

If configuration dominates, improve configuration-cache compatibility and configuration logic. If compilation dominates across fresh CI workers, inspect task output cache hit rates. If dependency resolution dominates, examine the dependency store and repository network requests.

Track the same target set and toolchain over comparable builds. Record configuration duration, task execution duration, cache transfer time, and dependency resolution separately. A high hit count can coexist with a slow build if the few remaining tasks are expensive or cached outputs are costly to transfer.

## Verify a Reuse Matrix

Run four controlled cases: unchanged workspace, deleted project outputs, source change, and configuration-only change. For each, record configuration reuse and the outcome of the expensive task.

Then repeat the output-restoration case on a fresh CI worker to verify the remote backend specifically. The diagnosis becomes precise: configuration was reused, compile outputs came from the remote cache, or existing workspace outputs remained valid. Each statement points to a different performance mechanism and a different next investigation.

## References

- [Gradle incremental builds](https://docs.gradle.org/current/userguide/incremental_build.html)
- [Gradle build cache](https://docs.gradle.org/current/userguide/build_cache.html)
- [Gradle configuration cache](https://docs.gradle.org/current/userguide/configuration_cache.html)
- [Diagnosing cache misses](https://docs.gradle.org/current/userguide/build_cache_debugging.html)
