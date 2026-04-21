# Validation Summary: How to Capture Traffic on a Specific VLAN with tcpdump

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Linux
- tcpdump
- libpcap/pcap-filter filter expressions
- IEEE 802.1Q VLANs
- Linux packet sockets and capabilities
- GNU timeout

## Sources Consulted
- tcpdump manual page, The Tcpdump Group: https://www.tcpdump.org/manpages/tcpdump.1.html
- pcap-filter manual page, The Tcpdump Group/libpcap: https://www.tcpdump.org/manpages/pcap-filter.7.html
- ip-link(8), Linux manual pages: https://man7.org/linux/man-pages/man8/ip-link.8.html
- capabilities(7), Linux manual pages: https://man7.org/linux/man-pages/man7/capabilities.7.html
- packet(7), Linux manual pages: https://man7.org/linux/man-pages/man7/packet.7.html
- GNU Coreutils timeout manual: https://www.gnu.org/software/coreutils/manual/html_node/timeout-invocation.html

## Issues Found
- The prerequisite listed only `cap_net_raw` as an alternative to root. Linux packet sockets require `CAP_NET_RAW`, and promiscuous-mode capture can also require `CAP_NET_ADMIN`, so the prerequisite was updated to include both capabilities where relevant.
- The VLAN sub-interface explanation said tcpdump captures all VLAN 100 traffic after the tag is stripped. Linux VLAN devices normally hide the VLAN header from captures on the VLAN device, so the wording was updated to describe traffic delivered through that VLAN interface.
- Several tcpdump examples placed options such as `-w` and `-c` after the filter expression. The official tcpdump manual recommends placing options before the expression for portability, so those commands were reordered.
- The conclusion described trunk captures as raw 802.1Q inspection without caveat. The wording was updated to clarify that trunk-interface filtering depends on VLAN tags being visible to tcpdump.

## Review Notes
All tcpdump filter expressions in the post were compiled successfully with `tcpdump -d`. On systems with VLAN hardware offload or VLAN header reordering, tag visibility can vary by interface and driver.
