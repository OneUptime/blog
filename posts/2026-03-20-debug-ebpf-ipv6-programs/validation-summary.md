# Validation Summary: How to Debug eBPF IPv6 Programs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- eBPF (Extended Berkeley Packet Filter)
- XDP (eXpress Data Path)
- IPv6 (RFC 8200)
- Linux kernel BPF subsystem
- libbpf (`bpf_helpers.h`, `bpf_endian.h`)
- Clang/LLVM (BPF target)
- iproute2 (`ip link`)
- bpftool
- ping6 / hping3 / trace-cmd
- Linux tracing infrastructure (`/sys/kernel/debug/tracing/trace_pipe`)

## Sources Consulted
- libbpf source tree: https://github.com/libbpf/libbpf (specifically `src/bpf_helpers.h` and `src/bpf_endian.h` to confirm which header defines `bpf_htons` / `bpf_ntohl`)
- Linux kernel headers: `include/uapi/linux/if_ether.h` (ETH_P_IPV6 = 0x86DD), `include/uapi/linux/ipv6.h` (struct ipv6hdr / s6_addr32)
- RFC 8200 (IPv6 Specification — confirms 40-byte fixed header followed by extension headers)
- Linux kernel BPF documentation: https://docs.kernel.org/bpf/
- iproute2 `ip-link(8)` man page for XDP attach syntax (`ip link set dev <iface> xdp obj <file> sec <section>`)
- bpftool man pages for `prog list`, `prog show`, `prog dump xlated`, `map list`, `map dump`
- CAP_BPF capability: introduced in Linux 5.8 (`include/uapi/linux/capability.h`)

## Issues Found
1. **Missing `#include <bpf/bpf_endian.h>` in the C example.** The code uses `bpf_htons(ETH_P_IPV6)` and `bpf_ntohl(...)`, but these byte order conversion macros are defined in `<bpf/bpf_endian.h>`, not in `<bpf/bpf_helpers.h>`. Without that include, the program would fail to compile with undefined macro errors. Added the missing `#include <bpf/bpf_endian.h>` line after the existing `bpf_helpers.h` include.

## Review Notes
- The XDP bounds-check pattern (`(void *)(eth + 1) > data_end` and `(void *)(ip6h + 1) > data_end`) is correct and matches what the eBPF verifier requires.
- `bpf_printk` is used with 2 variadic arguments, which is within the 3-argument helper limit.
- `ping6` is technically deprecated in modern iputils in favor of `ping -6`, but `ping6` still works on most distributions and is widely understood — left as-is.
- Mainline `hping3` does not officially support IPv6, but Debian/Ubuntu's hping3 package ships with an IPv6 patch enabling `--ipv6`. This may not work on all distributions; readers on minimal/non-Debian-based systems may need an alternative tool such as `nping --ipv6`. Left as-is since the post targets a typical Linux environment.
- The trace pipe path `/sys/kernel/debug/tracing/trace_pipe` requires debugfs to be mounted; on some systems `/sys/kernel/tracing/trace_pipe` (tracefs) is preferred. Both work in practice.
- CAP_BPF requires Linux 5.8+, so the stated 5.6+ prerequisite is technically a minimum for BTF/full feature parity but CAP_BPF specifically needs 5.8+. Not significant enough to warrant a change since the post says "Root access OR CAP_BPF".
