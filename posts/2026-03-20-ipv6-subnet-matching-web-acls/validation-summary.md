# Validation Summary: How to IPv6 Subnet Matching in Web Application ACLs

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- CIDR subnet matching
- Python `ipaddress`
- Linux `ip` and `ping`
- `curl`
- YAML ACL configuration

## Sources Consulted
- Python `ipaddress` HOWTO: https://docs.python.org/3/howto/ipaddress.html
- Python `ipaddress` library reference: https://docs.python.org/3/library/ipaddress.html
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849
- Debian `ip(8)` man page for iproute2 family selection and `-6`: https://manpages.debian.org/trixie/iproute2/ip.8.en.html
- Debian `ping(8)`/`ping6(8)` man page for IPv6 mode and `-6`: https://manpages.debian.org/testing/iputils-ping/ping6.8.en.html
- curl man page for `-6` and IPv6 URL syntax: https://curl.se/docs/manpage.html

## Issues Found
- The setup section claimed extra Python dependencies were required. I removed `pip install ipaddress netaddr` and the unrelated `npm install ipaddr.js` example because the published Python code uses the standard-library `ipaddress` module and no third-party packages.
- The core Python example used invalid IPv6 literals such as `2001:db8:trusted::/48` and `2001:db8:unknown::1`. I replaced them with valid RFC 3849 documentation addresses so the example now parses and the stated test results are correct.
- The core matching function used version-agnostic constructors even though the post is specifically about IPv6. I changed the example to `IPv6Address` and `IPv6Network` so it enforces IPv6 input explicitly.
- The Step 4 apply command referenced `configure.py`, which is not defined anywhere in the post and would not run as published. I replaced it with an executable prefix-validation command that demonstrates the intended verification step with `ipaddress`.
- The monitoring snippet used `ipaddress.ip_address()` without importing `ipaddress`. I added the missing import.
- The conclusion referred to Python's module without naming it. I corrected the reference to `ipaddress`.

## Review Notes
- The post now consistently uses RFC 3849 documentation prefixes (`2001:db8::/32`) in examples. These are correct for documentation and should be replaced with real allocations in production.
- The YAML ACL example is syntactically valid, but its `::/0` deny rule behaves as a catch-all, so real implementations must evaluate rule order consistently.
- The corrected Python examples were executed locally and produced the expected results.
