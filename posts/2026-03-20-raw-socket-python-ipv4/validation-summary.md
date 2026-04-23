# Validation Summary: How to Build a Raw Socket Application for IPv4 in Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python `socket` module
- IPv4 raw sockets on Linux
- ICMP echo request/reply
- Linux capabilities (`CAP_NET_RAW`)
- RFC 791 IPv4 header format
- BCP 38 ingress filtering

## Sources Consulted
- Python `socket` module documentation: https://docs.python.org/3/library/socket.html
- Linux `raw(7)` manual page: https://man7.org/linux/man-pages/man7/raw.7.html
- Linux `ip(7)` manual page: https://man7.org/linux/man-pages/man7/ip.7.html
- Linux `capabilities(7)` manual page: https://man7.org/linux/man-pages/man7/capabilities.7.html
- RFC 791, Internet Protocol: https://www.rfc-editor.org/rfc/rfc791
- RFC 792, Internet Control Message Protocol: https://www.rfc-editor.org/rfc/rfc792.html
- BCP 38 / RFC 2827, Network Ingress Filtering: https://www.rfc-editor.org/bcp/bcp38

## Issues Found
- The original Linux sniffer example used `socket.AF_INET`, `SOCK_RAW`, and `socket.IPPROTO_IP` with `IP_HDRINCL`, which matches Python's Windows sniffer example rather than Linux raw-socket behavior. I changed the example to use `socket.IPPROTO_ICMP`, removed `IP_HDRINCL`, and updated the surrounding text because Linux raw IPv4 sockets receive packets for the protocol they are opened with and already include the IP header on receive.
- The ping example assumed a fixed 20-byte IPv4 header when parsing replies. I changed it to read the IPv4 IHL field so the ICMP header offset is correct when IPv4 options are present.
- The privilege wording said raw sockets require root/administrator privileges. I updated it to note the Linux-specific requirement more accurately: elevated privileges such as root or `CAP_NET_RAW`.
- The conclusion said `IP_HDRINCL` causes received packets to include the IP header and stated that most ISPs implement BCP 38. I corrected this to reflect Linux receive behavior and softened the ingress-filtering claim to avoid overstating deployment.

## Review Notes
- The code blocks compile successfully under `python3`.
- I did not run the raw-socket examples end-to-end in this environment because they require `CAP_NET_RAW` or root privileges.
