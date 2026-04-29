# Validation Summary: How to Use an IPv6 Subnet Calculator

## Status
validated

## Post Type
Guide / tutorial

## Technologies Covered
- IPv6 addressing and subnetting
- CIDR and prefix calculations
- Python 3 `ipaddress`
- `sipcalc`
- `ipv6calc`

## Sources Consulted
- Python `ipaddress` library docs: https://docs.python.org/3/library/ipaddress.html
- Python `ipaddress` HOWTO: https://docs.python.org/3/howto/ipaddress.html
- RFC 4291, IPv6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849
- `sipcalc` manual page: https://www.mankier.com/1/sipcalc
- Homebrew `sipcalc` formula: https://formulae.brew.sh/formula/sipcalc
- Debian `sipcalc` package page: https://packages.debian.org/sipcalc
- `ipv6calc` homepage: https://www.deepspace6.net/projects/ipv6calc.html
- Hurricane Electric BGP Toolkit: https://bgp.he.net/
- Hurricane Electric Network Tools: https://networktools.he.net/
- Network Calculator IPv6 page: https://www.network-calculator.com/ipv6.php
- Subnetting Practice IPv6 page: https://subnettingpractice.com/ipv6-subnetting-practice.html

## Issues Found
- The `sipcalc` sample output had the `Subnet prefix` and `Prefix address` meanings swapped. I corrected the example so the subnet prefix shows the network portion and the prefix address shows the IPv6 mask equivalent.
- The custom Python example labeled `IPv6Network.broadcast_address` as a broadcast-equivalent value. RFC 4291 states that IPv6 has no broadcast addresses, so I relabeled it as the last address in the prefix.
- The “Subnet 100” example comment was wrong. I verified the actual value with Python and corrected it to `2001:db8:0:64::/64`.
- The `collapse_addresses()` example used a misaligned set of `/64` networks that could not collapse to a single `/62`. I replaced it with an aligned contiguous set and corrected the expected result to `2001:db8:1::/62`.
- The `network00.com` recommendation no longer points to a subnetting tool. I replaced it with `network-calculator.com` and updated the Hurricane Electric tool name to the current BGP Toolkit wording.

## Review Notes
- The Python snippets are syntactically valid and match the current standard-library `ipaddress` API.
- The example `2001:db8::/32` address space is appropriate for documentation examples per RFC 3849.
- `sipcalc` is still available in current Debian package repositories and Homebrew, although it is a mature tool rather than an actively evolving one.
