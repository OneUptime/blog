# Validation Summary: How to Use ndisc6 for Neighbor Discovery Diagnostics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ndisc6 (IPv6 Neighbor Discovery diagnostic tool)
- IPv6 Neighbor Discovery Protocol (NDP)
- iproute2 (`ip -6 neigh`)
- ping6 / ICMPv6
- Bash scripting
- Python 3 (`subprocess`, `re`)

## Sources Consulted
- ndisc6(8) man page (Debian): https://manpages.debian.org/bookworm/ndisc6/ndisc6.8.en.html
- RFC 4861 (Neighbor Discovery for IP version 6) for protocol behavior
- iproute2 `ip-neighbour(8)` documentation for `ip -6 neigh` syntax
- Upstream ndisc6 package by Rémi Denis-Courmont

## Issues Found
1. **Incorrect use of `-m` flag with a numeric argument.** The post repeatedly used `ndisc6 -m N` to mean "send N solicitations." This is wrong: per the ndisc6(8) man page, `-m` is a boolean flag ("wait for and display all advertisement replies — useful for detecting duplicate addresses"). The number-of-attempts option is `-r NUM` (default: 3). I replaced every `-m N` with `-r N`:
   - "Multiple probes for reliability" example: `ndisc6 -m 3 ...` → `ndisc6 -r 3 ...` (also tightened the comment to reflect that `-r` caps the number of solicitations and matches the default).
   - "Timeout" example: `ndisc6 -m 2 -w 2000 ...` → `ndisc6 -r 2 -w 2000 ...`.
   - Bash discovery script: `ndisc6 -m 1 -w 500 ...` → `ndisc6 -r 1 -w 500 ...`.
   - Troubleshooting loop: `ndisc6 -m 1 -w 1000 ...` → `ndisc6 -r 1 -w 1000 ...`.
   - Python `subprocess.run` arg list: `'-m', '2', '-w', '2000', ...` → `'-r', '2', '-w', '2000', ...`.
   With the original `-m N` form, ndisc6 would treat `N` as the destination IPv6 address and fail to parse it.
2. **Invalid IPv6 literal `2001:db8::new`** in Scenario 3 (the placeholder is not parseable as IPv6 since `new` is not a hex group). Changed to `2001:db8::100`.
3. **Inaccurate timeout output text.** The post showed `Timeout! No answer from 2001:db8::2`, but ndisc6 actually prints `Timed out.` on timeout. Updated the example output and the `grep` filter in the Scenario 4 loop to match (`grep "link-layer\|Timed out"`).
4. **Minor wording fix** for the `-w` default — changed "default: 1 second" to "default: 1000ms" in the inline comment for consistency with the other ms-based examples (the value itself was correct).

## Review Notes
- `ndisc6` is shipped in the `ndisc6` Debian/Ubuntu package; on RHEL/CentOS it lives in EPEL. The post does not call out the EPEL requirement, which could trip up some readers, but the install command itself is accurate once EPEL is enabled.
- `ping6` (from inetutils / iputils) is being phased out on many modern distributions in favor of `ping -6`; both forms still work today, so the examples remain valid.
- The Python regex `r'link-layer address: ([0-9a-f:]{17})'` is fine because ndisc6's output uses lowercase hex for MAC addresses; if the user pipes through other tools that uppercase the output, adding `re.IGNORECASE` would be safer, but that is an enhancement, not a correctness issue.
- `str | None` PEP 604 union syntax requires Python 3.10+; that constraint is not stated in the post but is unlikely to surprise modern readers.
