# Validation Summary: How to Limit Bandwidth per IPv4 Address Using tc on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux traffic control (`tc`)
- HTB (`tc-htb`)
- u32 filters and u32 hash tables (`tc-u32`)
- Netfilter `MARK` with `iptables`
- IPv4 QoS and per-host bandwidth shaping

## Sources Consulted
- `tc(8)` Linux manual page: https://man7.org/linux/man-pages/man8/tc.8.html
- `tc-htb(8)` Linux manual page: https://man7.org/linux/man-pages/man8/tc-htb.8.html
- `tc-u32(8)` Linux manual page: https://man7.org/linux/man-pages/man8/tc-u32.8.html
- `tc-fw(8)` Linux manual page: https://man7.org/linux/man-pages/man8/tc-fw.8.html
- `iptables-extensions(8)` Linux manual page (`MARK` target): https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Local CLI help checked for syntax: `tc filter add help`, `tc filter add u32 help`, `tc filter add fw help`, `tc class add htb help`, `iptables -j MARK -h`

## Issues Found
- The Method 1 introduction implied generic source/destination matching without explaining that HTB shapes egress traffic only. I clarified when to use `src` versus `dst` so the example matches how `tc` works on an egress qdisc.
- Method 2 was not valid as written. The original example set `default 30` without creating class `1:30`, described hash tables as if they reused a single per-IP class, and added a hash-table entry without the required `link`/`hashkey` dispatcher and `sample`-based bucket placement. I corrected the example to create the default class, add separate per-IP classes, link traffic into the u32 hash table, and populate buckets using `sample`, which matches the documented `tc-u32` workflow.
- Method 3 omitted interface scoping in the `iptables` rule and used the `fw` example without saying it depends on the HTB classes from Method 1. I added `-o eth0`, stated that the same HTB tree is reused, and changed the `fw` filters to the documented `classid` form.

## Review Notes
- HTB shapes outbound traffic only; inbound limiting requires policing or redirecting ingress traffic through an IFB device before shaping.
- The `iptables` syntax remains valid on current systems even when `iptables` is backed by nftables (`iptables v1.8.10 (nf_tables)` in the local environment).
