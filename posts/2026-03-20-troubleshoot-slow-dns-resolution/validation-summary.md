# Validation Summary: How to Troubleshoot Slow DNS Resolution Times

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- `dig` (BIND DNS lookup utility)
- `getent` / NSS resolver
- systemd-resolved (`resolvectl`)
- Unbound (`unbound-control`)
- BIND9 (`rndc stats`)
- `tcpdump`
- `nc` (netcat) UDP/TCP probes
- `mtr` network path diagnosis
- DNSSEC (CD/AD flags, RRSIGs)
- `/etc/resolv.conf`, `/etc/hosts`

## Sources Consulted
- BIND 9 `dig` man page (ISC) — https://bind9.readthedocs.io/en/latest/manpages.html#dig-dns-lookup-utility
- RFC 4035 (DNSSEC Protocol Modifications) — AD and CD bit semantics
- RFC 6840 (Clarifications and Implementation Notes for DNS Security)
- systemd-resolved documentation — `resolvectl(1)` man page
- Unbound documentation — `unbound-control(8)` stats output
- BIND 9 statistics channel / `rndc stats` documentation

## Issues Found
1. **Case-sensitive grep for truncation message.** `dig example.com | grep "TRUNCATED"` would never match because dig prints `;; Truncated, retrying in TCP mode.` with only the "T" capitalized. Changed to `grep -i "truncated"` so the match works.
2. **Broken DNSSEC AD-flag detection.** The command `dig +dnssec +cd @8.8.8.8 google.com | grep "AD"` has two problems: (a) the flags line in dig output uses lowercase (`;; flags: qr rd ra ad;`), so a case-sensitive `grep "AD"` does not detect the AD flag — it instead matches the header count line (`ADDITIONAL: 1`); (b) `+cd` sets the Checking Disabled bit which requests the resolver skip validation, defeating the point of verifying that the resolver validates DNSSEC. Replaced with `dig +dnssec @8.8.8.8 google.com | grep "^;; flags:"` and updated the accompanying comment to tell the reader to look for `ad` in the printed flags.

## Review Notes
- `nc -zu` UDP probing is inherently unreliable (UDP is connectionless) but the command is syntactically correct and still commonly used; left as-is since it is a widely known smoke test and not a factual error.
- The BIND9 stats file path `/var/named/data/named_stats.txt` is RHEL/CentOS-conventional; Debian/Ubuntu places it under `/var/cache/bind/` per the `statistics-file` directive in `named.conf`. Not an error, just distro-specific default — left unchanged.
- Unbound's actual stat keys are `total.num.cachehits` / `total.num.cachemiss`; the post's shorthand (`cache.hits / cache.misses`) is conceptually correct for explaining the hit-rate formula, so it was not changed.
- The conclusion mentions "four main causes" while the body covers six sections (adds authoritative nameserver latency and TTL tuning). Minor stylistic inconsistency, not a technical error, so not modified per the "only fix technical errors" constraint.
