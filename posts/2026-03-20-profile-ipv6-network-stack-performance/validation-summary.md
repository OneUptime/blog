# Validation Summary: How to Profile IPv6 Network Stack Performance

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Linux networking stack
- `perf`
- `bpftrace`
- BCC / eBPF
- `ss`
- `netstat`
- `ethtool`
- `iperf3`

## Sources Consulted
- `perf-top(1)`: https://man7.org/linux/man-pages/man1/perf-top.1.html
- `perf-record(1)`: https://man7.org/linux/man-pages/man1/perf-record.1.html
- `perf-report(1)`: https://man7.org/linux/man-pages/man1/perf-report.1.html
- `ss(8)`: https://man7.org/linux/man-pages/man8/ss.8.html
- bpftrace documentation: https://bpftrace.org/docs/0.21
- BCC reference guide: https://github.com/iovisor/bcc/blob/master/docs/reference_guide.md
- iperf3 invocation guide: https://software.es.net/iperf/invoking.html
- Linux kernel tracepoint documentation: https://docs.kernel.org/trace/tracepoints.html
- Linux kernel NAPI documentation: https://docs.kernel.org/networking/napi.html
- Linux kernel source for `skb:kfree_skb`: https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/plain/include/trace/events/skb.h
- Linux kernel source for `netif_receive_skb*` tracepoints: https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/plain/include/trace/events/net.h
- Linux kernel source for `ipv6_rcv`: https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/plain/net/ipv6/ip6_input.c
- Linux kernel source for `ETH_P_IPV6`: https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/plain/include/uapi/linux/if_ether.h
- Local CLI verification with `perf list`, `ss --help`, `nstat --help`, and `ethtool --help`

## Issues Found
- The original `perf top` example used command syntax that belongs to `perf record`, and it mixed system-wide profiling with a PID filter in a misleading way. I changed it to a valid timed `perf top -a -g` invocation.
- The `perf stat` example used `net:napi_poll`, but the current tracepoint is `napi:napi_poll`. I corrected the event group.
- The `perf report` pipeline omitted `--stdio`, which is needed for reliable non-interactive text output when piping to `grep`. I added `--stdio` and expanded the symbol filter to include `ipv6_rcv`.
- The drop-tracing section used `kprobe:kfree_skb`, which is not the stable kernel tracing interface for packet drops and was not IPv6-specific. I changed it to the stable `tracepoint:skb:kfree_skb` interface and filtered on `ETH_P_IPV6` (`0x86DD`).
- The `ss` section described retransmission information without enabling timer output, and its queue-depth `awk` example printed the wrong columns. I added `-o`, corrected the field explanations, and fixed the column extraction by using `-H` and printing the actual state/queue/address columns.
- The BCC example was technically broken: it keyed the start timestamp by `skbaddr`, looked it up later by `skaddr`, and used `inet_sock_set_state`, which reports socket state transitions rather than application receive completion. I replaced it with a valid BCC kprobe/kretprobe example that measures time spent in the kernel's `ipv6_rcv` receive handler and updated the step title/commentary to match what is actually measured.
- The retransmission tracer used a kprobe on `tcp_retransmit_skb`; I changed it to the stable `tcp:tcp_retransmit_skb` tracepoint.

## Review Notes
- `stackcollapse-perf.pl` and `flamegraph.pl` are external FlameGraph scripts; the post assumes they are already installed and available on `PATH`.
- The BCC example requires BCC Python bindings and root privileges. The exact package name varies by distribution.
- `netstat -s` is still valid, but on many modern systems `ss`/`nstat` from iproute2 are more commonly installed by default.
