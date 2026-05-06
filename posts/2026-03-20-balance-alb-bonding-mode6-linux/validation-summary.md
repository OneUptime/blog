# Validation Summary: How to Configure Balance-ALB Bonding (Mode 6) on Linux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux bonding driver (`bonding`, mode 6 / `balance-alb`)
- `iproute2` / `ip link`
- Netplan
- NetworkManager / `nmcli`
- ARP-based receive load balancing
- `/proc/net/bonding`

## Sources Consulted
- Linux kernel bonding documentation: https://www.kernel.org/doc/html/latest/networking/bonding.html
- `ip-link(8)` manual: https://man7.org/linux/man-pages/man8/ip-link.8.html
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- NetworkManager `nmcli` reference: https://networkmanager.dev/docs/api/latest/nmcli.html
- NetworkManager `nmcli` examples: https://networkmanager.dev/docs/api/latest/nmcli-examples.html
- NetworkManager `nm-settings-nmcli` reference: https://networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- Local CLI help checked against installed tools: `ip link help bond`, `nmcli connection add help`

## Issues Found
- The post described mode 6 receive load balancing as generic inbound load balancing. Upstream kernel docs limit `balance-alb` receive load balancing to ARP-based IPv4 behavior, so I corrected the description, explanation, table, and conclusion to reflect that scope.
- The `nmcli` example only created the bond connection. NetworkManager's official examples require separate Ethernet slave/port connections attached to the bond, so I replaced the snippet with a working bond-plus-slaves example and included the static IPv4/gateway values to match the earlier manual example.
- The Netplan example omitted the default route even though the manual configuration section configured one. I added a `routes` entry so the persistent example matches the documented static gateway setup.
- The bonding comparison table overstated hashing and receive behavior for `balance-xor` and `802.3ad`. I changed the wording to `Hash-based` and `Peer-dependent` to align it with kernel documentation.

## Review Notes
- The kernel's bonding HOWTO is still the upstream reference, but the document itself notes its last content update was April 27, 2011; the current kernel docs still publish it as the canonical bonding guide.
- `balance-alb` inherits `balance-tlb` traffic-pattern caveats from the kernel docs: in gatewayed topologies, traffic may not spread as evenly as it does across multiple local peers.
