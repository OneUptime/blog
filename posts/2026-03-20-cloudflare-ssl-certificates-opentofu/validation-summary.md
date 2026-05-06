# Validation Summary: How to Cloudflare Ssl Certificates with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- Cloudflare Terraform provider
- Cloudflare SSL/TLS advanced certificate packs

## Sources Consulted
- OpenTofu provider requirements documentation: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu version constraints documentation: https://opentofu.org/docs/language/expressions/version-constraints/
- Cloudflare Terraform provider documentation: https://developers.cloudflare.com/api/terraform
- Cloudflare Terraform SSL resource documentation: https://developers.cloudflare.com/api/terraform/resources/ssl
- Cloudflare Advanced certificates documentation: https://developers.cloudflare.com/ssl/edge-certificates/advanced-certificate-manager/
- Cloudflare API reference for ordering advanced certificate packs: https://developers.cloudflare.com/api/resources/ssl/subresources/certificate_packs/methods/create/

## Issues Found
- The original post used placeholder provider metadata (`provider_name`, `provider-namespace/provider-name`) instead of the real Cloudflare provider. I replaced it with `cloudflare = { source = "cloudflare/cloudflare", version = "~> 5.19.0" }`, which matches the official provider documentation.
- The authentication section used fictitious environment variables (`PROVIDER_API_KEY` and `PROVIDER_API_SECRET`). I replaced them with the documented Cloudflare token environment variable `CLOUDFLARE_API_TOKEN` and updated the provider block to `provider "cloudflare"`.
- The example resource (`provider_example_resource`) did not exist. I replaced it with the documented `cloudflare_certificate_pack` resource and valid arguments: `zone_id`, `certificate_authority`, `hosts`, `type`, `validation_method`, `validity_days`, and `cloudflare_branding`.
- The variables and output no longer matched the real resource after the example was corrected. I updated them to `zone_id`, `zone_name`, and `cloudflare_certificate_pack.main.id`.
- The original post implied a generic “Cloudflare SSL Certificates provider,” which is inaccurate. I corrected the description and introduction to refer to the Cloudflare provider managing SSL certificate resources, and I added the required note that the `cloudflare_certificate_pack` example uses Advanced Certificate Manager.

## Review Notes
- The validated example specifically covers ordering an advanced edge certificate pack in Cloudflare. It does not cover other certificate-related resources such as custom certificates or Origin CA certificates.
- Advanced certificate packs require the Advanced Certificate Manager add-on. Readers on zones without that add-on will need to use a different SSL/TLS workflow.
