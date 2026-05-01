# Validation Summary: How to Use eBPF for IPv6 DDoS Mitigation

## Status
validated

## Post Type
Guide / Introductory tutorial

## Technologies Covered
- eBPF
- XDP
- IPv6
- libbpf BPF-side headers
- iproute2 (`ip link`)
- `bpftool`
- `trace-cmd`
- `nping`
- OneUptime
- Prometheus-style metrics scraping

## Sources Consulted
- Linux kernel BTF documentation: https://docs.kernel.org/bpf/btf.html
- Linux kernel tracing documentation (`trace_pipe` / `trace_printk`): https://www.kernel.org/doc/html/latest/trace/debugging.html
- RFC 8200, Internet Protocol Version 6 (IPv6) Specification: https://datatracker.ietf.org/doc/rfc8200/
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849
- Linux capabilities(7): https://man7.org/linux/man-pages/man7/capabilities.7.html
- `ip-link(8)`: https://man7.org/linux/man-pages/man8/ip-link.8.html
- `ping(8)` / iputils: https://man7.org/linux/man-pages/man8/ping.8%40%40iputils.html
- Nping Reference Guide: https://nmap.org/book/nping-man.html
- libbpf `bpf_endian.h`: https://raw.githubusercontent.com/libbpf/libbpf/master/src/bpf_endian.h
- libbpf `bpf_helpers.h`: https://raw.githubusercontent.com/libbpf/libbpf/master/src/bpf_helpers.h
- Local CLI/manpage checks: `bpftool prog help`, `bpftool map help`, `trace-cmd-record(1)`, `trace-cmd-report(1)`

## Issues Found
- The example used `bpf_htons()` and `bpf_ntohl()` without including `<bpf/bpf_endian.h>`. I added the missing header because those endian helpers live there, not in `bpf_helpers.h`.
- The prerequisites claimed `Linux kernel 5.6+` and implied `CAP_BPF` alone was enough. I updated this to `Linux kernel 5.8+ recommended` and `CAP_BPF` plus `CAP_NET_ADMIN`, which matches the modern capability model for loading and attaching XDP programs.
- The compile command omitted `-g`, so the object would not include BTF metadata even though the post later tells readers to inspect BTF details. I changed the command to `clang -O2 -g --target=bpf -c program.c -o program.o`.
- The testing section used `ping6`, which current iputils documents as merged into `ping`. I replaced it with `ping -6`.
- The testing section used `hping3 --ipv6`, which is not documented in the upstream `hping3` manual I checked. I replaced it with `nping --tcp -6 -p 80 --flags syn <TARGET_IPV6>`, which is documented by Nmap.
- The trace pipe example used `/sys/kernel/debug/tracing/trace_pipe`. I updated it to `/sys/kernel/tracing/trace_pipe`, which is the canonical tracefs path in current kernel docs.
- The example traffic commands used `2001:db8::1` as a literal target. I changed that to `<TARGET_IPV6>` so the commands are clearly placeholders instead of suggesting the RFC 3849 documentation prefix is a real destination.
- The description and overview overstated the sample as a drop-based mitigation program even though the code only parses and logs IPv6 headers. I narrowed that wording so it accurately describes the current example as foundational inspection for mitigation work.

## Review Notes
- The XDP sample is technically fine for reading the fixed IPv6 header and logging the source prefix.
- If the post is expanded later to filter TCP/UDP fields, it should explicitly show how to walk IPv6 extension headers before treating the next header as L4.
- On older kernels, capability requirements differ from the modern `CAP_BPF` split; the updated prerequisite keeps the article aligned with current kernels rather than documenting every legacy path.
