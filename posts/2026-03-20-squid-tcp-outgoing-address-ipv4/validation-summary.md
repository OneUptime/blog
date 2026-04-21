# Validation Summary: How to Configure tcp_outgoing_address in Squid for IPv4 Source IP Selection

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Squid proxy
- Squid ACLs and `tcp_outgoing_address`
- Linux `iproute2` policy routing
- curl proxy testing
- httpbin IP echo endpoint

## Sources Consulted
- Squid `tcp_outgoing_address` directive documentation: https://www.squid-cache.org/Doc/config/tcp_outgoing_address/
- Squid `acl` directive documentation: https://www.squid-cache.org/Doc/config/acl/
- Squid `http_port` directive documentation: https://www.squid-cache.org/Doc/config/http_port/
- Squid `http_access` directive documentation: https://www.squid-cache.org/Doc/config/http_access/
- Squid `server_persistent_connections` directive documentation: https://www.squid-cache.org/Doc/config/server_persistent_connections/
- Squid `forwarded_for` directive documentation: https://www.squid-cache.org/Doc/config/forwarded_for/
- curl official man page for `--proxy` / `-x`: https://curl.se/docs/manpage.html
- Linux `ip-address(8)` manual page: https://man7.org/linux/man-pages/man8/ip-address.8.html
- Linux `ip-rule(8)` manual page: https://man7.org/linux/man-pages/man8/ip-rule.8.html
- Linux `ip-route(8)` manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- httpbin endpoint documentation: https://httpbin.org/legacy
- Author GitHub profile link: https://github.com/nawazdhandala

## Issues Found
- The post described `tcp_outgoing_address` generically for Squid, but the current Squid directive reference lists it as available through Squid 7 and not available in Squid v8. Updated the description, introduction, and conclusion to say Squid 7 and earlier.
- The client-subnet ACL example omitted Squid's documented server-side persistent connection caveat for client-dependent `tcp_outgoing_address` rules. Added `server_persistent_connections off` to that example and adjusted the section lead-in.
- The destination-based example defined `acl normal_traffic all`, but `all` is a predefined ACL name rather than a documented custom ACL type in current Squid configuration. Removed that invalid ACL definition and used an unqualified fallback `tcp_outgoing_address` line.
- The verification command used plain HTTP with httpbin. Squid's default `forwarded_for on` behavior can add `X-Forwarded-For`, which may make IP echo services report header-derived values rather than only the TCP source IP. Changed the test URL to `https://httpbin.org/ip` for normal forward-proxy CONNECT testing.

## Review Notes
- The Linux `ip addr`, `ip rule`, and `ip route get` command forms are syntactically valid per `iproute2` help/man pages. In real deployments, policy routing tables may also need environment-specific connected routes or explicit `dev` arguments depending on interface and gateway setup.
- A local Squid binary was not available in this workspace, so Squid syntax was reviewed against official Squid directive documentation rather than `squid -k parse`.
