# Validation Summary: How to Debug IPv6 Address Selection Problems

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- IPv6 (RFC 6724 Default Address Selection)
- Linux iproute2 (`ip addr`, `ip addrlabel`)
- Linux sysctl (`net.ipv6.conf.*.use_tempaddr`)
- glibc `getaddrinfo()` and `/etc/gai.conf`
- Python 3 `socket` and `ipaddress` modules
- `ss`, `dig`, `strace`, `curl` CLI tools
- Bash scripting

## Sources Consulted
- RFC 6724 — Default Address Selection for Internet Protocol Version 6 (IPv6), particularly §2.1 (default policy table) and §5 (source address selection rules)
- `ip-addrlabel(8)` man page (iproute2)
- `ip-address(8)` man page (iproute2)
- Linux kernel `Documentation/networking/ip-sysctl.txt` (use_tempaddr semantics)
- Python `socket` module documentation (`getaddrinfo` signature)
- `gai.conf(5)` man page

## Issues Found

1. **Wrong RFC 6724 rule number for "matching label" (table row).** The "Common Address Selection Problems" table referenced "Rule 5/8 mismatch" for label issues. Per RFC 6724 §5, source-selection Rule 5 is "Prefer outgoing interface" and Rule 6 is "Prefer matching label". (RFC 6724 inserted Rule 5.5 between RFC 3484's old Rule 5 and Rule 6, shifting the label rule from Rule 5 to Rule 6.) **Fix:** Changed the table to "Rule 6/8 mismatch".

2. **Bash script: uninitialized `temp` variable and inaccurate Rule 3 wording.** In Step 3's address-state script, `$temp` was referenced in the `echo` but only assigned conditionally inside the loop, so its value would persist across iterations once set. Also, Rule 3 in RFC 6724 is "Avoid deprecated addresses" (a preference, not an unconditional skip — deprecated addresses can still be selected if no alternatives exist). **Fix:** Added `temp=""` initialization at the top of each loop iteration and changed "Rule 3 skips this" to "Rule 3 avoids this".

3. **`ip addrlabel flush` does not restore defaults.** The "Fixing Common Issues" section claimed `ip addrlabel flush  # restore kernel defaults`. The `ip-addrlabel(8)` man page explicitly states flush "does not restore any default settings" — it empties the addrlabel table entirely, which would *break* RFC 6724 selection until labels are re-populated or the system reboots. **Fix:** Replaced the dangerous flush with a targeted `del`/`add` of the `fc00::/7` label-13 entry and added a comment explaining why flush is the wrong tool here.

## Review Notes

- The `ip -6 addr show` output parsing in Step 3 is fragile (it positionally extracts `$5` for flags, but flag ordering and presence varies — e.g., `noprefixroute`, `tentative`, `dynamic`, `mngtmpaddr` may appear before or instead of `deprecated`/`temporary`). The script is illustrative; in practice readers should consider parsing with `ip -j -6 addr show` (JSON output) for reliability. Not changed since it would require a structural rewrite.
- The `socket.connect()` UDP trick for revealing kernel source-address selection without sending packets is well-known and correct.
- The default `use_tempaddr` value varies by distro (typically 0 on most desktop/server Linux, 2 on Android); the inline comment "(0=off, 1=gen/no-prefer, 2=gen+prefer)" is accurate shorthand for the kernel-documented semantics.
- RFC 6724 default for `fc00::/7` is precedence 3, label 13 (verified against RFC 6724 Table 1). Note that some Linux kernel versions/distros have historically shipped slightly different built-in defaults, so readers may observe label 5 or label 1 in the wild — checking `ip addrlabel list` against the RFC table remains the right diagnostic.
