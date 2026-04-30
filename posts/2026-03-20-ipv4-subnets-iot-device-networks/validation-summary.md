# Validation Summary: How to Plan IPv4 Subnets for IoT Device Networks

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 subnetting
- IoT network segmentation
- Python `ipaddress`
- ISC DHCP
- Cisco IOS VLANs and IPv4 ACLs
- IEEE 802.1X
- RADIUS
- MAC Authentication Bypass (MAB)

## Sources Consulted
- Python `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- ISC DHCP `dhcpd.conf` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- ISC DHCP product status: https://www.isc.org/dhcp/
- Cisco IP access list configuration: https://www.cisco.com/c/en/us/support/docs/security/ios-firewall/23602-confaccesslists.html
- Cisco ACL remarks documentation: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/sec_data_acl/configuration/15-e/sec-data-acl-15-e-book/sec-acl-comm-ipacl.html
- Cisco ACL behavior and implicit deny: https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/security/acls/acls-configuration-guide/access-control-lists.html
- IANA service name and port registry for MQTT: https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml?search=secure-mqtt
- Cisco IEEE 802.1X VLAN assignment: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/sec_usr_8021x/configuration/xe-3e/sec-usr-8021x-xe-3e-book/sec-ieee-8021x-vlan-assign.html
- Cisco IEEE 802.1X auth fail VLAN: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/sec_usr_8021x/configuration/15-mt/sec-user-8021x-15-mt-book/sec-ieee-auth-fail-vlan.pdf
- RFC 3580, IEEE 802.1X RADIUS Usage Guidelines: https://www.rfc-editor.org/rfc/rfc3580.html

## Issues Found
- The network model described the isolated IoT zone as a single "separate VLAN" even though the post assigns multiple IoT subnets to separate routed segments. I changed this to "separate VLANs."
- The ISC DHCP example used `deny unknown-clients;` directly in subnet scope. ISC documents that non-pool use as deprecated for this purpose, and recommends using it inside an address `pool`. I moved the setting into a `pool` block and clarified that it requires host declarations for known clients.
- The Cisco ACL example used UDP for MQTT ports 1883 and 8883, but IANA registers MQTT and secure MQTT on TCP. I corrected both entries to TCP.
- The Cisco ACL example used inline `!` comments on ACE lines. Cisco documents `remark` as the supported way to annotate ACL entries, so I converted the comments to `remark` lines.
- The Cisco ACL example would have permitted traffic to other routed IoT subnets via the final `permit ip ... any`, which conflicted with the earlier "DENY All other inter-IoT traffic" rule. I added an explicit deny for the rest of the IoT address space before the final permit.
- The DHCP example pointed clients at `10.2.100.10` as a local resolver, but the ACL example did not explicitly allow DNS to that host once inter-IoT blocking is enforced. I added DNS permits for TCP and UDP 53 to keep the example internally consistent.
- The 802.1X onboarding section said unknown MACs should fall back to a quarantine VLAN. Cisco's auth-fail VLAN behavior is tied to authentication failure, while MAC-based handling belongs in the MAB flow. I changed that line to "Fall back to a quarantine VLAN on authentication failure."

## Review Notes
- ISC states that ISC DHCP reached end of maintenance at the end of 2022. The configuration shown is still valid for legacy environments, but new deployments should generally prefer Kea.
- The Python capacity calculation using `net.num_addresses - 2` is correct for the `/24` and `/25` examples in this post. If the post later adds `/31` or `/32` examples, that formula would need to be adjusted.
