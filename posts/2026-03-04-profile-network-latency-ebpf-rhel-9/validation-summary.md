# Validation Summary: How to Profile Network Latency with eBPF on RHEL

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- eBPF / BPF
- BCC tools
- bpftrace
- Linux TCP networking
- Linux kernel tracepoints and kprobes

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Network tracing using the BPF compiler collection": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/network-tracing-using-the-bpf-compiler-collection_configuring-and-managing-networking
- Red Hat Enterprise Linux 9 Package Manifest for bpftrace package availability: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/package_manifest/Red_Hat_Enterprise_Linux-9-Package_manifest-en-US.pdf
- bpftrace official documentation: https://bpftrace.org/docs/0.22
- BCC upstream repository and tools list: https://github.com/iovisor/bcc
- Linux kernel tracepoint documentation: https://www.kernel.org/doc/html/v6.9/core-api/tracepoint.html
- Linux kernel source for socket tracepoints: https://codebrowser.dev/linux/linux/include/trace/events/sock.h.html

## Issues Found
- The network-stack diagram placed XDP alongside tc after driver/softirq processing. XDP is an early driver hook, while tc is later in the networking path, so the diagram and accompanying claim were corrected.
- The post claimed eBPF can show "exactly" where packets spend time and instrument every transition. This was softened because kprobes, tracepoints, and packet correlation depend on kernel version, available symbols, and enabled tracepoints.
- The `tcpconnlat 1` example showed a `0.82 ms` connection even though the command filters for connections slower than 1 millisecond. The sample output was changed to `1.82 ms`.
- The `tcpretrans` section described "retransmit latency," but the BCC tool traces retransmission events rather than measuring retransmission latency. The heading and text were corrected.
- The socket-read bpftrace example claimed to measure time between socket queueing and application `read()`, but it stored `@queued` without using it and measured generic `read(2)` syscall duration. It was replaced with a `sock_recvmsg` kprobe/kretprobe example that measures socket receive time in the kernel.
- The custom "round-trip time" bpftrace example correlated `tcp_sendmsg` and `tcp_rcv_established` by thread ID, which does not reliably match a sent TCP message to its response. It was replaced with a sample of the kernel TCP smoothed RTT estimate from `struct tcp_sock`.

## Review Notes
The corrected bpftrace examples still rely on kprobes and kernel internals, so they should be treated as operational diagnostics rather than stable APIs. On RHEL systems, administrators should verify available functions and tracepoints with `bpftrace -l` on the target kernel before using the examples in production.
