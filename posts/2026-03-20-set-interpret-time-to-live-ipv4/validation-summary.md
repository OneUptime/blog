# Validation Summary: How to Set and Interpret Time to Live in IPv4

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- IPv4 Time to Live (TTL)
- ICMP Time Exceeded
- traceroute and tracert
- Linux sysctl IPv4 settings
- Scapy
- tcpdump
- IPv4 multicast TTL scoping

## Sources Consulted
- RFC 791, Internet Protocol: https://www.rfc-editor.org/rfc/rfc791
- RFC 1812, Requirements for IP Version 4 Routers: https://www.rfc-editor.org/rfc/rfc1812
- RFC 1112, Host Extensions for IP Multicasting: https://www.rfc-editor.org/rfc/rfc1112
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Linux ip(7) manual page: https://man7.org/linux/man-pages/man7/ip.7.html
- Linux traceroute(8) manual page: https://man7.org/linux/man-pages/man8/traceroute.8.html
- tcpdump(1) manual page: https://man7.org/linux/man-pages/man1/tcpdump.1.html
- Scapy usage documentation: https://scapy.readthedocs.io/en/latest/usage.html
- Scapy inet API documentation: https://scapy.readthedocs.io/en/latest/api/scapy.layers.inet.html
- Microsoft tracert documentation: https://support.microsoft.com/en-us/topic/how-to-use-tracert-to-troubleshoot-tcp-ip-problems-in-windows-e643d72b-2f4f-cdd6-09a0-fd2989c7ca8e
- Microsoft TCP/IP DefaultTTL documentation: https://learn.microsoft.com/en-us/troubleshoot/windows-client/networking/tcpip-and-nbt-configuration-parameters
- Oracle Solaris network tunables documentation: https://docs.oracle.com/cd/E53394_01/html/E54838/gneys.html

## Issues Found
- The TTL decrement wording said each router decrements by exactly 1. Updated it to "at least 1 (normally by 1)" to match RFC 791 and RFC 1812.
- The TTL expiration wording implied any router receiving TTL=1 always discards the packet. Updated it to describe discard during forwarding when TTL would become 0, and to note ICMP Time Exceeded for non-multicast traffic.
- The Scapy example printed `reply[IP].proto` while labeling it as an ICMP type. Updated the code to read `reply[ICMP].type` and `reply[ICMP].code`.
- The Scapy comment said the packet "will" expire at the third hop. Updated it to say it should expire there if the destination is farther away.
- The multicast TTL example claimed TTL=255 is site-wide. Updated it to say TTL=1 stays on the local subnet and TTL values greater than 1 may be forwarded by multicast routers.
- The tcpdump example omitted elevated privileges commonly required for packet capture. Updated the command to use `sudo tcpdump`.
- The key takeaway repeated the exact decrement wording. Updated it to "at least 1" by each forwarding router.

## Review Notes
Default TTL values are conventional and can vary by OS version, protocol, or local configuration. The listed values are acceptable for a general guide, but future revisions could add a short caveat that observed TTLs are only OS fingerprints when the initial TTL is known or reasonably inferred.
