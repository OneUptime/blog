# Validation Summary: How to Configure Squid ACL src to Allow Specific IPv4 Subnets

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Squid proxy
- Squid ACLs
- Squid `src`, `time`, and `dstdomain` ACL types
- Squid `http_access` rules
- IPv4 CIDR subnet notation
- curl proxy testing

## Sources Consulted
- Squid current release information: https://www.squid-cache.org/Versions/
- Squid `acl` configuration directive: https://www.squid-cache.org/Doc/config/acl/
- Squid `http_access` configuration directive: https://www.squid-cache.org/Doc/config/http_access/
- Squid `http_port` configuration directive: https://www.squid-cache.org/Doc/config/http_port/
- Squid ACL FAQ: https://wiki.squid-cache.org/SquidFaq/SquidAcl
- Squid installation/configuration validation notes for `squid -k parse`: https://wiki.squid-cache.org/SquidFaq/InstallingSquid
- curl network interface documentation: https://everything.curl.dev/usingcurl/connections/interface.html
- RFC 5737, IPv4 address blocks reserved for documentation: https://www.rfc-editor.org/rfc/rfc5737
- RFC 1918, private IPv4 address ranges: https://www.rfc-editor.org/rfc/rfc1918
- httpbin service documentation page: https://httpbin.org/

## Issues Found
- The `203.0.113.0/24` comment described the range as an office public IP range. RFC 5737 reserves `203.0.113.0/24` for documentation, so I changed the comment to call it an example office public IP range.
- The destination ACL example allowed approved sites before explicitly denying social media. Because Squid evaluates `http_access` rules in order, a later deny would not override an earlier allow if the ACLs ever overlapped. I moved the social media deny before the approved-sites allow.
- The blocked-client curl example used `--interface 203.0.113.200`. curl can bind to an interface or local source address, but the source address must be usable on the test host; `203.0.113.200` is a documentation address. I changed the example to run the same proxy request from a blocked client.
- The cache log command said it checked ACL decisions unconditionally. Squid documents ACL decision logging in `cache.log` after enabling ACL debug options, so I updated the comment to mention `debug_options ALL,1 33,2`.

## Review Notes
The remaining Squid configuration syntax is consistent with current stable Squid 7 documentation. In a production `squid.conf`, these allow rules should be integrated with Squid's default safety rules for ports, CONNECT, manager access, localhost, and link-local targets instead of replacing the entire default access-control block.
