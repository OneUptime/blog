# Validation Summary: How to Configure OpenVPN Client Routing for IPv4 Split Tunnel

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenVPN (server and client configuration)
- IPv4 routing
- Linux `iproute2` (`ip route`) commands
- Bash scripting for OpenVPN up scripts
- DNS push options (`dhcp-option`)

## Sources Consulted
- OpenVPN 2.6 Manual: https://openvpn.net/community-resources/reference-manual-for-openvpn-2-6/
- OpenVPN HOWTO: https://openvpn.net/community-resources/how-to/
- OpenVPN `--redirect-gateway`, `--route-nopull`, `--route`, `--script-security`, `--up`, `--dhcp-option` directive documentation
- OpenVPN environment variables reference (e.g., `route_vpn_gateway`)
- `ip-route(8)` man page (iproute2)
- RFC 1918 (private IPv4 address space) and RFC 5737 (documentation IPs like 203.0.113.0/24)

## Issues Found
No technical issues found.

All OpenVPN directives shown (`redirect-gateway def1 bypass-dhcp`, `push "route ..."`, `route-nopull`, `route`, `script-security 2`, `up`, `push "dhcp-option DNS ..."`, `push "dhcp-option DOMAIN ..."`) match the OpenVPN 2.x reference manual. The `route_vpn_gateway` environment variable used in the up script is a documented variable set by OpenVPN before script execution. The `ip route` verification commands are syntactically correct and produce the described output format. Example IPs use RFC 5737 documentation ranges and RFC 1918 private ranges appropriately.

## Review Notes
- The shebang line (`#!/bin/bash`) in the up script appears below a comment indicating the filename. This is a common blog convention — readers are expected to understand the leading `# /etc/openvpn/add-routes.sh` is a path label, not part of the script. In real usage the shebang must be the first line of the file.
- `--route-up` is sometimes preferred over `--up` for adding routes because it runs after OpenVPN has finished its own route processing, but using `--up` works as shown since `route_vpn_gateway` is exported before either script runs.
- `route-nopull` also suppresses pushed DHCP options (DNS), in addition to routes. Readers using both `route-nopull` and the server-side DNS push section should be aware these two patterns are mutually exclusive on the same client.
- No version-specific caveats for OpenVPN 2.4–2.6; all directives shown are present and stable across these versions.
