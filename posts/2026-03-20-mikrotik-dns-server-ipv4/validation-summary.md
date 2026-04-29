# Validation Summary: How to Set Up DNS Server for IPv4 on MikroTik

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- MikroTik RouterOS (v6/v7)
- DNS caching resolver
- Static DNS entries (with subdomain matching)
- DHCP server DNS option
- Firewall NAT (dst-nat redirection)
- DNS over HTTPS (DoH) — RouterOS v7+
- X.509 certificate import for DoH

## Sources Consulted
- MikroTik RouterOS — DNS: https://help.mikrotik.com/docs/spaces/ROS/pages/37748767/DNS
- MikroTik RouterOS — DHCP: https://help.mikrotik.com/docs/spaces/ROS/pages/24805500/DHCP
- MikroTik RouterOS — NAT: https://help.mikrotik.com/docs/spaces/ROS/pages/3211299/NAT
- MikroTik RouterOS — Common Firewall Matchers and Actions: https://help.mikrotik.com/docs/spaces/ROS/pages/250708064/Common+Firewall+Matchers+and+Actions
- MikroTik wiki — Manual:IP/Firewall/Filter (negation operator examples): https://wiki.mikrotik.com/wiki/Manual:IP/Firewall/Filter

## Issues Found

1. **`/ip dns set` had a `comment="Enable DNS caching"` parameter.** `/ip dns` is a singleton configuration object, not a list — its `set` command does not accept a `comment` property. Per the official DNS docs, `comment` exists only on `/ip dns static` entries. Removed the `comment` parameter from the `/ip dns set` block.

2. **`cache-size=4096KiB` is invalid input.** The `cache-size` property is documented as `integer[64..4294967295]` and is interpreted as KiB. The CLI displays the value with a `KiB` suffix on `print`, but the input must be a plain integer. Changed to `cache-size=4096`.

3. **`name=*.corp` does not perform wildcard matching.** The `name` parameter takes a literal hostname; glob-style wildcards are not supported. Subdomain matching requires either `match-subdomain=yes` (RouterOS 7.6+) or the `regexp=` parameter. Replaced with `/ip dns static add name=corp match-subdomain=yes address=10.1.1.1 ttl=300`.

4. **Negation operator placement was wrong: `!dst-address=192.168.1.1`.** RouterOS firewall negation places `!` before the value, not before the property name (e.g., `src-address=!192.168.88.0/24`). Fixed both NAT rules to use `dst-address=!192.168.1.1`.

## Review Notes

- DoH section is correct for RouterOS v7+. Note that DoH in RouterOS requires a current root CA (imported via `/certificate import`) and was not available in v6.
- `match-subdomain=yes` was introduced in RouterOS 7.6; readers on older versions need to use the `regexp=` form (e.g., `regexp=".*\\.corp\$"`) instead.
- `/ip dns print` shows configuration plus runtime values like `cache-used`, which serves as basic statistics; this is acceptable but readers wanting more detail can check `/ip dns cache print` and per-record cache info.
- The DHCP `set 0` syntax assumes the first DHCP network entry exists; readers with multiple networks should target the correct index or use `[find]` selectors.
