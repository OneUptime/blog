# Validation Summary: How to Use Python netaddr for IPv6 Operations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- netaddr
- IPv6
- CIDR and subnetting
- IP sets
- EUI-64

## Sources Consulted
- netaddr API Reference: https://netaddr.readthedocs.io/en/latest/api.html
- netaddr Tutorial 1: IP Addresses, Subnets and Ranges: https://netaddr.readthedocs.io/en/latest/tutorial_01.html
- netaddr Tutorial 2: MAC addresses: https://netaddr.readthedocs.io/en/latest/tutorial_02.html
- netaddr Tutorial 3: Working with IP sets: https://netaddr.readthedocs.io/en/latest/tutorial_03.html
- netaddr Installation guide: https://netaddr.readthedocs.io/en/latest/installation.html
- Python standard library `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- RFC 4291, IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849

## Issues Found
- The post used `IPAddress.is_private()`, which is not part of the documented `netaddr` public API. I replaced it with `is_ipv6_unique_local()` in the affected snippets so they run correctly on current `netaddr`.
- The `IPNetwork.first` and `IPNetwork.last` example comments implied those properties print `IPAddress` objects, but they actually return integers. I wrapped them with `IPAddress(...)` and corrected the expected output.
- The `net.size` example comment used symbolic notation (`2^96`) instead of the actual printed value. I updated it to the real integer output and kept the `2**96` equivalence for clarity.
- The firewall example used invalid IPv6 literals (`2001:db8:admin::/48` and `2001:db8:blocked::/48`). I replaced them with valid hexadecimal documentation-prefix subnets.
- The `cidr_merge()` example inputs were not aligned for the claimed `/46` result. I changed the prefixes to an aligned contiguous set so the demonstrated merge output is correct.
- The `cidr_exclude` snippet omitted `IPNetwork` from its import statement. I added the missing import so the snippet runs as written.
- The EUI-64 example comment did not match `netaddr`'s canonical string output. I corrected the expected address to `2001:db8:1:0:a8bb:ccff:fedd:eeff`.

## Review Notes
- All code snippets were re-validated successfully against `netaddr` 1.3.0 in an isolated runtime check.
- The post correctly uses `2001:db8::/32`, which RFC 3849 reserves for documentation and example usage rather than production deployment.
- `netaddr.EUI.ipv6()` is valid for demonstrating modified EUI-64 address generation, but the `netaddr` documentation notes the privacy implications and points readers to RFC 4941.
