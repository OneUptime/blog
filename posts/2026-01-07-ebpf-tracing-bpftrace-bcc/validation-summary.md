# Validation Summary: How to Trace System Calls and Functions with eBPF (bpftrace, bcc)

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- eBPF
- bpftrace
- BCC / bpfcc tools
- Linux tracepoints, kprobes, uprobes, and USDT probes
- Python BCC programs
- PostgreSQL USDT tracing

## Sources Consulted
- bpftrace official documentation: https://bpftrace.org/docs/0.21
- BCC project documentation and reference guide: https://github.com/iovisor/bcc and https://github.com/iovisor/bcc/blob/master/docs/reference_guide.md
- BCC Python developer tutorial: https://github.com/iovisor/bcc/blob/master/docs/tutorial_bcc_python_developer.md
- Linux kernel tracepoints documentation: https://www.kernel.org/doc/html/latest/trace/tracepoints.html
- PostgreSQL dynamic tracing documentation: https://www.postgresql.org/docs/current/dynamic-trace.html
- Local command help for bpftrace v0.20.2 and installed BCC tools: `bpftrace --help`, `execsnoop-bpfcc --help`, `opensnoop-bpfcc --help`, `biolatency-bpfcc --help`, `trace-bpfcc --help`, `funccount-bpfcc --help`

## Issues Found
- Corrected the bpftrace installation prerequisite to mention BTF information or kernel headers for type-aware tracing, rather than implying kernel headers are always required.
- Replaced the BCC verification command that assumed `/usr/share/bcc/tools/` with `command -v` checks for Debian/Ubuntu `-bpfcc` tool names.
- Fixed the syscall counting one-liner description: it counts syscalls system-wide by process name and uses a map counter, not a per-process trace or histogram.
- Corrected `execsnoop-bpfcc` option descriptions: `-x` includes failed exec attempts, `-T` adds an HH:MM:SS time column, and `-q` quotes arguments rather than showing full argument lists. Added `--max-args` for increasing parsed arguments.
- Corrected `opensnoop-bpfcc -n` documentation to say it filters process names, not filename patterns.
- Corrected `trace-bpfcc` examples to use BCC trace argument numbering for `write` (`arg3` for byte count) and removed an inaccurate `%K` stack-format comment.
- Corrected `funccount-bpfcc` examples: `-d` is used for total duration, and `-p` filters to a process ID. The documented `-P` option does not exist.
- Fixed a BCC example comment that called `BPF_PERF_OUTPUT` a ring buffer; it is a perf buffer.
- Fixed bpftrace syntax in the file I/O script by replacing the unsupported string `.repeat()` call and storing `openat` paths as strings at syscall entry.
- Fixed the `tcp_v4_connect` argument inspection example to read the destination address and port from the `struct sockaddr_in *` function argument at entry.
- Fixed the malloc profiling example to key outstanding allocations by `(pid, pointer)` instead of pointer alone, avoiding collisions between processes with the same virtual address.
- Fixed PostgreSQL USDT query string handling by reading the USDT argument as a pointer and then copying the user string with `bpf_probe_read_user_str`.
- Fixed the bpftrace filtering example to use the positional parameter `$1` instead of an undefined `$target_pid` variable.
- Replaced the incorrect `--unsafe` map-limit example with `BPFTRACE_MAX_MAP_KEYS` passed through `sudo env`.
- Softened the production-safety conclusion to avoid claiming absolute safety; the verifier enforces safety properties, but tracing still needs filtering and overhead checks.

## Review Notes
Some examples remain intentionally distribution- and kernel-version-dependent, especially hard-coded library paths, kernel function names, BTF/header availability, and PostgreSQL binary paths. These are acceptable for a tracing tutorial, but readers may need to adjust paths and function names for their distribution and kernel.
