# Validation Summary: How to Audit IPv6 Addresses for Tracking Risks

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing and Interface Identifiers (IIDs)
- Modified EUI-64 and MAC/EUI-48-derived IIDs
- Linux `ip` / iproute2
- `nmap`
- Python 3 `ipaddress` and `csv`
- RFC 7217 stable opaque IIDs
- RFC 8981 temporary IPv6 addresses

## Sources Consulted
- RFC 4291, "IP Version 6 Addressing Architecture": https://www.rfc-editor.org/rfc/rfc4291.html
- RFC 7217, "A Method for Generating Semantically Opaque Interface Identifiers with IPv6 Stateless Address Autoconfiguration (SLAAC)": https://www.rfc-editor.org/rfc/rfc7217.html
- RFC 8064, "Recommendation on Stable IPv6 Interface Identifiers": https://www.rfc-editor.org/rfc/rfc8064.html
- RFC 8981, "Temporary Address Extensions for Stateless Address Autoconfiguration in IPv6": https://www.rfc-editor.org/rfc/rfc8981.html
- Python standard library documentation for `ipaddress`: https://docs.python.org/3/library/ipaddress.html
- Nmap target specification reference: https://nmap.org/book/man-target-specification.html
- Nmap host discovery reference: https://nmap.org/man/man-host-discovery.html
- Nmap XML output reference: https://nmap.org/book/output-formats-xml-output.html
- Nmap grepable output reference: https://nmap.org/book/output-formats-grepable-output.html
- `ip(8)` Linux manual page (`-o` / `-oneline`): https://www.man7.org/linux/man-pages/man8/ip.8.html
- `ip-address(8)` Linux manual page: https://www.man7.org/linux/man-pages/man8/ip-address.8.html

## Issues Found
- The post said the `ff:fe` marker occupied the 5th and 6th bytes of the IID and implied that all EUI-64 IIDs have that pattern. I corrected this to the MAC/EUI-48-derived modified EUI-64 case, where the inserted `ff:fe` bytes are the 4th and 5th bytes of the IID.
- The quick shell check relied on a regex over the compressed text form of the IPv6 address, which can miss or misclassify addresses because the `ff:fe` pattern must be checked in the IID after expansion. I replaced it with a Python `ipaddress`-based check.
- The single-host audit script parsed `ip -6 addr show` output incorrectly and would often report the last flag on the line instead of the interface name. I changed it to use `ip -o -6 addr show scope global` and parse the interface/address fields explicitly.
- The original `nmap` example attempted to scan an IPv6 `/64` directly and parsed grepable output. That is not operationally realistic for IPv6 target space, and Nmap documents grepable output as deprecated. I changed the example to use `-iL` with a curated target list and XML output.
- The original MAC recovery logic in the network scan example manipulated a 16-bit hextet as if it were the first IID byte, which would not correctly recover the MAC/EUI-48 value. I replaced it with byte-accurate recovery logic based on the expanded IID.
- The Python tool claimed to expand addresses but did not do so, failed on compressed addresses, checked the wrong IID offset for `fffe`, and claimed to support file input without implementing it. I updated it to use Python's standard `ipaddress` module and added file-argument support.
- The flowchart referenced RFC 4941 for temporary addresses. I updated it to RFC 8981, which obsoletes RFC 4941, and adjusted the wording from "changes on reconnect" to "changes over time" to better match temporary-address behavior.

## Review Notes
- The `ff:fe` signature is a strong indicator for MAC/EUI-48-derived modified EUI-64 IIDs, but it is not a universal test for every possible EUI-64-derived IID. The post now reflects that narrower and technically accurate scope.
- The examples focus on detecting MAC-derived modified EUI-64 IIDs. Auditing other predictable or low-entropy IIDs would require additional heuristics beyond the `ff:fe` signature.
