# Validation Summary: How to Calculate the Network Address from IPv4 and Subnet Mask in Code

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- IPv4
- CIDR
- Subnet masks
- C
- Python `ipaddress`
- JavaScript bitwise operators

## Sources Consulted
- RFC 4632, Classless Inter-domain Routing (CIDR): https://datatracker.ietf.org/doc/rfc4632/
- Python `ipaddress` module documentation: https://docs.python.org/3/library/ipaddress.html
- POSIX `inet_pton()` / `inet_ntop()` documentation: https://pubs.opengroup.org/onlinepubs/9699919799/functions/inet_ntop.html
- MDN JavaScript `&` operator reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_AND
- MDN JavaScript `>>>` operator reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Unsigned_right_shift
- ECMAScript language specification: https://tc39.es/ecma262/2026/multipage/ecmascript-language-expressions.html

## Issues Found
No technical issues found.

## Review Notes
The C and JavaScript examples assume valid IPv4 input, valid subnet masks, and prefix lengths in the `0` to `32` range. That is acceptable for this post because the examples are presented as direct calculation examples, not hardened input-validation utilities.
