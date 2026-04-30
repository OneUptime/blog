# Validation Summary: How to Configure IPv6 Address Lifetime for Privacy

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 temporary addresses
- RFC 4941 and RFC 8981
- Linux IPv6 sysctl configuration
- Router Advertisements and ICMPv6
- `iproute2` (`ip`)
- `sysctl`
- `tcpdump`
- `ndisc6` (`rdisc6`)

## Sources Consulted
- RFC 8981, "Temporary Address Extensions for Stateless Address Autoconfiguration in IPv6": https://www.rfc-editor.org/rfc/rfc8981.html
- RFC 4941, "Privacy Extensions for Stateless Address Autoconfiguration in IPv6": https://www.rfc-editor.org/rfc/rfc4941.html
- Linux kernel `ip-sysctl` documentation (current upstream): https://docs.kernel.org/6.18/networking/ip-sysctl.html
- Linux kernel `ip-sysctl` documentation (5.10 reference): https://docs.kernel.org/5.10/networking/ip-sysctl.html
- `ip-address(8)` manual page: https://man7.org/linux/man-pages/man8/ip-address.8.html
- `rdisc6(8)` manual page: https://manpages.debian.org/unstable/ndisc6/rdisc6.8.en.html
- Local CLI help checked for command syntax: `sysctl --help`, `ip -6 addr help`, `tcpdump --help`

## Issues Found
- The "Default Linux Values" table mixed older RFC 4941 defaults with Linux sysctl names. I corrected it to current upstream Linux kernel documented defaults for `temp_valid_lft`, `regen_min_advance`, and `regen_max_retry`.
- The lifecycle diagram used inconsistent timing and an outdated 7-day valid lifetime. I replaced the hard-coded values with the correct generic preferred/deprecated/valid phases.
- The REGEN_ADVANCE explanation was too loose. I updated it to match RFC 8981's lead-time behavior before a temporary address becomes deprecated.
- The Router Advertisement section oversimplified the lifetime calculation. I corrected it to the RFC 8981 model where valid lifetime is capped by the advertised prefix valid lifetime and `temp_valid_lft`, and preferred lifetime is capped by the advertised preferred lifetime and `temp_prefered_lft` with desynchronization applied.
- The `rdisc6` description implied passive monitoring. I changed it to describe the command accurately as requesting and displaying Router Advertisements.
- The verification section claimed that toggling `use_tempaddr` would force immediate regeneration. I replaced that with a safer verification flow and clarified that existing temporary addresses keep their remaining lifetimes.

## Review Notes
- Upstream kernel defaults and a host's active runtime values can differ because distributions or local sysctl configuration may override the documented defaults. The post now calls this out explicitly.
- The introduction still references both RFC 4941 and RFC 8981. That is technically acceptable because RFC 4941 is the historical specification and RFC 8981 is the current update.
