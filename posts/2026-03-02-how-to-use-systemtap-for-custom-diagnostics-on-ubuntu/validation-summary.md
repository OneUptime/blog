# Validation Summary: How to Use SystemTap for Custom Diagnostics on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- SystemTap (stap)
- Linux kernel (kernel.function probes, syscall probes)
- Ubuntu package management (apt, ddebs.ubuntu.com debug symbol repo)
- Linux kernel networking internals (`tcp_sendmsg`, `tcp_v4_connect`, `inet_csk_accept`, `kfree_skb_reason`, `sock_common`)
- Statistical aggregators (`<<<`, `@count`, `@avg`, `@min`, `@max`, `@hist_log`)
- User-space probing (`process(...).function(...)`)

## Sources Consulted
- [SystemTap Language Reference](https://sourceware.org/systemtap/langref.pdf)
- [stap(1) man page (Debian)](https://manpages.debian.org/testing/systemtap/stap.1.en.html)
- [SystemTap Beginners Guide — Array Operations / foreach](https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/7/html/systemtap_beginners_guide/arrayoperators)
- [SystemTap Language Reference — foreach](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/5/html/systemtap_language_reference/foreach)
- [Ubuntu Debug Symbol Packages (ddebs)](https://wiki.ubuntu.com/Debug%20Symbol%20Packages)
- [linux/include/net/sock.h (sock_common definition)](https://github.com/torvalds/linux/blob/master/include/net/sock.h)
- [Linux commit c504e5c — net: skb: introduce kfree_skb_reason()](https://github.com/torvalds/linux/commit/c504e5c2f9648a1e5c2be01e8c3f59d394192bd3)
- [How to retrieve packet drop reasons in the Linux kernel — Red Hat Developer](https://developers.redhat.com/articles/2023/07/19/how-retrieve-packet-drop-reasons-linux-kernel)
- [DTrace/SystemTap Book — Kernel networking probes (myaut)](https://myaut.github.io/dtrace-stap-book/kernel/net.html)

## Issues Found

1. **Incorrect use of `ntohs()` on `skc_num`** (TCP connections script).
   - The post had: `local_port = ntohs($return->__sk_common->skc_num)`.
   - `skc_num` in `struct sock_common` is declared as `__u16` and is stored in **host** byte order (unlike `skc_dport`, which is `__be16` / network byte order). Applying `ntohs()` byte-swaps a value that is already in the correct order, producing a wrong port number.
   - Fixed: removed `ntohs()` and added a brief comment explaining the byte order.

2. **`kernel.function("kfree_skb")` with `$reason`** (packet drops script).
   - The post probed `kfree_skb`, which has signature `void kfree_skb(struct sk_buff *skb)` and does **not** have a `$reason` argument. The drop-reason parameter was introduced in `kfree_skb_reason()` in Linux 5.17 (commit c504e5c).
   - Fixed: changed the probe to `kernel.function("kfree_skb_reason")` and added a comment noting the 5.17 kernel requirement.

3. **Missing `global` declaration for `start_time`** (nginx user-space probe).
   - The script used `start_time[tid()]` across two probes but never declared `start_time` as `global`. SystemTap requires the `global` keyword for variables shared between probes — without it, the script fails to compile.
   - Fixed: added `global start_time` near the top of the script.

## Review Notes

- The `tcp_v4_connect` and `inet_csk_accept` probe points and the `$return->__sk_common->skc_num` accessor depend on kernel debug symbols and the kernel structure layout; these may shift between major kernel versions. Tested probes on a specific running kernel are recommended before relying on them in production.
- Some commonly used kernel functions (e.g. `tcp_sendmsg`) may get inlined or renamed across kernel versions. The post already warns about this in the troubleshooting section.
- The `ddebs.ubuntu.com` repository and `ubuntu-dbgsym-keyring` package are correct for Ubuntu 22.04 and later. The keyring package replaces the older `apt-key`-based instructions seen in some older tutorials.
- The `print(@hist_log(latencies))` pattern is correct, but readers should note that `@hist_log` prints a histogram directly when used as a statement; wrapping it in `print()` works because `@hist_log` returns formatted text. Left as-is since both forms are accepted.
- `stap -p4` compiles through pass 4 (module build) without loading/running; this matches the post's description.
- `stap -T 5` (run for 5 seconds) is correct per the current stap(1) man page.
