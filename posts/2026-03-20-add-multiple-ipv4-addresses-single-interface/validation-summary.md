# Validation Summary: How to Add Multiple IPv4 Addresses to a Single Network Interface on Linux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux networking
- IPv4 addressing
- `iproute2` (`ip` command)
- Netplan
- Debian `ifupdown` (`/etc/network/interfaces`)

## Sources Consulted
- `ip-address(8)` Linux manual page (iproute2): https://www.man7.org/linux/man-pages/man8/ip-address.8.html
- Netplan examples: https://netplan.readthedocs.io/en/0.107/examples/
- `interfaces(5)` Debian man page (ifupdown): https://manpages.debian.org/unstable/ifupdown/interfaces.5.en.html

## Issues Found
- The description used the phrase "label aliases", which is inaccurate for `iproute2`. I changed it to `labels` to match the documented `label` parameter in `ip-address(8)`.
- The first command block said the primary address was "already assigned" while also showing `ip addr add` for that same address. I changed the comment to clarify that the command is only needed if the interface does not already have an address.
- The explanation for labels said the format was `interface:N`, but the examples used non-numeric suffixes such as `eth0:web`. I changed this to `interface:suffix` so the explanation matches the examples and common `label` usage.
- The command `ip addr show dev eth0 | grep label` would not reliably display labeled addresses because `ip addr show` output does not include the literal word `label`. I replaced it with `ip addr show dev eth0 label 'eth0:*'`, which uses the documented `label PATTERN` selector.
- The sentence saying the second and subsequent addresses are marked `secondary` was too absolute. I changed it to say additional IPv4 addresses are typically marked `secondary` to avoid overstating the behavior.
- The Debian `/etc/network/interfaces` example used `eth0:1` and `eth0:2` alias stanzas plus the deprecated `netmask` field. I replaced it with repeated `iface eth0 inet static` stanzas using CIDR notation, which matches current `interfaces(5)` documentation for configuring multiple addresses on one interface.

## Review Notes
- The Netplan example is technically valid for assigning multiple IPv4 addresses to one interface. Netplan's official examples also support per-address labels when the `networkd` renderer is used.
- The use of `eth0` is acceptable in examples, but many current Linux distributions use predictable interface names such as `enp3s0`.
