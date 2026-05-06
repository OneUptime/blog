# Validation Summary: How to Calculate Broadcast Address from IPv4 and Subnet Mask in Code

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- IPv4
- Subnetting
- C
- POSIX networking APIs (`inet_pton`, `inet_ntop`)
- Python `ipaddress`
- JavaScript bitwise operators

## Sources Consulted
- Python `ipaddress` module documentation: https://docs.python.org/3/library/ipaddress.html
- The Open Group `inet_pton()` / `inet_ntop()` specification: https://pubs.opengroup.org/onlinepubs/9699919799/functions/inet_ntop.html
- RFC 919, Broadcasting Internet Datagrams: https://www.rfc-editor.org/rfc/rfc919
- RFC 922, Broadcasting Internet Datagrams in the Presence of Subnets: https://www.rfc-editor.org/rfc/rfc922.html
- RFC 3021, Using 31-Bit Prefixes on IPv4 Point-to-Point Links: https://www.rfc-editor.org/rfc/rfc3021
- MDN JavaScript bitwise operators reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Expressions_and_operators
- MDN unsigned right shift (`>>>`) reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Unsigned_right_shift
- MDN `parseInt()` reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/parseInt

## Issues Found
- The introduction stated that the broadcast address is always the last address in a subnet and that packets sent to it are delivered to all hosts on the subnet. That is too broad because RFC 3021 defines `/31` point-to-point prefixes as a special case where subnet-directed broadcast is not available. I updated the introduction and conclusion to scope the claim to IPv4 subnets that define a directed broadcast address.

## Review Notes
- The code examples executed successfully in local checks with `cc`, `python3`, and `node`, and produced the documented broadcast addresses.
- The examples assume valid IPv4 dotted-decimal input and valid prefix lengths; they are correct as tutorial examples but do not add input validation.
