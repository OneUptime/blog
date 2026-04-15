# Validation Summary: How to Chain Multiple Middleware Components in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr HTTP middleware pipeline (`httpPipeline` configuration)
- Dapr middleware components: routerchecker, ratelimit, bearer, OPA
- Dapr CLI (`dapr run`)
- Kubernetes (Dapr Configuration resource)
- Open Policy Agent (OPA) Rego policy language

## Sources Consulted
- Dapr Bearer Middleware Reference: https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-bearer/
- Dapr OPA Middleware Reference: https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-opa/
- Dapr Rate Limit Middleware Reference: https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-rate-limit/
- Dapr RouterChecker Middleware Reference: https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-routerchecker/
- Dapr CLI `dapr run` Reference: https://docs.dapr.io/reference/cli/dapr-run/

## Issues Found

1. **OPA middleware missing `includedHeaders` metadata field.** The OPA policy checks `input.request.headers["x-role"]` to authorize POST requests, but the Dapr OPA middleware does not pass request headers to the policy by default. Without the `includedHeaders` metadata field, the `input.request.headers` map would be empty and the header-based policy rule would never match. Added `includedHeaders: "x-role"` to the OPA component metadata.

2. **Deprecated `--components-path` flag in `dapr run` command.** The `--components-path` flag is deprecated in favor of `--resources-path`. Changed to `--resources-path` in the `dapr run` example.

3. **ASCII diagram incorrectly tagged as TOML.** The pipeline execution order diagram used ` ```toml ` as the code fence language, but the content is plain ASCII art, not TOML. Changed to ` ```text `.

## Review Notes
- The bearer middleware metadata fields (`issuer`, `audience`) were verified as correct against official Dapr docs. The `jwksURL` field is optional and not needed when the issuer supports OIDC discovery (e.g., Google).
- The routerchecker `rule` regex, rate limiter `maxRequestsPerSecond`, and OPA `rego` field names are all correct per official documentation.
- The `httpPipeline.handlers` configuration structure with `name` and `type` fields is correct for Dapr Configuration resources.
- The Dapr service invocation URL pattern `/v1.0/invoke/{app-id}/method/{method}` used in the test examples is correct.
- The Kubernetes Configuration resource adds a `namespace` field compared to the self-hosted version, which is appropriate.
