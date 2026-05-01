# Validation Summary: How to Understand DHCPv6 Privacy Considerations

## Status
validated

## Post Type
Guide

## Technologies Covered
- DHCPv6
- IPv6
- DUIDs
- ISC `dhclient`
- NetworkManager / `nmcli`
- RFC 7844 anonymity profiles

## Sources Consulted
- RFC 7844: Anonymity Profiles for DHCP Clients — https://www.rfc-editor.org/rfc/rfc7844
- RFC 7824: Privacy Considerations for DHCPv6 — https://www.rfc-editor.org/rfc/rfc7824
- RFC 8415: Dynamic Host Configuration Protocol for IPv6 (DHCPv6) — https://www.rfc-editor.org/rfc/rfc8415
- RFC 4704: The Dynamic Host Configuration Protocol for IPv6 (DHCPv6) Client Fully Qualified Domain Name (FQDN) Option — https://www.rfc-editor.org/rfc/rfc4704
- NetworkManager `nm-settings-nmcli` reference — https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- NetworkManager connection settings reference — https://networkmanager.dev/docs/api/latest/settings-connection.html
- ISC DHCP 4.4 `dhclient` manual page — https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhclient
- ISC DHCP 4.4 `dhclient.conf` manual page — https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhclientconf
- ISC DHCP 4.4 `dhcp-options` manual page — https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcp-options

## Issues Found
- The post said DHCPv6 clients expose DUIDs in every message and framed the privacy concern too broadly. I corrected this to "most" messages and aligned the overview with RFC 7844 and RFC 7824, because stateless Information-request can omit the Client Identifier.
- The RFC 7844 guidance was inaccurate. I replaced the incorrect "random DUID-UUID per network" and "use Rapid Commit for privacy" claims with the RFC's actual DHCPv6 anonymity guidance: DUID-LL with randomized MACs, randomized DUID-LLT on link changes without MAC randomization, omission of the Client Identifier in stateless Information-request, suppression of Client FQDN/User Class/Vendor Class, and reduced ORO fingerprinting.
- The Linux `dhclient` example claimed you can set a random per-connection DUID with a static `dhclient.conf` snippet. I replaced it with documented ISC `dhclient` behavior and supported flags (`-S`, `-D LL`, `-D LLT`), because the original example overstated what the client officially supports.
- The NetworkManager example used incorrect values such as `ipv6.dhcp-iaid "stable-privacy"` and `dhcp-duid=stable-privacy`, and it described `ipv6.dhcp-duid "ll"` as a temporary random DUID. I corrected this to documented NetworkManager settings: per-network Wi-Fi MAC randomization with `stable-ssid`, DHCPv6 DUID derived from the current link-layer address with `ipv6.dhcp-duid=ll`, and hostname suppression with `ipv6.dhcp-send-hostname`.
- The mitigation text implied shorter DHCPv6 lease times are a primary privacy fix. I clarified that temporary privacy addresses help only when SLAAC is also present, and shorter lease times do not remove DUID-based tracking.
- The ISP logging section made an unsupported legal claim about GDPR and said the record is permanent. I changed this to a technical statement about long-lived DHCPv6 logging and removed the legal conclusion.

## Review Notes
- NetworkManager's DHCPv6 behavior varies somewhat by DHCP plugin. The post now keeps the example to properties that are clearly documented in current NetworkManager references.
- No structural or stylistic changes were made beyond what was needed to correct the technical content.
