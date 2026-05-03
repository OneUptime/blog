# Validation Summary: How to Delete a Static Route from the Linux Routing Table

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Linux `iproute2` (`ip route` command)
- Linux kernel routing table / RTNETLINK
- Netplan (Ubuntu)
- NetworkManager (`nmcli`)
- Debian `/etc/network/interfaces` / `ifupdown`
- Bash scripting

## Sources Consulted
- `ip-route(8)` man page (iproute2): https://man7.org/linux/man-pages/man8/ip-route.8.html
- `nmcli(1)` man page: https://networkmanager.dev/docs/api/latest/nmcli.html
- Netplan reference: https://netplan.readthedocs.io/en/stable/netplan-yaml/
- Debian interfaces(5) man page: https://manpages.debian.org/bookworm/ifupdown/interfaces.5.en.html
- Linux kernel RTNETLINK error codes (ESRCH → "No such process")

## Issues Found
No technical issues found.

All command syntaxes are correct and current:
- `ip route del <prefix>`, `ip route del <prefix> via <gw>`, `ip route del <prefix> dev <iface>`, and `ip route del default` are all valid forms documented in `ip-route(8)`.
- The "RTNETLINK answers: No such process" error message is the actual message produced when attempting to delete a non-existent route (kernel returns ESRCH).
- The `nmcli con mod ... -ipv4.routes "..."` syntax correctly uses the `-` prefix to remove a value from a multi-value property; `nmcli con up` reactivates the connection so changes take effect.
- `sudo ip route flush table main` is the correct command to flush the main routing table.
- The conditional Bash script is syntactically correct.

## Review Notes
- The comment "Delete the route to 10.10.0.0/16 via eth1 specifically" uses "via" colloquially while the command uses `dev`. This is not technically wrong (the prose just means "through eth1"), and the command itself is correct.
- For NetworkManager, `nmcli con up` on an already-active connection reactivates it, which is sufficient to apply route changes. An alternative is `nmcli device reapply <device>` for a less disruptive reload, but the post's approach is valid.
- On systems using `systemd-networkd` (rather than ifupdown/Netplan/NetworkManager), persistent route removal would be done by editing `.network` files in `/etc/systemd/network/` and running `networkctl reload`. The post does not cover this case, but the three covered are the most common.
