# Validation Summary: How to Configure Tyk API Gateway for IPv6

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Tyk Gateway 5.x (Go-based API gateway)
- IPv6 networking (RFC 2732 bracket notation)
- Redis (session storage backend)
- systemd (service management)
- curl (testing)
- ss (listener verification)

## Sources Consulted
- Tyk OSS Gateway Configuration Reference: https://tyk.io/docs/tyk-oss-gateway/configuration/
- Tyk Health Check documentation: https://tyk.io/docs/planning-for-production/ensure-high-availability/health-check/
- Tyk config Go package: https://pkg.go.dev/github.com/tyktechnologies/tyk/config
- Tyk reference tyk.conf.example: https://github.com/TykTechnologies/tyk/blob/master/tyk.conf.example
- Redis CLI documentation: https://redis.io/docs/latest/develop/tools/cli/
- RFC 2732 (IPv6 literal addresses in URLs)

## Issues Found
1. **`/hello` endpoint placed on the wrong port and incorrectly required auth.** The original Step 4 used `http://[::1]:9696/hello` (the control API port) with an `X-Tyk-Authorization` header. Per Tyk's health check documentation, `/hello` is exposed on the gateway listener (port 8080 in this post's setup) and does not require authentication. Fixed the URL to use port 8080 and removed the auth header. Also expanded the example response to include the `details` object that the real `/hello` response contains.

## Review Notes
- Verified `enable_api_segregation` in the config snippet — it is a real boolean field on the Tyk `Config` struct (`json:"enable_api_segregation"`), even though it is not in the prose configuration reference. Left as-is.
- Verified `redis-cli -6` flag — it is a valid redis-cli flag that prefers IPv6 over IPv4 on DNS lookups. Left as-is.
- Confirmed `tyk_js_path`, `middleware_path`, `template_path`, `app_path`, `use_db_app_configs`, `control_api_hostname`, `control_api_port`, `secret`, `node_secret`, `listen_address`, `listen_port`, and the `storage` object structure (with `type`, `host`, `port`) against the OSS gateway configuration reference.
- IPv6 URL bracket notation reference (RFC 2732) is correct.
- The `2001:db8::` prefix used for the example upstream is the documentation/example range per RFC 3849, which is appropriate.
- Tyk Gateway 5.3.0 is a plausible 5.x version; the `description: "Tyk GW"` and `status: "pass"` fields match the documented health response shape.
- Future caveat: Tyk's JSVM (and therefore `tyk_js_path`) is a legacy middleware path; new deployments are encouraged to use Go or gRPC plugins. Not a correctness issue here.
