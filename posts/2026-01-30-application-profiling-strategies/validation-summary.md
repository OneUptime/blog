# Validation Summary: How to Build Application Profiling Strategies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- CPU profiling, memory profiling, I/O and wall-clock profiling
- Linux perf and FlameGraph
- JavaScript and Node.js V8 Inspector
- Python cProfile, pstats, tracemalloc, and memory_profiler
- Go runtime/pprof, net/http/pprof, go tool trace, and fgprof
- Java Flight Recorder, AspectJ-style instrumentation, async-profiler, VisualVM, and JProfiler
- Production profiling practices, sampling, instrumentation, and flame graph interpretation

## Sources Consulted
- Node.js Inspector API documentation: https://nodejs.org/api/inspector.html
- Chrome DevTools Node.js performance profiling documentation: https://developer.chrome.com/docs/devtools/performance/nodejs
- Python tracemalloc documentation: https://docs.python.org/3/library/tracemalloc.html
- Python profiling and pstats documentation: https://docs.python.org/3/library/profile.html
- memory_profiler project documentation: https://github.com/pythonprofilers/memory_profiler
- Go runtime/pprof package documentation: https://pkg.go.dev/runtime/pprof
- Go net/http/pprof package documentation: https://pkg.go.dev/net/http/pprof
- Go trace command documentation: https://pkg.go.dev/cmd/trace
- Linux perf record local man page via `perf record --help`
- Linux perf_event_open man page: https://man7.org/linux/man-pages/man2/perf_event_open.2.html
- Oracle JDK Flight Recorder Recording API documentation: https://docs.oracle.com/en/java/javase/11/docs/api/jdk.jfr/jdk/jfr/Recording.html
- Oracle JDK Flight Recorder Configuration documentation: https://docs.oracle.com/en/java/javase/19/docs/api/jdk.jfr/jdk/jfr/Configuration.html
- Oracle Flight Recorder configuration guide: https://docs.oracle.com/en/java/javase/25/jfapi/flight-recorder-configurations.html
- AspectJ documentation and API resources: https://eclipse.dev/aspectj/doc/latest/index.html
- Spring Framework AspectJ-style around advice documentation: https://docs.spring.io/spring-framework/reference/core/aop/ataspectj/advice.html
- async-profiler project documentation: https://github.com/async-profiler/async-profiler

## Issues Found
- The first Go pprof example described itself as I/O profiling even though the snippet only exposes standard pprof runtime endpoints. Updated the comment to describe the snippet accurately and commented out the placeholder `startServer()` call so the example is syntactically valid as shown.
- The AspectJ Java snippet used `@Aspect`, `@Around`, and `ProceedingJoinPoint` without imports. Added the relevant AspectJ imports so the example is complete enough to compile when the referenced local `Metrics` helper exists.
- The Node.js Inspector example destructured the `Profiler.stop` response in the callback parameter list. If the inspector call returned an error without params, that destructuring could throw before `reject(err)` ran. Changed it to accept `params`, check `err`, then extract `profile`.
- The Go language-selection snippet had a second `import` block after function declarations, which is invalid Go syntax. Moved `net/http` and the blank `net/http/pprof` import into the top import block.
- The Java Flight Recorder example used `Path.of(...)` without importing `java.nio.file.Path` and included an unused `jdk.jfr.consumer.*` import. Added the missing `Path` import and removed the unused consumer import.

## Review Notes
- Local syntax checks were run for the JavaScript and Python snippets with the available Node.js and Python runtimes. Go and Java compilers were not installed in the environment, so those snippets were reviewed against official language/API documentation rather than compiled locally.
- `memory_profiler` is still widely referenced for line-by-line examples, but its GitHub project notes that it is no longer actively maintained. Future updates could mention this caveat or prefer maintained alternatives such as Scalene where appropriate.
- The overhead percentages in the post are reasonable as rules of thumb, but real production overhead depends on profiler configuration, sampling frequency, runtime, workload, and enabled events.
