# Validation Summary: How to Reserve IPv4 Addresses for Network Infrastructure Devices

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- IPv4 addressing and subnet planning
- DHCP reservations with ISC DHCP and dnsmasq
- Cisco IOS / IOS XE switch and access point management configuration
- Router loopback addressing
- NetBox IPAM REST API
- Python with `requests`

## Sources Consulted
- RFC 2131: Dynamic Host Configuration Protocol — https://www.rfc-editor.org/rfc/rfc2131
- RFC 2132: DHCP Options and BOOTP Vendor Extensions — https://www.rfc-editor.org/rfc/rfc2132
- ISC DHCP `dhcpd.conf` manual — https://kb.isc.org/docs/isc-dhcp-41-manual-pages-dhcpdconf
- ISC DHCP End of Life Dates — https://kb.isc.org/docs/isc-dhcp-eol-dates
- dnsmasq man page — https://dnsmasq.org/docs/dnsmasq-man.html
- Cisco IOS XE 17.x IP Routing Configuration Guide: Basic IP Routing — https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_iri-iprouting.html
- Cisco Catalyst 9100 Series Access Point Command Reference: `capwap ap ip` — https://www.cisco.com/c/en/us/td/docs/wireless/access_point/ios-xe/command-reference/b-cisco-cat-ap-iosxe-cr/capwap_commands.html
- Cisco: Reset the CAPWAP Configuration on IOS and ClickOS APs — https://www.cisco.com/c/en/us/support/docs/wireless/aironet-1200-series/99763-reset-lwappconfig-lap.html
- NetBox REST API documentation — https://netbox.readthedocs.io/en/stable/integrations/rest-api/
- NetBox IPAddress model documentation — https://netbox.readthedocs.io/en/stable/models/ipam/ipaddress/

## Issues Found
- The post assigned `192.168.1.10` to both the primary DNS server and the example wireless AP. I changed the AP reservation examples and AP static configuration example to `192.168.1.6` so the addressing plan is conflict-free.
- The switch example used `ip default-gateway` while the addressing table labeled the switch as a Layer 3 device. Cisco documents `ip default-gateway` for devices acting as hosts with IP routing disabled, so I corrected the wording to a management SVI / IP-routing-disabled context.
- The Cisco wireless AP example used generic `ip address`, `ip default-gateway`, and `ip name-server` lines, which are not the current documented CAPWAP AP CLI syntax. I replaced that snippet with the documented `capwap ap ip ...` command.
- The ISC DHCP examples were presented without noting that ISC DHCP is end-of-life. I marked those examples as legacy so the post does not imply ISC DHCP is a currently maintained DHCP server.

## Review Notes
- The ISC DHCP syntax shown remains valid for legacy deployments, but ISC ended public maintenance for the server at the end of 2022.
- The corrected Cisco AP example matches current CAPWAP AP console syntax on IOS XE. Autonomous Cisco APs use different interface-based commands, so readers should adapt the example to their AP mode and software family.
- The NetBox example is syntactically valid against current REST API documentation. It creates IP address objects successfully, although it documents device/interface names via the `description` field rather than attaching the IP to an interface with `assigned_object_type` and `assigned_object_id`.
