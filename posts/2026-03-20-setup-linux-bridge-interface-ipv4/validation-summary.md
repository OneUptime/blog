# Validation Summary: How to Set Up a Linux Bridge Interface for IPv4 Networking

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux bridge
- iproute2 `ip` and `bridge` commands
- IPv4 addressing and routing
- Netplan
- Debian `/etc/network/interfaces`
- bridge-utils ifupdown extensions
- KVM/QEMU and `virt-install`

## Sources Consulted
- Linux kernel Ethernet Bridging documentation: https://kernel.org/doc/html/next/networking/bridge.html
- `ip-link(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- `ip-address(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip-address.8.html
- `ip-route(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- `bridge(8)` iproute2 manual page: https://man.archlinux.org/man/core/iproute2/bridge.8.en
- Netplan YAML configuration reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Debian `bridge-utils-interfaces(5)` manual page: https://manpages.debian.org/bookworm/bridge-utils/bridge-utils-interfaces.5.en.html
- Debian `virt-install(1)` manual page: https://manpages.debian.org/testing/virt-install/virt-install.1.en.html
- Local `iproute2` help output for `ip link`, `ip address`, `ip route`, and `bridge link`

## Issues Found
- The introduction described Linux bridges as "essential" for VM and container networking. Bridges are common for those use cases, but alternatives exist. Changed this to "commonly used" for technical accuracy.
- The manual bridge setup added `eth0` to `br0` but did not explicitly bring `eth0` up. Added `sudo ip link set eth0 up` so the bridge port can forward traffic when the physical interface was down.
- The default route command used `ip route add`, which can fail if a default route already exists while migrating an interface into a bridge. Changed it to `ip route replace default via 192.168.1.1 dev br0`, which updates an existing route or adds it if missing.
- The VM section said the guest "will" receive a DHCP address. A bridge does not provide DHCP by itself, so this depends on a DHCP server and guest DHCP configuration. Changed the statement to say the VM can receive a DHCP address if DHCP is available and the guest is configured for it.

## Review Notes
The Netplan bridge snippet uses valid `bridges`, `interfaces`, `addresses`, `routes`, `nameservers`, and bridge `parameters` keys. The Debian `/etc/network/interfaces` example uses valid bridge-utils extensions, though bridge-utils is mostly relevant to ifupdown-style persistent configuration; iproute2 remains the preferred tool for ad hoc bridge inspection and management.
