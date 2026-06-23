# Validation Summary: How to Set Up Cloudflare as a CDN and DDoS Protection for Kubernetes Services

## Status
validated

## Post Type
Tutorial / Guide (step-by-step Cloudflare + Kubernetes setup with dashboard, API, and Terraform examples)

## Technologies Covered
- Cloudflare (CDN, WAF, DDoS protection, SSL/TLS, caching, rate limiting, Rulesets engine)
- Cloudflare API (v4) and Cloudflare Terraform provider (`cloudflare/cloudflare ~> 4.0`)
- Kubernetes (Ingress, ingress-nginx, Secrets, ConfigMaps, NetworkPolicy)
- external-dns
- Prometheus / Grafana
- NGINX configuration (real IP, cache headers)

## Sources Consulted
- Cloudflare Terraform — Rate limiting rules configuration: https://developers.cloudflare.com/terraform/additional-configurations/rate-limiting-rules/
- Cloudflare WAF — Rate limiting rules (phase `http_ratelimit`): https://developers.cloudflare.com/waf/rate-limiting-rules/
- Cloudflare WAF — Create a rate limiting rule via API: https://developers.cloudflare.com/waf/rate-limiting-rules/create-api/
- `cloudflare_ruleset` Terraform resource: https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs/resources/ruleset
- Cloudflare Community — "only ratelimit rules can be placed in the http_ratelimit phase" (error 20132): https://community.cloudflare.com/t/20132-only-ratelimit-rules-can-be-placed-in-the-http-ratelimit-phase/733095
- Cloudflare — Deprecating Auto Minify (Aug/Oct 2024): https://community.cloudflare.com/t/deprecating-auto-minify/655677 and https://developers.cloudflare.com/speed/optimization/content/troubleshooting/disable-auto-minify/
- Cloudflare — IP ranges: https://www.cloudflare.com/ips/

## Issues Found
1. **Rate limiting rules placed in the wrong Ruleset phase (functional error).** Section 5.3 (`waf_custom_rules`) and Section 6.3 (`ddos_protection`) both used `phase = "http_request_firewall_custom"` for rules containing a `ratelimit {}` block. Cloudflare rejects this — rate limiting rules can only be deployed to the dedicated `http_ratelimit` phase (API error 20132), and a zone supports only one entry-point ruleset per phase. **Fix:** Changed the `ddos_protection` ruleset to `phase = "http_ratelimit"`, removed the invalid "Rate limit API endpoints" rule from the `http_request_firewall_custom` ruleset in 5.3, and consolidated that rule (with its custom 429 JSON response) into the single `http_ratelimit` ruleset in 6.3. Added explanatory comments noting the one-ruleset-per-phase constraint.

2. **Deprecated Auto Minify setting (outdated).** Section 6.3's `cloudflare_zone_settings_override` included a `minify {}` block. Cloudflare deprecated Auto Minify on 2024-08-05 and globally disabled it by late October 2024; it is no longer available via dashboard, API, or Terraform, so applying this block would fail/no-op. **Fix:** Removed the `minify {}` block (and its "Performance with security" comment).

3. **Inaccurate nameserver example (factual).** Step 1.2 showed `ns1.cloudflare.com` / `ns2.cloudflare.com`. Cloudflare does not assign those; it assigns two personalized nameservers from its pool (e.g. `dana.ns.cloudflare.com`). **Fix:** Updated the example to realistic personalized nameservers and clarified that the reader's assigned names will differ.

## Review Notes
- **Legacy v4 firewall/WAF endpoints (not changed).** Section 5.2 uses the legacy WAF managed-rules API (`/firewall/waf/packages/{id}`), and the analytics/firewall-events examples in Step 8 and the access-rules calls use the older v4 firewall API. These are superseded by the new WAF Managed Rules (Rulesets) deployment API and the GraphQL Analytics API. They still illustrate the concepts and the package IDs shown are the historical OWASP/managed package IDs, but readers on newly onboarded zones should prefer the modern Rulesets and GraphQL Analytics APIs. Left as-is to avoid restructuring; flagged here as a deprecation caveat.
- **Terraform provider version.** The post pins `cloudflare/cloudflare ~> 4.0`, so `cloudflare_record` correctly uses `value` (renamed to `content` in provider v5) and `cloudflare_zone_settings_override` is still available. If a reader upgrades to provider v5, several resources in this post would need migration.
- **Cloudflare IP ranges** in Sections 7.1/7.2 match the published Cloudflare IPv4/IPv6 ranges at review time. Cloudflare recommends pulling these from `https://www.cloudflare.com/ips/` programmatically since they can change — the post already calls this out in its best-practices list.
- SSL mode explanations (Off/Flexible/Full/Full Strict), Origin Certificate validity (up to 15 years), `min_tls_version` value `"1.2"`, `ssl` value `"strict"`, the `ddos_l7` override phase, and the `CF-Connecting-IP` real-IP handling are all accurate.
