# Validation Summary: How to Profile Kotlin Applications for Performance

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kotlin
- JVM
- Java Flight Recorder
- JDK Mission Control
- jcmd and jps
- Kotlin coroutines
- kotlinx-coroutines-debug
- async-profiler
- JVM heap dumps

## Sources Consulted
- Oracle Java SE `java` command documentation for `-XX:StartFlightRecording`: https://docs.oracle.com/en/java/javase/21/docs/specs/man/java.html
- Oracle Java SE `jcmd` command documentation for `JFR.start`, `JFR.stop`, `JFR.dump`, and `GC.heap_dump`: https://docs.oracle.com/en/java/javase/22/docs/specs/man/jcmd.html
- Kotlin official documentation for inline functions: https://kotlinlang.org/docs/inline-functions.html
- Kotlin official documentation for object declarations and companion objects: https://kotlinlang.org/docs/object-declarations.html
- Kotlin official documentation for arrays and primitive arrays: https://kotlinlang.org/docs/arrays.html
- kotlinx.coroutines API documentation for `Dispatchers.IO`: https://kotlinlang.org/api/kotlinx.coroutines/kotlinx-coroutines-core/kotlinx.coroutines/-dispatchers/-i-o.html
- kotlinx.coroutines API documentation for `DebugProbes`: https://kotlinlang.org/api/kotlinx.coroutines/kotlinx-coroutines-debug/kotlinx.coroutines.debug/-debug-probes/
- kotlinx.coroutines debugging documentation: https://github.com/Kotlin/kotlinx.coroutines/blob/master/docs/topics/debugging.md
- async-profiler official README: https://github.com/async-profiler/async-profiler

## Issues Found
- The JFR startup example said `filename` caused the recording to be dumped on JVM exit. In current JDK documentation, `dumponexit` defaults to `false`, while `filename` only names the file used when the recording is stopped or dumped. Added `dumponexit=true` and adjusted the comment.
- The post described JFR as having "near-zero overhead." Changed this to "low overhead" to match the JDK documentation's more precise description.
- The companion object explanation said companion objects compile to a nested class with a static `INSTANCE` field. That `INSTANCE` pattern applies to Kotlin object declarations, while companion objects are exposed through a companion class referenced from the enclosing class. Updated the wording.
- The coroutine frame explanation implied suspended functions may show as anonymous classes in `kotlin.coroutines`. Updated it to describe compiler-generated continuation classes and `kotlin.coroutines.jvm.internal` runtime frames more accurately.
- The lambda-capture example used Kotlin stdlib `filter`, which is inline, while the surrounding warning was about non-inline higher-order functions. Replaced the example with a non-inline higher-order function so the allocation warning matches the code.
- The coroutine IO dispatcher comment described `Dispatchers.IO` as a larger thread pool with "64+ threads." Updated it to the documented default parallelism limit: 64 threads or the number of cores, whichever is larger.
- The async-profiler examples used the older `profiler.sh` launcher. Updated them to the current documented `asprof` launcher.

## Review Notes
The code snippets are illustrative and were reviewed for syntax and API correctness, but they were not compiled locally because the workspace does not have a JDK or Kotlin compiler installed. The JFR and `jcmd` commands were verified against official documentation rather than local `--help` output for the same reason.
