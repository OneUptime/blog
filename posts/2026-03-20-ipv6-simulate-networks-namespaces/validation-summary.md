# Validation Summary: How to Simulate IPv6 Networks with Network Namespaces

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux network namespaces
- IPv6
- `iproute2`
- `veth`
- `tcpdump`

## Sources Consulted
- Linux `ip-netns(8)` manual page: https://man7.org/linux/man-pages/man8/ip-netns.8.html
- Linux `network_namespaces(7)` manual page: https://man7.org/linux/man-pages/man7/network_namespaces.7.html
- Linux `veth(4)` manual page: https://man7.org/linux/man-pages/man4/veth.4.html
- Linux `ip-address(8)` manual page: https://man7.org/linux/man-pages/man8/ip-address.8.html
- Linux `ping(8)` manual page: https://man7.org/linux/man-pages/man8/ping.8.html
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849.html
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861.html
- OneUptime homepage link check: https://oneuptime.com/

## Issues Found
- The common namespace example did not bring up the namespace loopback interface. I added `sudo ip netns exec myns ip link set lo up` because the `ip-netns(8)` examples explicitly bring `lo` up inside a new namespace.
- The post used `ping6`, while current `iputils` documentation standardizes on `ping -6`. I updated the connectivity examples to `ping -6` to match current documented usage and avoid portability issues on systems where `ping6` is not provided as a separate command.
- The conclusion had dropped the actual command reference and read as if key text was missing. I restored it to refer to standard Linux `ip` commands and the `ip netns` subcommand.

## Review Notes
- The examples use `2001:db8::/32`, which is the RFC 3849 documentation prefix and is appropriate for tutorial content.
