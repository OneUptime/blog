# Validation Summary: How to Set the MTU on an Interface with ip link

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux networking
- iproute2 `ip link`
- MTU and jumbo frames
- GRE, VXLAN, WireGuard, and IPsec tunnel MTU sizing
- VLAN interfaces
- systemd-networkd
- Netplan
- NetworkManager `nmcli`
- iputils `ping`

## Sources Consulted
- iproute2 `ip-link(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- iputils `ping(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ping.8.html
- systemd.network documentation for `[Link]` and `MTUBytes=`: https://www.freedesktop.org/software/systemd/man/254/systemd.network.html
- Netplan YAML reference for `mtu`: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- NetworkManager `nm-settings-nmcli` reference for `802-3-ethernet.mtu` / `ethernet.mtu`: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- RFC 2784, Generic Routing Encapsulation (GRE): https://datatracker.ietf.org/doc/html/rfc2784
- RFC 7348, VXLAN: https://datatracker.ietf.org/doc/html/rfc7348
- WireGuard protocol documentation: https://www.wireguard.com/protocol/
- RFC 4303, IP Encapsulating Security Payload (ESP): https://www.rfc-editor.org/rfc/rfc4303.html

## Issues Found
- The introduction described MTU as the largest packet an interface can transmit. I clarified that interface MTU is the largest Layer 3 packet size transmitted without fragmentation.
- The jumbo-frame wording implied that all jumbo frames are exactly 9000 bytes. I changed this to say jumbo frames commonly use 9000 bytes.
- The tunnel MTU examples stated GRE, VXLAN, and WireGuard overheads without specifying common assumptions. I clarified that the GRE example is basic IPv4 GRE, the VXLAN example is VXLAN over IPv4, and the WireGuard example is WireGuard over IPv4.
- The IPsec ESP example gave a single overhead value even though ESP overhead varies by mode, cipher, NAT traversal, and padding. I replaced the fixed calculation with a note that ESP overhead varies.
- The systemd-networkd persistent configuration omitted a `[Match]` section, which could apply the file too broadly. I added `[Match]` with `Name=eth0`.
- The Netplan snippet was an incomplete YAML fragment. I added the required `network:` and `version: 2` structure while keeping the example concise.
- The persistent configuration heading said "at interface creation" even though the examples configure persistent profile files or connection settings. I changed the heading to "Set MTU Persistently."
- The conclusion implied tunnels always need smaller MTUs. I clarified that the reduction is often needed unless the underlay MTU is increased.

## Review Notes
The command examples for `ip link show`, `ip link set <interface> mtu <size>`, `nmcli connection modify`, and `ping -M do -s 1472` are valid on Linux. The `ping -s 1472` calculation applies to IPv4 ICMP over a 1500-byte MTU path because it subtracts 20 bytes for IPv4 and 8 bytes for ICMP.
