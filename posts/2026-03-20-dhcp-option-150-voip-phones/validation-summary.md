# Validation Summary: How to Understand DHCP Option 150 for VoIP Phones

## Status
validated

## Post Type
Guide

## Technologies Covered
- DHCPv4
- DHCP option 66
- DHCP option 150
- ISC DHCP (`dhcpd`)
- `dnsmasq`
- `tcpdump`
- `tshark`
- Cisco VoIP phone provisioning
- TFTP

## Sources Consulted
- RFC 5859, TFTP Server Address Option for DHCPv4: https://www.rfc-editor.org/rfc/rfc5859
- RFC 2132, DHCP Options and BOOTP Vendor Extensions: https://www.rfc-editor.org/rfc/rfc2132
- ISC DHCP 4.4 Manual Pages, `dhcpd.conf`: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- ISC DHCP 4.1 Manual Pages, `dhcp-options`: https://kb.isc.org/docs/isc-dhcp-41-manual-pages-dhcp-options
- ISC KB, Standard DHCP Options Defined in ISC DHCP and Kea: https://kb.isc.org/docs/standard-dhcp-options
- `dnsmasq` documentation and local man/help output: https://dnsmasq.org/doc.html
- Wireshark Display Filter Reference for DHCP fields: https://www.wireshark.org/docs/dfref/d/dhcp.html
- Cisco IP Phone 7800 Series Administration Guide for Cisco Unified Communications Manager: https://www.cisco.com/c/en/us/td/docs/voice_ip_comm/cuipph/7800-series/english/admin-guide/pa2d_b_7800-series-admin-guide-cucm/pa2d_b_7800-series-admin-guide-cucm_chapter_010.html
- Cisco ATA 186 and Cisco ATA 188 Analog Telephone Adaptor Administrator's Guide for SCCP (version 3.0): https://www.cisco.com/c/en/us/td/docs/voice_ip_comm/cata/186_188/3_0/english/administration/guide/sccp/sccp3_0.pdf
- Cisco IP Phone Security for Multiplatform Phones: https://www.cisco.com/c/en/us/td/docs/voice_ip_comm/cuipph/MPP/common/ag_desk_mpp_6800_7800_8800/tpcc_b_cisco-ip-desk-phone-multiplatform/tpcc_m_cisco-ip-phone-security.pdf

## Issues Found
- The post described option 150 as only a Cisco-proprietary option. I corrected this to reflect RFC 5859, which documents DHCP option 150 as the TFTP Server Address option and allows one or more IPv4 addresses.
- The ISC `dhcpd` example defined option 150 as a single `ip-address`. I changed it to `array of ip-address` to match the option format defined in RFC 5859 while preserving the single-address example value.
- The second `dhcpd` example would have restricted leases to members of the `cisco-phone` class because of `allow members of "cisco-phone";`. I removed that line so the example only scopes option 150/66 to class members instead of blocking non-Cisco clients.
- The second `dhcpd` example used `tftp-server-address` without defining the custom option in that snippet. I added the option definition so the example is self-contained.
- The `dnsmasq` example used the wrong selector syntax (`dhcp-option=<interface>,...`). I changed it to use `tag:<interface>` and named options, which matches `dnsmasq`'s documented syntax.
- The `dnsmasq` option 66 example sent `10.0.0.100` unquoted. I quoted it so option 66 is encoded as a string, which is what RFC 2132 defines and what `dnsmasq` requires for literal IP text in option 66.
- The post stated that Cisco phones check option 150, then option 66, then `siaddr`. I replaced this with an RFC-based statement that option 150 should be preferred over option 66 when both are present, and noted that `siaddr` fallback behavior is device-specific.
- The `tshark` example used old `bootp.*` field names. I updated it to current `dhcp.*` field names per Wireshark documentation.
- The `tcpdump | grep DHCPACK` example was brittle and not reliable across `tcpdump` output formats. I replaced it with a direct verbose capture command that will actually show the DHCP options for inspection.

## Review Notes
- `dnsmasq` syntax was additionally checked locally with `dnsmasq --test`; the corrected snippet parses successfully.
- `tcpdump` is installed locally and its flags were checked against `tcpdump --help`.
- `tshark` and `dhcpd` were not installed in the local environment, so those parts were validated against upstream documentation rather than local execution.
- Cisco device fallback behavior is not uniform across product lines; some Cisco documentation shows option 150 preference, while other Cisco phones expose configurable DHCP option order. The revised wording keeps the post accurate across models.
