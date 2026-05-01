# Validation Summary: How to Detect Rogue DHCP Servers on Your Network

## Status
validated

## Post Type
Guide

## Technologies Covered
- DHCP / BOOTP
- Nmap NSE (`broadcast-dhcp-discover`)
- `dhcp_probe`
- `tcpdump` and libpcap capture filters
- `tshark` / Wireshark display filters
- ISC DHCP client (`dhclient`)
- `journalctl`
- Python `subprocess`

## Sources Consulted
- Nmap NSE documentation for `broadcast-dhcp-discover`: https://nmap.org/nsedoc/scripts/broadcast-dhcp-discover.html
- Nmap reference guide for `-e` interface selection: https://nmap.org/man/man-bypass-firewalls-ids.html
- `dhcp_probe` upstream project page: https://www.net.princeton.edu/software/dhcp_probe/
- `dhcp_probe(8)` upstream manual: https://www.net.princeton.edu/software/dhcp_probe/dhcp_probe.8.html
- `dhcp_probe.cf(5)` upstream manual: https://www.net.princeton.edu/software/dhcp_probe/dhcp_probe.cf.5.html
- TShark manual: https://www.wireshark.org/docs/man-pages/tshark.html
- Wireshark Display Filter Reference for DHCP fields: https://www.wireshark.org/docs/dfref/d/dhcp.html
- ISC DHCP `dhclient` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhclient
- ISC DHCP `dhcp-options` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcp-options
- RFC 2131: Dynamic Host Configuration Protocol: https://www.rfc-editor.org/rfc/rfc2131
- RFC 2132: DHCP Options and BOOTP Vendor Extensions: https://www.rfc-editor.org/rfc/rfc2132
- Cisco DHCP snooping guidance: https://www.cisco.com/c/en/us/support/docs/ip/dynamic-host-configuration-protocol-dhcp-dhcpv6/217055-operate-and-troubleshoot-dhcp-snooping.html
- Local man pages consulted: `tcpdump(8)`, `pcap-filter(7)`, and `journalctl(1)`

## Issues Found
- The post used `/etc/dhcp-probe.cf`, but upstream `dhcp_probe` documents `/etc/dhcp_probe.cf`. I corrected the config path and the example `-c` argument.
- The `dhcp-probe` configuration comments did not match the documented config syntax. I updated them to use the actual `legal_server` statement expected by `dhcp_probe.cf(5)`.
- The `tshark` example used stale/incorrect `bootp.*` field names for current Wireshark/TShark releases. I replaced them with the documented `dhcp.option.dhcp`, `dhcp.ip.your`, and `dhcp.option.dhcp_server_id` fields.
- The `tcpdump` example relied on grepping for `DHCP Offer`, which is not a stable documented output token. I changed it to a packet filter that directly captures DHCP replies from servers.
- The log-analysis section pointed at `isc-dhcp-server` service logs, which do not identify rogue responders on the client segment as written. I changed this to client-side journal inspection and a one-shot verbose `dhclient -1 -v` example that surfaces responding servers.
- The Nmap section said the host should currently have no DHCP lease. The script documentation does not require that; I changed the note to the actual requirement that the scan run on the local broadcast domain being tested.
- The takeaway describing DHCP snooping as the "definitive" prevention mechanism was too absolute. I softened it to "standard prevention mechanism" to match vendor documentation more closely.

## Review Notes
- `dhcp_probe` only detects DHCP/BOOTP servers on the directly attached broadcast domain; DHCP broadcasts do not normally cross routers.
- Princeton's upstream `dhcp_probe` project states that development ended in June 2021. The tool is still packaged by some distributions, but it is older tooling.
- ISC DHCP is end-of-life. The `dhclient` example remains valid on systems that still ship ISC DHCP, but some Linux distributions now use other DHCP clients.
