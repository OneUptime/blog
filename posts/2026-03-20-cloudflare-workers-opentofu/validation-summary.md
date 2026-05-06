# Validation Summary: How to Cloudflare Workers with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Cloudflare Terraform provider
- Cloudflare Workers
- HCL

## Sources Consulted
- OpenTofu Settings: https://opentofu.org/docs/language/settings/
- OpenTofu Provider Requirements: https://opentofu.org/docs/v1.9/language/providers/requirements/
- Cloudflare Terraform provider docs: https://developers.cloudflare.com/api/terraform/
- Cloudflare `cloudflare_workers_script` resource docs: https://raw.githubusercontent.com/cloudflare/terraform-provider-cloudflare/main/docs/resources/workers_script.md
- Cloudflare `cloudflare_workers_route` resource docs: https://raw.githubusercontent.com/cloudflare/terraform-provider-cloudflare/main/docs/resources/workers_route.md
- Cloudflare provider examples: https://raw.githubusercontent.com/cloudflare/terraform-provider-cloudflare/main/examples/resources/cloudflare_workers_script/resource.tf
- Cloudflare provider test fixtures for `cloudflare_workers_script`: https://raw.githubusercontent.com/cloudflare/terraform-provider-cloudflare/main/internal/services/workers_script/testdata/module.tf

## Issues Found
- The provider installation example used placeholder names and a fake source address. I replaced it with the current Cloudflare provider source `cloudflare/cloudflare` and a pinned v5.19 provider constraint.
- The authentication example used generic environment variables and a non-existent `provider_name` block. I updated it to the supported `CLOUDFLARE_API_TOKEN` environment variable and the `cloudflare` provider block.
- The resource example used a placeholder resource type that would not work. I replaced it with a valid `cloudflare_workers_script` resource using a module Worker and `compatibility_date`.
- The variables and outputs referenced the placeholder resource. I updated them to match the corrected Cloudflare Workers example.
- The best-practices section referred to API keys generically. I updated it to recommend API tokens, which are the preferred Cloudflare authentication method.

## Review Notes
- Cloudflare’s current provider documentation notes that for more direct control over Workers deployments, the beta `cloudflare_worker`, `cloudflare_worker_version`, and `cloudflare_workers_deployment` resources are recommended. The corrected post remains valid because `cloudflare_workers_script` is still documented and supported.
