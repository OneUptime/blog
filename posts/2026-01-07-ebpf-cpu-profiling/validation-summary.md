# Validation Summary: How to Profile CPU Performance with eBPF

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- eBPF
- BCC / BPF Compiler Collection
- bpftrace
- Linux perf events
- FlameGraph
- systemd
- Prometheus Python client
- Python
- Bash

## Sources Consulted
- BCC `profile.py` upstream source and usage: https://github.com/iovisor/bcc/blob/master/tools/profile.py
- BCC `offcputime.py` upstream source and usage: https://github.com/iovisor/bcc/blob/master/tools/offcputime.py
- Local BCC tool help for `profile-bpfcc -h` and `offcputime-bpfcc -h`
- bpftrace language documentation: https://github.com/bpftrace/bpftrace/blob/master/docs/language.md
- bpftrace local CLI help (`bpftrace --help`, version 0.20.2)
- FlameGraph `flamegraph.pl` upstream options: https://github.com/brendangregg/FlameGraph/blob/master/flamegraph.pl
- Linux perf security documentation: https://www.kernel.org/doc/html/v6.0/admin-guide/perf-security.html

## Issues Found
- BCC `profile` was shown with `-U -K` together. In BCC, `-U` means user stacks only and `-K` means kernel stacks only; they are mutually exclusive. Changed the folded output example to rely on the default user + kernel stack behavior.
- BCC `offcputime` was shown with `-U -K` together. These flags are also mutually exclusive there. Changed the example to use default user + kernel stacks.
- Debian/Ubuntu BCC packages commonly install commands with the `-bpfcc` suffix. Added a short note so readers can map `profile` and `offcputime` examples to `profile-bpfcc` and `offcputime-bpfcc` when needed.
- The custom BCC profiler described `BPF_F_REUSE_STACKID` but did not pass it to `get_stackid`. Updated the user and kernel stack capture calls to include the flag.
- The custom BCC profiler printed progress messages to stdout, which would corrupt folded stack output when using `> folded_output.txt`. Changed progress messages to stderr.
- The profile query helper used `str.split()` for subprocess commands, which breaks quoted arguments such as the flame graph title and paths containing spaces. Replaced those commands with argument lists and closed the pipeline stdout properly.
- The profile query helper only searched the newest 20 profiles when finding a profile closest to a timestamp. Changed it to search all profiles for timestamp lookup.
- The Prometheus exporter incremented `cpu_profiles_total` every time it parsed the latest file, overcounting when no new profile had been captured. Added tracking so the counter increments only for a newly seen profile file.
- The troubleshooting advice set `kernel.perf_event_paranoid=1` for non-root CPU profiling. Adjusted it to `0`, which is the more appropriate threshold for unprivileged CPU event access absent suitable capabilities.
- The security section suggested applying file capabilities directly to `/usr/sbin/profile`, which is not generally correct for Python-based BCC scripts and is path-dependent across distributions. Reworded the example for compiled profiler binaries and noted that Python BCC tools are typically run with sudo or managed via a constrained service.

## Review Notes
- The embedded Python snippets compile with `python3 -m py_compile` after the fixes.
- The Bash script blocks that are actual standalone scripts pass `bash -n`.
- Some command examples still use upstream BCC tool names (`profile`, `offcputime`). This is valid for source installs and some distributions; the post now includes the Debian/Ubuntu `-bpfcc` suffix caveat.
