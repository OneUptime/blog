# Validation Summary: How to Test Multicast Connectivity with iperf

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- iperf2
- iperf3
- UDP multicast
- Linux networking
- socat
- tcpdump and pcap filters

## Sources Consulted
- iperf2 official man page: https://iperf2.sourceforge.io/iperf-manpage.html
- ESnet iperf3 documentation: https://software.es.net/iperf/
- ESnet iperf3 invocation manual: https://software.es.net/iperf/invoking.html
- ESnet throughput tool comparison: https://fasterdata.es.net/performance-testing/network-troubleshooting-tools/throughput-tool-comparision/
- RFC 1112, Host Extensions for IP Multicasting: https://www.rfc-editor.org/rfc/rfc1112.html
- socat man page: https://man.freebsd.org/socat
- pcap-filter manual syntax used by tcpdump: https://www.wireshark.org/docs/man-pages/pcap-filter.html

## Issues Found
- The description implied that both iperf and iperf3 can be used for multicast UDP connectivity testing. Updated it to identify iperf2 as the multicast test tool, consistent with the iperf2 man page and ESnet's feature comparison.
- The prerequisites stated that all hosts must be on a network where multicast routing is enabled. Updated this to clarify that same-Layer-2 tests do not require multicast routing, while routing is required between subnets.
- The result interpretation text was too absolute about loss and delivery. Updated it to say zero loss confirms delivery for the reporting receiver, and broadened loss causes to include congestion, forwarding, and host or network buffering.

## Review Notes
The main iperf2, socat, and tcpdump command syntax is valid. End-to-end packet delivery was not executed in this workspace because iperf, iperf3, and socat are not installed and multicast testing requires a suitable multi-host network. For private lab examples, an administratively scoped multicast address from 239.0.0.0/8 would be preferable to 224.1.1.1, although 224.1.1.1 is still a valid IPv4 multicast address.
