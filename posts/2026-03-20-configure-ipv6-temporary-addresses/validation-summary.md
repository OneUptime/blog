# Validation Summary: How to Configure IPv6 Temporary Addresses on Linux

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Linux kernel IPv6 stack
- `sysctl` (procps)
- `iproute2` (`ip` command)
- IPv6 Privacy Extensions (RFC 4941, obsoleted by RFC 8981)
- IPv6 Stable Privacy Addressing (RFC 7217)
- `/etc/sysctl.d/` configuration

## Sources Consulted
- Linux kernel `Documentation/networking/ip-sysctl.rst` — https://www.kernel.org/doc/Documentation/networking/ip-sysctl.rst
- Linux UAPI header `include/uapi/linux/if_link.h` (`enum in6_addr_gen_mode`) — https://github.com/torvalds/linux/blob/master/include/uapi/linux/if_link.h
- RFC 4941 — IPv6 Privacy Extensions
- RFC 7217 — Stable IPv6 Interface Identifiers
- iproute2 `ip-address(8)` man page (filter flags: `temporary`, `permanent`, `dynamic`, etc.)

## Issues Found
- **`addr_gen_mode` value descriptions were swapped/incorrect.** The post listed `1 = Stable privacy (RFC 7217)` and `2 = Disable link-local generation`. The kernel UAPI defines:
  - `0 = EUI64`
  - `1 = NONE` (do not generate a link-local address)
  - `2 = STABLE_PRIVACY` (RFC 7217, uses `stable_secret`)
  - `3 = RANDOM` (stable-privacy mechanism with a random secret, not stable across reboots)
  Fixed the value list in the "Temporary Addresses vs Stable Privacy Addressing" section, added the missing value 3, corrected the recommended `sysctl -w ... addr_gen_mode=1` to `=2`, and added a note that mode 2 requires `stable_secret` to be set.
- **Summary line referenced `addr_gen_mode=1`** for RFC 7217 stable privacy. Updated to `addr_gen_mode=2` for consistency with the corrected section above.

## Review Notes
- RFC 4941 has been obsoleted by **RFC 8981** (February 2021). The post's references to RFC 4941 are still accurate for the underlying mechanism and the common Linux/sysctl naming, but readers researching the current standard should be aware of RFC 8981.
- The sysctl knob `temp_prefered_lft` is intentionally spelled with one `r` — this is the historical kernel spelling and is correct as written.
- The `ip -6 addr show` output uses `preferred_lft` (two `r`s); this is also correct.
- `addr_gen_mode=2` requires a non-zero `net.ipv6.conf.<iface>.stable_secret` to be configured first, otherwise no SLAAC addresses will be generated. Mode `3` (added in Linux 4.5) avoids this by using a random secret automatically — worth noting for readers who want a one-line fix without managing a secret.
- The use_tempaddr value `-1` mention is correct: the kernel treats values `<= 0` as disabled, and `-1` is used as the default for point-to-point and loopback devices.
