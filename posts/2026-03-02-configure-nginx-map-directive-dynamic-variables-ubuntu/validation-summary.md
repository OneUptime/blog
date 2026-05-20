# Validation Summary: How to Configure Nginx Map Directive for Dynamic Variables on Ubuntu

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Ubuntu
- Nginx HTTP configuration
- Nginx `map` directive
- Nginx reverse proxying
- Nginx proxy caching
- Nginx request rate limiting
- GeoIP2-based routing
- systemd service reloads

## Sources Consulted
- Nginx `ngx_http_map_module` documentation: https://nginx.org/en/docs/http/ngx_http_map_module.html
- Nginx `ngx_http_proxy_module` documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx `ngx_http_limit_req_module` documentation: https://nginx.org/en/docs/http/ngx_http_limit_req_module.html
- Nginx `ngx_http_rewrite_module` documentation: https://nginx.org/en/docs/http/ngx_http_rewrite_module.html
- Nginx server names documentation: https://nginx.org/en/docs/http/server_names.html
- Nginx GeoIP2 dynamic module documentation: https://docs.nginx.com/nginx/admin-guide/dynamic-modules/geoip2/
- MaxMind GeoIP country database field documentation: https://dev.maxmind.com/geoip/docs/databases/city-and-country/country-binary/

## Issues Found
- The GeoIP example used `proxy_cache $cache_zone` but did not define the referenced cache zones. Added matching `proxy_cache_path` directives for `us_cache`, `eu_cache`, and `asia_cache` because Nginx cache zones must be defined before they can be selected by `proxy_cache`.
- The GeoIP example listed `EU` as a country code while the variable name and section text describe country-code routing. Replaced it with `FR`, leaving the European backend behavior intact while using an actual ISO country code.
- The GeoIP example used hostnames directly in a variable-based `proxy_pass` value without defining a resolver or upstream groups. Added upstream groups and mapped to those group names so the example remains valid without an environment-specific DNS resolver.
- The chained-map backend example used hostnames in a variable-based `proxy_pass` value without a resolver or upstream groups. Switched the example backend values to loopback addresses to match the rest of the post's proxy examples.
- The rate-limit chaining example used `limit_req zone=$rate_limit_zone`, but the Nginx `limit_req` directive expects a literal zone name and does not document variable support for the `zone` parameter. Reworked the example to map each plan tier to an active or empty rate-limit key, define zones from those keys, and apply literal `limit_req` zones. This follows Nginx documentation that empty rate-limit keys are not accounted.

## Review Notes
Local `nginx` was not installed in the review environment, so syntax was checked against official Nginx documentation rather than `nginx -t`. The `if` examples use `return`, which is supported by the Nginx rewrite module in `if` context.
