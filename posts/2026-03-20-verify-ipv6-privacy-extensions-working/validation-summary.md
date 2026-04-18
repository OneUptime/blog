# Validation Summary: How to Verify That Privacy Extensions Are Working

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- IPv6 Privacy Extensions (RFC 4941 / RFC 8981)
- IPv6 Stable Privacy Addresses (RFC 7217)
- Linux kernel IPv6 sysctl (`use_tempaddr`, `addr_gen_mode`)
- `iproute2` (`ip -6 addr`, `ip link`)
- `sysctl` command
- `nmcli` (NetworkManager CLI)
- EUI-64 Interface Identifier derivation (RFC 4291)
- Python 3 (for EUI-64 calculation helper)
- `curl` with IPv6 (`-6` flag)

## Sources Consulted
- Linux kernel networking docs — `ip-sysctl.txt` / `ip-sysctl.rst` (IPv6 parameters `use_tempaddr`, `addr_gen_mode`, `temp_valid_lft`, `temp_prefered_lft`)
- `man ip-address` (iproute2) — for `temporary`, `mngtmpaddr`, `dynamic` flags
- NetworkManager `nm-settings` documentation (`ipv6.addr-gen-mode`, `ipv6.ip6-privacy`)
- RFC 4291 — IPv6 Addressing Architecture (EUI-64 derivation, U/L bit inversion)
- RFC 4941 — Privacy Extensions for Stateless Address Autoconfiguration (obsoleted)
- RFC 8981 — Temporary Address Extensions (current, Feb 2021, obsoletes RFC 4941)
- RFC 7217 — Semantically Opaque Interface Identifiers (stable privacy)
- `api6.ipify.org` (verified as a real live IPv6 endpoint)

## Issues Found
No technical issues found.

All verified technical claims are correct:

- `use_tempaddr` values (0 disabled, 1 enabled/prefer public, 2 enabled/prefer temporary) match kernel semantics.
- `addr_gen_mode` values (0=EUI-64, 1=none, 2=stable-privacy, 3=random) match kernel documentation.
- The Python EUI-64 computation is algorithmically correct: splits the MAC, inserts `ff:fe` between the 3rd and 4th octets, flips the U/L bit (0x02) on the first byte, and reassembles into four hextets — matches RFC 4291.
- `ip -6 addr show` flags (`temporary`, `mngtmpaddr`, `dynamic`, `scope global`, `scope link`) and the `valid_lft` / `preferred_lft` fields are accurate.
- Default `temp_prefered_lft` is indeed 86400s (1 day / 24h) — matches the claim in Step 5.
- `nmcli` output format, `ipv6.addr-gen-mode: stable-privacy`, and `ipv6.ip6-privacy: -1 (unknown)` (meaning fall-back to kernel default) all match NetworkManager's `nm-settings` documentation.
- `api6.ipify.org` is a real, working IPv6-serving endpoint.
- Cycling an interface with `ip link set <iface> down/up` does trigger regeneration of temporary addresses.

## Review Notes
- **RFC reference could be modernized**: The post cites RFC 4941 throughout. RFC 4941 was obsoleted by RFC 8981 in February 2021. The Linux kernel's own `ip-sysctl` documentation still references the older RFCs (RFC 3041 / 4941), so using "RFC 4941" is not factually wrong when describing the kernel feature, but a future refresh could mention RFC 8981 as the current standard.
- **sysctl spelling quirk**: The actual kernel sysctl name for the preferred-lifetime knob is `temp_prefered_lft` (intentional single-"r" typo preserved for backwards compatibility). The post does not reference it by name, so this is not an error — just worth noting if the post is ever extended with a tuning section.
- **Example output lifetimes are illustrative**: The `valid_lft` / `preferred_lft` values in the Step 2 example (86399s / 14399s for a temporary address) do not correspond to a freshly-generated address with default kernel settings (`temp_valid_lft=172800`, `temp_prefered_lft=86400`), but they are plausible snapshots after some time has elapsed or on a system with tuned lifetimes. This is acceptable for an illustrative example.
- **Setting vs. reading `addr_gen_mode` on `all`**: `addr_gen_mode` is a per-interface setting applied at interface bring-up; reading it via `net.ipv6.conf.all.addr_gen_mode` (as the post does) is valid and reflects the "all" default pointer. The post only reads it, so there is no incorrect guidance here.
