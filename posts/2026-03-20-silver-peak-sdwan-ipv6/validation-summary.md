# Validation Summary: How to Configure Silver Peak SD-WAN with IPv6

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- HPE Aruba Networking EdgeConnect SD-WAN
- Silver Peak SD-WAN / EdgeConnect Orchestrator
- IPv6 addressing, Router Advertisements, DHCPv6, and SLAAC
- Business Intent Overlays and WAN link bonding policies
- EdgeConnect CLI
- EdgeConnect REST APIs
- Python `requests`, `tarfile`, and `csv`

## Sources Consulted
- HPE Aruba Networking EdgeConnect SD-WAN Documentation - Home: https://arubanetworking.hpe.com/techdocs/sdwan/
- HPE Aruba Networking SD-WAN Orchestrator - Deployment Tab: https://arubanetworking.hpe.com/techdocs/sdwan/docs/orch/configuration/network/deployment/
- HPE Aruba Networking SD-WAN Orchestrator - Business Intent Overlays: https://arubanetworking.hpe.com/techdocs/sdwan/docs/orch/configuration/overlays/bios/
- HPE Aruba Networking SD-WAN Orchestrator - Tunnels Tab: https://arubanetworking.hpe.com/techdocs/sdwan/docs/orch/configuration/network/tunnels/
- HPE Aruba Networking EdgeConnect SD-WAN Edge Platform CLI Reference: https://www.arubanetworks.com/techdocs/sdwan-PDFs/cli-ref/CLI-Reference_latest.pdf
- HPE Aruba Networking EdgeConnect Developer Docs - Making API Requests: https://developer.arubanetworks.com/edgeconnect/docs/making-api-requests
- HPE Aruba Networking EdgeConnect Developer Docs - Authentication: https://developer.arubanetworks.com/edgeconnect/docs/authentication
- HPE Aruba Networking EdgeConnect API Reference - Appliance login: https://developer.arubanetworks.com/edgeconnect/reference/login280187
- HPE Aruba Networking EdgeConnect API Reference - Flow API: https://developer.arubanetworks.com/edgeconnect/reference/flows263831
- HPE Aruba Networking EdgeConnect API Reference - Minute statistics range: https://developer.arubanetworks.com/edgeconnect/reference/minuterange701455
- HPE Aruba Networking EdgeConnect API Reference - Minute statistics file: https://developer.arubanetworks.com/edgeconnect/reference/minutestatsfile244581
- RFC 3849 - IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/info/rfc3849
- RFC 4291 - IP Version 6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291

## Issues Found
- **Invalid IPv6 literals**: The examples used non-hex labels inside IPv6 addresses, such as `2001:db8:site-a::1`, `2001:db8:wan::gateway`, and `2001:db8::edgeconnect`. Replaced them with valid RFC 3849 documentation-prefix addresses such as `2001:db8:100::1/64` and `2001:db8:200::1`.
- **Unsupported EdgeConnect DHCPv6 server configuration**: The post described enabling an IPv6 DHCPv6 server and pool on the LAN interface. Current EdgeConnect Orchestrator documentation states that DHCP for IPv6 is not supported on the LAN-side V6 settings. Replaced this with Router Advertisement settings, including prefix, autonomous, on-link, managed, and other flags.
- **Incorrect Orchestrator navigation**: The post used `Configuration > Appliances > [Appliance Name] > Deployment`. Updated it to the documented `Configuration > Networking > Deployment` workflow.
- **Incorrect CLI commands**: Replaced undocumented commands such as `show interfaces ipv6`, `configure interface ... ipv6 address`, `configure ipv6 route`, `show ip route ipv6`, `show tunnels`, and `ping6 source-interface` with documented EdgeConnect CLI forms such as `show interfaces`, `interface ... ip-address`, `ip default-gateway`, `show ip route`, `show tunnel`, and `ping -I`.
- **Inaccurate Business Intent Overlay terminology**: Replaced `Match: IPv6`, `Path Quality`, `Highest Bandwidth`, and `Load Balance` wording with the documented ACL match flow, Service Level Objective (SLO), WAN Links, and Link Bonding Policy terminology.
- **Incorrect tunnel description and commands**: Removed the unsupported statement that Silver Peak directly creates `IPv6-in-IPv4` or `IPv6-in-IPv6` tunnels in this workflow. Updated the section to describe EdgeConnect overlay tunnels built from WAN labels and policy, IPSec over UDP as the modern default mode, documented tunnel show commands, and the documented default UDP tunnel port 4163.
- **Incorrect REST API example**: The original Python code used unverified Orchestrator endpoints such as `/gms/rest/flows/appliances/{appliance_id}` and `/gms/rest/stats/appliances/{appliance_id}/tunnels`, and did not handle CSRF tokens. Replaced it with documented appliance-level API calls for `/rest/json/login`, `/rest/json/flows`, `/rest/json/stats/minuteRange`, `/rest/json/stats/minuteStats/{file}`, and `/rest/json/logout`.
- **Incorrect QoS CLI commands**: Replaced undocumented `configure qos map-profile` and `show qos stats interface` commands with the documented `qos-map` configuration and `show qos-map` / `show tunnel ... stats qos` verification commands.
- **Incorrect final deployment summary**: The original conclusion said IPv6 deployment centers on DHCPv6 for client addressing. Updated it to Router Advertisements for client addressing, consistent with the Orchestrator documentation.

## Review Notes
- The post is technically relevant and implementation-focused, so it was reviewed as a code/configuration guide.
- The embedded Python API example was syntax-checked with `python3 -m py_compile`.
- Some EdgeConnect API response shapes vary by ECOS/Orchestrator release, so the updated Python example filters IPv6 records defensively rather than assuming a single response schema.
