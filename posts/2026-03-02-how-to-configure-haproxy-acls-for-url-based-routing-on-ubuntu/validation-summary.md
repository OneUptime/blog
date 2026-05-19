# Validation Summary: How to Configure HAProxy ACLs for URL-Based Routing on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- HAProxy
- HAProxy ACLs
- HTTP routing
- Load balancing
- TLS termination
- curl
- systemd

## Sources Consulted
- HAProxy 2.8 Configuration Manual: https://docs.haproxy.org/2.8/configuration.html
- HAProxy ACL conditions and operators: https://docs.haproxy.org/2.8/configuration.html#7.2
- HAProxy request header fetches and ACL derivatives: https://docs.haproxy.org/2.8/configuration.html#7.3.6
- HAProxy URL parameter fetches: https://docs.haproxy.org/2.8/configuration.html#url_param
- HAProxy request actions, including `http-request return`, `http-request redirect`, and `http-request replace-path`: https://docs.haproxy.org/2.8/configuration.html#4.2-http-request
- Ubuntu package management documentation: https://ubuntu.com/server/docs/how-to/software/package-management/index.html

## Issues Found
- The basic User-Agent ACL used `hdr(User-Agent)` while the comment said it matched values contained in the header. HAProxy's `hdr()` ACL derivative performs exact string matching by default, so this was changed to `hdr_sub(User-Agent)` for substring matching.
- The logical-operator example described OR behavior but showed `use_backend internal_api if is_api is_internal`, which is an implicit AND condition. It was changed to use HAProxy's explicit `or` operator: `if is_api is_internal or is_api is_authenticated`.
- The example declared `acl is_external !src 10.0.0.0/8`. HAProxy negation belongs in conditions, so this was changed to reuse `!is_internal` in the `http-request deny` condition.
- The header-routing User-Agent example used mixed matcher flag ordering. It was changed to the clearer HAProxy ACL derivative `hdr_sub(User-Agent) -i mobile android iphone`.
- The curl examples for API/static/admin routing used `http://localhost` even though the main configuration redirects HTTP to HTTPS. They were changed to HTTPS examples with `-k` so they test backend routing when using a local or self-signed certificate.

## Review Notes
HAProxy is not installed in the review workspace, so `haproxy -c -f /etc/haproxy/haproxy.cfg` could not be run locally. Syntax-sensitive claims were checked against the official HAProxy configuration manual instead. The hostname examples are technically valid, but future revisions could mention that exact `hdr(host)` matches may not match requests whose Host header includes a port.
