# Validation Summary: How to Configure a Bridge with systemd-networkd - Configure

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Linux networking
- `systemd-networkd`
- `systemd` `.netdev` and `.network` configuration
- Linux bridge devices
- `iproute2` (`ip`, `bridge`)
- KVM host networking

## Sources Consulted
- systemd.netdev(5): https://www.freedesktop.org/software/systemd/man/latest/systemd.netdev.html
- systemd.network(5): https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- networkctl(1): https://www.freedesktop.org/software/systemd/man/latest/networkctl.html
- systemd-resolved.service(8): https://www.freedesktop.org/software/systemd/man/250/systemd-resolved.service.html
- bridge(8): https://man7.org/linux/man-pages/man8/bridge.8.html
- ip-link(8): https://man7.org/linux/man-pages/man8/ip-link.8.html

## Issues Found
- The introduction said the bridge `.network` file was required to create the bridge. I corrected that wording because the `.netdev` file creates the bridge device, while the bridge `.network` file is used to configure L3 settings such as `Address=`, `Gateway=`, `DNS=`, or `DHCP=` on that bridge.
- The configuration snippets and verification commands themselves were otherwise technically correct. `Bridge=br0`, `DHCP=ipv4`, `STP=`, `HelloTimeSec=`, `MaxAgeSec=`, `ForwardDelaySec=`, `networkctl status br0`, and `bridge link show` all match current upstream documentation.

## Review Notes
- `DNS=` in a `.network` file is consumed by `systemd-resolved`; whether applications use that DNS server depends on the host's resolver setup.
- `systemctl restart systemd-networkd` is valid for applying this configuration, though current `networkctl reload` documentation also supports loading new `.netdev` and `.network` files without a full daemon restart.
- I validated the syntax and semantics against the current upstream man pages, but I did not stand up a live bridge in this workspace because the post contains host-network configuration intended for a real Linux system.
