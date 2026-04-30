# Validation Summary: How to Set Up GRE Tunnel Between Linux and OPNsense

## Status
validated

## Post Type
Guide

## Technologies Covered
- GRE
- Linux networking
- `iproute2`
- OPNsense
- FreeBSD networking
- IPv4 static routing
- Firewall rules

## Sources Consulted
- OPNsense Devices documentation: https://docs.opnsense.org/manual/other-interfaces.html
- OPNsense Interface configuration documentation: https://docs.opnsense.org/manual/interfaces.html
- OPNsense Routes documentation: https://docs.opnsense.org/manual/routes.html
- OPNsense Firewall documentation: https://docs.opnsense.org/manual/firewall.html
- Linux kernel IP sysctl documentation: https://docs.kernel.org/6.18/networking/ip-sysctl.html
- FreeBSD `gre(4)` manual: https://man.freebsd.org/cgi/man.cgi?manpath=FreeBSD+14.1-RELEASE&query=gre&sektion=4
- RFC 2784, Generic Routing Encapsulation (GRE): https://www.rfc-editor.org/rfc/rfc2784
- Local command help checked for CLI syntax: `ip tunnel help`, `ip route help`, `tcpdump --help`

## Issues Found
- The post omitted Linux IPv4 forwarding for the routed-LAN scenario shown in the diagram. I added `sysctl -w net.ipv4.ip_forward=1` because Linux will not forward packets between the LAN and GRE interface unless forwarding is enabled.
- The OPNsense navigation path was outdated. I changed `Interfaces → Other Types → GRE` to `Interfaces → Devices → GRE` to match current OPNsense documentation.
- The post instructed readers to set the GRE interface IPv4 address again after assignment. I changed that step to confirm the configured tunnel local address, which matches current OPNsense GRE device behavior and documentation.

## Review Notes
- GRE does not provide encryption or authentication. On public networks, OPNsense recommends protecting GRE with IPsec.
- GRE adds encapsulation overhead. If traffic crosses links with tight MTU limits, Path MTU Discovery should be allowed to work, or MTU/MSS may need tuning.
