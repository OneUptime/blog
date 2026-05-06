# Validation Summary: How to Build IPv6 Network Scanners in Python

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- IPv6
- Linux neighbor discovery and neighbor cache inspection
- ICMPv6 multicast ping
- `asyncio` TCP connectivity probing
- Reverse DNS with dnspython

## Sources Consulted
- Python 3.12 `asyncio` streams documentation — https://docs.python.org/3.12/library/asyncio-stream.html
- Python `ipaddress` documentation — https://docs.python.org/3/library/ipaddress.html
- dnspython resolver documentation — https://dnspython.readthedocs.io/en/stable/resolver-class.html
- dnspython name helpers documentation — https://dnspython.readthedocs.io/en/stable/name-helpers.html
- RFC 4291: IP Version 6 Addressing Architecture — https://www.rfc-editor.org/rfc/rfc4291
- RFC 4861: Neighbor Discovery for IP version 6 (IPv6) — https://www.rfc-editor.org/rfc/rfc4861
- Local `ip-neighbour(8)` manual page
- Local `ping(8)` manual page

## Issues Found
1. **Neighbor-cache parsing was too strict.** The original regex only matched the simplest `ip -6 neigh show` output and missed valid entries that include extra flags such as `router`. Replaced the regex parser with token-based parsing that matches current `ip neigh` output more reliably.

2. **The NDP cache example incorrectly dropped link-local addresses.** On-link IPv6 discovery commonly surfaces link-local neighbors, especially when using link-local multicast like `ff02::1`. Removed the `is_link_local` filter so the scanner reports the actual neighbors present in the cache.

3. **The multicast ping example used the older `ping6` spelling instead of the current documented `ping -6` form.** Updated the command to `ping -6 -c 3 -I <interface> ff02::1`, which matches the current `ping(8)` documentation.

4. **The reverse-DNS section had an internal size-limit mismatch.** The prose said `/120` or smaller with 256 addresses maximum, but the code allowed up to 512 addresses. Changed the guard to 256 addresses and clarified the wording to `/120` or longer prefixes.

5. **The conclusion slightly overstated reliability.** Changed “find active hosts reliably” to “can find active hosts efficiently” so the summary matches the practical limits of NDP cache state, ICMPv6 reply behavior, and DNS coverage.

## Review Notes
- The examples are Linux-oriented because they rely on `ip` and `ping` command behavior from a typical Linux userspace.
- The async port scanner is syntactically correct and uses current `asyncio.open_connection()` APIs, but it does not limit concurrency. That is acceptable for the small sample input shown in the post.
