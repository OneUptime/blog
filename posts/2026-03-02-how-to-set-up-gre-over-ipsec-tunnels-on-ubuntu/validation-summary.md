# Validation Summary: How to Set Up GRE over IPsec Tunnels on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Ubuntu (apt, systemd)
- strongSwan (IPsec, ipsec.conf legacy/starter config)
- GRE (Generic Routing Encapsulation, RFC 2784)
- iproute2 (`ip tunnel`, `ip addr`, `ip route`, `ip xfrm`)
- FRRouting (FRR) with OSPFd and vtysh
- tcpdump
- iptables

## Sources Consulted
- strongSwan ipsec.conf(5) reference: https://docs.strongswan.org/docs/5.9/config/IKEv2.html and https://wiki.strongswan.org/projects/strongswan/wiki/IpsecConf
- strongSwan Ubuntu service naming (strongswan-starter.service for legacy ipsec.conf on Ubuntu 22.04+): https://wiki.strongswan.org/projects/strongswan/wiki/UbuntuPackages
- Linux `ip-tunnel(8)` manpage for GRE tunnel syntax
- RFC 2784 (GRE) — protocol number 47
- RFC 4303 (ESP) — IP protocol 50; IKE UDP 500/4500
- FRRouting OSPFd documentation: https://docs.frrouting.org/en/latest/ospfd.html
- FRR `/etc/frr/daemons` reference for enabling protocol daemons
- Ubuntu `strongswan` and `strongswan-pki` package metadata (Jammy/Noble)

## Issues Found
- "The cleanest way to persist them is with a systemd service combined with Netplan for IPsec." — Netplan is not used anywhere in this article and is not the persistence mechanism for IPsec (strongSwan is persisted via `systemctl enable strongswan-starter`). Rewrote the sentence to refer to a systemd service ordered after `strongswan-starter.service`, which matches the unit shown immediately below in the post.

## Review Notes
- `leftprotoport=gre` / `rightprotoport=gre` rely on `getprotobyname()` resolving "gre" via `/etc/protocols`. This works on standard Ubuntu, but readers who hit obscure parser issues can substitute the numeric value `47` (`leftprotoport=47`).
- `strongswan-starter.service` is the correct unit name on Ubuntu 22.04+ for the legacy `ipsec`/starter daemon using `ipsec.conf`. On Ubuntu 20.04 the equivalent unit was `strongswan.service`. The post targets the modern naming, which is appropriate for current Ubuntu LTS releases.
- `zebra=yes` in `/etc/frr/daemons` is already the default in current FRR releases; the `sed` command is redundant but harmless.
- For new deployments, strongSwan upstream recommends `swanctl`/`vici` over the legacy `ipsec.conf`/starter approach. The legacy config used here is still fully supported by the Ubuntu `strongswan` package and is widely deployed, so it remains a valid choice for a tutorial.
- The PSK shown is illustrative; readers should generate their own with `openssl rand -base64 32` as the post correctly instructs, and certificate-based auth is correctly recommended for production.
