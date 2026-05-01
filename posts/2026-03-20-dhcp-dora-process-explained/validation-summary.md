# Validation Summary: How to Understand the DHCP DORA Process (Discover, Offer, Request, Acknowledge)

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- DHCP
- IPv4 networking
- UDP ports 67/68
- Wireshark
- `tcpdump`
- ISC `dhclient`

## Sources Consulted
- RFC 2131, Dynamic Host Configuration Protocol: https://www.rfc-editor.org/rfc/rfc2131
- Wireshark User's Guide: https://www.wireshark.org/docs/wsug_html/
- Wireshark Display Filter Reference, DHCP: https://www.wireshark.org/docs/dfref/d/dhcp.html
- ISC DHCP 4.4 manual page for `dhclient`: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhclient
- Local `tcpdump --help` output from `tcpdump` 4.99.4

## Issues Found
- The Wireshark display filter used `bootp`, which Wireshark documents as a deprecated alias since Wireshark 3.0. I changed it to `dhcp`, which is the current protocol filter name.
- The renewal section stated T1 and T2 as fixed 50% and 87.5% lease points. RFC 2131 defines those as default values and allows the server to configure them, so I changed the wording and timeline to mark them as defaults.
- The key takeaways incorrectly said all DHCP messages are broadcast and implied T2 was part of a unicast renewal path. RFC 2131 says the initial DHCPDISCOVER and selecting-state DHCPREQUEST are typically broadcast, DHCPOFFER and DHCPACK may be broadcast or unicast, T1 renewal uses unicast, and T2 rebinding uses broadcast. I corrected that summary.
- The `dhclient` example was written as a generic Linux command. I narrowed the wording to ISC `dhclient`, because that specific CLI is not present on every Linux distribution even though the syntax itself is valid.

## Review Notes
- The `tcpdump` commands are syntactically valid. The capture filter is broad but appropriate for DHCP traffic because DHCP uses UDP ports 67 and 68.
- I verified the `dhclient -v eth0` syntax against ISC's official `dhclient` manual page, but `dhclient` is not installed in this local environment, so the command was not executed here.
