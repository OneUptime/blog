# Validation Summary: How to Create UFW Rules for Specific Network Interfaces on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- UFW (Uncomplicated Firewall)
- Ubuntu Linux
- iptables (UFW backend)
- Networking (network interfaces: eth0/eth1/eth2, lo, docker0, wg0, tun0)
- WireGuard / OpenVPN (VPN interfaces)
- Docker networking (docker0 bridge)
- NFS, iSCSI, PostgreSQL (example service ports)
- nmap (testing)

## Sources Consulted
- UFW man page (`man ufw`) - covers the full RULE SYNTAX section, including `[in|out [on INTERFACE]] [proto PROTOCOL] [from ADDRESS [port PORT]] [to ADDRESS [port PORT]] [comment COMMENT]` and the sample status output format
- Ubuntu UFW community documentation: https://help.ubuntu.com/community/UFW
- IANA Service Name and Transport Protocol Port Number Registry (NFS 2049, iSCSI 3260, PostgreSQL 5432)
- WireGuard documentation (default port 51820): https://www.wireguard.com/quickstart/
- Prometheus documentation (default port 9090): https://prometheus.io/docs/prometheus/latest/installation/
- UFW source rule chains (`ufw-user-input`, `ufw-before-input`, etc.) as installed under `/etc/ufw/`

## Issues Found
No technical issues found.

The interface-specific UFW syntax used throughout the post matches the official UFW man page:
- `ufw allow in on eth0 to any port 22` — valid full syntax
- `ufw allow in on eth0 to any port 80 proto tcp` — valid (proto after to/port is accepted by the parser; the man page example `ufw deny in on eth0 to 224.0.0.1 proto igmp` shows the same ordering)
- `ufw allow in on eth2 proto tcp` — valid; all fields after the direction are optional and default to "any"
- `comment "..."` parameter — supported by UFW (per man page)
- `ufw reset`, `ufw enable`, `ufw default deny incoming`, `ufw status numbered/verbose` — all standard
- `ufw delete N` and `ufw delete <full rule>` — both supported
- Sample iptables chain `ufw-user-input` — correct chain name in UFW
- Sample status output format with "PORT/proto on IFACE" notation matches the man page's sample output

Port numbers cited are all standard defaults:
- NFS 2049, iSCSI 3260, PostgreSQL 5432, WireGuard 51820/udp, Prometheus 9090

The Docker/UFW caveat (that interface-only rules do not fully address Docker bypassing UFW because Docker manipulates iptables directly via its DOCKER and DOCKER-USER chains) is accurately framed as a partial mitigation.

## Review Notes
- Modern Ubuntu (18.04+) uses predictable network interface names (e.g., `enp0s3`, `ens33`) by default rather than `eth0`/`eth1`/`eth2`. The post uses `eth*` naming consistently, which is conventional for documentation/tutorials and still works on systems where users have renamed interfaces or where `net.ifnames=0` is set on the kernel command line. Readers should substitute their actual interface names (`ip link show`).
- The post mentions UFW's `comment` option without noting a minimum UFW version requirement. Comment support was added in UFW 0.35; all currently-supported Ubuntu releases (20.04 LTS and newer) ship versions well above that, so this is not a practical concern.
- The Docker/UFW bypass issue referenced in the post is a well-known, longstanding limitation; the post correctly notes it requires more than just interface-specific rules to fix completely.
