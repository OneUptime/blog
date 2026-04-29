# Validation Summary: How to Troubleshoot IPv6 Router Advertisement Not Received

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 Router Advertisements and Router Solicitations
- SLAAC and Neighbor Discovery Protocol (NDP)
- Linux IPv6 sysctls (`accept_ra`, `forwarding`)
- Linux networking tools (`rdisc6`, `tcpdump`, `ip`, `ping6`, `ip6tables`, `ethtool`)
- `radvd`

## Sources Consulted
- RFC 4861, *Neighbor Discovery for IP version 6 (IPv6)*: https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4862, *IPv6 Stateless Address Autoconfiguration*: https://datatracker.ietf.org/doc/html/rfc4862
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- `rdisc6(8)` man page: https://manpages.debian.org/unstable/ndisc6/rdisc6.8.en.html
- `radvd.conf(5)` man page: https://manpages.ubuntu.com/manpages/jammy/man5/radvd.conf.5.html
- Local CLI/manual verification: `pcap-filter(7)`, `tcpdump --help`, `ip6tables -p icmpv6 -h`, `ping(8)`

## Issues Found
- The `rdisc6` retry example used `-m 3`, but `-m/--multiple` does not take a numeric argument. It was corrected to `-r 3 -w 5000`, which matches the documented retry option.
- The post said that no `rdisc6` response or no captured RA definitively means the router is not sending RAs. That was too strong; RAs can also be filtered or blocked before reaching the host. The wording was corrected in Steps 1 and 2.
- The explanation of Linux `accept_ra` was inaccurate. `accept_ra=1` only accepts Router Advertisements when forwarding is disabled; `accept_ra=2` is required to accept them with forwarding enabled. The prose and diagnostic script output were corrected to match the kernel documentation.
- The diagnostic script used `timeout 5 rdisc6 -w 3000` without setting `-r`, so the outer timeout could terminate the probe before `rdisc6` finished its documented retry behavior. It was changed to a single explicit `rdisc6 -r 1 -w 3000` probe, and a `command -v rdisc6` check was added so a missing binary is reported accurately.
- The router verification section described `forwarding` as if it directly enabled RA sending. It was corrected to describe what that sysctl actually indicates on Linux: whether IPv6 forwarding is enabled on the router.
- The introduction and conclusion overstated the effect of missing RAs and of received-but-unused RAs. They were tightened to be SLAAC-specific and to note that invalid advertisements, not only sysctl settings, can prevent hosts from applying them.

## Review Notes
- The sample `radvd.conf` is valid; `AdvDefaultLifetime 1800` is within the allowed range when `MaxRtrAdvInterval` is left at its default.
- `router-advertisement` and numeric type `134` are both valid `ip6tables --icmpv6-type` selectors.
- The embedded diagnostic shell snippet passes `bash -n` after the corrections.
- `rdisc6` is not installed in the current workspace, so command syntax was verified against the current man page rather than by live execution.
