# Validation Summary: How to Configure JIT Compilation Optimization

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Java HotSpot JVM JIT and tiered compilation
- GraalVM JIT and Native Image
- Spring Boot warmup and health endpoints
- Kubernetes startup, readiness, and liveness probes
- .NET tiered compilation, ReadyToRun, and dynamic PGO
- PyPy JIT
- Numba JIT
- Micrometer JVM metrics

## Sources Consulted
- Oracle Java SE Embedded HotSpot VM options: https://docs.oracle.com/javase/8/embedded/JEMAG.pdf
- OpenJDK HotSpot JIT overview: https://cr.openjdk.org/~vlivanov/talks/2015_JIT_Overview.pdf
- GraalVM Graal JIT Compiler Operations Manual: https://www.graalvm.org/latest/reference-manual/compiler/operations/
- GraalVM Native Image command-line options: https://www.graalvm.org/latest/reference-manual/native-image/overview/Options/
- Microsoft .NET runtime compilation configuration: https://learn.microsoft.com/en-us/dotnet/core/runtime-config/compilation
- Microsoft .NET ReadyToRun deployment overview: https://learn.microsoft.com/en-us/dotnet/core/deploying/ready-to-run
- Microsoft dotnet publish MSBuild properties: https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-publish
- Kubernetes probes documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- PyPy command-line and environment variable documentation: https://doc.pypy.org/man/pypy.1.html
- Numba performance tips: https://numba.readthedocs.io/en/stable/user/performance-tips.html
- Numba parallelization documentation: https://numba.pydata.org/numba-doc/dev/user/parallel.html

## Issues Found
- The JVM tiered compilation level descriptions overstated level 1 as "full optimization" and described level 2 too narrowly. Updated the descriptions to match HotSpot's C1 no/limited/full profiling tiers and C2 full optimization.
- The compilation threshold section implied a single default threshold controlled all C2 compilation under tiered compilation. Clarified that `CompileThreshold` is the common non-tiered default and that tiered compilation uses tier-specific thresholds.
- The code cache section said a small code cache causes methods to be deoptimized and recompiled. Updated this to the more accurate behavior: code cache flushing or disabled compilation until space is available.
- `-XX:+PrintInlining` and the inlining tuning example omitted `-XX:+UnlockDiagnosticVMOptions`, which is required for diagnostic HotSpot options. Added it to the commands.
- The GraalVM JIT example used older `UseJVMCICompiler`/`EnableJVMCI` style flags and an enterprise compiler configuration property. Replaced them with the current GraalVM-documented `-XX:+UseGraalJIT` example and `-Djdk.graal.ShowConfiguration=info` verification option.
- The Spring Boot warmup example never marked readiness as complete. Added a `HealthController` dependency and a call to `setWarmupComplete()` after warmup.
- The warmup snippet contained two public top-level classes in a single `WarmupService.java` example. Made the illustrative `ApplicationWarmup` class package-private so the snippet is syntactically valid as one file.
- The Kubernetes Deployment example omitted the required `spec.selector` and matching pod template labels for an `apps/v1` Deployment. Added selector and labels.
- The JVM JMX code cache query only matched pool names containing `CodeCache`, missing modern `CodeHeap` memory pools. Updated the query to inspect memory pools and filter both `CodeCache` and `CodeHeap` names.
- The Native Image section described startup as "instant" and the JIT/AOT peak-performance comparison as absolute. Changed these claims to more precise wording.

## Review Notes
The .NET tiered compilation, QuickJIT, QuickJITForLoops, ReadyToRun, and TieredPGO settings matched Microsoft documentation. The PyPy `PYPYLOG` example and Numba `@jit`/`@njit(parallel=True)` usage are consistent with current documentation. Some JVM tuning values remain workload- and JDK-version-dependent, so they should be treated as examples rather than universal recommendations.
