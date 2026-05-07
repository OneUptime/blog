# Validation Summary: How to Assign Static IPv4 Addresses on Linux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux networking
- IPv4
- `iproute2` (`ip`)
- Netplan
- NetworkManager (`nmcli`)
- `systemd-networkd`
- `systemd-resolved`
- Debian `ifupdown`
- `resolvconf`

## Sources Consulted
- `ip-address(8)`: https://man7.org/linux/man-pages/man8/ip-address.8.html
- `ip-route(8)`: https://man7.org/linux/man-pages/man8/ip-route.8.html
- Netplan documentation, "How to use static IP addresses": https://netplan.readthedocs.io/en/1.1.1/using-static-ip-addresses/
- NetworkManager `nmcli` reference: https://networkmanager.dev/docs/api/1.46.2/nmcli.html
- NetworkManager `nmcli` examples: https://networkmanager.dev/docs/api/latest/nmcli-examples.html
- NetworkManager `nm-settings-nmcli` reference: https://networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- `systemd.network(5)`: https://www.freedesktop.org/software/systemd/man/257/systemd.network.html
- `systemd-resolved.service(8)`: https://www.freedesktop.org/software/systemd/man/257/systemd-resolved.service.html
- Debian `interfaces(5)`: https://manpages.debian.org/testing/ifupdown/interfaces.5.en.html
- Debian `resolvconf(8)`: https://manpages.debian.org/testing/resolvconf/resolvconf.8.en.html

## Issues Found
- The temporary `ip` example added a default route but did not remove it during cleanup. I added `sudo ip route del default via 192.168.1.1 dev eth0` so the rollback matches the setup steps.
- The `systemd-networkd` example used `DNS=` in the `.network` file without enabling `systemd-resolved`, even though `systemd.network(5)` documents that `DNS=` is read by `systemd-resolved`. I updated the commands to enable and start both `systemd-networkd` and `systemd-resolved`.
- The Debian `/etc/network/interfaces` example used `dns-nameservers` without indicating that this is provided via `resolvconf` integration rather than core `interfaces(5)` syntax alone. I clarified the section heading to scope the DNS example to Debian systems using `resolvconf`.
- The takeaway that said to always set a default gateway and DNS server was too broad. I corrected it to say a default gateway is needed when the host must reach other networks, and DNS is needed when name resolution is required.

## Review Notes
- The examples consistently use `eth0` as the interface name. That is acceptable as an example, but many modern Linux systems use predictable interface names such as `enp0s3`, `ens160`, or similar.
- The Netplan example is valid for a static IPv4 configuration. In mixed IPv4/IPv6 environments, additional keys such as `dhcp6: false` or `accept-ra: false` may be appropriate depending on whether IPv6 autoconfiguration should remain enabled.
