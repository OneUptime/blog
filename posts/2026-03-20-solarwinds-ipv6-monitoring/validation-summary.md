# Validation Summary: How to Configure SolarWinds for IPv6 Monitoring

## Status
validated

## Post Type
Technical guide / Tutorial

## Technologies Covered
- SolarWinds Network Performance Monitor (NPM)
- SolarWinds Platform / Orion
- SolarWinds Network Configuration Manager (NCM)
- SolarWinds NetPath and Intelligent Maps
- IPv6 addressing and DNS AAAA records
- SNMP v2c/v3 and IP-MIB custom pollers
- SolarWinds Information Service (SWIS), SWQL, and SwisPowerShell

## Sources Consulted
- SolarWinds Platform 2026.1 system requirements — https://documentation.solarwinds.com/en/success_center/orionplatform/content/system_requirements/solarwinds_platform_2026-1_system_requirements.htm
- SolarWinds NPM 2026.1 system requirements — https://documentation.solarwinds.com/en/success_center/npm/content/system_requirements/npm_2026-1_system_requirements.htm
- SolarWinds NPM release history — https://documentation.solarwinds.com/en/success_center/npm/content/release_notes/release_history.htm
- SolarWinds NPM network discovery documentation — https://documentation.solarwinds.com/en/success_center/npm/content/onboarding/discover/npm-qs-discover-your-network.htm
- SolarWinds NetPath create-service and requirements documentation — https://documentation.solarwinds.com/en/success_center/npm/content/npm-create-a-service.htm and https://documentation.solarwinds.com/en/success_center/npm/content/npm-netpath-requirements.htm
- SolarWinds Orion SDK PowerShell documentation — https://solarwinds.github.io/OrionSDK/ and https://github.com/solarwinds/OrionSDK/wiki/PowerShell
- SolarWinds Orion SDK schema documentation for `Orion.Nodes` and `Orion.NPM.Interfaces` — https://solarwinds.github.io/OrionSDK/schema/Orion.Nodes.html and https://solarwinds.github.io/OrionSDK/schema/Orion.NPM.Interfaces.html
- SolarWinds NPM release notes for Network Atlas deprecation — https://documentation.solarwinds.com/en/success_center/npm/content/release_notes/npm_2026-1-1_release_notes.htm
- RFC 3849, IPv6 Address Prefix Reserved for Documentation — https://www.rfc-editor.org/info/rfc3849
- RFC 4293, Management Information Base for the Internet Protocol (IP) — https://www.rfc-editor.org/rfc/rfc4293

## Issues Found
- **Unsupported/outdated version prerequisite**: The post required "SolarWinds NPM 12.x or later." SolarWinds release history shows NPM 12.x is end-of-life, and current NPM runs on current SolarWinds Platform releases. Changed this to require a supported NPM/SolarWinds Platform release with IPv6 support.
- **Nonexistent IPv6 polling setting**: The post told readers to enable "IPv6 Polling" under Polling Settings. Current SolarWinds Platform documentation lists IPv6 support as a platform capability, not as that explicit NPM setting. Replaced it with reachability and DNS verification steps.
- **Invalid IPv6 examples**: Examples such as `2001:db8::router1`, `2001:db8:network::/48`, `2001:db8::device`, and `2001:db8::destination` were not valid IPv6 literals. Replaced them with valid RFC 3849 documentation-prefix addresses.
- **IPv6 CIDR discovery guidance**: The post suggested adding IPv6 subnets with CIDR notation. SolarWinds Platform documentation states CIDR notation is not supported for IPv6 addresses, and NPM discovery documentation recommends limiting scans. Changed the discovery guidance to targeted IPv6 addresses or hostnames.
- **Interface counter naming**: The post described `InOctets/OutOctets` as 64-bit counters. Corrected this to `ifHCInOctets/ifHCOutOctets` when 64-bit counters are available.
- **Incorrect IP-MIB OID for IPv6 outbound packets**: The post listed `1.3.6.1.2.1.4.31.1.1.4.2` as outbound IPv6 packets, but RFC 4293 defines it as `ipSystemStatsHCInReceives` for the IPv6 row. Changed the custom pollers to high-capacity inbound and outbound transmit OIDs: `...4.2` and `...31.2`.
- **NetPath protocol claim**: The post said NetPath supports TCP or UDP. SolarWinds NetPath service documentation requires TCP-based services. Changed the example to a target address, port, and TCP protocol only.
- **Deprecated mapping tool reference**: The post referenced Network Atlas for new maps. SolarWinds documents Network Atlas as deprecated and recommends Intelligent Maps. Updated the map reference to Intelligent Maps.
- **SWQL query fields**: The API example filtered IPv6 nodes with string prefix matching and selected non-schema interface properties `InBitsPerSec` / `OutBitsPerSec`. The current Orion SDK schema provides `IPAddressType`, `Inbps`, and `Outbps`. Updated the queries accordingly and added `Import-Module SwisPowerShell`.

## Review Notes
- The post is technically relevant and contains implementation details, so it was reviewed as a technical guide.
- The SNMP v2c examples are syntactically valid but should be treated as examples only; SNMPv3 is preferable for production because SNMP v1/v2c community strings are not encrypted.
- NetPath can accept a host name or IP address and port for a TCP-based service. For production IPv6 targets, using a DNS name with an AAAA record is often easier to maintain than hard-coding an address.
