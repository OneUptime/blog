# Validation Summary: How to Use XDP for IPv6 Packet Filtering

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- eBPF (extended Berkeley Packet Filter)
- XDP (eXpress Data Path)
- IPv6 (RFC 8200)
- libbpf
- clang / LLVM
- iproute2 (`ip link`)
- bpftool
- trace-cmd / kernel tracing (`/sys/kernel/debug/tracing/trace_pipe`)
- hping3, ping6

## Sources Consulted
- libbpf headers (`bpf_helpers.h`, `bpf_endian.h`) — https://github.com/libbpf/libbpf/tree/master/src
- Linux kernel UAPI headers (`include/uapi/linux/ipv6.h`, `include/uapi/linux/in6.h`) — https://elixir.bootlin.com/linux/latest/source/include/uapi/linux/ipv6.h
- Linux kernel UAPI `if_ether.h` (ETH_P_IPV6 = 0x86DD) — https://elixir.bootlin.com/linux/latest/source/include/uapi/linux/if_ether.h
- XDP documentation and examples — https://docs.kernel.org/bpf/index.html
- bpftool manpage — https://man7.org/linux/man-pages/man8/bpftool.8.html
- iproute2 `ip-link` manpage — https://man7.org/linux/man-pages/man8/ip-link.8.html
- RFC 8200 (IPv6 Specification): 40-byte fixed header + optional extension headers — https://datatracker.ietf.org/doc/html/rfc8200

## Issues Found
- **Missing header include**: The C example calls `bpf_htons(ETH_P_IPV6)` and `bpf_ntohl(...)`, which are defined in `<bpf/bpf_endian.h>` (not `<bpf/bpf_helpers.h>`). Without the endian header, the program fails to compile with implicit-declaration errors. Added `#include <bpf/bpf_endian.h>` to the example.

## Review Notes
- The `struct in6_addr` access pattern `ip6h->saddr.s6_addr32[0]` is correct: `s6_addr32` is a macro in UAPI `<linux/in6.h>` that expands to `in6_u.u6_addr32`.
- The ETH_P_IPV6 value (0x86DD) referenced in the comment is correct per `<linux/if_ether.h>`.
- `ping6` is the older invocation; modern iputils has deprecated the separate binary in favor of `ping -6` / `ping` with an IPv6 target, but `ping6` still works on most distributions so it was left as-is.
- `hping3` has limited and distribution-dependent IPv6 support; the `--ipv6` flag is accepted by patched/Debian builds. Users on stock hping3 builds may need `nping`, `scapy`, or `packeth` instead. Left unchanged since flag usage is not universally wrong.
- Prerequisites state "Linux kernel 5.6+ (for BTF and full eBPF feature support)"; `CAP_BPF` was actually introduced in 5.8, but the stated minimum is still reasonable for general XDP/BTF use, so left as-is.
- `clang -O2 -target bpf -c program.c -o program.o` works for this example; users including more complex kernel headers may need `-g` for BTF and `-D__TARGET_ARCH_x86` plus `-I` paths to vmlinux.h, but that is out of scope here.
