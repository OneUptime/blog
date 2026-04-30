# Validation Summary: How to Understand the IPv6 Fragment Header

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- IPv6 Fragment Header
- ICMPv6
- Path MTU
- Python 3
- Linux `/proc/net/snmp6`

## Sources Consulted
- RFC 8200, "Internet Protocol, Version 6 (IPv6) Specification": https://datatracker.ietf.org/doc/rfc8200/
- RFC 4443, "ICMPv6 (ICMP for IPv6)": https://www.ietf.org/rfc/rfc4443
- Python `socket` module documentation: https://docs.python.org/3.11/library/socket.html
- Python `struct` module documentation: https://docs.python.org/3.11/library/struct.html
- Python `os` module documentation: https://docs.python.org/3.11/library/os.html
- Linux kernel `/proc` filesystem documentation: https://docs.kernel.org/filesystems/proc.html
- IANA Protocol Numbers registry: https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml

## Issues Found
- The worked fragmentation example used byte counts that violated RFC 8200's 8-byte alignment rule for non-final fragments. I corrected the example so the first fragment carries 1448 bytes of fragment data, which yields fragment packet sizes of 1496 and 160 bytes.
- The Fragment Header field description said the `Next Header` value was simply the original protocol. I updated that wording to match RFC 8200 more closely: it identifies the first header in the fragmentable part, which is often but not always an upper-layer protocol header.
- The Fragment Header field description and the sample code both described the Identification value as "unique", while the example code only generated a random 32-bit value. I reworded that description so it accurately explains the field's role in matching fragments from the same original packet.
- The Python example claimed to fragment a UDP datagram, but the sample payload did not contain a UDP header. I changed the example to a generic 3072-byte test payload and used an experimental Next Header value so the example is internally consistent.
- The Linux monitoring command used `grep -i frag`, which does not match the `Ip6Reasm*` counters listed below it. I changed the command to `grep -Ei 'frag|reasm'` so it returns both fragmentation and reassembly metrics.

## Review Notes
- The `cat /proc/net/snmp6` example is Linux-specific.
- The Python snippet correctly demonstrates fragment construction, but it does not send the packets on the network.
