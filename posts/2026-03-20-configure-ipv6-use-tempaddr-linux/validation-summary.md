# Validation Summary: How to Configure IPv6 Use Tempaddr on Linux

## Status
validated

## Post Type
Reference / Configuration Guide

## Technologies Covered
- Linux kernel IPv6 stack
- `net.ipv6.conf.*.use_tempaddr` sysctl
- IPv6 Privacy Extensions (RFC 4941, updated by RFC 8981)
- IPv6 Stable Privacy Addresses (RFC 7217) via `addr_gen_mode`
- `sysctl(8)` and `/etc/sysctl.d/`
- `iproute2` (`ip -6 addr`, `ip -6 route get`)
- NetworkManager (`nmcli`)

## Sources Consulted
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/Documentation/networking/ip-sysctl.rst
- Linux kernel IP sysctl HTML docs: https://docs.kernel.org/networking/ip-sysctl.html
- RFC 4941 — IPv6 Privacy Extensions (and successor RFC 8981)
- RFC 7217 — A Method for Generating Semantically Opaque Interface Identifiers (Stable Privacy Addresses)
- NetworkManager `nmcli` reference (ipv6.ip6-privacy property)

## Issues Found
1. **Incorrect `addr_gen_mode` value mapped to RFC 7217.** The summary stated "Combine with `addr_gen_mode=1` (RFC 7217)". Per the kernel documentation, `addr_gen_mode=1` actually means "do not generate a link-local address; use EUI-64 for autoconf" — it is NOT RFC 7217. RFC 7217 stable privacy addresses correspond to `addr_gen_mode=2` (uses an explicit `stable_secret`) or `addr_gen_mode=3` (uses a random secret if `stable_secret` is unset). Changed to `addr_gen_mode=3` since it works without requiring the operator to also configure `stable_secret`.

2. **Misleading description of value `-1`.** The post said `-1 = Disabled (kernel bootstrap default on some builds)`. Per the kernel docs, `-1` is specifically the documented default for point-to-point and loopback devices, and `0` is the default for most other devices. Updated the comment to reflect this and changed the `2` line to `>1` to match the kernel doc's actual semantics ("any value greater than 1").

## Review Notes
- RFC 4941 has been formally obsoleted/updated by RFC 8981 (March 2021), but the kernel documentation and most Linux distribution docs still reference RFC 4941, so leaving the post's RFC 4941 reference as-is is appropriate and consistent with current kernel docs.
- The example `ip -6 addr show` output uses the `mngtmpaddr` flag for the stable address — this is correct; it marks the address as the one from which temporary addresses are generated.
- The NetworkManager `ipv6.ip6-privacy` integer values mirror the kernel's (0 = disable, 1 = enabled but prefer public, 2 = enabled and prefer temporary), which matches the post.
- The `2001:4860:4860::8888` address used in the `ip -6 route get` example is Google Public DNS over IPv6 — a valid, well-known target for source-address-selection demonstrations.
