# Validation Summary: How to Handle IPv6 Subnet Matching in Web Application ACLs

## Status
validated

## Post Type
Guide

## Technologies Covered
- Python `ipaddress` module
- Django middleware
- nginx access control rules
- IPv6 addressing and CIDR notation
- IPv4-mapped IPv6 addresses

## Sources Consulted
- Python `ipaddress` library reference: https://docs.python.org/3/library/ipaddress.html
- Python `ipaddress` HOWTO: https://docs.python.org/3/howto/ipaddress.html
- Django middleware documentation: https://docs.djangoproject.com/en/5.2/topics/http/middleware/
- Django request/response documentation (`HttpRequest.META` / `REMOTE_ADDR`): https://docs.djangoproject.com/en/5.0/ref/request-response/
- nginx `ngx_http_access_module` documentation: https://nginx.org/en/docs/http/ngx_http_access_module.html
- RFC 4291, IP Version 6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 4193, Unique Local IPv6 Unicast Addresses: https://datatracker.ietf.org/doc/html/rfc4193
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849

## Issues Found
- The `_normalize()` method claimed to normalize addresses to IPv6, but it can validly return either `IPv4Address` or `IPv6Address`, especially when converting IPv4-mapped IPv6 addresses. I corrected the return type hint and docstring to match the actual behavior.
- The example labeled `2001:db8::/32` as an internal IPv6 range, but RFC 3849 reserves that prefix for documentation. I corrected the comment so the example matches the standard.
- The Django middleware unconditionally trusted `HTTP_X_FORWARDED_FOR` even though the comment said it should only be trusted behind a known proxy. I changed the example to use `REMOTE_ADDR`, which aligns with Django’s documented request metadata and avoids spoofable header handling in the sample.
- The nginx parser treated rules as separate allow and deny lists with deny-first precedence, which does not match nginx. According to `ngx_http_access_module`, nginx checks rules in sequence until the first match. I updated the ACL example to support ordered rules for this parser path.
- The nginx parser did not accept semicolon-terminated directives such as `allow 2001:db8::/32;`, which are standard nginx syntax. I updated the parser and example rules to handle trailing semicolons correctly.
- The nginx ordered-rule example needed nginx’s default behavior when no rule matches. I updated the ordered-rule path so parsed nginx-style rules default to allow unless a rule such as `deny all;` blocks the request.
- The introduction tied `/64` prefixes too specifically to NDP. I adjusted the wording to the more accurate statement that IPv6 subnets are often expressed as `/64` while individual hosts use `/128`.

## Review Notes
The nginx parsing example is now technically accurate for ordered IP/CIDR and `all` rules, but it remains a simplified parser rather than a full nginx configuration parser. It does not implement other valid nginx access-module forms such as `unix:`.
