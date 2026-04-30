# Validation Summary: How to Configure IPv6 on Cisco Meraki Wi-Fi

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco Meraki MX security appliances
- Cisco Meraki MR access points
- IPv6
- SLAAC
- DHCPv6 and DHCPv6-PD
- Meraki Dashboard API v1
- Python `requests`

## Sources Consulted
- Cisco Meraki Documentation: IPv6 Support on MX Security & SD-WAN Platforms - WAN — https://documentation.meraki.com/SASE_and_SD-WAN/MX/Design_and_Configure/Configuration_Guides/Networks_and_Routing/IPv6_Support_on_MX_Security_SDWAN_Platforms_WAN
- Cisco Meraki Documentation: IPv6 Support on MX Security & SD-WAN Platforms - LAN — https://documentation.meraki.com/SASE_and_SD-WAN/MX/Design_and_Configure/Configuration_Guides/Networks_and_Routing/IPv6_Support_on_MX_Security_SDWAN_Platforms_LAN
- Cisco Meraki Documentation: IPv6 Support on MX Security & SD-WAN Platforms - Security — https://documentation.meraki.com/SASE_and_SD-WAN/MX/Design_and_Configure/Configuration_Guides/Firewall_and_Traffic_Shaping/IPv6_Support_on_MX_Security_and_SDWAN_Platforms_Security
- Cisco Meraki Documentation: IPv6 Support on MR Access Points — https://documentation.meraki.com/MR/Product_Information/Compatibility_and_Firmware/IPv6_Support_on_MR_Access_Points
- Cisco Meraki Documentation: MR 28.X Firmware Release - Supported IPv6 Features — https://documentation.meraki.com/Wireless/Product_Information/Compatibility_and_Firmware/MR_28.X_Firmware_Release_-_Supported_IPv6_Features
- Cisco Meraki Documentation: Meraki Event Log — https://documentation.meraki.com/Platform_Management/Dashboard_Administration/Operate_and_Maintain/Monitoring_and_Reporting/Meraki_Event_Log
- Cisco Meraki Documentation: Clients List and Details Page Overview — https://documentation.meraki.com/Platform_Management/Dashboard_Administration/Operate_and_Maintain/Monitoring_and_Reporting/Clients_List_and_Details_Page_Overview
- Cisco Meraki Documentation: Clients Usage Page Overview — https://documentation.meraki.com/Platform_Management/Dashboard_Administration/Operate_and_Maintain/Monitoring_and_Reporting/Clients_Usage_Page_Overview
- Cisco Meraki Developer Hub: Authorization — https://developer.cisco.com/meraki/api-v1/authorization/
- Cisco Meraki Developer Hub: Pagination — https://developer.cisco.com/meraki/api-v1/pagination/
- Cisco Meraki Developer Hub: Get Network Clients — https://developer.cisco.com/meraki/api-v1/get-network-clients/

## Issues Found
- The post treated MX LAN IPv6 configuration as if it provided DHCPv6 stateless/stateful server modes. I corrected this to Meraki's documented MX behavior: IPv6-enabled VLANs generate router advertisements and clients use SLAAC, while DHCPv6-PD is used upstream for prefix delegation rather than LAN address assignment.
- The dashboard paths for MX and MR IPv6 settings were conflated. I separated MX VLAN configuration from MR Wireless IPv6 Bridging and updated the verification and troubleshooting paths to the documented Dashboard locations.
- The WAN section incorrectly described MX WAN IPv6 as being assigned "via prefix delegation." I corrected this to the documented WAN modes (DHCPv6-NA, SLAAC, PPPoE, and static) and clarified that DHCPv6-PD is used to obtain LAN prefixes, not the WAN interface address itself.
- The MR section overstated AP behavior and incorrectly said management was IPv4-only in most firmware versions. I corrected this to the documented MR 28.1+ IPv6 feature set, including IPv6 management/uplink support, Wireless IPv6 Bridging, the mandatory-DHCP caveat, RA/DHCP guard, and L2 isolation guidance.
- The firewall section implied specific default allow rules for DHCPv6 and DNS were required on MX. I replaced that with the documented MX default IPv6 firewall behavior: outbound allowed by default, return traffic stateful, and inbound denied unless explicitly allowed.
- The API example used the old v0 `X-Cisco-Meraki-API-Key` header and did not account for Meraki v1 redirect and pagination behavior. I updated it to use the documented bearer-token header, a `requests.Session` that preserves auth across redirects, API pagination via `Link` headers, and the current `ip6` and `ip6Local` client fields.
- The troubleshooting section referenced SSH access to the MX and older or incorrect tool paths. I updated it to use documented Dashboard live tools, route table, packet capture, and event-log paths.

## Review Notes
- MR IPv6 features beyond basic bridging are firmware-dependent. Meraki documents MR 28.1 as the minimum firmware for the broader MR IPv6 feature set.
- MX RDNSS support for advertising IPv6 DNS servers requires MX 18.205 or newer.
- The Clients page is not real-time; Meraki documents that client visibility updates can lag by a few minutes.
