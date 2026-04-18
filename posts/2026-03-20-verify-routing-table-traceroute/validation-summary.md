# Validation Summary: How to Verify Routing Table Entries with Traceroute

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- traceroute (Linux, UDP/ICMP/TCP probes)
- iproute2 (`ip route get`, `ip rule show`)
- MTR (My Traceroute)
- ping
- Policy-based routing (PBR) and ECMP concepts

## Sources Consulted
- traceroute(8) man page — https://man7.org/linux/man-pages/man8/traceroute.8.html
- ip-route(8) man page — https://man7.org/linux/man-pages/man8/ip-route.8.html
- ip-rule(8) man page — https://man7.org/linux/man-pages/man8/ip-rule.8.html
- mtr(8) man page — https://github.com/traviscross/mtr (upstream manual)
- ping(8) man page (iputils) — https://man7.org/linux/man-pages/man8/ping.8.html

## Issues Found
- Line 29 comment incorrectly described `traceroute -n` as "Show both hostnames and IPs". The `-n` flag disables DNS resolution and shows only numeric IPs. Updated the comment to "Skip DNS lookups (show IPs only)" so it matches the command's actual behavior.

## Review Notes
- All traceroute flags (`-I`, `-T -p 80`, `-m`, `-n`, `-s`) are correct for the Linux traceroute (from the `traceroute` package / Olaf Kirch implementation, commonly installed on Debian/Ubuntu/RHEL).
- `ip route get <dest> from <src>` syntax is correct and useful for detecting policy routing that differs by source.
- The default traceroute max hop count on Linux is 30, which the post states correctly.
- mtr `--report` and `--report-cycles` flags are accurate.
- The description of asterisks (ICMP TTL-exceeded drops, rate limiting, asymmetric routing, loss) reflects standard, well-known causes.
- Note for future readers: `traceroute -T` typically requires root/CAP_NET_RAW because it crafts raw TCP SYN packets; the post does not mention this, but it is not technically incorrect.
