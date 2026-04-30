# Validation Summary: How to Handle IPv6 Client Addresses in API Rate Limiting

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing and prefix delegation
- NGINX rate limiting and njs (`ngx_http_js_module`)
- Python `ipaddress`
- Flask request handling
- Redis counters and Lua scripting
- Kong Gateway `rate-limiting-advanced` plugin

## Sources Consulted
- NGINX `ngx_http_limit_req_module`: https://nginx.org/en/docs/http/ngx_http_limit_req_module.html#limit_req_zone
- NGINX `ngx_http_js_module`: https://nginx.org/en/docs/http/ngx_http_js_module.html
- NGINX `ngx_http_map_module`: https://nginx.org/en/docs/http/ngx_http_map_module.html
- NGINX `ngx_http_geo_module`: https://nginx.org/en/docs/http/ngx_http_geo_module.html
- Python `ipaddress` library docs: https://docs.python.org/3/library/ipaddress.html
- Redis `INCR` command docs: https://redis.io/docs/latest/commands/incr/
- Redis `EVAL` command docs: https://redis.io/docs/latest/commands/eval/
- redis-py pipeline docs: https://redis.readthedocs.io/en/stable/advanced_features.html
- Kong Rate Limiting Advanced overview: https://developer.konghq.com/plugins/rate-limiting-advanced/
- Kong Rate Limiting Advanced configuration reference: https://developer.konghq.com/plugins/rate-limiting-advanced/reference/
- RFC 6177, IPv6 Address Assignment to End Sites: https://www.rfc-editor.org/rfc/rfc6177.html
- RFC 7421, Analysis of the 64-bit Boundary in IPv6 Addressing: https://www.rfc-editor.org/rfc/rfc7421.html
- RFC 4291, IPv6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291.html
- Werkzeug `ProxyFix` docs: https://werkzeug.palletsprojects.com/en/stable/middleware/proxy_fix/

## Issues Found
- The original NGINX example did not actually provide reliable IPv6 prefix normalization. The `geo` block was not masking a dynamic `/64`, and the regex-based `map` approach would only match some textual IPv6 forms rather than canonicalize all valid representations. I replaced it with a documented `ngx_http_js_module` (`js_set`) example that derives a stable `/64` key before `limit_req_zone`.
- The Python normalization helpers returned only `network_address`, which dropped the selected prefix length from the resulting key. I changed both helpers to return `str(network)` / `str(net)` so the key explicitly preserves the bucket size in CIDR notation.
- The Redis `/48` example depended on `ipaddress` and `r` being defined in earlier snippets. I added the missing imports and a Redis client initialization so the snippet is runnable as written.
- The Kong example incorrectly implied that `identifier: ip` performs IPv6 prefix bucketing and omitted currently documented configuration requirements. I changed it to a documented `identifier: header` configuration with `header_name`, added the required `namespace`, and clarified that `rate-limiting-advanced` is Enterprise-only.
- The conclusion overstated `/64` and `/48` as universal defaults. I adjusted the wording to match current IPv6 guidance more closely: `/64` is a common baseline, but broader buckets depend on the delegated prefix model in the deployment.

## Review Notes
- The revised NGINX strategy requires the `ngx_http_js_module` (njs) module to be available. The post intentionally avoids a distro-specific `load_module` line because the module path differs across packages and operating systems.
- The Flask example still assumes `request.remote_addr` already reflects the true client IP. If Flask is deployed behind a reverse proxy or load balancer, trusted proxy handling such as Werkzeug `ProxyFix` or equivalent gateway configuration is required.
