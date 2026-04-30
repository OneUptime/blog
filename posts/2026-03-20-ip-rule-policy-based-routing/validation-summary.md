# Validation Summary: How to Use ip rule for Policy-Based Routing

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Linux policy-based routing
- `iproute2` (`ip rule`, `ip route`)
- Netfilter packet marking with `iptables`
- Network configuration persistence with Netplan, NetworkManager, and systemd-networkd

## Sources Consulted
- `ip-rule(8)` Linux man page: https://man7.org/linux/man-pages/man8/ip-rule.8.html
- `ip-route(8)` Linux man page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- `iptables-extensions(8)` Linux man page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Netplan routing-policy reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- NetworkManager `nm-settings-nmcli` reference: https://networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- Local CLI/manpage checks: `ip rule help`, `ip route help`, `man ip-rule`, `man ip-route`, `man iptables-extensions`

## Issues Found
- The introduction said rules run before the main routing table. I changed this to explain that rules are evaluated by priority and that the built-in `main` lookup is normally at priority `32766`, so only rules with lower priority numbers run before it.
- The custom routing table examples added default routes without specifying the outgoing device and before the connected subnet route. I changed the examples to add the interface-specific subnet route first and then add the default route with `dev eth0`/`dev eth1`, matching `ip-route(8)` expectations for a directly reachable gateway.
- The rule-priority section said `32767` is the lowest priority. I changed this to describe the built-in default priorities (`0`, `32766`, `32767`) without implying `32767` is a global maximum, because `ip-rule(8)` defines rule priority as an unsigned integer.
- The persistence note referred to `routing-policy` generically across Netplan, `nmcli`, and `systemd-networkd`. I changed it to a generic persistence note so it no longer implies those tools all use the same configuration keyword.

## Review Notes
- Numeric table IDs such as `100` and `200` are valid as written; adding names in `/etc/iproute2/rt_tables` is optional and mainly improves readability.
- The `iptables` marking example is still valid. On systems using nftables natively, the same concept is usually implemented with nft syntax instead.
