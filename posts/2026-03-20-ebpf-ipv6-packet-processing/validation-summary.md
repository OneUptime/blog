# Validation Summary: How to Write eBPF Programs for IPv6 Packet Processing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- eBPF
- IPv6
- Linux Traffic Control (`tc`)
- Linux TCX
- Go
- `github.com/cilium/ebpf`
- Prometheus-style metrics monitoring

## Sources Consulted
- Linux UAPI IPv6 header definition: https://raw.githubusercontent.com/torvalds/linux/master/include/uapi/linux/ipv6.h
- Linux traffic-control action constants: https://raw.githubusercontent.com/torvalds/linux/master/include/uapi/linux/pkt_cls.h
- `tc-bpf` manual page: https://man7.org/linux/man-pages/man8/tc-bpf.8.html
- `github.com/cilium/ebpf/link` package docs: https://pkg.go.dev/github.com/cilium/ebpf/link
- Official `cilium/ebpf` TCX example: https://github.com/cilium/ebpf/tree/main/examples/tcx
- Official `bpf2go` docs: https://pkg.go.dev/github.com/cilium/ebpf/cmd/bpf2go
- Official `cilium/ebpf` getting-started guide: https://github.com/cilium/ebpf/blob/main/docs/ebpf/guides/getting-started.md
- RFC 8200, Internet Protocol, Version 6 (IPv6) Specification: https://www.rfc-editor.org/rfc/rfc8200
- RFC 4302, IP Authentication Header: https://www.rfc-editor.org/rfc/rfc4302
- OneUptime metrics monitoring docs: https://oneuptime.com/docs/monitor/metrics-monitor

## Issues Found
- The IPv6 header snippet was described as an RFC 8200 layout, but it actually matched Linux's `struct ipv6hdr` and omitted the endianness-dependent bitfield layout. I corrected the snippet to reflect the Linux UAPI definition and clarified what `flow_lbl[3]` contains.
- The BPF C example used `TC_ACT_OK` without including `<linux/pkt_cls.h>`. I added the missing header so the snippet is compile-correct.
- The map comment said it counted packets per IPv6 prefix, but the key type was `struct in6_addr`, which is a full IPv6 address. I corrected the comment.
- The debug logging printed only part of the IPv6 source address and would be misleading as written. I replaced it with a simpler, accurate debug print of the IPv6 next-header field.
- The hash-map insertion path could lose an increment under contention when two packets for a new destination raced on first insert. I added a retry lookup path after a failed `BPF_NOEXIST` update.
- The `tc` load command used shorthand arguments. I normalized it to the documented `object-file` and `section` form from `tc-bpf(8)`.
- The Go example used `link.AttachTCIngress` and `link.TCOptions`, which are not current `cilium/ebpf` APIs. I updated it to use the documented `link.AttachTCX` and `link.TCXOptions` API and noted that TCX requires Linux 6.6+.
- The `bpf2go` directive used an older invocation style. I updated it to the current `go tool bpf2go` form documented by `cilium/ebpf`.
- The IPv6 extension-header parser incorrectly treated Fragment headers like generic extension headers, did not handle Authentication Header length rules, and did not verify the full header length before advancing the offset. I corrected those cases.

## Review Notes
- The classic `tc` command path remains the more compatible attach mechanism for older kernels; the Go attach example now uses TCX, which requires Linux 6.6 or newer.
- OneUptime's current metrics documentation supports monitoring metrics sent to the platform, and the product pages describe Prometheus compatibility, so the monitoring recommendation is still plausible.
- `clang` and `go` were not available in this workspace, so validation was done against upstream documentation, upstream source, local Linux headers, and the local `tc` man page rather than by compiling the snippets end-to-end.
