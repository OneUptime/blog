# Validation Summary: How to Create Flame Graph Generation

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Brendan Gregg's FlameGraph toolkit (stackcollapse-perf.pl, flamegraph.pl, difffolded.pl)
- Linux `perf` profiler
- async-profiler v3.0 (JVM)
- Node.js profiling tools: 0x, v8-profiler-next, flamebearer, speedscope
- Python profiling tools: py-spy, cProfile/pstats, flameprof, memray
- Go: `runtime/pprof`, `net/http/pprof`, `go tool pprof`
- Linux bcc/BPF tools (`offcputime`)
- GitHub Actions CI integration

## Sources Consulted
- Brendan Gregg's FlameGraph repo and docs: https://github.com/brendangregg/FlameGraph
- async-profiler v3.0 release notes and command-line docs: https://github.com/async-profiler/async-profiler
- async-profiler CPU Sampling Engines docs: https://github.com/async-profiler/async-profiler/blob/master/docs/CpuSamplingEngines.md
- flameprof source: https://github.com/baverman/flameprof
- cpuprofilify package: https://github.com/thlorenz/cpuprofilify
- memray documentation: https://bloomberg.github.io/memray/run.html
- perf-probe(1) man page: https://www.man7.org/linux/man-pages/man1/perf-probe.1.html
- Brendan Gregg's perf examples: https://www.brendangregg.com/perf.html
- py-spy README and CLI help
- Go pprof package docs: https://pkg.go.dev/runtime/pprof and https://pkg.go.dev/net/http/pprof

## Issues Found

1. **flameprof `--title` flag (invalid)** — The example used `flameprof --width 1200 --title "API Handler" profile.pstats > profile.svg`, but flameprof has no `--title` argument. Replaced the second example with a valid combination of flags (`--width 1200 --row-height 24`).

2. **cpuprofilify usage reversed** — The post showed `cpuprofilify profile.cpuprofile | flamegraph.pl > profile.svg`, claiming this converts cpuprofile to a flame graph. In reality, cpuprofilify converts the *other* direction: it takes perf/DTrace output and produces `.cpuprofile` files for Chrome DevTools. The command as written would not work and the intermediate format would also be wrong for `flamegraph.pl` (which expects folded stacks). Removed the broken example; the surrounding `flamebearer` and `speedscope` examples already cover converting cpuprofile to flame graphs.

3. **perf malloc tracepoint requires uprobe setup** — The original `perf record -e malloc:* -g -p 12345 -- sleep 30` will not work out of the box because `malloc` is a userspace libc function, not a kernel tracepoint. Added the prerequisite `perf probe -x /lib/x86_64-linux-gnu/libc.so.6 malloc` command and corrected the event name to `probe_libc:malloc`.

4. **memray output filename convention** — The example showed `memray-script.bin` but memray actually writes files named `memray-<script>.<pid>.bin`. Updated the placeholder and added a clarifying comment.

## Review Notes

- async-profiler `cpu`, `wall`, `alloc`, `lock`, `itimer`, and `ctimer` events are all valid in v3.0. Note: `ctimer` was introduced in v3.0 and is Linux-only — readers running older async-profiler versions or non-Linux platforms will not have it available.
- `--reverse` in async-profiler is correctly documented as the way to produce icicle graphs.
- `v8Profiler.setGenerateType(1)` is technically redundant in newer v8-profiler-next versions (1 is already the default for the new sampler API), but it is not incorrect — left as-is to make the intent explicit.
- The Go programmatic example calls `go profileCPU(...)` and then `profileHeap(...)` immediately, so the heap snapshot is captured before the CPU profile finishes. This is fine as a usage demonstration but worth flagging if a future reader copies the pattern verbatim.
- `--color=io` for `flamegraph.pl` is a real palette and works as shown.
- The bcc `/usr/share/bcc/tools/offcputime` path is correct on Debian/Ubuntu where `bcc-tools` is installed; other distros may install it elsewhere (e.g. `/usr/share/bcc-tools/`).
