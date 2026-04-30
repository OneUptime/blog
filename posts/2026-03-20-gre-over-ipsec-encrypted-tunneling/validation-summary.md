# Validation Summary: How to Configure GRE over IPsec for Encrypted Tunneling

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux networking
- GRE
- IPsec
- strongSwan
- `swanctl`
- `iproute2`
- `tcpdump`

## Sources Consulted
- strongSwan Route-based VPN documentation: https://docs.strongswan.org/docs/5.9/features/routeBasedVpn.html
- strongSwan Introduction to the IPsec Protocol: https://docs.strongswan.org/docs/latest/howtos/ipsecProtocol.html
- strongSwan `swanctl.conf` reference: https://docs.strongswan.org/docs/latest/swanctl/swanctlConf.html
- strongSwan `swanctl` tool reference: https://docs.strongswan.org/docs/latest/swanctl/swanctl.html
- strongSwan installation documentation: https://docs.strongswan.org/docs/latest/install/install.html
- strongSwan introduction/configuration overview: https://docs.strongswan.org/docs/latest/howtos/introduction.html
- Debian `ipsec.conf(5)` manpage for current deprecation notes on `leftprotoport`: https://manpages.debian.org/unstable/strongswan-starter/ipsec.conf.5.en.html
- Linux kernel `ip_forward` documentation: https://www.kernel.org/doc/html/v6.15/networking/ip-sysctl.html
- Local CLI help: `ip tunnel help`
- Local CLI help: `ip route help`
- Local manpage: `pcap-filter(7)`

## Issues Found
- The post used the legacy `ipsec.conf`/`ipsec.secrets` backend. strongSwan’s current documentation states that the legacy `stroke`/`ipsec.conf` path is deprecated and no longer built by default, so the post was updated to use `/etc/swanctl/swanctl.conf` and `swanctl` commands.
- The post used `leftprotoport=gre` and `rightprotoport=gre`. Current strongSwan documentation marks `leftprotoport` as deprecated, so the GRE traffic selectors were updated to `local_ts = dynamic[gre]` and `remote_ts = dynamic[gre]`.
- The packet diagram showed `ESP/AH` in an encryption-focused tutorial. AH does not provide encryption and the walkthrough configures ESP, so the architecture line was corrected to show `ESP`.
- The GRE tunnel interface was named `gre0`. strongSwan’s GRE guidance notes that names starting with `gre` are treated specially by `ip`, and `gre0` commonly collides with Linux’s fallback GRE device, so the interface name was changed to `ipsec0`.
- The routed-LAN example omitted IPv4 forwarding. Because the hosts are acting as routers for `192.168.1.0/24` and `192.168.2.0/24`, the post was updated to enable `net.ipv4.ip_forward=1` before adding inter-LAN routes.
- The verification and operational commands were updated from `ipsec status*` to `swanctl --load-all`, `swanctl --initiate --child gre`, `swanctl --list-conns`, and `swanctl --list-sas` to match the modern configuration backend.
- The `tcpdump` example hard-coded `eth0`, which is not a portable interface name on current Linux systems. It was replaced with `<underlay-interface>`.

## Review Notes
- The tutorial assumes direct host-to-host IPsec transport without NAT. If NAT traversal is in use, packet captures may show UDP/4500-encapsulated ESP instead of bare ESP packets.
- The post uses PSK authentication for simplicity. strongSwan’s documentation warns that weak PSKs are vulnerable to offline attacks, so production deployments should use strong random PSKs or certificate-based authentication.
