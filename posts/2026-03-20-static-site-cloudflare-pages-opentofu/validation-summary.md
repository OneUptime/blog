# Validation Summary: How to Deploy Static Sites on Cloudflare Pages with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Cloudflare Terraform provider
- Cloudflare Pages
- Cloudflare DNS
- Cloudflare Web Analytics
- HCL / Terraform configuration

## Sources Consulted
- Cloudflare Terraform provider v4.52.5 `cloudflare_pages_project` resource documentation: https://raw.githubusercontent.com/cloudflare/terraform-provider-cloudflare/v4.52.5/docs/resources/pages_project.md
- Cloudflare Terraform provider v4.52.5 `cloudflare_pages_domain` resource documentation: https://raw.githubusercontent.com/cloudflare/terraform-provider-cloudflare/v4.52.5/docs/resources/pages_domain.md
- Cloudflare Terraform provider v4.52.5 `cloudflare_record` resource documentation: https://raw.githubusercontent.com/cloudflare/terraform-provider-cloudflare/v4.52.5/docs/resources/record.md
- Cloudflare Terraform provider v4.52.5 `cloudflare_web_analytics_site` resource documentation: https://raw.githubusercontent.com/cloudflare/terraform-provider-cloudflare/v4.52.5/docs/resources/web_analytics_site.md
- Cloudflare Terraform provider v4.52.5 `cloudflare_zone` data source documentation: https://raw.githubusercontent.com/cloudflare/terraform-provider-cloudflare/v4.52.5/docs/data-sources/zone.md
- Cloudflare Pages custom domains documentation: https://developers.cloudflare.com/pages/configuration/custom-domains/
- Cloudflare Pages preview deployments documentation: https://developers.cloudflare.com/pages/configuration/preview-deployments/
- Cloudflare Pages environment variables and secrets documentation: https://developers.cloudflare.com/pages/functions/bindings/
- Cloudflare DNS proxy status documentation: https://developers.cloudflare.com/dns/proxy-status/
- Cloudflare DNS TTL documentation: https://developers.cloudflare.com/dns/manage-dns-records/reference/ttl/
- OpenTofu provider requirements documentation: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu sensitive data in state documentation: https://opentofu.org/docs/language/state/sensitive-data/
- Cloudflare Terraform provider v5 GA changelog: https://developers.cloudflare.com/changelog/post/2025-02-03-terraform-v5-provider/

## Issues Found

1. **Deprecated DNS record attribute**: The custom domain DNS examples used `value` in `cloudflare_record`. In Cloudflare provider v4, `value` is deprecated and `content` is the supported attribute. Updated both CNAME records to use `content`.

2. **Unbound `www` hostname**: The post created a `www` CNAME but only associated the apex domain with the Pages project. Cloudflare Pages custom domains must be associated with the Pages project; adding only the DNS record is not sufficient. Added a `cloudflare_pages_domain` resource for `www.${var.domain_name}` and pointed the `www` CNAME directly at the Pages subdomain.

3. **Overbroad preview deployment claim**: The intro said Pages provides preview deployments for every PR. Cloudflare documents that PR preview URLs are created for pull requests originating from the connected repository. Narrowed the wording accordingly.

4. **Incorrect Web Analytics output description**: The example used `auto_install = true` but described the output tag as something to add to HTML. With `auto_install = true`, Cloudflare injects the snippet for orange-clouded sites; `site_tag` is an identifier, not the HTML snippet. Updated the output description.

5. **Overstated secrets/logging claim**: The best practices section claimed secrets are not exposed in logs or the dashboard. Cloudflare documents that secrets are encrypted and not visible in the dashboard after creation, but application code can still leak secrets if it logs them. Updated the wording and added a state-file protection caveat.

6. **Proxy feature wording**: The best practices section implied WAF is enabled "without additional configuration." Cloudflare documents that proxied records route traffic through Cloudflare and make security/performance features such as DDoS protection, caching, and WAF available. Updated the wording to avoid implying all WAF configuration is automatic.

## Review Notes
- The post's examples intentionally target Cloudflare provider v4 via `version = "~> 4.0"`. Cloudflare provider v5 is generally available and uses breaking schema changes for several resources, including DNS records and Pages deployment variables. A future larger update could migrate the article to v5, but the corrected examples are valid for the pinned v4 provider line.
- The `deployment_configs` environment variables and `secrets` syntax matches the v4 `cloudflare_pages_project` schema.
- The `cloudflare_pages_domain`, `cloudflare_zone`, `cloudflare_web_analytics_site`, and proxied TTL examples match the consulted provider and Cloudflare DNS documentation.
- `tofu` and `terraform` were not installed in the local environment, so validation was documentation-based rather than a local `tofu validate` run.
