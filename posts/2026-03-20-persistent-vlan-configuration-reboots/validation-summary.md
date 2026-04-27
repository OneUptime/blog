# Validation Summary: How to Make VLAN Configuration Persistent Across Reboots

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Linux VLAN interfaces (802.1Q)
- Netplan (Ubuntu)
- NetworkManager / nmcli (RHEL, CentOS, Fedora)
- ifupdown / `/etc/network/interfaces` with the `vlan` package (Debian)
- systemd-networkd (`.netdev` and `.network` files)
- `8021q` kernel module / `modules-load.d`

## Sources Consulted
- Netplan YAML reference: https://netplan.readthedocs.io/en/stable/netplan-yaml/
- NetworkManager `nmcli` man page and connection settings reference: https://networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- `systemd.netdev(5)` man page: https://www.freedesktop.org/software/systemd/man/systemd.netdev.html
- `systemd.network(5)` man page: https://www.freedesktop.org/software/systemd/man/systemd.network.html
- Debian `vlan` package / ifupdown `vlan-raw-device` documentation: https://wiki.debian.org/NetworkConfiguration#Howto_use_vlan_.28dot1q.2C_802.1q.2C_trunk.29_.28Etch.2C_Lenny.29
- `modules-load.d(5)` man page: https://www.freedesktop.org/software/systemd/man/modules-load.d.html

## Issues Found
- Section heading typo: `## Debian (/ etc/network/interfaces)` contained a stray space inside the path. Changed to `## Debian (/etc/network/interfaces)` so the reference matches the actual file path.

## Review Notes
- The Netplan example correctly nests `vlans:` under `network:` and uses the canonical `id` / `link` fields with the modern `routes:` (rather than the deprecated `gateway4:`) syntax.
- The `nmcli connection add type vlan ...` invocation uses valid property names (`ipv4.addresses`, `ipv4.gateway`, `ipv4.dns`, `ipv4.method`, `connection.autoconnect`) consistent with current NetworkManager versions.
- For Debian's ifupdown approach, `vlan-raw-device` requires the `vlan` package (correctly noted) and `dns-nameservers` requires `resolvconf` or equivalent to actually populate `/etc/resolv.conf`; this is a common assumption and not strictly an error.
- The `pre-up modprobe 8021q` line in the parent interface stanza is redundant once `/etc/modules-load.d/8021q.conf` is in place, but having both is harmless.
- For systemd-networkd, the three-file split (`.netdev` for the VLAN device, a `.network` for the VLAN interface, and a `.network` for the parent that references the VLAN via `VLAN=`) is the documented and correct pattern.
- The `gateway`/`Gateway=` and `addresses` examples use IPs from a single /24 — readers should adjust to their own subnet; not an error in the post.
