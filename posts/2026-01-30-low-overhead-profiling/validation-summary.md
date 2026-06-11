# Validation Summary: How to Create Low-Overhead Profiling

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- eBPF and BCC/profile-bpfcc
- async-profiler for JVM applications
- py-spy for Python profiling
- Node.js Inspector and V8 CPU Profiler
- 0x for Node.js flame graphs
- Go runtime/pprof and net/http/pprof

## Sources Consulted
- BCC profile tool source and local `profile-bpfcc --help`: https://github.com/iovisor/bcc/blob/master/tools/profile.py
- Debian profile-bpfcc man page: https://manpages.debian.org/experimental/bpfcc-tools/profile-bpfcc.8.en.html
- async-profiler README and profiler options: https://github.com/async-profiler/async-profiler and https://github.com/async-profiler/async-profiler/blob/master/docs/ProfilerOptions.md
- py-spy README: https://github.com/benfred/py-spy
- Node.js Inspector API documentation: https://nodejs.org/api/inspector.html
- Chrome DevTools Protocol Profiler domain: https://chromedevtools.github.io/devtools-protocol/v8/Profiler/
- 0x README and API documentation: https://github.com/davidmarkclements/0x and https://github.com/davidmarkclements/0x/blob/master/docs/api.md
- Go runtime and runtime/pprof package documentation: https://pkg.go.dev/runtime and https://pkg.go.dev/runtime/pprof

## Issues Found
- The eBPF description implied profiling happens without context switches or interruption. Updated the wording to the more precise claim that eBPF avoids application signal handlers and per-sample user-space transfers.
- The eBPF diagram said the application continues uninterrupted. Updated the note to say sampling work stays in kernel context.
- The custom BCC example described `BPF_F_FAST_STACK_CMP` as using frame pointers. Corrected the comment to explain that it compares stack hashes for lower overhead, and added a guard for failed stack collection.
- The BCC aggregation example manually looked up and incremented counts. Replaced it with BCC's `counts.increment(key)` helper, which better matches BCC examples and avoids a verbose non-atomic update pattern.
- The async-profiler commands used the older `profiler.sh` wrapper. Updated them to the current `asprof` command documented by async-profiler.
- The async-profiler `--all-user` comment said it avoids kernel stacks. Corrected it to say it includes only user-mode events.
- The 0x section claimed `--collect-only` reduced sample rate, but the flag only skips immediate flame graph generation. Corrected the comment.
- The 0x section showed `0x --kernel-tracing -p <pid>`, but current 0x usage profiles a launched command rather than attaching with `-p`. Replaced it with a valid `--kernel-tracing --output-dir ./profiles my-app.js` example.
- The Go snippet used `fmt.Sprintf` without importing `fmt`. Added the missing import.
- The Go snippet suggested `runtime.SetCPUProfileRate(50)` configures the later `runtime/pprof` CPU profile. `pprof.StartCPUProfile` uses the runtime profiler's standard rate, so the snippet now notes that custom rates require direct management outside `pprof.StartCPUProfile`.

## Review Notes
- Overhead percentages remain approximate and environment-dependent; the post correctly tells readers to measure overhead in their own environment.
- The JavaScript snippet was syntax-checked locally with Node.js v22.22.0.
- Go tooling was not available in the local environment, so the Go snippet was reviewed against official package documentation rather than compiled locally.
