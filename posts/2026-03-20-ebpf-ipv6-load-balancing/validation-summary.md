# Validation Summary: How to Use eBPF for IPv6 Load Balancing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- eBPF
- XDP
- IPv6
- Clang/LLVM
- libbpf headers
- iproute2
- bpftool
- Nping
- trace-cmd

## Sources Consulted
- Linux kernel BPF documentation: https://docs.kernel.org/bpf/
- Linux kernel BTF documentation: https://docs.kernel.org/bpf/btf.html
- RFC 8200, Internet Protocol Version 6 (IPv6) Specification: https://www.rfc-editor.org/rfc/rfc8200
- `ip-link(8)` manual page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- `ping(8)` manual page: https://man7.org/linux/man-pages/man8/ping.8.html
- `capabilities(7)` manual page: https://man7.org/linux/man-pages/man7/capabilities.7.html
- `nping(1)` manual page: https://man7.org/linux/man-pages/man1/nping.1.html
- `hping3(8)` Debian man page: https://manpages.debian.org/bookworm/hping3/hping3.8.en.html
- Local man/help output checked for `bpftool-prog(8)`, `bpftool-map(8)`, `trace-cmd`, and installed libbpf/kernel headers

## Issues Found
- The post claimed to implement IPv6 load balancing and DNAT, but the sample only parsed and logged IPv6 headers. I retitled and re-scoped the post so the content matches the implementation it actually shows.
- The prerequisites mixed a generic `5.6+` kernel claim with `CAP_BPF`, but `CAP_BPF` was introduced in Linux 5.8 and XDP attachment also requires network-administration privileges. I replaced that guidance with capability wording that matches current Linux behavior and added the missing `libbpf` headers prerequisite.
- The C example used `bpf_htons()` and `bpf_ntohl()` without including `<bpf/bpf_endian.h>`. I added the missing header and clarified the log message.
- The compile command omitted `-g` even though the inspection section referred to BTF-oriented tooling. I added `-g` and simplified the `bpftool prog show` description.
- The testing section used `ping6`, which modern iputils folds into `ping -6`. I updated both test commands accordingly.
- The post suggested `hping3 --ipv6`, but current `hping3` documentation does not provide an IPv6 mode or `--ipv6` flag. I replaced that example with `nping --tcp -6 -p 80 ...`, which is documented to support IPv6.
- The debugging section read `trace_pipe` directly. I replaced it with `bpftool prog tracelog`, which is the documented interface for `bpf_trace_printk()` output.

## Review Notes
- This post is now technically accurate as an IPv6/XDP parsing tutorial, not a full load-balancing or DNAT implementation.
- `bpf_printk()` and `bpftool prog tracelog` are debugging tools and should not be used as a high-rate production telemetry path.
- I was not able to compile the sample in this environment because `clang` is not installed. Code and command checks were done against installed headers, local man/help output, and official documentation.
