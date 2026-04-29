# Validation Summary: How to Manage Fastly CDN Resources with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Fastly Terraform/OpenTofu provider
- Fastly CDN services
- Fastly VCL snippets
- Fastly managed TLS

## Sources Consulted
- Fastly provider docs overview: https://registry.terraform.io/providers/fastly/fastly/latest/docs
- `fastly_service_vcl` resource docs: https://github.com/fastly/terraform-provider-fastly/blob/main/docs/resources/service_vcl.md
- `fastly_tls_subscription` resource docs: https://github.com/fastly/terraform-provider-fastly/blob/main/docs/resources/tls_subscription.md
- `fastly_tls_subscription_validation` resource docs: https://github.com/fastly/terraform-provider-fastly/blob/main/docs/resources/tls_subscription_validation.md
- Fastly provider changelog: https://github.com/fastly/terraform-provider-fastly/blob/main/CHANGELOG.md
- Fastly guide for managed certificates: https://docs.fastly.com/en/guides/serving-https-traffic-using-fastly-managed-certificates

## Issues Found
- Updated the provider pin from `~> 5.0` to `~> 9.0` because the current official provider line is 9.x, with 9.1.0/9.1.1 published in April 2026.
- Fixed invalid `fastly_service_vcl` backend arguments by changing `max_connections` to `max_conn`, which is the documented provider field.
- Removed the duplicate `force_destroy` attribute from the same resource block because duplicate HCL attributes are invalid.
- Corrected the backend weighting example. A low `weight` does not mean failover, so the secondary backend was renamed and the comment was changed to reflect weighted traffic share instead.
- Added explicit `auto_loadbalance` and backend-to-healthcheck references so the backend and health check example matches how the provider actually wires load balancing and health checks together.
- Fixed `header` blocks by replacing the invalid `dst` argument with the documented `destination` argument and by removing `ignore_if_set` from a `delete` action example where it does not apply.
- Corrected the cache-bypass condition from `REQUEST` to `CACHE` because `cache_setting.cache_condition` must reference a condition of type `CACHE`.
- Reworked the first cache-setting example so it demonstrates actual TTL-based caching instead of an unconditional `pass` action labeled as TTL configuration.
- Clarified the TLS validation workflow by noting that the ACME challenge records returned by `managed_dns_challenges` must be created with an external DNS provider before `fastly_tls_subscription_validation` can succeed.

## Review Notes
- `activate = true` is still technically correct, but the provider documentation states this is already the default behavior for `fastly_service_vcl`.
- The TLS example is intentionally partial because DNS validation requires resources from the DNS provider managing the zone; the post now states that prerequisite explicitly.
