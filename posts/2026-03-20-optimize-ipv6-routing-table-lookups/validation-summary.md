# Validation Summary: How to Optimize IPv6 Routing Table Lookups

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux kernel IPv6 networking stack (FIB6 radix tree, dst exception cache)
- `net.ipv6.route.*` sysctls (max_size, gc_thresh, gc_min_interval_ms, gc_timeout)
- `net.ipv6.fib_multipath_hash_policy` (ECMP)
- iproute2 (`ip -6 route`, `ip -6 rule`)
- `/etc/iproute2/rt_tables` policy routing
- `/proc/net/fib_triestat`, `/proc/net/rt6_stats`
- `perf stat`, `iperf3`, `netstat`

## Sources Consulted
- Linux kernel ip-sysctl documentation: https://docs.kernel.org/networking/ip-sysctl.html
- Linux kernel source `net/ipv6/route.c`: https://github.com/torvalds/linux/blob/master/net/ipv6/route.c
- Linux kernel source `net/ipv4/fib_trie.c` (for `fib_triestat`): https://github.com/torvalds/linux/blob/master/net/ipv4/fib_trie.c
- Vincent Bernat — "IPv6 route lookup on Linux": https://vincent.bernat.ch/en/blog/2017-ipv6-route-lookup-linux
- Vincent Bernat — "Performance progression of IPv6 route lookup on Linux": https://vincent.bernat.ch/en/blog/2017-performance-progression-ipv6-route-lookup-linux
- Kernel commit `45e4fd26683c` (Martin KaFai Lau, IPv6 dst cache rework, kernel 4.2)
- Kernel commit `66f5d6ce53e6` (Wei Wang, RCU FIB6 lookup, kernel 4.15)
- net-tools netstat man page: https://net-tools.sourceforge.io/man/netstat.8.html

## Issues Found

1. **Incorrect kernel version for IPv6 cache rework.** The post said "Linux removed the IPv6 route cache in kernel 3.12+". This is wrong: the IPv4 route cache was removed in 3.6, while the IPv6 dst cache was reworked in **kernel 4.2** (commit `45e4fd26683c` by Martin KaFai Lau), with RCU lookups landing in 4.15 (Wei Wang). Updated Step 1 accordingly.

2. **"FIB Hash Table Size" terminology is inaccurate.** The IPv6 FIB is a radix tree (Patricia trie), not a hash table. Furthermore, `net.ipv6.route.max_size` and the `gc_*` sysctls govern the dst exception cache (PMTU/redirect entries), not the FIB itself. Renamed Step 2 to "Tune the IPv6 Route Cache and GC Parameters" and added a one-line clarification.

3. **Outdated `net.ipv6.route.max_size` default.** The post stated "Default is 4096". That was true historically, but in current kernels the default is `INT_MAX` and the knob is **deprecated since kernel 6.3** (the comment in `net/ipv6/route.c` and ip-sysctl docs explicitly say so — GC manages cache entries). Setting it to 2147483647 is effectively a no-op on modern kernels. Reworded the comment to note the historical default and the deprecation.

4. **Incomplete `fib_multipath_hash_policy` values.** The post listed only "0 = L3 (src+dst IP), 1 = L4 (adds ports)". The kernel documents four values: 0 (L3 — src+dst **plus flow label**), 1 (L4 / 5-tuple), 2 (L3 inner for tunneled traffic), 3 (custom via `fib_multipath_hash_fields`). Also corrected "default in modern kernels" — 0 is the default, and the post's `=1` setting changes that. Expanded the comment to list all four values and clarified the default.

5. **Invalid `netstat -s6` syntax.** `-6` is a separate flag, not a suffix to `-s`; net-tools netstat does not accept `-s6`. Changed to `netstat -s -6`.

## Review Notes
- `/proc/net/fib_triestat` is IPv4-only (requires `CONFIG_IP_FIB_TRIE_STATS`); the post's fallback to `/proc/net/rt6_stats` for IPv6 is correct.
- The `gc_thresh = 1024`, `gc_min_interval_ms = 500`, `gc_timeout = 60` values written by the post match the kernel defaults — they are illustrative rather than tuning, but technically correct.
- `ip -6 -s route show | grep -i error` will work but typically returns nothing on a healthy system; the per-route error counter is rarely populated.
- The `2001:db8::/32` documentation prefix and `2001:db8:1::/48`, `2001:db8:100::/48` subprefixes used throughout are correct per RFC 3849.
- ECMP `nexthop ... weight 1` syntax for `ip -6 route add` is valid iproute2 syntax.
- The post could benefit from mentioning `ip -6 route get <addr>` as a quick lookup-correctness check, but this is a future enhancement, not a correction.
