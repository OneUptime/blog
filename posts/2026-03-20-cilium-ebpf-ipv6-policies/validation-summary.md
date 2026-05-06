# Validation Summary: How to Use Cilium eBPF for IPv6 Network Policies

## Status
validated

## Post Type
Guide

## Technologies Covered
- eBPF
- XDP
- IPv6
- Linux networking
- `iproute2`
- `bpftool`
- `trace-cmd`

## Sources Consulted
- Cilium network policy documentation: https://docs.cilium.io/en/stable/network/kubernetes/policy/
- Cilium eBPF datapath introduction: https://docs.cilium.io/en/stable/network/ebpf/intro/
- RFC 8200, Internet Protocol Version 6 (IPv6) Specification: https://www.rfc-editor.org/rfc/rfc8200
- Libbpf eBPF-side headers index: https://docs.ebpf.io/ebpf-library/libbpf/ebpf/
- Libbpf `bpf_htons` macro documentation: https://docs.ebpf.io/ebpf-library/libbpf/ebpf/bpf_htons/
- Libbpf `bpf_trace_printk` helper documentation: https://docs.ebpf.io/linux/helper-function/bpf_trace_printk/
- Linux kernel ftrace documentation: https://docs.kernel.org/6.4/trace/ftrace.html
- Linux kernel tracing debug guide: https://docs.kernel.org/trace/debugging.html
- Local authoritative CLI/manual checks: `ip link help`, `bpftool prog help`, `ping(8)`, `capabilities(7)`, `trace-cmd --help`

## Issues Found
- The post was titled and described as a Cilium/Kubernetes network policy guide, but the body actually demonstrated a standalone XDP eBPF packet-inspection program. I retitled the post and corrected the tags, description, overview, and conclusion to match the code and commands that were actually present.
- The sample program used `bpf_htons` and `bpf_ntohl` without including `bpf/bpf_endian.h`, which is where libbpf provides those macros. I added the missing include.
- The `ip` example used shorthand options and a weak verification command. I changed it to the documented `object`/`section` syntax and `ip -details link show` for more reliable inspection of XDP attachment.
- The testing commands used obsolete `ping6`, a documentation-only IPv6 example address as if it were directly reachable, and the older debugfs tracing path. I changed them to `ping -6`, a `<REACHABLE_IPV6>` placeholder, and `/sys/kernel/tracing/trace_pipe`.
- The prerequisites implied `CAP_BPF` alone was enough. I clarified that attaching XDP and configuring interfaces also needs networking privileges such as `CAP_NET_ADMIN`, with `CAP_SYS_ADMIN` as the older-kernel fallback.
- The `bpftool map` comments were rewritten to make clear they only apply when the loaded program actually defines maps.

## Review Notes
- The post now validates as a generic eBPF/XDP IPv6 inspection guide, not as a Cilium network policy tutorial.
- The compile command is intentionally minimal. If readers specifically want rich BTF/debug metadata in the object file, they may also add `-g`.
