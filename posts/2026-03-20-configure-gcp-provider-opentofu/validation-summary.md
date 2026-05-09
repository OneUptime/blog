# Validation Summary: How to Configure the Google Cloud Provider in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Google Cloud Platform (GCP)
- HashiCorp Google provider (`hashicorp/google`)
- HashiCorp Google Beta provider (`hashicorp/google-beta`)
- HCL
- Google Cloud authentication and Application Default Credentials (ADC)

## Sources Consulted
- OpenTofu Settings: https://opentofu.org/docs/language/settings/
- OpenTofu Provider Configuration: https://opentofu.org/docs/language/providers/configuration/
- Google Cloud provider configuration reference (official provider source docs): https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/guides/provider_reference.html.markdown
- Google provider versions guide (official provider source docs): https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/guides/provider_versions.html.markdown
- Terraform Registry API for `hashicorp/google`: https://registry.terraform.io/v1/providers/hashicorp/google
- Terraform Registry API for `hashicorp/google-beta`: https://registry.terraform.io/v1/providers/hashicorp/google-beta
- Google Cloud SDK `gcloud auth application-default` reference: https://cloud.google.com/sdk/gcloud/reference/auth/application-default
- Google Cloud documentation, How Application Default Credentials works: https://cloud.google.com/docs/authentication/application-default-credentials

## Issues Found
- The introduction referred generically to "Workload Identity". The current provider docs describe this path as external credentials / Workload Identity Federation, so I updated the wording to be precise.
- The post described a strict credential lookup order that did not match the provider documentation and omitted documented credential environment variables and ADC sources. I replaced it with the provider's documented behavior and changed the CI/CD example to the official `GOOGLE_APPLICATION_CREDENTIALS` pattern.
- The minimal configuration pinned `hashicorp/google` to `~> 6.0`, which was outdated as of the validation date. I updated it to `~> 7.0` to match the current major provider line.
- The production example used `google-beta` without declaring it in `required_providers`, and it implied that provider defaults automatically carried over. I added a `google-beta` provider requirement, clarified that beta resources must set `provider = google-beta`, and duplicated `default_labels` in the `google-beta` block because the official docs state the two provider blocks are configured separately.
- The variables section omitted `project_a_id` and `project_b_id`, even though the multi-project example referenced both. I added the missing variable declarations so the snippets are internally consistent.
- The conclusion claimed `default_labels` ensures consistent labels across all resources. The provider docs limit this to resources with supported label fields, so I corrected that wording.

## Review Notes
- As of 2026-05-06, the Terraform Registry API reports `hashicorp/google` and `hashicorp/google-beta` at version `7.31.0`. The post now constrains examples to the current major line with `~> 7.0`.
- `default_labels` only applies to resources with a top-level `labels` field or a `labels` field nested under top-level `metadata`.
- I did not run `tofu init` or `tofu plan`, because the article contains illustrative snippets rather than a complete runnable configuration with project-specific credentials.
