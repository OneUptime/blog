# Validation Summary: How to Profile Network Performance with perf and Flamegraphs on Linux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux `perf`
- FlameGraph
- `iperf3`
- Linux kernel tracepoints
- BCC/eBPF tools
- Ubuntu/Debian package management with `apt`

## Sources Consulted
- Local CLI help and event listings: `perf record -h`, `perf stat -h`, `perf list 'net:*'`, `perf list 'syscalls:sys_enter_*'`
- `perf-record(1)`: https://man7.org/linux/man-pages/man1/perf-record.1.html
- `perf-stat(1)`: https://man7.org/linux/man-pages/man1/perf-stat.1.html
- Linux kernel tracepoints documentation: https://www.kernel.org/doc/html/latest/trace/tracepoints.html
- FlameGraph upstream repository and README: https://github.com/brendangregg/FlameGraph
- `iperf3` invocation manual: https://software.es.net/iperf/invoking.html
- Ubuntu package details for `bpfcc-tools`: https://packages.ubuntu.com/noble/bpfcc-tools
- Ubuntu file list for `bpfcc-tools`: https://packages.ubuntu.com/noble/all/bpfcc-tools/filelist
- BCC `tcplife.py`: https://github.com/iovisor/bcc/blob/master/tools/tcplife.py
- BCC `stackcount.py`: https://github.com/iovisor/bcc/blob/master/tools/stackcount.py
- BCC `profile.py`: https://github.com/iovisor/bcc/blob/master/tools/profile.py

## Issues Found
- The original workload used `127.0.0.1`, which only exercises the loopback interface and cannot be used to profile a real NIC driver, RSS, or hardware offload behavior. I changed the example to use a remote `SERVER_IP`.
- The original client PID capture used `pgrep iperf3 | tail -1`, which could select the server or the wrong `iperf3` instance. I replaced it with `$!` after backgrounding the client.
- The original `perf stat` verification command omitted `sudo`, which is not reliable on modern Ubuntu systems with restrictive `perf_event_paranoid` defaults. I updated the example to use `sudo perf stat ...`.
- The FlameGraph clone command wrote into `/opt` without elevated privileges. I changed it to `sudo git clone`.
- The “kernel-only” `perf record` example used `-e cpu-clock`, which does not by itself restrict sampling to kernel space. I replaced it with `--all-kernel`.
- The FlameGraph folding step omitted `stackcollapse-perf.pl --all`, which is the upstream-recommended form when preserving mixed user/kernel annotations from `perf script`. I updated the command accordingly.
- The interpretation section made overly specific causal claims, such as directly mapping wide TCP bars to missing offloads or wide `__napi_poll` to a need for a higher NAPI budget. I reworded those points to direct readers toward appropriate follow-up checks without overstating causality.
- The tracepoint example described `net:netif_receive_skb` as measuring receive packet processing time. I adjusted the wording to accurately describe it as recording receive-path tracepoint activity and added `-g` for call graph context.
- The syscall counting example relied on a wildcard tracepoint selector. I replaced it with explicit, common socket I/O syscall tracepoints to avoid ambiguity.
- The eBPF section incorrectly claimed “without perf overhead,” but BCC `profile` itself uses `perf_events`. I reworded the section to describe it as more targeted BCC/eBPF analysis.
- The Ubuntu/Debian `bpfcc-tools` package installs commands with `-bpfcc` suffixes, so the original `tcplife`, `stackcount`, and `profile` commands would not match the packaged command names. I updated them to `tcplife-bpfcc`, `stackcount-bpfcc`, and `profile-bpfcc`.
- The BCC tool descriptions were inaccurate: `tcplife` traces TCP session lifespan, `stackcount` counts call stacks for a probed function, and `profile` performs interval CPU profiling rather than tracing socket reads. I corrected the comments to match the actual tools.
- `iperf3` and `git` were used later in the tutorial but were not included in the prerequisites. I added them to the install step.

## Review Notes
- The post now accurately reflects an Ubuntu/Debian-style environment. On other distributions, package names and BCC command names may differ.
- `perf` call graph quality still depends on frame pointers, unwind information, and available symbols/debug packages. That is a caveat worth keeping in mind, but it does not make the post incorrect.
- If a reader wants to focus on receive-side CPU on the profiled host, they may need to run the workload in reverse mode or profile the server side instead of the sender.
