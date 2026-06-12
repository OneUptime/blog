# Validation Summary: How to Configure WireGuard for Site-to-Site Connectivity

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- WireGuard (kernel module + wireguard-tools)
- wg-quick configuration format (INI-style with `[Interface]` and `[Peer]` sections)
- Linux networking: iptables, ip route, sysctl (net.ipv4.ip_forward)
- systemd service template (`wg-quick@wg0`)
- Package managers: apt (Debian/Ubuntu) and dnf (RHEL/CentOS) with EPEL
- Firewall management: ufw and firewalld
- Diagnostics: tcpdump, netcat (nc), traceroute, dmesg
- Mermaid diagrams for architecture illustration

## Sources Consulted
- WireGuard official documentation: https://www.wireguard.com/quickstart/
- WireGuard configuration reference: https://www.wireguard.com/install/
- wg(8) man page: https://manpages.debian.org/wg.8
- wg-quick(8) man page: https://manpages.debian.org/wg-quick.8
- Linux kernel WireGuard module documentation (in-tree since Linux 5.6)
- iptables(8) and ip-route(8) man pages
- systemd.unit(5) for service templates
- EPEL package repository for RHEL/CentOS wireguard-tools

## Issues Found
No technical issues found.

All code examples, configuration snippets, and commands were verified to be syntactically correct and consistent with current WireGuard documentation:

- Key generation pipeline (`wg genkey | tee privatekey | wg pubkey | tee publickey`) follows the standard WireGuard pattern.
- All `[Interface]` and `[Peer]` directives (PrivateKey, Address, ListenPort, PostUp, PostDown, PublicKey, Endpoint, AllowedIPs, PersistentKeepalive) are valid wg-quick directives.
- The /30 tunnel subnet (172.16.0.0/30) is correctly used for the point-to-point link with .1 and .2 host addresses.
- AllowedIPs semantics are correctly used as both a routing table and ingress filter (the cryptokey routing model).
- PersistentKeepalive = 25 is the standard recommended value to maintain NAT mappings.
- The systemd service template name `wg-quick@wg0` is correct (provided by wireguard-tools).
- IP forwarding configuration via sysctl is accurate, both for runtime and persistence in /etc/sysctl.conf.
- Installation commands are correct for both Debian/Ubuntu and RHEL/CentOS (wireguard-tools comes from EPEL on RHEL family; kernel module is in-tree since Linux 5.6).
- iptables FORWARD chain rules and `ip route add` syntax are correct.
- Diagnostic commands (`wg show`, `wg showconf wg0`, `nc -vzu`, `ip link show`, `dmesg | grep wireguard`) are correct.

## Review Notes
- The hub-and-spoke config example only includes one PostUp/PostDown pair for FORWARD `-i wg0` (without the matching `-o wg0`). This is sufficient for spoke-to-spoke traffic routed via the hub (incoming on wg0, outgoing on wg0 — matched by `-i wg0`), but traffic originating from the hub's own LAN destined for spokes would not be matched by these rules. This is a minor asymmetry compared to the per-site configs and is not strictly incorrect — it depends on the intended use case (pure spoke interconnect vs. hub LAN access to spokes). Left as-is.
- The post correctly uses RFC 5737 documentation IP ranges (203.0.113.0/24, 198.51.100.0/24) for the example public endpoints, which is best practice.
- The `tcpdump -i eth0` example assumes eth0 is the public interface; on systems using predictable network interface names (e.g., ens3, enp0s3), users will need to adjust. This is a common documentation convention and not an error.
- `nc -vzu` for UDP probing is included as a diagnostic; users should be aware that UDP scans can return false positives because the absence of an ICMP unreachable does not confirm an open port. Reasonable to include in a troubleshooting section.
- WireGuard is included in the mainline Linux kernel since 5.6 (March 2020), so the separate `wireguard-dkms` package mentioned in some older guides is correctly omitted here.
