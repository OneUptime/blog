# Validation Summary: How to Configure UDP Rate Limiting with iptables

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- iptables (netfilter)
- iptables `limit` module
- iptables `hashlimit` module
- iptables `LOG` target
- Linux traffic control (tc) with HTB qdisc
- UDP protocol (IP protocol 17)
- /proc/net/ipt_hashlimit/ kernel interface
- iptables-save / iptables-persistent

## Sources Consulted
- iptables-extensions(8) man page (limit, hashlimit, LOG modules) — https://ipset.netfilter.org/iptables-extensions.man.html
- iptables(8) man page — https://ipset.netfilter.org/iptables.man.html
- tc(8) and tc-htb(8) man pages — https://man7.org/linux/man-pages/man8/tc.8.html, https://man7.org/linux/man-pages/man8/tc-htb.8.html
- IANA Assigned Internet Protocol Numbers (UDP = 17) — https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml
- RFC 768 (UDP)
- Debian iptables-persistent documentation (rules.v4 path)
- Linux kernel source: net/netfilter/xt_hashlimit.c (proc entry naming)

## Issues Found
No technical issues found.

## Review Notes
- The `limit` module examples use the standard pattern of `-m limit ... -j ACCEPT` followed by a catch-all `-j DROP`. This relies on the token-bucket behavior where the rule matches only while tokens are available; exceeding traffic falls through to the DROP rule. Correct.
- The `hashlimit` examples correctly use `--hashlimit-above N -j DROP` to drop packets that exceed the threshold. (`--hashlimit-above` matches when the rate is above the value; `--hashlimit-upto` would be the inverse.)
- The LOG+DROP section uses two separate `--hashlimit-name` entries (`udp_log` and `udp_drop`). Each rule maintains an independent hash table, so the LOG and DROP rate counters are tracked separately. This works correctly but is slightly less efficient than reusing a single name; it's a stylistic choice rather than an error.
- In the FORWARD chain example, `--hashlimit-mode dstip` combined with a fixed `-d 10.20.0.10` effectively rate-limits the single destination globally (dstip is always the same). This is functional and the comment is accurate.
- The first tc block (without a UDP filter) limits all traffic on eth0 via the default class — the comment "Limit UDP to 50 Mbps" is technically correct in that UDP would indeed be capped, though all other traffic is also capped. The second tc block adds the UDP-specific u32 filter. Considered editing for clarity but determined the comment is not technically wrong, so left as written per the "only fix technical errors" directive.
- HTB class structure with classes as direct children of the root qdisc is valid (no intermediate parent class required), though using a parent class is more common in production setups.
- `/proc/net/ipt_hashlimit/<name>` is the correct path for IPv4; IPv6 uses `/proc/net/ip6t_hashlimit/`. The post only deals with IPv4, so this is fine.
- The post does not mention nftables, which is the modern replacement for iptables on most distributions (the local environment shows `iptables v1.8.10 (nf_tables)`, which is the iptables-nft compatibility layer). Existing iptables syntax continues to work via this shim, so the commands remain valid, but readers running on nftables-native systems may eventually want to migrate to nft `limit` rules. Not a correctness issue for this post.
