# Validation Summary: How to Implement Query Parameter Routing

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- NGINX (map directive, $arg_* variables, upstream blocks, proxy_pass, rate limiting)
- OpenResty / lua-nginx-module (set_by_lua_block)
- Envoy Proxy (route_config, query_parameters matcher, string_match, safe_regex, Lua filter)
- Kong Gateway (declarative configuration, request-transformer plugin)
- AWS API Gateway (OpenAPI extensions, x-amazon-apigateway-integration)
- Express.js / Node.js middleware
- k6 (load testing framework)
- curl (CLI testing)
- Prometheus (metrics naming)
- Mermaid diagrams

## Sources Consulted
- NGINX `map` module docs: https://nginx.org/en/docs/http/ngx_http_map_module.html
- NGINX embedded variables (`$arg_NAME`, `$args`): https://nginx.org/en/docs/http/ngx_http_core_module.html
- Envoy route matching docs: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto
- Envoy regex matcher: https://www.envoyproxy.io/docs/envoy/latest/api-v3/type/matcher/v3/regex.proto
- Envoy Lua filter docs: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter
- Kong route entity reference: https://docs.konghq.com/gateway/latest/admin-api/#route-object
- Kong request-transformer plugin: https://docs.konghq.com/hub/kong-inc/request-transformer/
- AWS API Gateway OpenAPI extensions: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-swagger-extensions.html
- k6 HTTP API: https://k6.io/docs/javascript-api/k6-http/
- Express.js middleware docs: https://expressjs.com/en/guide/using-middleware.html

## Issues Found

1. **NGINX composite map used `~` as if it were a wildcard placeholder.** The original code had entries like `"v2:xml:~"` and `"v1:~:~"` intended to match "any value" in those positions. In NGINX's `map` directive, `~` is only meaningful when it is the *first character* of a value (it then prefixes a regex). Embedded inside a literal string it matches a literal `~` character — which never appears in URL query parameters, so the lines would never match anything. Replaced with proper regex patterns `"~^v2:xml:"` and `"~^v1:"` so the intent (prefix matching) is actually implemented.

2. **NGINX "strip debug param" example did not actually strip anything.** The block had two identical `set $clean_args $args;` statements and a `rewrite ^(.*)$ $1?$clean_args break;` that just rewrote to the same URI plus the unchanged args. The comment said "Remove debug parameter" but no removal happened. Replaced with a `map $args $args_no_debug { ... }` block that uses a named-capture regex to strip the `debug=...` segment, then used `$args_no_debug` as the source for `$clean_args` when the request is unauthorized. Also fixed the `proxy_pass` to include `$uri?$clean_args` so the rewritten args are actually used.

## Review Notes

- The Kong example deliberately routes on a header (`x-api-version`) rather than the query parameter, with a comment acknowledging that Kong's standard `routes` resource matches on headers/paths/methods rather than query strings. This is accurate; Kong 3.x's Expression Router can match query params via expressions, but the header-rewrite pattern shown here is still valid and widely used.
- The Envoy `safe_regex` block uses `google_re2: {}` which still works but has been a no-op default since Envoy 1.22+; newer configs typically write just `regex: "..."` without the wrapper. Not incorrect, just slightly dated.
- The `set_by_lua_block` directive used in the parameter-transformation NGINX example requires the `lua-nginx-module` (typically via OpenResty). Stock NGINX will not parse this. The post does not call this out explicitly — readers using vanilla NGINX would need to install OpenResty or rewrite using `njs`.
- The Envoy Lua snippet passes `os.time()` (a number) to `headers:add()`. The Envoy Lua API generally expects strings; in practice this is auto-coerced but explicit `tostring()` would be safer.
- The AWS API Gateway example mixes OpenAPI 3.0 with CloudFormation intrinsic functions (`Fn::If`). This works only when the OpenAPI document is embedded inside a CloudFormation template, and the `IsV2Request` condition would need to be defined in a `Conditions:` block elsewhere in the template. The snippet is plausible as a fragment but is not a standalone working file.
- The date-based version routing sequence diagram shows `api-version=2023-01-01` going to V2, while the accompanying NGINX `map` routes `2023-01-01` to `api_v1`. These are illustrative of different routing tables rather than a strict inconsistency, but readers may find the mismatch confusing.
- k6 HTTP response headers are stored case-sensitively as the server returns them; the test `r.headers['X-Api-Version']` will only pass if the upstream emits exactly that casing. NGINX `add_header X-API-Version` would produce `X-Api-Version` after Go's HTTP canonicalization in many proxies, but this is implementation-dependent.
