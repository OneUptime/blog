# Validation Summary: How to Configure IPsec IPv6 on OPNsense

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OPNsense
- IPsec
- strongSwan
- IPv6
- FreeBSD
- pfSense

## Sources Consulted
- OPNsense IPsec overview: https://docs.opnsense.org/manual/vpnet.html
- OPNsense legacy site-to-site IPsec guide: https://docs.opnsense.org/manual/how-tos/ipsec-s2s.html
- OPNsense IKEv2/IPsec roadwarrior guide: https://docs.opnsense.org/manual/how-tos/ipsec-swanctl-rw-ikev2-eap-mschapv2.html
- strongSwan `swanctl --initiate`: https://docs.strongswan.org/docs/latest/swanctl/swanctlInitiate.html
- strongSwan `swanctl --list-conns`: https://docs.strongswan.org/docs/latest/swanctl/swanctlListConns.html
- strongSwan `swanctl --list-sas`: https://docs.strongswan.org/docs/latest/swanctl/swanctlListSas.html
- FreeBSD `ping(8)`: https://man.freebsd.org/cgi/man.cgi?query=ping&sektion=8
- FreeBSD `route(8)`: https://man.freebsd.org/cgi/man.cgi?manpath=FreeBSD+13.1-RELEASE+and+Ports&query=route&sektion=8
- pfSense IPsec tunnels tab: https://docs.netgate.com/pfsense/en/latest/vpn/ipsec/tunnels.html
- pfSense IPsec status: https://docs.netgate.com/pfsense/en/latest/vpn/ipsec/ipsec-status.html
- pfSense IPsec logs: https://docs.netgate.com/pfsense/en/latest/monitoring/logs/ipsec.html

## Issues Found
- The post mixed OPNsense's newer `Connections` UI with the legacy Phase 1 / Phase 2 `Tunnel Settings` workflow. I corrected the navigation and overview text so the instructions consistently describe the legacy workflow the rest of the post already used.
- Several example IPv6 addresses were invalid syntax (`2001:db8:gw2::1`, `2001:db8:site1::/48`, `2001:db8:site2::/48`). I replaced them with valid documentation-prefix IPv6 examples.
- The CLI initiation example used invalid `swanctl` syntax (`swanctl --initiate conn:...`). I changed it to the documented `swanctl --initiate --child <child-name>` form and clarified that the name should come from `swanctl --list-conns`.
- The log example referenced `/var/log/system.log`, but current OPNsense IPsec logs are exposed via `VPN → IPsec → Log File` and `/var/logs/ipsec/latest.log`. I updated the command accordingly.
- The packet-capture example used a hypervisor-specific interface name (`vtnet0`). I replaced it with `<wan-interface>` and expanded the filter to include ESP plus IKE/NAT-T traffic.
- The routing section implied a static IPv6 route might need to be added for this policy-based tunnel. OPNsense documents that policy-based Phase 2/child entries install the matching kernel route/policy automatically, so I corrected the section to reflect that static routes are generally only needed for route-based/VTI IPsec.
- The OPNsense vs pfSense comparison table had outdated or inaccurate UI and logging paths. I updated those entries to match current documentation.

## Review Notes
- The corrected post documents the legacy `VPN → IPsec → Tunnel Settings` workflow. OPNsense documentation marks that UI as legacy and feature-frozen while the newer `Connections` UI is the long-term direction, but the legacy workflow is still documented and supported.
