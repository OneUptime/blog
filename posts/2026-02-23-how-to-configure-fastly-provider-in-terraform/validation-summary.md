# Validation Summary: How to Configure Fastly Provider in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Fastly Terraform provider
- Fastly VCL services
- Fastly VCL snippets
- Fastly edge dictionaries
- Fastly S3 log streaming

## Sources Consulted
- Fastly Terraform provider documentation: https://registry.terraform.io/providers/fastly/fastly/latest/docs
- Fastly Terraform provider `fastly_service_vcl` resource documentation: https://registry.terraform.io/providers/fastly/fastly/latest/docs/resources/service_vcl
- Fastly Terraform provider v5.16.0 `fastly_service_vcl` documentation: https://github.com/fastly/terraform-provider-fastly/blob/v5.16.0/docs/resources/service_vcl.md
- Fastly Terraform provider `fastly_service_dictionary_items` documentation: https://registry.terraform.io/providers/fastly/fastly/latest/docs/resources/service_dictionary_items
- Fastly API token documentation: https://www.fastly.com/documentation/reference/api/auth-tokens/user/
- Fastly Terraform developer guide: https://www.fastly.com/documentation/guides/integrations/non-fastly-services/developer-guide-terraform/
- Fastly VCL `table.contains` documentation: https://www.fastly.com/documentation/reference/vcl/functions/table/table-contains/
- Fastly VCL `table.lookup` documentation: https://www.fastly.com/documentation/reference/vcl/functions/table/table-lookup/
- Fastly VCL `error` statement documentation: https://www.fastly.com/documentation/reference/vcl/statements/error/
- Fastly custom log format documentation: https://www.fastly.com/documentation/guides/integrations/streaming-logs/custom-log-formats/
- Terraform CLI import command documentation: https://developer.hashicorp.com/terraform/cli/commands/import
- Referenced OneUptime link: https://oneuptime.com/blog/post/2026-02-23-how-to-use-multiple-provider-instances-in-a-single-configuration/view

## Issues Found
- The description claimed the post covered Compute services, but the post only covers VCL services, VCL snippets, dictionaries, and logging. Removed the Compute services reference from the description.
- The API token guidance implied that `purge_all` plus `global:read` is enough for full management. Fastly documents `global:read` as read-only and `purge_all` as purge-only, so the guidance now recommends `global` scope with sufficient user permissions for full management.
- The provider version constraint used `~> 5.0`, while the current provider major version is 9.x. Updated the example to `~> 9.0`.
- A `force_destroy` comment incorrectly said it always activates changes. Fastly provider docs define it as allowing destruction of active services, so the comment was corrected.
- The basic CDN example described the apex domain as a redirect without configuring any redirect. Updated the comment to describe it as an apex domain only.
- A backend comment said "Health check and timeouts" but the example only configured timeout fields. Updated it to "Connection timeouts."
- The custom 404 VCL snippet was presented as general 404 handling, but a `type = "error"` snippet only runs for synthetic error handling. Updated the wording to describe synthetic 404 errors.
- The edge dictionary redirect snippet used `table.lookup` as a condition and `error 301` without setting a `Location` header. Replaced it with `table.contains`, a synthetic error status, and an error-phase snippet that sets `obj.status` and `obj.http.Location`.
- The dictionary items resource omitted `manage_items = true`, which is needed when Terraform should keep HCL-defined dictionary items authoritative. Added `manage_items = true`.
- The S3 logging JSON format used `%%{...}V`, which escapes a literal percent sign in Fastly log formats. Changed those entries to `%{...}V`.
- The import section said to import by ID and active version but only showed a service ID. Updated the text and added the documented `service_id@version` form for importing a specific version.
- The versioning best practice implied every apply creates a version. Updated it to say applies with versioned service configuration changes create and activate a new version by default.

## Review Notes
Terraform CLI was not installed in the local environment, so I could not run `terraform validate`. The HCL examples were reviewed against the official Fastly Terraform provider schemas and Terraform CLI documentation instead.
