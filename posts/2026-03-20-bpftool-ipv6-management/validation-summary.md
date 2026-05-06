# Validation Summary: How to Use bpftool for IPv6 eBPF Program Management

## Status
validated

## Post Type
Guide

## Technologies Covered
- `bpftool`
- eBPF
- XDP
- IPv6
- `iproute2`
- `trace-cmd`
- `curl`
- C

## Sources Consulted
- Linux kernel BTF documentation: https://docs.kernel.org/bpf/btf.html
- Linux kernel tracing documentation: https://docs.kernel.org/trace/debugging.html
- `ip-link(8)` manual: https://man7.org/linux/man-pages/man8/ip-link.8.html
- `capabilities(7)` manual: https://man7.org/linux/man-pages/man7/capabilities.7.html
- RFC 8200: https://www.rfc-editor.org/rfc/rfc8200.html
- `hping3(8)` Debian man page: https://manpages.debian.org/bookworm/hping3/hping3.8.en.html
- Local `bpftool` help output: `bpftool help`, `bpftool prog help`, and `bpftool map help`
- Local Linux capability header: `/usr/include/linux/capability.h`
- Local libbpf endian header: `/usr/src/linux-headers-6.17.0-20-generic/tools/bpf/resolve_btfids/libbpf/include/bpf/bpf_endian.h`
- Local `curl` help output: `curl --help all`
- Local `trace-cmd` help output: `trace-cmd record --help`

## Issues Found
- The code sample used `bpf_htons()` and `bpf_ntohl()` without including `<bpf/bpf_endian.h>`. I added the missing header because those macros are defined there.
- The compile command omitted `-g`, which means LLVM would not emit BTF metadata for the object file. I added `-g` so the later `bpftool` BTF inspection step is technically consistent.
- The prerequisites implied that `CAP_BPF` alone was enough. I updated them to reflect that XDP program loading needs `CAP_BPF` and `CAP_NET_ADMIN`, and that some system-wide `bpftool` listing operations may also require `CAP_SYS_ADMIN`.
- The prerequisites were missing `bpftool` itself and the libbpf headers required by the sample includes. I added both so the setup matches the commands and code shown in the post.
- The `hping3 --ipv6` example was not supported by the documented `hping3` CLI. I replaced it with a documented IPv6-capable `curl -6` example to generate IPv6 TCP traffic.
- The tracing example used `/sys/kernel/debug/tracing/trace_pipe`. I updated it to `/sys/kernel/tracing/trace_pipe`, which matches the current tracefs path used by kernel tracing documentation.

## Review Notes
- The explanation that the IPv6 base header is a fixed 40 bytes and may be followed by extension headers is accurate per RFC 8200.
- `bpftool prog list` and `bpftool map list` are valid command forms; `show` is also accepted.
- `ping6` still exists on current iputils releases, but `ping -6` is the more portable form across environments.
