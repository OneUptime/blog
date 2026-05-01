# Validation Summary: How to Use eBPF for IPv6 Traffic Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux eBPF
- XDP
- TC
- IPv6
- libbpf
- iproute2 `ip`
- `bpftool`
- `trace-cmd`
- Prometheus
- OneUptime

## Sources Consulted
- RFC 8200, Internet Protocol, Version 6 (IPv6) Specification: https://www.rfc-editor.org/rfc/rfc8200
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849.html
- Linux `ip-link(8)` manual: https://man7.org/linux/man-pages/man8/ip-link.8.html
- Linux `ping(8)` manual: https://man7.org/linux/man-pages/man8/ping.8.html
- Linux `trace-cmd-record(1)` manual: https://man7.org/linux/man-pages/man1/trace-cmd-record.1.html
- eBPF Docs, libbpf eBPF-side headers index: https://docs.ebpf.io/ebpf-library/libbpf/ebpf/
- eBPF Docs, `bpf_trace_printk`: https://docs.ebpf.io/linux/helper-function/bpf_trace_printk/
- eBPF Docs, XDP program type: https://docs.ebpf.io/linux/program-type/BPF_PROG_TYPE_XDP/
- eBPF Docs, BPF token and capability requirements: https://docs.ebpf.io/linux/concepts/token/
- Debian Sources, `bpf_helpers.h`: https://sources.debian.org/src/libbpf/1.5.0-3/src/bpf_helpers.h
- Debian Sources, `bpf_endian.h`: https://sources.debian.org/src/libbpf/1.5.0-3/src/bpf_endian.h
- Debian `hping3(8)` man page: https://manpages.debian.org/bookworm/hping3/hping3.8.en.html
- Local CLI verification against installed tools: `ip link help`, `bpftool prog help`, `bpftool map help`, `trace-cmd list -e bpf`, and `ping -h`

## Issues Found
- The prerequisites said `CAP_BPF` alone was sufficient. I corrected this to `CAP_BPF + CAP_NET_ADMIN` for XDP loading and attachment, and noted that `CAP_PERFMON` is additionally relevant when using `bpf_printk` for debugging.
- The sample C program used `bpf_htons()` and `bpf_ntohl()` without including `<bpf/bpf_endian.h>`. I added the missing libbpf header so the example matches the documented macro definitions.
- The compile command omitted `-g` even though the inspection section referred to BTF details. I added `-g` so debug/BTF metadata is emitted for the object file.
- The description and overview claimed the post used tracepoints and TC hooks, but the actual code example is an XDP program. I corrected that wording to `XDP or TC hooks`.
- The testing section used `ping6`, while current `iputils` documentation uses `ping -6`. I updated the command accordingly.
- The testing section used `hping3 --ipv6`, but the documented `hping3` interface does not provide a `--ipv6` option. I replaced that example with a valid larger-packet `ping -6` test.
- The debugging section used a raw `trace_pipe` path and an invalid or unclear `trace-cmd -e "bpf:*"` selector. I replaced those with `bpftool prog tracelog` and `trace-cmd record -e bpf_trace:bpf_trace_printk`, which match current tooling behavior.

## Review Notes
- The post is technically correct after the fixes above, but it remains focused on XDP parsing and debugging. It mentions Prometheus and OneUptime conceptually without showing a metric exporter or Prometheus scrape configuration.
- The example target `2001:db8::1` is in the IPv6 documentation prefix reserved by RFC 3849 and should be treated as a placeholder for a lab or real IPv6 target.
