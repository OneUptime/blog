# Validation Summary: How to Set Up iptables Rate Limiting on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- iptables (netfilter)
- iptables `limit` module (token bucket)
- iptables `hashlimit` module (per-source-IP token bucket)
- iptables `recent` module (timestamp tracking)
- iptables `connlimit` module (simultaneous connection cap)
- iptables `state` / conntrack matching
- Linux sysctl (`net.ipv4.tcp_syncookies`)
- `iptables-persistent` / `netfilter-persistent` (Ubuntu/Debian)
- `/proc/net/ipt_hashlimit/` and `/proc/net/xt_recent/` kernel pseudo-files
- TCP SYN flood mitigation

## Sources Consulted
- iptables-extensions(8) — https://ipset.netfilter.org/iptables-extensions.man.html
- iptables(8) — https://linux.die.net/man/8/iptables
- Ubuntu manpage: iptables-extensions — https://manpages.ubuntu.com/manpages/xenial/man8/iptables-extensions.8.html
- Debian Wiki: iptables — https://wiki.debian.org/iptables
- Notes on the `state` match being obsolete in favor of `conntrack` (still functional) — https://blog.yjl.im/2012/11/iptables-state-match-is-obsolete-use.html
- Background on hashlimit token-bucket semantics — https://poorlydocumented.com/2017/08/understanding-iptables-hashlimit-module/

## Issues Found

1. **Incorrect claim that the `limit` module is per-source-IP.** In the "Limiting SSH Brute Force Attempts" section the comment read "limit to 3 new connection attempts per minute per source IP", but the `limit` module is a global per-rule token bucket and does not partition state by source IP. Fixed the comment to state the rate is global and reference the `hashlimit` section for per-IP limiting.

2. **`recent` module rule ordering was off-by-one and could refresh the ban timestamp on every blocked packet.** The original example placed `-m recent --set` before `-m recent --update --hitcount 5 -j DROP`. Because `--set` also appends a timestamp that `--hitcount` counts, this ordering inflates the count `--update` sees and refreshes the "last seen" time on dropped packets (potentially extending the ban indefinitely under sustained probing). Reversed the order to the standard pattern (`--update -j DROP` first, then `--set`) and added a short comment explaining why the order matters.

## Review Notes
- The `-m state --state ...` syntax used throughout is still functional on Ubuntu 20.04 / 22.04 / 24.04 (it is a thin wrapper around conntrack), but it is upstream-deprecated. The modern preferred form is `-m conntrack --ctstate ...`. The post is internally consistent in using the legacy form, so it was left as-is.
- Putting two `hashlimit` rules with the same name back-to-back (LOG then DROP in the "Complete Ruleset") causes each matched packet to consume two tokens from the per-IP bucket. The practical effect is minor — the LOG/DROP pair still triggers on the same logical event — but readers tuning thresholds precisely should be aware.
- `net.ipv4.tcp_syncookies=1` is already the default on modern Ubuntu; the sysctl command and persistence step remain correct but are largely redundant on default installs.
- The `--syn` shorthand expands to `--tcp-flags FIN,SYN,RST,ACK SYN`, which is correct for matching TCP SYNs.
- Rate format short forms (`/s`, `/min`, `/h`, `/d`) are accepted by the `limit` module per the iptables(8) man page, so the rate-format reference block is accurate.
- `/proc/net/ipt_hashlimit/<name>` and `/proc/net/xt_recent/<name>` are the correct pseudo-file paths on current kernels (note `ipt_hashlimit`, not `xt_hashlimit`).
