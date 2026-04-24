# Validation Summary: How to Run Portainer Behind a VPN for Secure Access

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer CE
- Docker
- WireGuard
- Tailscale
- Linux networking and firewalling
- UFW / iptables

## Sources Consulted
- Portainer Docs, "Install Portainer CE with Docker on Linux": https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux
- Docker Docs, "Port publishing and mapping": https://docs.docker.com/engine/network/port-publishing/
- Docker Docs, "Packet filtering and firewalls": https://docs.docker.com/engine/network/packet-filtering-firewalls/
- Docker Docs, "Docker with iptables": https://docs.docker.com/engine/network/firewall-iptables/
- WireGuard, "Installation": https://www.wireguard.com/install/
- WireGuard, "Quick Start": https://www.wireguard.com/quickstart/
- WireGuard `wg-quick(8)` manual: https://git.zx2c4.com/wireguard-tools/about/src/man/wg-quick.8
- Tailscale Docs, "Install Tailscale on Linux": https://tailscale.com/docs/install/linux
- Tailscale Docs, "Tailscale CLI": https://tailscale.com/docs/reference/tailscale-cli
- Tailscale Docs, "How Tailscale assigns IP addresses": https://tailscale.com/kb/1033/ip-and-dns-addresses

## Issues Found
- The post said VPN access "eliminates the attack surface almost entirely." That was too absolute. I changed it to say it significantly reduces the public attack surface, which is technically accurate.
- The WireGuard server example included `PostUp` and `PostDown` NAT and forwarding rules using `eth0`. Those rules are not required when clients only need to reach services on the same host, and the hard-coded interface name was environment-specific. I removed them.
- The WireGuard intro implied the same configuration would also apply if WireGuard ran on a separate jump host. I clarified that a separate jump host requires additional routing or proxying to the Portainer host.
- Both `docker run` examples were incomplete for a working Portainer installation, and the WireGuard example was shell-invalid because inline comments followed line-continuation backslashes. I replaced the commands with working syntax, added the persistent data volume, mounted `/var/run/docker.sock` and `/data`, and switched to the current `portainer/portainer-ce:lts` image used in Portainer's official install docs.
- The UFW example was misleading for Docker-published ports. Docker documents that published ports can bypass `ufw` rules, so I replaced the snippet with guidance to rely on binding to the VPN IP and to use Docker-specific filtering via the `DOCKER-USER` chain if additional firewall restrictions are needed.

## Review Notes
- Portainer's port `8000` is optional and is only needed for Edge agent and TCP tunnel features per Portainer's install docs.
- The commands in the post assume root privileges or equivalent `sudo` access.
- Binding Portainer to the VPN address is the key protection in this setup; extra host firewall rules are defense in depth, not a substitute for correct Docker port binding.
