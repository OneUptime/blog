# Validation Summary: How to Capture Packets on a Specific Network Interface with tcpdump

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- tcpdump
- libpcap/pcap capture filters
- Linux network interfaces
- iproute2
- Docker bridge networking
- Linux network namespaces
- WireGuard
- OpenVPN/TUN interfaces
- GRE tunnels

## Sources Consulted
- Local `tcpdump` 4.99.4 `--help` output and `tcpdump(8)` man page; official man page: https://www.tcpdump.org/manpages/tcpdump.1.html
- Local `pcap-filter(7)` man page; official filter syntax reference: https://www.tcpdump.org/manpages/pcap-filter.7.html
- iproute2 `ip-link(8)` manual: https://man7.org/linux/man-pages/man8/ip-link.8.html
- Debian iproute2 `ip-link(8)` manual for current link type syntax: https://manpages.debian.org/testing/iproute2/ip-link.8.en.html
- Docker CLI `docker inspect` reference: https://docs.docker.com/reference/cli/docker/inspect/
- Docker bridge network driver documentation: https://docs.docker.com/engine/network/drivers/bridge/
- Linux `nsenter(1)` manual: https://man7.org/linux/man-pages/man1/nsenter.1.html
- Linux `veth(4)` manual: https://man7.org/linux/man-pages/man4/veth.4.html
- WireGuard protocol documentation: https://www.wireguard.com/protocol/
- WireGuard network namespace documentation: https://www.wireguard.com/netns/

## Issues Found
- The Docker section said `docker inspect container_name | grep "NetworkMode"` would get a container interface name. `NetworkMode` is a network mode, not an interface. I replaced that example with a Linux host-side veth lookup using the container PID, `nsenter`, `/sys/class/net/eth0/iflink`, and `ip -o link`, then captured on the resolved host interface.
- The Docker bridge example said `docker0` captures traffic between all Docker containers. That is only accurate for containers attached to the default Docker bridge; user-defined bridge networks use separate bridge devices. I changed the wording to "containers on the default Docker bridge."
- The interface discovery examples used `ip link show type ether` and `ip link show type tun`, which are not reliable current `ip link` link kinds. I replaced them with `link/ether` output filtering for Ethernet-style interfaces, current `ip link show type` examples for `veth`, `bridge`, and `gre`, a name-based TUN/TAP lookup for common OpenVPN devices, and `wg show interfaces` for WireGuard.
- The WireGuard examples assumed UDP port 51820. That is common, but WireGuard traffic uses the configured `ListenPort`/peer endpoint port. I added comments telling readers to replace 51820 with their tunnel's actual port.

## Review Notes
The core tcpdump flags and filters in the post are valid: `-D` lists capture interfaces, `-i` selects an interface, `-i any` captures across interfaces on supported systems, `-nn` disables name resolution, `-c` limits captured packets, and `-w` writes packet data. One caveat left as-is: `any` is a Linux/recent macOS/Solaris pseudo-interface and is not captured in promiscuous mode according to the tcpdump man page.
