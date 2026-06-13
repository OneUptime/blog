# Validation Summary: How to Implement HAProxy ACLs

## Status
validated

## Post Type
Technical tutorial / configuration guide

## Technologies Covered
- HAProxy ACLs
- HAProxy frontends and backends
- HAProxy HTTP request and response rules
- HAProxy stick tables and rate limiting
- WebSocket routing
- gRPC over HTTP/2
- SSL/TLS routing and client certificate checks
- Linux shell commands for HAProxy support files

## Sources Consulted
- HAProxy Configuration Manual, ACL usage and conditions: https://www.haproxy.com/documentation/haproxy-configuration-manual/latest/
- HAProxy Configuration Manual, `http-request` and `http-response` rules: https://www.haproxy.com/documentation/haproxy-configuration-manual/latest/#4.2-http-request
- HAProxy Configuration Manual, stick tables: https://www.haproxy.com/documentation/haproxy-configuration-manual/latest/#stick-table
- HAProxy Configuration Manual, sample fetches including `rand`: https://www.haproxy.com/documentation/haproxy-configuration-manual/latest/#rand
- HAProxy Configuration Manual, header ACL matching methods such as `hdr_beg`: https://www.haproxy.com/documentation/haproxy-configuration-manual/latest/#7.3.6
- HAProxy 2.8 Docker image parser check: `haproxy:2.8-alpine`, HAProxy 2.8.24

## Issues Found
- The A/B testing backend comments said the `Set-Cookie` header was set only on the first response. The configuration sets the header on every response served by the selected backend, so the comments were corrected.
- The WebSocket `Connection` header ACL used an exact match against `upgrade`. Real `Connection` headers can contain comma-separated tokens such as `keep-alive, Upgrade`, so it was changed to `hdr_sub(Connection) -i upgrade`.
- The gRPC content-type ACL used an exact match for `application/grpc`. gRPC content types can include suffixes such as `application/grpc+proto`, so it was changed to `hdr_beg(content-type) -i application/grpc`.
- The debug header snippet used a nonexistent HAProxy fetch method, `acl_matched()`. It was replaced with request-scoped transaction variables set from the ACL conditions and read during the response phase.
- The verbose logging snippet also used `acl_matched()`. It was replaced with a transaction variable set to `true` or `false` based on the ACL.
- The verbose logging snippet used HTTP log-format fields without setting HTTP mode. Added `mode http` to the `defaults` section.

## Review Notes
The corrected snippets for debug headers, verbose logging, and the complete production example were validated with the HAProxy 2.8.24 parser via the official Docker image. Some snippets remain intentionally partial examples and omit unrelated backend definitions, certificates, or environment-specific files.
