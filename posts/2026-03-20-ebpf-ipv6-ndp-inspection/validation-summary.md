# Validation Summary: How to Write eBPF Programs for IPv6 NDP Inspection

## Status
validated

## Post Type
Guide

## Technologies Covered
- eBPF
- XDP
- IPv6
- ICMPv6 / NDP
- bpftool
- iproute2 (`ip`)
- trace-cmd
- OneUptime

## Sources Consulted
- Linux kernel documentation: Program Types and ELF Sections - https://docs.kernel.org/bpf/libbpf/program_types.html
- Linux kernel documentation: Using the tracer for debugging - https://docs.kernel.org/trace/debugging.html
- eBPF Docs: `bpf_printk` - https://docs.ebpf.io/ebpf-library/libbpf/ebpf/bpf_printk/
- eBPF Docs: `bpf_htons` - https://docs.ebpf.io/ebpf-library/libbpf/ebpf/bpf_htons/
- `ip-link(8)` man page - https://man7.org/linux/man-pages/man8/ip-link.8.html
- `ping(8)` man page - https://man7.org/linux/man-pages/man8/ping.8.html
- `capabilities(7)` man page - https://man7.org/linux/man-pages/man7/capabilities.7.html
- RFC 8200: Internet Protocol, Version 6 (IPv6) Specification - https://datatracker.ietf.org/doc/html/rfc8200
- RFC 4861: Neighbor Discovery for IP version 6 (IPv6) - https://datatracker.ietf.org/doc/html/rfc4861
- OneUptime homepage - https://oneuptime.com/

## Issues Found
- The sample program only parsed generic IPv6 packets and did not inspect NDP traffic. I updated it to parse ICMPv6, require Hop Limit 255, filter NDP message types 133-137, and log NDP traffic so the example matches the post's stated purpose.
- The code used `bpf_htons` and `bpf_ntohl` without including `<bpf/bpf_endian.h>`. I added the missing header so the sample matches current libbpf macro definitions.
- The compile command omitted `-g`, which is needed for a BTF-oriented workflow. I added `-g` to align the build example with the prerequisite and inspection guidance.
- The XDP attach example used `obj` and `sec`, while current documented `ip link` syntax uses `object` and `section`. I updated the command to match `ip-link(8)`.
- The prerequisite line implied `CAP_BPF` alone was sufficient. I corrected it to root access or equivalent privileges needed to both load BPF programs and attach XDP to an interface.
- The testing section used `ping6`, which current `ping(8)` documents as merged into `ping`. I changed the examples to `ping -6`.
- The tracing example used the older debugfs path `/sys/kernel/debug/tracing/trace_pipe`. I updated it to the current TraceFS path `/sys/kernel/tracing/trace_pipe`.
- The `hping3 --ipv6` example could not be validated against current tool documentation and was replaced with a verified IPv6 traffic-generation example using `nc -6 -vz`.

## Review Notes
- The example now explicitly states that it assumes ICMPv6 follows the fixed IPv6 header directly. In production code, IPv6 extension headers may need to be walked before accessing `struct icmp6hdr`.
- The review environment did not have `clang` installed, so the eBPF sample was validated against current kernel headers and documentation rather than compiled locally.
