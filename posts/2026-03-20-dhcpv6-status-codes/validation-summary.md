# Validation Summary: How to Understand DHCPv6 Status Codes

## Status
validated

## Post Type
Reference guide

## Technologies Covered
- DHCPv6
- IPv6
- `tcpdump`
- `tshark` / Wireshark
- ISC Kea DHCPv6
- `curl`
- `jq`

## Sources Consulted
- RFC 9915, Dynamic Host Configuration Protocol for IPv6 (DHCPv6): https://www.rfc-editor.org/rfc/rfc9915.html
- RFC 8415, Dynamic Host Configuration Protocol for IPv6 (DHCPv6): https://www.rfc-editor.org/rfc/rfc8415.html
- IANA DHCPv6 Parameters Registry: https://www.iana.org/assignments/dhcpv6-parameters/dhcpv6-parameters.xhtml
- Wireshark Display Filter Reference for DHCPv6: https://www.wireshark.org/docs/dfref/d/dhcpv6.html
- Kea Management API: https://kea.readthedocs.io/en/latest/arm/ctrl-channel.html
- Kea API Reference: https://kea.readthedocs.io/en/latest/api.html
- `pcap-filter` manual: https://www.wireshark.org/docs/man-pages/pcap-filter.html

## Issues Found
- The post treated DHCPv6 status codes as Reply-only and IA-only. I updated the overview and message-location sections because RFC 8415/RFC 9915 allow the Status Code option at the message level and also nested inside other options.
- The status-code table incorrectly said codes `7–65535` were reserved or vendor-defined. I corrected it to reflect the current IANA registry: codes `7–23` already have IANA assignments, code `5` is obsolete in RFC 9915, and `24–65535` are currently unassigned.
- The metadata referenced `RFC 8415` as the governing spec. I updated it to `RFC 9915`, which obsoleted RFC 8415 in January 2026.
- The `tcpdump` example used `ip6[40] == 7`, which does not point to the DHCPv6 message type. I replaced it with a safe DHCPv6 port-based capture and corrected the explanation.
- The `tshark` example used the wrong field name (`dhcpv6.status_message`). I changed it to the documented Wireshark field `dhcpv6.status_msg`, and I added `dhcpv6.msgtype` so the extracted output identifies the packet type.
- The Kea HTTP examples used older Control Agent-style `service` routing and omitted the JSON content-type header. I updated the `curl` examples to match the current Kea management API and clarified what the commands are actually inspecting.
- The `NoBinding`, `NotOnLink`, and forced-exhaustion sections overstated behavior. I removed the distro-specific `dhclient` recovery command, corrected `NotOnLink` to cover both addresses and prefixes, and clarified that exhaustion can surface in an Advertise or a Reply depending on the exchange.

## Review Notes
- `UseMulticast` and the related server-unicast behavior are obsolete in RFC 9915, but readers may still encounter them in legacy RFC 8415-era implementations.
- The Kea examples assume an HTTP control interface is enabled on `http://localhost:8000/`; deployments using UNIX control sockets or a different port will need equivalent commands for their environment.
