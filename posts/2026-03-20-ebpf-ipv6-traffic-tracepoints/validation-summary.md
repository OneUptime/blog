# Validation Summary: How to Monitor IPv6 Traffic with eBPF Tracepoints

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- eBPF
- XDP
- IPv6
- Linux kernel tracing
- `iproute2`
- `bpftool`
- `trace-cmd`

## Sources Consulted
- Linux kernel documentation, "Program Types and ELF Sections": https://www.kernel.org/doc/html/next/bpf/libbpf/program_types.html
- RFC 8200, "Internet Protocol, Version 6 (IPv6) Specification": https://www.rfc-editor.org/rfc/rfc8200
- `ip-link(8)` man page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- `ping(8)` man page: https://man7.org/linux/man-pages/man8/ping.8.html
- `bpf(2)` man page: https://man7.org/linux/man-pages/man2/bpf.2.html
- `capabilities(7)` man page: https://man7.org/linux/man-pages/man7/capabilities.7.html
- Linux kernel documentation, "Using the tracer for debugging": https://www.kernel.org/doc/html/latest/trace/debugging.html
- `trace-cmd record` documentation: https://www.trace-cmd.org/Documentation/trace-cmd/trace-cmd-record.1.html
- Official libbpf headers: https://raw.githubusercontent.com/libbpf/libbpf/master/src/bpf_helpers.h
- Official libbpf headers: https://raw.githubusercontent.com/libbpf/libbpf/master/src/bpf_endian.h
- Local CLI help output checked from installed tools: `ip link help`, `bpftool prog help`, `bpftool map help`, `trace-cmd record --help`, `curl --help all`

## Issues Found
- The post was titled and described as a tracepoints/kprobes article, but the implementation shown is an XDP program (`SEC("xdp")`) attached with `ip link set ... xdp`. I updated the title, tags, description, overview, and conclusion so the post accurately describes XDP-based packet monitoring.
- The C example used `bpf_htons()` and `bpf_ntohl()` without including `<bpf/bpf_endian.h>`, which is where those libbpf macros are defined. I added the missing include.
- The prerequisites incorrectly implied a Linux 5.6+ kernel and BTF were required for this minimal example, and they understated the required tooling and privileges. I changed the prerequisites to reflect XDP/eBPF support, the need for libbpf headers plus `iproute2`/`bpftool`, and the practical requirement for root or capabilities such as `CAP_BPF` and `CAP_NET_ADMIN`.
- The `bpftool prog show` comment claimed BTF info unconditionally, but the article’s compile command does not guarantee BTF metadata. I changed the comment to a generic "Show program details".
- The testing section used `ping6` and a documentation-only IPv6 address as if it were a direct runnable target, and it used the older debugfs tracing path. I updated the commands to use `ping -6`, parameterized the IPv6 target, replaced the extra packet-generation example with a verified `curl -6` example, and switched the trace pipe path to `/sys/kernel/tracing/trace_pipe`.

## Review Notes
- The post is now technically consistent as an XDP tutorial. It does not demonstrate tracepoint- or kprobe-based monitoring of IPv6 socket lifecycle events; that would require different attach types and examples.
- The packet parser correctly bounds-checks the Ethernet and IPv6 headers, but it intentionally stops at the fixed IPv6 header and does not walk extension headers. That is acceptable for this introductory example.
