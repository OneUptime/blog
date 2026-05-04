# Validation Summary: How to Create Cloudflare Proxy DNS Records with OpenTofu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- Cloudflare Terraform provider (~> 4.0)
- Cloudflare DNS records (A, CNAME) with proxy (orange-cloud) and DNS-only (grey-cloud) modes
- Cloudflare Page Rules (always_use_https, cache_level, edge_cache_ttl)
- Cloudflare Tunnel (cfargotunnel.com CNAME targets)
- CNAME flattening at the zone apex

## Sources Consulted
- Cloudflare Terraform provider v4 `cloudflare_record` resource docs: https://github.com/cloudflare/terraform-provider-cloudflare/blob/v4.52.0/docs/resources/record.md
- Cloudflare Terraform provider v4 `cloudflare_zone` data source docs: https://github.com/cloudflare/terraform-provider-cloudflare/blob/v4.52.0/docs/data-sources/zone.md
- Cloudflare Terraform provider v4 `cloudflare_tunnel` resource docs: https://github.com/cloudflare/terraform-provider-cloudflare/blob/v4.52.0/docs/resources/tunnel.md
- Cloudflare Terraform provider v4 `cloudflare_page_rule` resource docs: https://github.com/cloudflare/terraform-provider-cloudflare/blob/v4.52.0/docs/resources/page_rule.md
- Cloudflare docs on proxiable records and proxied ports (HTTP/HTTPS only)
- Cloudflare docs on Cloudflare Tunnel CNAME format `<UUID>.cfargotunnel.com`

## Issues Found
- **`value` argument deprecated in v4** — Every `cloudflare_record` block in the post used `value = ...`, which is marked `Deprecated` in the v4 provider schema in favor of `content`. The official v4 docs use `content` in all examples. Replaced `value` with `content` in all six `cloudflare_record` blocks (`www`, `mail`, `api`, `apex`, `proxied` for_each, `unproxied` for_each, `tunnel`) so the configuration matches the current v4 attribute name and avoids deprecation warnings on `tofu plan`.

## Review Notes
- `cloudflare_record` requires exactly one of `data`, `content`, or `value`. Using `content` (the non-deprecated name) is correct.
- `ttl = 1` for proxied records is the documented "Auto" sentinel value — correct.
- `proxied = false` for `mail`, `smtp`, and `ftp` is correct: Cloudflare's HTTP/HTTPS proxy only handles a fixed set of HTTP/HTTPS ports, so SMTP/IMAP/POP3 and FTP cannot be proxied.
- The `cloudflare_zone` data source accepts `name` directly (no `filter` block needed) — correct for v4.
- `cloudflare_page_rule` action arguments (`always_use_https` boolean, `cache_level = "cache_everything"`, `edge_cache_ttl` in seconds) all match the v4 schema.
- `cloudflare_tunnel` arguments `account_id`, `name`, and `secret` are all required and correctly used. Note: the tunnel CNAME target `<tunnel_id>.cfargotunnel.com` is the documented format.
- **Future-proofing caveat (not changed):** In Cloudflare provider v5, `cloudflare_record` has been renamed to `cloudflare_dns_record`, `cloudflare_tunnel` is superseded by `cloudflare_zero_trust_tunnel_cloudflared`, and Page Rules are being phased out in favor of the Rulesets engine (`cloudflare_ruleset`). The post pins `~> 4.0`, so the examples are internally consistent, but readers upgrading to v5 will need to migrate. Worth a follow-up post.
- The "CNAME flatten at apex" comment is accurate — Cloudflare supports CNAME flattening at the zone apex; AWS Route 53 does not (it offers ALIAS records as an alternative).
