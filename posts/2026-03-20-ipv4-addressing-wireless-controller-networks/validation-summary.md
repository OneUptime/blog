# Validation Summary: How to Design IPv4 Addressing for Wireless Controller Networks

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 subnet design and CIDR planning
- Cisco Wireless LAN Controller (WLC) interfaces
- CAPWAP/LWAPP access point discovery
- ISC DHCP option 43 configuration
- Python `ipaddress` subnet calculations

## Sources Consulted
- Cisco: Configure DHCP OPTION 43 for Lightweight Access Points: https://www.cisco.com/c/en/us/support/docs/wireless-mobility/wireless-lan-wlan/97066-dhcp-option-43-00.html
- Cisco: Cisco Wireless Controller Configuration Guide, Release 8.10 - Ports and Interfaces: https://www.cisco.com/c/en/us/td/docs/wireless/controller/8-10/config-guide/b_cg810/ports_and_interfaces.html
- Cisco: Cisco Wireless Controller Configuration Guide, Release 8.5 - DHCP: https://www.cisco.com/c/en/us/td/docs/wireless/controller/8-5/config-guide/b_cg85/dhcp.html
- Cisco: Deploy the 2500 Series Wireless Controller: https://www.cisco.com/c/en/us/support/docs/wireless/2500-series-wireless-controllers/113034-2500-deploy-guide-00.html
- Python documentation: `ipaddress` — IPv4/IPv6 manipulation library: https://docs.python.org/3/library/ipaddress.html
- ISC DHCP 4.4 Manual Pages - dhcp-options: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcp-options
- RFC 5415: CAPWAP Protocol Specification: https://www.rfc-editor.org/rfc/rfc5415

## Issues Found
- The AP management subnet was defined as `10.1.50.0/22`, which is not a valid `/22` network boundary. It was corrected to `10.1.52.0/22`, and the building allocation example and AP DHCP scope were updated to match.
- The IoT subnet overlapped with the AP management plan because of the original invalid AP management block. After correcting AP management to `10.1.52.0/22`, the existing `10.1.50.0/23` IoT subnet no longer conflicts.
- The Python example failed at runtime because `ipaddress.IPv4Network("10.1.50.0/22")` raises `ValueError` when host bits are set. The example was updated to use a valid network and to split the `/22` into `/24` building blocks that match the prose.
- The ISC DHCP option 43 example was adjusted to match Cisco's documented ISC style more closely by using an option space with sub-option 241 defined as `array of ip-address`.
- The CAPWAP row was clarified to note that the tunnel uses the AP and controller management-side IPs rather than a standalone client subnet.

## Review Notes
- The post is now technically consistent for a Cisco controller-based design, but DHCP option 43 remains vendor-specific and AP model/VCI matching may be needed in mixed-client DHCP scopes.
- Cisco WLC deployments can discover controllers through methods other than DHCP option 43, including DNS and broadcast/unicast discovery, so the example should be read as one common design pattern rather than the only discovery method.
