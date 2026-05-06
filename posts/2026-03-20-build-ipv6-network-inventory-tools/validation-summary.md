# Validation Summary: How to Build IPv6 Network Inventory Tools

## Status
not-technically-relevant

## Post Type
Guide

## Technologies Covered
- IPv6 addressing
- Python `ipaddress`
- Linux `ip` and `ping`
- `curl`
- NAPALM

## Sources Consulted
- Python Standard Library: `ipaddress` module documentation: https://docs.python.org/3/library/ipaddress.html
- RFC 4291, IP Version 6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849
- NAPALM overview documentation: https://napalm.readthedocs.io/en/latest/index.html
- NAPALM `NetworkDriver.get_interfaces_ip()` documentation: https://napalm.readthedocs.io/en/latest/base.html

## Issues Found
- The post claims to show how to build IPv6 network inventory tools, but the implementation only performs subnet allowlisting and access logging. It does not discover or catalog IPv6 addresses, prefixes, or assignments, and it does not use NAPALM despite the title and tags.
- The example IPv6 literals `2001:db8:trusted::/48`, `2001:db8:trusted::1`, and `2001:db8:unknown::1` are invalid. RFC 4291 allows only hexadecimal digits in each IPv6 hextet, and Python's `ipaddress.ip_address()` raises `ValueError` for those samples.
- The prerequisite step incorrectly instructs readers to `pip install ipaddress`. The `ipaddress` module is part of Python's standard library and has been included since Python 3.3. The post also installs `netaddr` and `ipaddr.js` even though neither is used in the examples.
- The "Apply configuration" step tells readers to run `python3 configure.py --config config.yaml`, but no `configure.py` implementation is provided in the post or its directory, so the workflow cannot be executed as written.
- The YAML configuration is presented as though it drives the Python example, but the code never reads or applies that configuration. The verification step only instantiates `IPv6Address` and `IPv6Network` directly, so it does not validate the configuration shown.
- No README changes were made. Correcting the post would require rewriting it into an actual inventory workflow, which goes beyond narrow technical fixes and is why it was classified as `not-technically-relevant`.

## Review Notes
- `2001:db8::/32` is the correct documentation-only IPv6 prefix per RFC 3849, so example addresses in that range are appropriate when they use valid hexadecimal hextets.
- NAPALM does provide inventory-relevant getters such as `get_interfaces_ip()`, which returns configured IPv4 and IPv6 addresses per interface. None of that functionality appears in the post.
