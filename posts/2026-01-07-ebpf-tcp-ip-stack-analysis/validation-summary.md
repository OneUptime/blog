# Validation Summary: How to Analyze TCP/IP Stack Performance with eBPF

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- eBPF
- libbpf / CO-RE
- BCC
- bpftrace
- bpftool
- Linux TCP/IP stack
- Linux kernel tracepoints and kprobes
- TCP congestion control, retransmission, RTT, and socket buffers

## Sources Consulted
- Linux kernel tracepoint documentation: https://docs.kernel.org/trace/tracepoints.html
- Linux kernel libbpf overview: https://docs.kernel.org/bpf/libbpf/libbpf_overview.html
- Linux kernel BPF ring buffer documentation: https://docs.kernel.org/bpf/ringbuf.html
- bpftrace language documentation: https://bpftrace.org/docs/release_024/language
- Linux TCP tracepoint definitions: https://github.com/torvalds/linux/blob/master/include/trace/events/tcp.h
- Linux socket tracepoint definitions: https://github.com/torvalds/linux/blob/master/include/trace/events/sock.h
- Linux skb tracepoint definitions: https://github.com/torvalds/linux/blob/master/include/trace/events/skb.h
- Linux socket structure definitions: https://github.com/torvalds/linux/blob/master/include/net/sock.h
- Linux TCP structure and helper definitions: https://github.com/torvalds/linux/blob/master/include/net/tcp.h
- BCC reference guide: https://github.com/iovisor/bcc/blob/master/docs/reference_guide.md
- RFC 9293, Transmission Control Protocol: https://www.rfc-editor.org/rfc/rfc9293.html

## Issues Found
- The prerequisites used `bpftool` without installing it. Added `bpftool` to the Ubuntu/Debian package install command.
- The TCP connection kprobe example said it attached to both `tcp_v4_connect` and `tcp_v6_connect`, but the code only attached to `tcp_v4_connect` and used IPv4 fields. Updated the prose and comments to describe it as IPv4-only.
- The bpftrace connection example used `tracepoint:tcp:tcp_connect`, which is not an upstream TCP tracepoint in current Linux. Replaced it with `sock:inet_sock_set_state` filtered for TCP sockets entering `SYN_SENT`.
- The TCP state-change bpftrace example used `IPPROTO_TCP` without including a header and described it as an address family value. Added the include and corrected the comment to identify it as protocol number 6. Also printed and cleared the transition summary map.
- The retransmission diagram claimed RTT was calculated from retransmit events. Changed that to correlation of retransmit events with the flow, which matches the code.
- The retransmission event structure included an unused sequence-number field and used an 8-bit retransmission counter for `tcp_sock.retrans_out`. Removed the unused field and changed the counter to `__u32`.
- The RTT bpftrace example used obsolete/incorrect TCP fields (`mdev_us` and direct `rtt_min` internals). Updated it to use `rttvar_us` and removed the fragile minimum-RTT access.
- The receive-buffer example described `sk_backlog.rmem_alloc` imprecisely. Clarified that current kernels implement `sk_rmem_alloc` through that field.
- The buffer-drop example described `sock_rcvqueue_full` as a `sock_rfree` drop-flag path, included a `tcp:tcp_drop` tracepoint that is not present in current upstream TCP tracepoint definitions, and filtered `skb:kfree_skb` with an incorrect `SKB_CONSUMED` assumption. Corrected the comments, removed the unavailable TCP tracepoint example, and removed the invalid filter.
- The live congestion-window bpftrace example used `tcp_cong_avoid_ai` as if its first argument were `struct sock *`; current kernels define it with `struct tcp_sock *`. Reworked the main cwnd sampling to use the `tcp:tcp_probe` tracepoint fields instead.
- The congestion-control comparison example also used `tcp_cong_avoid_ai` with the wrong argument type. Changed that sampling probe to `tcp_ack`, where the first argument is `struct sock *`.
- The userspace analysis section paired libbpf/CO-RE-style BPF code with BCC's `BPF(src_file=...)` loader. Updated the section to direct readers to a libbpf/generated-skeleton loader and reframed the Python code as event aggregation logic to connect to a compatible loader.

## Review Notes
The examples still rely on kernel internals and kprobes for several measurements, so readers should verify symbol availability and structure fields on their target kernel with `bpftrace -lv`, `/sys/kernel/debug/tracing/available_events`, BTF, or generated `vmlinux.h`. Tracepoint-based examples are more stable than kprobe examples, but tracepoint field sets can still vary across kernel versions.
