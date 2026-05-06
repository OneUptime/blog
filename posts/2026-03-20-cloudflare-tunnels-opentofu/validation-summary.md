# Validation Summary: How to Cloudflare Tunnels with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Cloudflare Terraform provider
- Cloudflare Tunnel
- Cloudflare Zero Trust
- Cloudflare DNS
- HCL

## Sources Consulted
- OpenTofu Provider Requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu Dependency Lock File: https://opentofu.org/docs/language/files/dependency-lock/
- OpenTofu Workspaces: https://opentofu.org/docs/language/state/workspaces/
- Cloudflare Terraform provider overview: https://developers.cloudflare.com/terraform/
- Cloudflare Tunnel overview: https://developers.cloudflare.com/tunnel/
- Cloudflare Deploy Tunnels with Terraform guide: https://developers.cloudflare.com/tunnel/deployment-guides/terraform/
- Cloudflare provider docs: https://raw.githubusercontent.com/cloudflare/terraform-provider-cloudflare/main/docs/index.md
- Cloudflare `cloudflare_zero_trust_tunnel_cloudflared` resource docs: https://raw.githubusercontent.com/cloudflare/terraform-provider-cloudflare/main/docs/resources/zero_trust_tunnel_cloudflared.md
- Cloudflare `cloudflare_zero_trust_tunnel_cloudflared_config` resource docs: https://raw.githubusercontent.com/cloudflare/terraform-provider-cloudflare/main/docs/resources/zero_trust_tunnel_cloudflared_config.md
- Cloudflare `cloudflare_zero_trust_tunnel_cloudflared_token` data source docs: https://raw.githubusercontent.com/cloudflare/terraform-provider-cloudflare/main/docs/data-sources/zero_trust_tunnel_cloudflared_token.md
- Cloudflare `cloudflare_dns_record` resource docs: https://raw.githubusercontent.com/cloudflare/terraform-provider-cloudflare/main/docs/resources/dns_record.md
- Terraform Registry API for `cloudflare/cloudflare`: https://registry.terraform.io/v1/providers/cloudflare/cloudflare

## Issues Found
- The post referred to a dedicated "Cloudflare Tunnels provider", but the supported provider is the Cloudflare provider. I corrected the description and introduction to use the actual provider name and scope.
- The provider installation example used placeholder names and a fake source address. I replaced it with the fully-qualified official provider source `registry.terraform.io/cloudflare/cloudflare` and pinned the example to the current stable provider line, `~> 5.19`.
- The authentication section used generic environment variables and a non-existent provider block. I updated it to the documented `CLOUDFLARE_API_TOKEN` environment variable and `provider "cloudflare"`.
- The example resource block used a fake resource type that would not work. I replaced it with a valid Cloudflare Tunnel example using `cloudflare_zero_trust_tunnel_cloudflared`, `cloudflare_dns_record`, `cloudflare_zero_trust_tunnel_cloudflared_config`, and `cloudflare_zero_trust_tunnel_cloudflared_token`.
- The variables and outputs referenced the placeholder resource. I updated them to match the corrected Tunnel example and marked the tunnel token output as `sensitive`.
- The best-practices section referred generically to API keys and loosely suggested workspaces. I updated it to recommend API tokens, committing `.terraform.lock.hcl`, and separating state and credentials per environment.

## Review Notes
- As of 2026-05-06, the Terraform Registry API reports `cloudflare/cloudflare` stable version `5.19.1`. The post now constrains the example to `~> 5.19`.
- OpenTofu still uses the `terraform {}` block for `required_providers`, so the corrected provider installation snippet is valid for OpenTofu.
- The example uses the fully-qualified provider source address so OpenTofu does not rely on its default registry hostname resolution for a third-party provider.
- I did not run `tofu init` or `tofu validate`, because the article snippets require live Cloudflare credentials, account IDs, and zone IDs to be exercised end-to-end.
