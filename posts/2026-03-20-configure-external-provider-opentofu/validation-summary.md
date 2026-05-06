# Validation Summary: How to Configure External Provider with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- OpenTofu providers
- HashiCorp `external` provider
- HCL
- Shell environment variables

## Sources Consulted
- OpenTofu Provider Requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu Provider Configuration: https://opentofu.org/docs/language/providers/configuration/
- OpenTofu Registry API for `hashicorp/external` versions: https://registry.opentofu.org/v1/providers/hashicorp/external/versions
- HashiCorp `external` provider overview: https://github.com/hashicorp/terraform-provider-external/blob/main/docs/index.md
- HashiCorp `external` data source documentation: https://github.com/hashicorp/terraform-provider-external/blob/main/docs/data-sources/external.md
- HashiCorp `external` provider example: https://github.com/hashicorp/terraform-provider-external/blob/main/examples/data-sources/external.tf
- HashiCorp `external` provider changelog: https://github.com/hashicorp/terraform-provider-external/blob/main/CHANGELOG.md

## Issues Found
- The post described the `external` provider as if it managed external resources. I changed the description, introduction, and conclusion to reflect the documented behavior: it exposes an external program as a read-only data source.
- The provider installation example used placeholder provider names and sources. I replaced it with the real provider source, `hashicorp/external`, and a current version constraint based on the OpenTofu registry.
- The authentication section implied the provider has its own credential schema and provider block. I corrected this to explain that the provider itself has no authentication settings; credentials, if needed, belong to the external program being executed.
- The example used a nonexistent managed resource. I replaced it with the documented `data "external"` usage and updated the output to reference `data.external.main.result`.
- The best practices were written for generic API-backed providers. I updated them to match the `external` provider's documented limitations and intended usage.

## Review Notes
- Latest version found in the OpenTofu registry during validation on 2026-05-06 was `2.3.5`.
- The example assumes `example-data-source.sh` exists and follows the documented JSON-over-stdin/stdout protocol for the `external` data source.
- The OpenTofu CLI was not installed in this workspace, so validation was performed against official documentation and provider source material rather than by running `tofu validate`.
