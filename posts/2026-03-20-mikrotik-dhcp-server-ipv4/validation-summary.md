# Validation Summary: How to Set Up DHCP Server for IPv4 on MikroTik

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MikroTik RouterOS (v7+)
- DHCP Server (IPv4)
- DHCP Relay
- DHCP Options (option 150 / Cisco TFTP)
- IP Pools, static leases, network definitions

## Sources Consulted
- MikroTik official documentation: DHCP — https://help.mikrotik.com/docs/spaces/ROS/pages/24805500/DHCP
- MikroTik wiki: `/ip dhcp-server`, `/ip dhcp-relay`, `/ip dhcp-server option sets`
- MikroTik documentation on lease status values (waiting, testing, declined, offered, bound, authorizing, conflict)

## Issues Found
No technical issues found.

Verified:
- `/ip dhcp-server setup` is the correct wizard command.
- `/ip pool add name= ranges=` syntax is correct.
- `/ip dhcp-server add` parameters (`name`, `interface`, `address-pool`, `lease-time`, `disabled`) are all valid.
- `/ip dhcp-server network add` parameters (`address`, `gateway`, `dns-server` (singular), `domain`, `comment`) are correct — `dns-server` is the documented singular parameter that accepts comma-separated values.
- `/ip dhcp-server lease add` and `/ip dhcp-server lease make-static <id>` syntax matches official docs.
- `/ip dhcp-relay add` parameters (`name`, `interface`, `dhcp-server`, `local-address`, `disabled`) are correct.
- `/ip dhcp-server lease print where status=bound` — `bound` is a valid documented lease status.
- `/ip dhcp-server option sets add` — the `sets` submenu is correct for RouterOS 7+.
- Option 150 value formatting `value="'10.1.30.5'"` is consistent with MikroTik's IP-format value parser (single-quoted IP-shaped value is auto-detected as IP and converted to IP-encoded hex).

## Review Notes
- The `option sets` submenu and the `dhcp-option-set=` network attribute are RouterOS 7+ features. In RouterOS 6, option sets did not exist as a separate menu and options were attached differently. Adding a brief note about RouterOS 7+ requirement could help readers on legacy installs.
- For option 150, some operators prefer the unambiguous hex form (e.g., `value=0x0A011E05` for `10.1.30.5`) because it works identically across RouterOS versions and avoids any ambiguity about value-type auto-detection. The single-quoted IP form used in the post is documented and works in current RouterOS, but the hex form is a useful alternative to mention.
- Lease time examples mix `10m` (wizard) and `12h` (manual) — both are valid; readers should pick a value appropriate to their environment.
