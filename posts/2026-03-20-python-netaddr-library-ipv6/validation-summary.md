# Validation Summary: How to Use Python netaddr Library for IPv6

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- netaddr
- IPv6
- IP address management (IPAM)

## Sources Consulted
- netaddr documentation: https://netaddr.readthedocs.io/
- netaddr API Reference: https://netaddr.readthedocs.io/en/latest/api.html
- netaddr Tutorial 1: IP Addresses, Subnets and Ranges: https://netaddr.readthedocs.io/en/latest/tutorial_01.html
- netaddr Tutorial 3: Working with IP sets: https://netaddr.readthedocs.io/en/latest/tutorial_03.html
- netaddr installation guide: https://netaddr.readthedocs.io/en/latest/installation.html
- netaddr on PyPI: https://pypi.org/project/netaddr/
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849
- IANA IPv6 Special-Purpose Address Registry: https://www.iana.org/assignments/iana-ipv6-special-registry
- Python typing documentation: https://docs.python.org/3.10/library/typing.html

## Issues Found
- The basic `IPAddress` example claimed `IPAddress("2001:db8::1").is_global()` returns `True`. In current `netaddr`, it returns `False` because `2001:db8::/32` is the documentation prefix and is not globally reachable. I corrected the expected output.
- The `IPNetwork` example used `IPAddress(...)` without importing `IPAddress` in that standalone code block. I added the missing import so the snippet runs as written.
- The `cidr_merge()` example claimed that `2001:db8:1::/48` through `2001:db8:4::/48` merge to a single `/46`, which is not how `cidr_merge()` summarizes those prefixes. I corrected the sample input and output so the demonstration matches actual `netaddr` behavior.
- The `IPSet` example used invalid IPv6 literals (`prod` and `staging` are not valid hexadecimal hextets). I replaced them with valid IPv6 prefixes while preserving the intent of the example.

## Review Notes
- All Python code blocks were executed successfully on 2026-04-24 against `netaddr 1.3.0`.
- The `SimpleIPAM` example uses the `IPNetwork | None` annotation syntax, which requires Python 3.10 or newer even though `netaddr` itself supports older Python versions.
