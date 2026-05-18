# Validation Summary: How to Use bpftrace for System Tracing on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- bpftrace (BPF tracing language)
- eBPF / Linux kernel tracing infrastructure
- Linux kprobes, uprobes, tracepoints, USDT
- Ubuntu (20.04+) package management
- FlameGraph (Brendan Gregg's stackcollapse / flamegraph tools)
- libc / glibc userspace tracing (malloc, free, open)
- Linux block I/O subsystem tracepoints
- Linux network stack (tcp_connect, tcp_close, struct sock)

## Sources Consulted
- bpftrace Standard Library reference — https://bpftrace.org/docs/release_023/stdlib
- bpftrace Language reference (probe types, retval semantics) — https://bpftrace.org/docs/release_023/language
- bpftrace one-liner tutorial — https://github.com/bpftrace/bpftrace/blob/master/docs/tutorial_one_liners.md
- bpftrace tcpaccept.bt reference implementation — https://github.com/bpftrace/bpftrace/blob/master/tools/tcpaccept.bt
- bcc issue #4261 (biosnoop broken on 5.19 due to blk_account_io_start) — https://github.com/iovisor/bcc/issues/4261
- bcc issue #4478 (missing __blk_account_io_start kprobe) — https://github.com/iovisor/bcc/issues/4478
- bpftrace issue #3621 (biosnoop kernel ABI change) — https://github.com/bpftrace/bpftrace/issues/3621
- bpftrace PR #2507 (switch from blk_account_io_start kprobe to block tracepoints)
- Linux kernel tracepoint format for `sys_enter_sendto` (`/sys/kernel/debug/tracing/events/syscalls/sys_enter_sendto/format`)
- Linux kernel `sock_common` definition (`include/net/sock.h`) for `skc_dport` (`__be16`) byte order

## Issues Found

1. **`sys_enter_sendto` field name was wrong.** The DNS-counting one-liner filtered on `args->dest_len == 16`, but the actual tracepoint field is `addr_len`. Verified against the kernel tracepoint format. Changed `args->dest_len` → `args->addr_len`.

2. **`kprobe:blk_account_io_start` is broken on modern kernels.** Since kernel ~5.17 the function was renamed `__blk_account_io_start`, and on 5.19+/6.x it is typically inlined or marked notrace, making the kprobe unattachable on current Ubuntu releases (22.04, 24.04). Replaced with the stable `tracepoint:block:block_rq_issue` (also adjusted the comment to "issuing block I/O" since this is the request-issue point, not strictly "reading"). This is the same fix bpftrace upstream applied (PR #2507).

3. **`malloc-track.bt` referenced `retval` in a `uprobe` (entry) block.** `retval` is only defined in `uretprobe`/`kretprobe` blocks per the bpftrace language docs — using it in an entry probe is invalid. The original pattern keyed the entry map by `[tid, retval]` and tried to look it up the same way on return, which would not work even if `retval` were available, since the entry-probe `retval` would never equal the return-probe `retval`. Rewrote to the canonical malloc-tracking pattern: store the requested size keyed by `tid` at entry, then on uretprobe move it into `@allocations[retval]` (where `retval` is the allocated address returned by malloc). The `free` block already correctly uses `arg0` as the freed pointer, so it now matches.

## Review Notes

- The comment "Show the top 10 processes by CPU time (sample every 10ms)" is slightly loose: `profile:hz:99` samples ~99 times per second (~10.1 ms) and the script does not enforce a top-10 limit — it prints all sampled processes. Not a hard technical error, left as-is.
- The DNS heuristic (`addr_len == 16`) catches any IPv4 `sendto` (sockaddr_in is 16 bytes), not strictly DNS. The post's parenthetical "queries hitting the network" is honest about it being a coarse filter.
- The TCP byte-swap of `skc_dport` uses an inline expression; modern bpftrace also exposes a `bswap()` builtin which is more idiomatic, but the manual swap is correct and parenthesized properly (`(port & 0xff) << 8` evaluates before `|`).
- Tracing `open` in glibc (`uprobe:/lib/x86_64-linux-gnu/libc.so.6:open`) works on most systems where the alias symbol is exported, but on builds where applications go through `open64` or call the syscall directly the uprobe will not fire. Reasonable for an introductory example.
- The post says "Need 4.9+ for basic eBPF, 5.x+ for full bpftrace features" — broadly accurate; bpftrace itself officially requires kernel 4.9+ but many features (BTF, kfuncs, signal sending) require 5.x.
- libc paths assume Debian/Ubuntu x86_64 layout (`/lib/x86_64-linux-gnu/libc.so.6`). Readers on arm64 or other distros will need to adjust, but this is consistent with the "on Ubuntu" framing.
