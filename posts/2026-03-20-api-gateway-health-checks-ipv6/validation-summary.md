# Validation Summary: How to Configure API Gateway Health Checks over IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- NGINX
- Kong Gateway
- AWS Lambda
- Python `socket`
- HAProxy
- curl
- IPv6

## Sources Consulted
- NGINX HTTP load balancing docs: https://nginx.org/en/docs/http/load_balancing.html
- NGINX upstream module docs: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- NGINX active health check module docs: https://nginx.org/en/docs/http/ngx_http_upstream_hc_module.html
- Kong Gateway health checks and circuit breakers docs: https://developer.konghq.com/gateway/traffic-control/health-checks-circuit-breakers/
- Kong Gateway Target entity docs: https://developer.konghq.com/gateway/entities/target/
- Kong Gateway configuration reference (`admin_listen` defaults): https://developer.konghq.com/gateway/configuration/
- AWS Lambda VPC and IPv6 docs: https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html
- Python `socket` library docs: https://docs.python.org/3/library/socket.html
- HAProxy configuration manual: https://docs.haproxy.org/2.8/configuration.html
- curl man page: https://curl.se/docs/manpage.html

## Issues Found
- The NGINX passive health check example described `3` failures within `30` seconds, but the snippet did not actually configure `max_fails` or `fail_timeout`. I added `max_fails=3 fail_timeout=30s` to the upstream servers so the example matches the explanation.
- The commented NGINX Plus active health check example was not valid as written because `health_check` must be placed in the proxied `location`, and the upstream group must use shared memory. I added `zone api_backends 64k` and moved the commented `health_check` example into the `location /api/` block.
- The NGINX snippet enabled upstream `keepalive` without the required HTTP proxy settings for keepalive reuse. I added `proxy_http_version 1.1` and `proxy_set_header Connection ""` to match the official NGINX guidance.
- The Kong Admin API examples used `http://[::1]:8001`, but Kong’s documented default `admin_listen` is `127.0.0.1:8001` for HTTP. I changed the commands to use `127.0.0.1` and kept the IPv6 focus on the upstream Target rather than the Admin API listener.
- The Kong Target creation example used form fields, while the official Admin API examples use JSON payloads. I updated the command to JSON for consistency with current docs and to avoid ambiguity around bracketed IPv6 target notation.
- The AWS Lambda section omitted the requirement that outbound IPv6 works only for Lambda functions attached to dual-stack VPC subnets with IPv6 enabled. I added that prerequisite to the section text and code comment.
- The HAProxy HTTP health check example used inline CRLF header syntax that is not the current documented style. I updated it to `option httpchk ...` plus `http-check send hdr Host ...`, and clarified that the TCP example only verifies connection establishment when no explicit `tcp-check` rules are defined.

## Review Notes
- Kong documents that passive health checks can disable unhealthy Targets but cannot automatically re-enable them; active checks are needed for automatic recovery. The post’s combined active and passive example is valid with that caveat.
- Kong also documents that passive health checks are not available in Konnect or hybrid mode. The post does not discuss deployment-mode caveats, but the current examples are appropriate for self-managed Admin API usage.
- The AWS section is an application-level health endpoint pattern implemented in Lambda behind API Gateway, not a native API Gateway upstream health-check feature.
