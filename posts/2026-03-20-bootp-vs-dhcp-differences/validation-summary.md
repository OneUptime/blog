# Validation Summary: How to Understand BOOTP vs DHCP Differences

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- BOOTP
- DHCP
- BOOTP relay agents / DHCP relay behavior
- ISC DHCP (`dhcpd`)
- UDP ports 67 and 68
- Packet capture filters

## Sources Consulted
- RFC 951, Bootstrap Protocol: https://www.rfc-editor.org/rfc/rfc951
- RFC 1542, Clarifications and Extensions for the Bootstrap Protocol: https://www.rfc-editor.org/rfc/rfc1542
- RFC 2131, Dynamic Host Configuration Protocol: https://www.rfc-editor.org/rfc/rfc2131
- RFC 1533, DHCP Options and BOOTP Vendor Extensions: https://www.rfc-editor.org/rfc/rfc1533
- RFC 2132, DHCP Options and BOOTP Vendor Extensions: https://www.rfc-editor.org/rfc/rfc2132
- ISC DHCP 4.4 `dhcpd` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpd
- ISC DHCP 4.4 `dhcpd.conf` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf

## Issues Found
- The BOOTP column described the lease concept as "Permanent." BOOTP itself does not define DHCP-style lease and renewal behavior, so I changed this to "No standard lease/renewal mechanism."
- The BOOTP option-support row said "Limited (8 fixed fields)," which was inaccurate. BOOTP has a 64-byte `vend` field for vendor-specific extensions, so I corrected that row to describe BOOTP and DHCP option handling accurately.
- The packet-format diagram labeled the shared field as `flags` and the final area as DHCP `options`, which blurred BOOTP and DHCP specifics. I corrected the diagram to `flags/unused` and `vend (64 in BOOTP) / options (variable in DHCP)`.
- The post said the `0x63825363` magic cookie signals DHCP format and distinguishes DHCP from plain BOOTP packets. RFC 1533 and RFC 1542 show that the cookie is part of BOOTP vendor-extension handling as well; DHCP messages are identified by the DHCP message type option, so I corrected both the explanation and the takeaway.
- The relay section attributed DHCP relay behavior mainly to shared packet format. RFC 2131 is more precise: DHCP reuses BOOTP relay-agent behavior, so I updated the wording accordingly.
- The ISC `dhcpd` note implied that BOOTP handling depends on `allow bootp` being present in a subnet declaration. ISC's `dhcpd.conf` manual states that `allow bootp;` controls BOOTP replies and that BOOTP queries are allowed by default, so I corrected that statement.

## Review Notes
- Local checks: `tcpdump -d 'port 67 or port 68'` was used to confirm the capture filter compiles; `validation.json` was validated with `jq`.
- No live BOOTP or DHCP server/client exchange was available in this workspace, so protocol behavior was validated against the RFCs and ISC's official documentation rather than end-to-end packet captures.
- ISC DHCP 4.4 documentation is still authoritative for `dhcpd`, but ISC marks that software line as EOL and recommends migration to Kea for current deployments.
