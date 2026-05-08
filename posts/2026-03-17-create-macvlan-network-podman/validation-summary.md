# Validation Summary: How to Create a Macvlan Network with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Linux macvlan networking
- Linux VLAN sub-interfaces
- Linux `ip` command
- Container networking and IP address management

## Sources Consulted
- Podman `podman network create` documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman `podman create` / container networking option documentation: https://docs.podman.io/en/latest/markdown/podman-create.1.html
- Linux `ip-link(8)` manual page for macvlan and VLAN link types: https://man7.org/linux/man-pages/man8/ip-link.8.html
- Docker macvlan driver documentation for the Linux-kernel host communication limitation: https://docs.docker.com/engine/network/drivers/macvlan/

## Issues Found
- The network was created with `sudo podman network create`, but inspected with non-root `podman network inspect`. Changed the inspect command to `sudo podman network inspect my-macvlan` so it targets the same rootful Podman network.
- The VLAN example said the VLAN sub-interface is created automatically. Podman documents `parent` as a host device for macvlan networks, and Linux VLAN interfaces are created with `ip link`; automatic dotted-parent VLAN creation is Docker-specific behavior. Added explicit `ip link add` and `ip link set` commands and removed the automatic-creation claim.
- The multi-container example used nginx images and then ran `ping` inside one of them. The nginx image should not be assumed to include `ping`, so the example now uses Alpine containers, where the `ping` command is available.
- The host-to-container communication workaround assigned `/24` directly to the host macvlan interface without adding a route for the Podman macvlan IP range. This can leave routing ambiguous with the existing parent-interface connected route. Changed the host macvlan address to `/32` and added a route for `192.168.1.200/29` through the host macvlan interface.
- The limitations section implied promiscuous mode is always required and that `ip link show` checks support. Changed this to "may require" promiscuous mode and clarified that the `PROMISC` flag shows current state.

## Review Notes
The post uses rootful Podman consistently, which matches Podman's documented limitation that macvlan networks can only be used as root. The examples still assume the reader replaces `eth0`, subnets, gateways, and unused IP addresses with values valid for their LAN.
