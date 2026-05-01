# Validation Summary: How to Configure DHCP on a Bond Interface

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux bonding driver
- DHCPv4
- Debian/Ubuntu `ifupdown` with `ifenslave`
- NetworkManager `nmcli`
- `systemd-networkd`
- Linux `iproute2`

## Sources Consulted
- Linux kernel bonding documentation: https://docs.kernel.org/6.17/networking/bonding.html
- NetworkManager `nmcli` reference: https://www.networkmanager.dev/docs/api/latest/nmcli.html
- NetworkManager `nmcli` examples: https://networkmanager.dev/docs/api/latest/nmcli-examples.html
- NetworkManager connection settings reference: https://networkmanager.dev/docs/api/latest/settings-connection.html
- NetworkManager `nm-settings-nmcli` reference: https://www.networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- `systemd.netdev` reference: https://www.freedesktop.org/software/systemd/man/latest/systemd.netdev.html
- `systemd.network` reference: https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- Debian `ifenslave` package documentation: https://sources.debian.org/src/ifenslave/2.14/debian/README.Debian/

## Issues Found
- The NetworkManager example used deprecated `master` terminology and brought up only the bond connection. I updated it to current `controller` syntax, set the primary interface explicitly for parity with the other examples, and activated the two bond port profiles so the bond comes up correctly without relying on `connection.autoconnect-ports`.
- The verification section used `dhclient -v bond0` as a generic lease check. I removed that because it is not a reliable current command across NetworkManager- and `systemd-networkd`-managed systems, and kept a manager-agnostic IPv4 address check with `ip -4 addr show dev bond0`.
- The active-backup explanation overstated behavior by saying the primary slave always carries traffic and that the bond MAC always stays the same. I corrected this to reflect kernel bonding behavior: only one slave forwards traffic at a time, and MAC stability across failover depends on the `fail_over_mac` policy.
- The LACP note implied switch capability alone was sufficient. I tightened it to say the switch must be configured for LACP.

## Review Notes
- The `/etc/network/interfaces` example is technically valid for `ifupdown`/`ifenslave`, but it reflects a legacy configuration path. Many current Debian/Ubuntu deployments use Netplan or NetworkManager as the frontend.
- The post mentions LACP but does not include a full `802.3ad` example or the required switch-side configuration. That is acceptable for this post, but it is a version- and environment-specific caveat readers should understand.
