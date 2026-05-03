# Validation Summary: How to Delete an IPv4 Address from a Network Interface Using ip addr del

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Linux `ip` command (iproute2)
- IPv4 networking
- Netplan (Ubuntu)
- Debian `/etc/network/interfaces` (ifupdown)
- NetworkManager (`nmcli`)
- Bash scripting

## Sources Consulted
- `ip-address(8)` man page (iproute2)
- `nmcli(1)` man page — list property modifiers (`+`, `-`)
- Linux kernel documentation: `net.ipv4.conf.*.promote_secondaries` sysctl behavior
- Netplan documentation (https://netplan.io/reference)
- Debian `interfaces(5)` documentation

## Issues Found
No technical issues found.

All commands and syntax were verified against the iproute2 `ip-address(8)` man page:
- `ip address del IFADDR dev IFNAME` matches the documented form.
- `ip address flush` accepts the `label PATTERN` filter as shown.
- The error string `RTNETLINK answers: Cannot assign requested address` is the actual kernel/iproute2 error returned when deleting a non-existent address.
- The default kernel behavior of removing secondaries on the same subnet when the primary is deleted is accurate (this is overridden only when `net.ipv4.conf.<iface>.promote_secondaries=1`).
- `nmcli con mod <name> -ipv4.addresses <addr>` correctly uses the `-` modifier to remove a value from a list-type property.

## Review Notes
- The post does not mention the `net.ipv4.conf.<iface>.promote_secondaries` sysctl, which changes the default behavior described under "Deleting a Secondary Address". Mentioning it would make the section more complete, but the post's claim about the default behavior is correct as written.
- `ip addr flush dev eth0` (without `scope global`) will also remove IPv6 link-local addresses, which the man page warns about. The post warns generally about loss of connectivity, which is sufficient.
- On modern Debian/Ubuntu installs, `ifupdown` (`/etc/network/interfaces`) is no longer the default; Netplan (Ubuntu) and `systemd-networkd` are common. The post correctly covers both Netplan and `/etc/network/interfaces` paths, so this is fine.
