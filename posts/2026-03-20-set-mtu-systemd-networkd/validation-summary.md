# Validation Summary: How to Set the MTU with systemd-networkd

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux networking MTU
- systemd-networkd
- systemd `.link`, `.network`, and `.netdev` files
- VLAN, GRE tunnel, and bond interfaces
- `udevadm`, `networkctl`, `ip`, and `ping`

## Sources Consulted
- systemd.link official documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.link.html
- systemd.network official documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- systemd.netdev official documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.netdev.html
- systemd.syntax official documentation: https://www.freedesktop.org/software/systemd/man/257/systemd.syntax.html
- networkctl official documentation: https://www.freedesktop.org/software/systemd/man/latest/networkctl.html
- udevadm official documentation: https://www.freedesktop.org/software/systemd/man/latest/udevadm.html
- ip-link authoritative Linux man page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- iputils ping man page: https://manpages.opensuse.org/Tumbleweed/iputils/ping.8.en.html
- RFC 2784, Generic Routing Encapsulation: https://www.rfc-editor.org/rfc/rfc2784

## Issues Found
- The systemd configuration snippets used inline comments after `MTUBytes=` values. systemd's general configuration syntax documents comments as lines starting with `#` or `;`, so the inline comments could make the values invalid. I moved those comments to standalone lines before the directives.
- The bond example said MTU is set in `bond0.network`, "not here." Since `systemd.netdev` supports `MTUBytes=` in the `[NetDev]` section for bond devices, I clarified that this example sets MTU in `bond0.network`, not in the `[Bond]` section.

## Review Notes
- The remaining `MTUBytes=`, `Address=`, `Gateway=`, bond, VLAN, and GRE examples match the documented systemd configuration sections.
- `networkctl reload`, `udevadm control --reload`, `udevadm trigger --action=add`, `ip link show`, and the IPv4 `ping -M do -s 8972` jumbo-frame test are valid commands for the use cases shown.
- Official `systemd.link` documentation shows bringing the interface down and using `--settle` when reapplying `.link` files to existing devices; that is a useful operational caveat for future expansion.
