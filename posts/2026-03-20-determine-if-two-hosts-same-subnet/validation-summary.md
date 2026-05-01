# Validation Summary: How to Determine If Two Hosts Are on the Same Subnet

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4
- CIDR subnetting
- Python standard library `ipaddress`
- Ethernet ARP behavior

## Sources Consulted
- Python `ipaddress` module documentation: https://docs.python.org/3/library/ipaddress.html
- Python `socket` module documentation (`inet_aton` behavior): https://docs.python.org/3/library/socket.html
- RFC 1122, Section 3.3.1.1, local/remote delivery decision: https://www.rfc-editor.org/rfc/rfc1122
- RFC 4632, Section 3.1, CIDR prefix notation: https://www.rfc-editor.org/rfc/rfc4632.html
- RFC 826, ARP on Ethernet: https://www.rfc-editor.org/rfc/rfc826.html

## Issues Found
- The manual `same_subnet()` example did not validate the prefix length. For example, `prefix=-1` incorrectly returned `True` instead of rejecting an invalid CIDR prefix. I added explicit validation for the `0..32` range.
- The manual `same_subnet()` example used `socket.inet_aton()`, whose accepted input forms depend on the underlying C implementation and can accept non-canonical IPv4 strings. I changed it to `ipaddress.IPv4Address()` so the example uses strict, portable IPv4 parsing from the Python standard library.
- The opening description and bitwise test wording implied a subnet comparison without stating that both addresses must be evaluated with the same mask/prefix. I clarified that the test is for a given mask/prefix.
- The delivery example mentioned ARP as if it were universal for all layer-2 media. I narrowed it to "ARP for MAC on Ethernet," which matches RFC 826.

## Review Notes
The post is technically sound after the corrections above. The examples, `/25` boundary explanation, and `ipaddress` membership check all behave as described when run locally with Python 3. The article is IPv4-specific; if an IPv6 companion post is added later, neighbor discovery would replace ARP and the examples would need different code and terminology.
