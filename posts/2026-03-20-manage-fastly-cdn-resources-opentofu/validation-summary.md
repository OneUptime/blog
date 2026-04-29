# Validation Summary: How to Manage Fastly CDN Resources with OpenTofu - Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Fastly Terraform/OpenTofu provider
- Fastly CDN services
- Fastly VCL snippets
- Fastly TLS subscriptions
- Fastly S3 log streaming

## Sources Consulted
- Fastly Terraform Provider docs (`service_vcl`) — https://raw.githubusercontent.com/fastly/terraform-provider-fastly/main/docs/resources/service_vcl.md
- Fastly Terraform Provider docs (`tls_subscription`) — https://raw.githubusercontent.com/fastly/terraform-provider-fastly/main/docs/resources/tls_subscription.md
- Fastly Terraform Provider docs (`tls_subscription_validation`) — https://raw.githubusercontent.com/fastly/terraform-provider-fastly/main/docs/resources/tls_subscription_validation.md
- Fastly Terraform Provider docs (`tls_configuration` data source) — https://raw.githubusercontent.com/fastly/terraform-provider-fastly/main/docs/data-sources/tls_configuration.md
- Fastly Terraform Provider docs (`index`) — https://raw.githubusercontent.com/fastly/terraform-provider-fastly/main/docs/index.md
- Fastly Terraform Provider changelog — https://raw.githubusercontent.com/fastly/terraform-provider-fastly/main/CHANGELOG.md
- Fastly documentation: Forcing an HTTPS redirect — https://www.fastly.com/documentation/guides/full-site-delivery/domains-and-origins/forcing-an-https-redirect/
- Fastly documentation: `Fastly-SSL` header — https://www.fastly.com/documentation/reference/http/http-headers/Fastly-SSL/
- Fastly documentation: HTTP status codes and Fastly — https://www.fastly.com/documentation/reference/http/http-statuses/
- Fastly documentation: `error` statement in VCL — https://www.fastly.com/documentation/reference/vcl/statements/error/
- Fastly documentation: `vcl_error` — https://www.fastly.com/documentation/reference/vcl/subroutines/error/
- Fastly documentation: `fastly_info.edge.is_tls` — https://www.fastly.com/documentation/reference/vcl/variables/client-connection/fastly-info-edge-is-tls/

## Issues Found

1. **Provider authentication example was internally inconsistent.** The post configured `api_key = var.fastly_api_key` but the shell example exported `FASTLY_API_KEY`. Fastly reads `FASTLY_API_KEY` directly as a provider environment variable; it does not populate `var.fastly_api_key`. Changed the provider block to `provider "fastly" {}` so the example works with the exported environment variable.

2. **Provider version was outdated.** The post pinned `~> 5.0`, while the current official Fastly provider documentation and changelog show the active provider line is 9.x, with 9.1.1 released on April 22, 2026. Updated the example to `>= 9.1.1`.

3. **The HTTPS redirect VCL example used deprecated and risky patterns.** It checked `req.http.Fastly-SSL`, which Fastly documents as deprecated and potentially spoofable, and it used Fastly-reserved status code `801`, which Fastly advises customers not to rely on in custom VCL. Replaced this with `fastly_info.edge.is_tls` and a custom `601` error handled in `vcl_error`.

4. **The HTTPS redirect VCL example had invalid delivery syntax.** The snippet ended with `deliver;`, but Fastly VCL requires `return (deliver);` in `vcl_error`. Updated the snippet accordingly.

5. **The TLS subscription example needed a clarification to be operationally accurate.** `fastly_tls_subscription` exposes DNS challenge data, but certificate issuance still depends on creating those DNS records. Added a brief note explaining that the output contains the DNS challenge records that must be created with the DNS provider.

## Review Notes
- The `fastly_service_vcl`, `backend`, `cache_setting`, `condition`, `snippet`, `logging_s3`, `fastly_tls_subscription`, and `activate` examples otherwise match the current provider schemas.
- The TLS section now accurately describes subscription creation and challenge output, but it still stops short of a full end-to-end managed TLS workflow. A complete automation would typically also manage the DNS challenge records and, after validation, point the domain at the DNS records from an appropriate `fastly_tls_configuration`.
