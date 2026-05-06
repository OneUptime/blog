# Validation Summary: How to Set Up Cloudflare R2 Storage with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / HCL
- Cloudflare Terraform/OpenTofu provider
- Cloudflare R2
- Cloudflare R2 custom domains
- Cloudflare API tokens

## Sources Consulted
- Cloudflare Terraform provider overview: https://developers.cloudflare.com/api/terraform/
- Cloudflare R2 Terraform resources: https://developers.cloudflare.com/api/terraform/resources/r2
- Cloudflare R2 custom domain Terraform resource: https://developers.cloudflare.com/api/terraform/resources/r2/subresources/buckets/subresources/domains/subresources/custom/
- Cloudflare R2 public buckets documentation: https://developers.cloudflare.com/r2/buckets/public-buckets/
- Cloudflare R2 authentication and token model: https://developers.cloudflare.com/r2/api/tokens/
- Cloudflare API token permissions reference: https://developers.cloudflare.com/fundamentals/api/reference/permissions/
- Cloudflare Pipelines Terraform reference (current token resource pattern): https://developers.cloudflare.com/pipelines/reference/terraform/

## Issues Found
- The post pinned `cloudflare/cloudflare` to `~> 4.23`, but the examples mixed older provider conventions with features documented in the current provider. I updated the provider pin to `~> 5.19` and aligned the examples with the current resource schema.
- The bucket examples used uppercase location hints such as `WNAM`. Current Cloudflare API documentation lists R2 location values in lowercase, so I updated the examples to use `wnam`.
- The custom-domain section used outdated Worker resources and implied Workers were the normal way to expose R2 on a custom hostname. Cloudflare now has a first-class `cloudflare_r2_custom_domain` resource, so I replaced the Worker-based example with the direct R2 custom-domain configuration.
- The API token example used an outdated token schema (`policy` instead of `policies`) and an incorrect permission-group lookup pattern. I replaced it with the current `cloudflare_account_token` and `cloudflare_account_api_token_permission_groups_list` pattern, scoped to bucket-level object access.
- The original token output exposed only the raw token value, which is incomplete for R2 S3-compatible clients. I changed the outputs to expose the token ID as the access key ID and the SHA-256 of the token value as the secret access key, matching Cloudflare's R2 token documentation.
- The best-practices note saying to enable lifecycle rules "once Cloudflare R2 supports them" was outdated. I updated it to reflect that lifecycle rules are supported and should be used for transition/expiration policies as needed.

## Review Notes
- A Worker in front of R2 is still a valid pattern when you need authentication, URL rewriting, custom response handling, or other request-time logic. It is just no longer required for simple custom-domain exposure.
- The post mentions CORS management in the introduction but does not include a `cloudflare_r2_bucket_cors` example. That statement is still technically correct for the current provider.
- `tofu` and `terraform` were not installed in the review environment, so provider/schema validation was documentation-based rather than CLI-based.
