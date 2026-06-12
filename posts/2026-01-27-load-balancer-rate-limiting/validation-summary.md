# Validation Summary: How to Implement Load Balancer Rate Limiting

## Status
validated

## Post Type
Technical implementation guide

## Technologies Covered
- HAProxy stick tables and runtime socket commands
- Nginx `ngx_http_limit_req_module` and `ngx_http_limit_conn_module`
- AWS Application Load Balancer with AWS WAF rate-based rules
- Terraform AWS, Google Cloud, and Cloudflare provider configurations
- Google Cloud Armor rate limiting
- Azure Application Gateway WAF rate limiting
- Cloudflare WAF rate limiting rules and Rulesets API
- HTTP 429 response handling
- OpenResty `lua-resty-limit-traffic`

## Sources Consulted
- HAProxy Configuration Manual: https://docs.haproxy.org/2.8/configuration.html
- HAProxy stick tables tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/custom-rules/stick-tables/
- Nginx `ngx_http_limit_req_module` documentation: https://nginx.org/en/docs/http/ngx_http_limit_req_module.html
- AWS WAF `RateBasedStatement` API reference: https://docs.aws.amazon.com/waf/latest/APIReference/API_RateBasedStatement.html
- Google Cloud Armor rate limiting documentation: https://docs.cloud.google.com/armor/docs/configure-rate-limiting
- Azure Application Gateway WAF rate limiting documentation: https://learn.microsoft.com/en-us/azure/web-application-firewall/ag/rate-limiting-configure
- Cloudflare WAF rate limiting rules documentation: https://developers.cloudflare.com/waf/rate-limiting-rules/
- Cloudflare Terraform rate limiting rules documentation: https://developers.cloudflare.com/terraform/additional-configurations/rate-limiting-rules/
- OpenResty `lua-resty-limit-traffic` documentation: https://github.com/openresty/lua-resty-limit-traffic/blob/master/lib/resty/limit/req.md
- RFC 6585, HTTP 429 Too Many Requests: https://datatracker.ietf.org/doc/html/rfc6585

## Issues Found
- The HAProxy multi-tier example attempted to define multiple named `stick-table` directives inside one frontend using `name auth_table` and `name apikey_table`. HAProxy proxy sections support a single stick table, and separate named tables should be defined in separate proxy sections or peers tables. I moved the auth and API key tables into dedicated backend sections referenced by `http-request track-sc* ... table ...`.
- The Nginx basic example used `limit_req off;` in the health check location. The official `limit_req` syntax has no `off` form. I removed the inherited server-level request limit and applied the general limit only in the catch-all location, leaving `/health` unrate-limited.
- The Nginx health check example set `Content-Type` with `add_header`. I changed it to `default_type text/plain`, which is the correct way to control the content type for a simple `return` body.
- The AWS WAF Terraform rules included both `override_action` and `action` blocks in ordinary Web ACL rules. `override_action` is for rule group override behavior, while these rules should use `action`. I removed the `override_action` blocks.
- The Cloudflare Terraform example used the deprecated `cloudflare_rate_limit` resource. I replaced it with the current `cloudflare_ruleset` resource in the `http_ratelimit` phase.
- The OpenResty Lua example used `lim:uncommit(key)` to calculate remaining requests. The `uncommit` method undoes a prior commit and is mainly for combining multiple limiters, not for reading remaining quota. I removed that calculation and added the required `ngx.sleep(delay)` handling for delayed requests.

## Review Notes
The examples remain illustrative and require environment-specific values such as certificates, backend addresses, WAF associations, Cloudflare zone IDs, and Terraform provider versions. AWS WAF rate-based rules default to a 300-second evaluation window unless `evaluation_window_sec` is set explicitly.
