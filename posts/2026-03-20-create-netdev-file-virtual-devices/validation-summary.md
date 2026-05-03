# Validation Summary: How to Create .netdev Files for Virtual Devices in systemd-networkd

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- systemd-networkd
- .netdev configuration files
- VLAN (Virtual LAN)
- Linux bridges (with STP)
- Bonding (active-backup)
- VXLAN tunneling
- Dummy network interfaces
- MACVLAN
- networkctl CLI

## Sources Consulted
- systemd.netdev(5) man page (https://www.freedesktop.org/software/systemd/man/systemd.netdev.html)
- systemd.network(5) man page (https://www.freedesktop.org/software/systemd/man/systemd.network.html)
- networkctl(1) man page (https://www.freedesktop.org/software/systemd/man/networkctl.html)
- IANA service name port registry for VXLAN (port 4789)
- Linux kernel networking documentation for bridge STP and bonding modes

## Issues Found
No technical issues found.

- File location `/etc/systemd/network/` is correct.
- Numerical-prefix file ordering ("lower number = processed first") is accurate — systemd reads config files in lexicographical order.
- `[NetDev]` section with `Name=` and `Kind=` keys is correct for all device kinds shown (vlan, bridge, bond, vxlan, dummy, macvlan).
- `[VLAN]` `Id=10` is valid (range 0–4094).
- `[Bridge]` keys `STP=yes` and `ForwardDelaySec=4` are valid; systemd accepts unitless integers as seconds for `*Sec=` keys.
- `[Bond]` keys `Mode=active-backup` and `MIIMonitorSec=1s` are valid.
- `[VXLAN]` keys `VNI=`, `Remote=`, `Local=`, and `DestinationPort=4789` are correct; 4789 is the IANA-assigned default VXLAN port.
- `[MACVLAN]` `Mode=bridge` is valid (other valid modes: private, vepa, passthru, source).
- `networkctl list` and `networkctl status <iface>` commands are correct.
- `sudo systemctl restart systemd-networkd` is the correct way to apply changes (alternatively `networkctl reload` could be used for non-disruptive reload, but restart is also valid).

## Review Notes
- For a non-disruptive apply in newer systemd versions, `networkctl reload` followed by `networkctl reconfigure <iface>` can be used as a less disruptive alternative to restarting the service. The restart approach shown is still correct and widely supported.
- The post intentionally omits the corresponding `.network` files needed to bring devices up and assign IPs; this is acknowledged in the summary.
- `STP=yes` works; `STP=true` is equally valid as systemd accepts standard boolean spellings.
