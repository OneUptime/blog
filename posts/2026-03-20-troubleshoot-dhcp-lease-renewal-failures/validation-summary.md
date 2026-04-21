# Validation Summary: How to Troubleshoot DHCP Lease Renewal Failures

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- DHCPv4 lease renewal and rebinding
- ISC dhclient
- ISC dhcpd / isc-dhcp-server
- Linux networking commands
- tcpdump / pcap filters
- netcat
- systemd journalctl

## Sources Consulted
- RFC 2131: Dynamic Host Configuration Protocol: https://www.rfc-editor.org/rfc/rfc2131
- RFC 2132: DHCP Options and BOOTP Vendor Extensions: https://www.rfc-editor.org/rfc/rfc2132
- ISC DHCP 4.4 dhclient manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhclient
- ISC DHCP 4.4 dhclient.conf manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhclientconf
- ISC DHCP 4.4 dhclient.leases manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhclientleases
- ISC DHCP 4.4 dhcp-options manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcp-options
- pcap-filter manual: https://www.wireshark.org/docs/man-pages/pcap-filter.html
- OpenBSD nc(1) manual: https://man.openbsd.org/nc.1
- Local command help output for tcpdump 4.99.4, iproute2 `ip route help`, systemd `journalctl --help`, and OpenBSD netcat help.

## Issues Found
- The timeline presented T1 at 50% and T2 at 87.5% as absolute values. Updated the post to clarify these are defaults and can be overridden by DHCP options 58 and 59.
- The post implied the client simply waits from a failed T1 attempt until T2. Updated the explanation to say the client keeps retrying until T2, then enters rebinding.
- The client-side section was labeled broadly as Linux while the commands are specific to ISC dhclient. Updated the heading and command comment to make that scope explicit.
- The server-side packet notes said renewal DHCPREQUEST packets include option 50 and option 54. RFC 2131 says RENEWING and REBINDING DHCPREQUEST packets must not include requested IP address or server identifier; they use `ciaddr`. Updated the packet notes.
- The UDP `nc` example suggested it directly tests DHCP service reachability. Updated the wording to explain it is only a packet-path probe and must be confirmed with packet captures or server logs.
- The sample DHCPNAK log line used an IP address as the `to` target. Updated it to match common ISC dhcpd log format with a client hardware address and an accompanying wrong-network DHCPREQUEST line.
- The key takeaways repeated the absolute timer wording and overstated `dhclient -v` as showing a complete exchange. Updated those lines to match RFC behavior and the ISC dhclient manual.

## Review Notes
- ISC DHCP is end-of-life upstream, but the post is still technically useful for environments that run ISC dhclient or isc-dhcp-server packages.
- The `dhclient` binary was not installed in the local review environment, so its command syntax was verified against ISC's official manual instead of by local execution.
