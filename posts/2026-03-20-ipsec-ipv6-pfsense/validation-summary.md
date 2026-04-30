# Validation Summary: How to Configure IPsec IPv6 on pfSense

## Status
validated

## Post Type
Guide

## Technologies Covered
- pfSense
- IPsec
- IKEv2
- IPv6
- strongSwan
- FreeBSD networking tools

## Sources Consulted
- Netgate pfSense Documentation, Phase 1 Settings: https://docs.netgate.com/pfsense/en/latest/vpn/ipsec/configure-p1.html
- Netgate pfSense Documentation, Phase 2 Settings: https://docs.netgate.com/pfsense/en/latest/vpn/ipsec/configure-p2.html
- Netgate pfSense Documentation, IPsec and firewall rules: https://docs.netgate.com/pfsense/en/latest/vpn/ipsec/firewall-rules.html
- Netgate pfSense Documentation, IPsec Status: https://docs.netgate.com/pfsense/en/latest/monitoring/status/ipsec.html
- Netgate pfSense Documentation, Troubleshooting IPsec Connections: https://docs.netgate.com/pfsense/en/latest/troubleshooting/ipsec-connections.html
- Netgate pfSense Documentation, Testing IPsec Connectivity: https://docs.netgate.com/pfsense/en/latest/vpn/ipsec/test-connectivity.html
- Netgate pfSense Documentation, Routed IPsec (VTI): https://docs.netgate.com/pfsense/en/latest/vpn/ipsec/routed-vti.html
- Netgate pfSense Documentation, Troubleshooting IPsec Logs: https://docs.netgate.com/pfsense/en/latest/troubleshooting/ipsec-logs.html
- Netgate pfSense Documentation, Working with Log Files: https://docs.netgate.com/pfsense/en/latest/monitoring/logs/manage.html
- strongSwan Documentation, Introduction to strongSwan: https://docs.strongswan.org/docs/latest/howtos/introduction.html
- strongSwan Documentation, swanctl --list-sas: https://docs.strongswan.org/docs/latest/swanctl/swanctlListSas.html
- FreeBSD Manual, setkey(8): https://man.freebsd.org/setkey%288%29
- FreeBSD Manual, ping(8): https://man.freebsd.org/cgi/man.cgi?query=ping&sektion=8

## Issues Found
- The example IPv6 addresses `2001:db8:gw2::1`, `2001:db8:site1::/48`, and `2001:db8:site2::/48` were invalid because they used non-hexadecimal characters in IPv6 literals. I replaced them with valid documentation-prefix examples.
- The post referenced `VPN → IPsec → Status` and `Connect P1 and P2s`. Current pfSense documentation places tunnel status under `Status → IPsec` with per-tunnel connect controls, so I corrected that navigation.
- The WAN firewall section implied that manual UDP 500, UDP 4500, and ESP rules are always required. pfSense automatically adds these rules for enabled tunnels unless auto-added VPN rules are disabled, so I corrected that behavior.
- The firewall section omitted that local-to-remote tunneled traffic is controlled on the local interface tab, not the IPsec tab. I added that clarification.
- The CLI section used older or less current commands and outdated log handling with `clog`. I replaced them with current `swanctl` commands and plain-text log commands that match current pfSense and strongSwan documentation.
- The routing section incorrectly stated that tunnel-mode IPv6 IPsec creates normal IPv6 routes and suggested static routes via a tunnel interface. I corrected it to explain that tunnel mode uses SPD entries, while static routes and tunnel-interface gateways apply to Routed (VTI) IPsec.
- The troubleshooting example hard-coded `em0` and used a made-up connection label. I replaced those with interface-agnostic `tcpdump` guidance and documented `swanctl` connection handling.

## Review Notes
- Current pfSense documentation notes that IPv4 and/or IPv6 traffic may be carried inside a tunnel regardless of whether the outer Phase 1 transport uses IPv4 or IPv6. This post remains valid because it specifically configures an outer IPv6 IPsec tunnel.
- The post uses a simplified single-tunnel example. In production, both peers must still match proposals exactly, and initiation or reconnect behavior may be intentionally asymmetric between the two ends.
