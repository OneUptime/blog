# Validation Summary: How to Configure HAProxy ACLs for IPv6 Networks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- HAProxy
- IPv6
- ACLs
- Stick tables
- HTTP request routing

## Sources Consulted
- HAProxy 3.2 Configuration Manual: https://docs.haproxy.org/3.2/configuration.html
- HAProxy Frontends tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/configuration-basics/frontends/
- HAProxy ACLs tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/custom-rules/acls/
- HAProxy Stick tables tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/custom-rules/stick-tables/
- HAProxy Traffic policing tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/security/traffic-policing/
- RFC 4291, IPv6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849

## Issues Found
- Several sample IPv6 addresses and prefixes were invalid because they used non-hexadecimal words such as `admin`, `internal`, `trusted`, `blocked`, `eu`, `us`, `asia`, and `corp` inside IPv6 literals. I replaced them with valid documentation and ULA-style example addresses so the HAProxy ACLs are syntactically correct per IPv6 text-format rules.
- Each HAProxy example used both `bind *:80` and `bind [::]:80` in the same frontend. HAProxy’s current frontend documentation recommends `bind [::]:80 v4v6` to listen on both IPv4 and IPv6, which avoids dual-stack binding ambiguity. I updated all examples accordingly.
- The combined IPv4/IPv6 example defined `acl is_internal src is_internal_v4 is_internal_v6`, which is not valid ACL syntax because `src` expects address patterns, not previously defined ACL names. I removed that line and changed the condition to `http-request deny if is_admin_path !is_internal_v4 !is_internal_v6`, which matches HAProxy’s documented ACL condition syntax.
- The whitelist section comment said the configuration would require authentication for non-trusted IPv6 clients, but the rule actually denied the request. I corrected the comment to describe the real behavior.
- The summary used `2001:db8::addr` as an example IPv6 host literal, which is not a valid IPv6 address. I replaced it with a valid example and aligned the summary text with the corrected ACL-combination example.

## Review Notes
- The post is now technically sound for current HAProxy configuration syntax and IPv6 address formatting.
- A local `haproxy -c` syntax check was not possible in this environment because the `haproxy` binary is not installed.
