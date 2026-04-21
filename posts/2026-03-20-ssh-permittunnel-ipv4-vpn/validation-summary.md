# Validation Summary: How to Configure SSH PermitTunnel for IPv4 VPN-Like Connections

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenSSH `PermitTunnel`, `ssh -w`, and tunnel device forwarding
- Linux TUN/TAP devices
- Linux `ip addr`, `ip link`, and `ip route`
- Linux IPv4 forwarding via `sysctl`
- iptables NAT `MASQUERADE`
- OpenVPN and WireGuard comparison points

## Sources Consulted
- OpenSSH `ssh(1)` manual: https://man.openbsd.org/ssh.1
- OpenSSH `sshd_config(5)` manual: https://man.openbsd.org/sshd_config
- OpenSSH `ssh_config(5)` manual: https://man.openbsd.org/ssh_config.5
- Linux kernel TUN/TAP documentation: https://www.kernel.org/doc/html/next/networking/tuntap.html
- iproute2 `ip-route(8)` manual: https://man7.org/linux/man-pages/man8/ip-route.8.html
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/v6.12/networking/ip-sysctl.html
- iptables extensions manual: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- WireGuard Quick Start and protocol documentation: https://www.wireguard.com/quickstart/ and https://www.wireguard.com/protocol/
- OpenVPN 2.6 manual and Access Server PKI documentation: https://openvpn.net/community-resources/reference-manual-for-openvpn-2-6/ and https://openvpn.net/as-docs/external-public-key-infrastructure.html

## Issues Found
- Clarified that `PermitTunnel` permits clients to request tunnel devices; `ssh -w` is the client-side request that opens the devices.
- Clarified the server privilege requirement for tun creation. A non-root account needs suitable tun device access and `CAP_NET_ADMIN`; sudo for later commands does not by itself make the SSH tunnel request able to create the device.
- Changed the full-tunnel route example from `ip route add 0.0.0.0/0` to `ip route replace default ... dev tun0`, because adding a second default route can fail or leave route selection dependent on metrics.
- Added `dev tun0` to route examples so the intended tunnel interface is explicit.
- Added a note and script variable for replacing `eth0` with the actual server outbound interface.
- Corrected the limitations table: SSH TUN can carry UDP traffic as encapsulated IP traffic, but the transport is SSH over TCP.
- Corrected certificate/key management comparison: OpenVPN commonly uses PKI/certificates, while WireGuard uses public/private keys rather than X.509 certificates.
- Updated the conclusion to refer to native UDP transport support instead of implying SSH TUN cannot carry UDP packets.

## Review Notes
The examples are Linux-oriented and assume `systemd`, `iproute2`, `sysctl`, and `iptables` are available. On Debian/Ubuntu the SSH service unit may be named `ssh` rather than `sshd`; on nftables-first systems, `iptables` may be provided by the iptables-nft compatibility layer.
