# Validation Summary: How to Configure IPSec Site-to-Site Tunnel for IPv4 Networks

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPsec
- IKEv2
- strongSwan
- Linux XFRM (`ip xfrm`)
- iptables
- IPv4 routing and forwarding

## Sources Consulted
- strongSwan Documentation, Configuration Files: https://docs.strongswan.org/docs/latest/config/config.html
- strongSwan Documentation, Installation Documentation: https://docs.strongswan.org/docs/latest/install/install.html
- strongSwan package man page, `ipsec(8)`: https://manpages.opensuse.org/Tumbleweed/strongswan-ipsec/ipsec.8.en.html
- strongSwan package man page, `ipsec.conf(5)`: https://manpages.opensuse.org/Tumbleweed/strongswan-ipsec/ipsec.conf.5.en.html
- strongSwan package man page, `ipsec.secrets(5)`: https://manpages.opensuse.org/Tumbleweed/strongswan-ipsec/ipsec.secrets.5.en.html
- RFC 5737, IPv4 Address Blocks Reserved for Documentation: https://datatracker.ietf.org/doc/rfc5737/
- Local `iproute2` help output checked with `ip xfrm help` and `ip xfrm policy help`

## Issues Found
- The post used `systemctl restart strongswan` while the configuration and commands in the post use strongSwan's legacy `ipsec.conf`/`ipsec.secrets` backend. I changed this to `sudo ipsec restart`, which is the documented control command for the `starter`/`ipsec` workflow.
- Both gateway configs set `dpdtimeout=90s`. In strongSwan, `dpdtimeout` only applies to IKEv1 and has no effect on IKEv2 connections. I removed that line from both examples.
- The verification command used `ip xfrm policy`, which is incomplete for listing policies. I changed it to `sudo ip xfrm policy list` to match `iproute2` command syntax.
- The topology used ordinary public IPv4 examples (`1.2.3.4` and `5.6.7.8`). I replaced them with RFC 5737 documentation addresses (`198.51.100.10` and `203.0.113.10`).
- The closing explanation of the `!` suffix was slightly imprecise. I updated it to reflect strongSwan's documented behavior: it restricts negotiation to the configured proposals instead of appending the daemon's broader default proposal set.

## Review Notes
- The tutorial is technically valid after correction, but it uses strongSwan's legacy `ipsec.conf`/`ipsec.secrets` backend. strongSwan's current documentation identifies that backend as deprecated in favor of `swanctl.conf` and the `vici` interface.
- The example PSK is syntactically valid, but real deployments should replace it with a long random secret because PSK-based IKEv2 authentication is sensitive to weak shared secrets.
