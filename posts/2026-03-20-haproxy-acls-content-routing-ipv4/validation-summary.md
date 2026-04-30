# Validation Summary: How to Use HAProxy ACLs for Content-Based Routing on IPv4

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HAProxy
- HTTP request routing / content switching
- IPv4 networking
- HAProxy ACLs

## Sources Consulted
- HAProxy Configuration Manual (latest) — https://www.haproxy.com/documentation/haproxy-configuration-manual/latest/
- HAProxy ACLs tutorial — https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/custom-rules/acls/
- HAProxy Backends tutorial — https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/configuration-basics/backends/
- HAProxy HTTP rewrites tutorial — https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/http-rewrites/

## Issues Found
1. The ACL syntax block was too simplified and did not reflect HAProxy's documented syntax for optional flags, operators, and conditional forms on `use_backend`. I updated it to match the official syntax more closely.
2. The `is_heavy` example used `hdr(Content-Length) -m int gt 10000000`. HAProxy's manual distinguishes ACL-derivative fetches such as `hdr(...)` from sample fetches and documents `req.hdr_val(...)` for integer header comparisons. I changed the ACL to `req.hdr_val(Content-Length) gt 10000000` and clarified the inline comment.
3. The takeaway that "ACLs are evaluated in order" was imprecise for this example. The rule ordering that matters here is the `use_backend` evaluation order, so I corrected that wording. I also updated the OR-operator note to mention the current `||` syntax alongside `or`.

## Review Notes
- The path-based, host-based, source-IP, and header-based routing patterns are all technically valid for HAProxy HTTP frontends.
- The `src` fetch matches the TCP peer address seen by HAProxy. In deployments behind another proxy, the effective client address depends on features such as PROXY protocol handling.
- The local environment did not have a `haproxy` binary installed, so I could not run `haproxy -c` for parser validation. The review was completed against official HAProxy documentation instead.
