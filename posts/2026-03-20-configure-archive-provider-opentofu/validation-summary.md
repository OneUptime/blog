# Validation Summary: How to Configure Archive Provider with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- HashiCorp Archive provider (`hashicorp/archive`)
- HCL configuration language
- Local archive creation (`zip`, `tar.gz`)

## Sources Consulted
- OpenTofu Settings: https://opentofu.org/docs/language/settings/
- OpenTofu Provider Requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu Provider Configuration: https://opentofu.org/docs/language/providers/configuration/
- Archive provider overview (official provider docs): https://raw.githubusercontent.com/hashicorp/terraform-provider-archive/main/docs/index.md
- `archive_file` resource (official provider docs): https://raw.githubusercontent.com/hashicorp/terraform-provider-archive/main/docs/resources/file.md
- `archive_file` data source (official provider docs): https://raw.githubusercontent.com/hashicorp/terraform-provider-archive/main/docs/data-sources/file.md
- Archive provider latest release: https://github.com/hashicorp/terraform-provider-archive/releases/tag/v2.7.1

## Issues Found
- The original post was a generic provider template rather than an accurate Archive provider guide. The `required_providers` block used placeholder names and a fake source address. I replaced it with `archive = { source = "hashicorp/archive" version = "~> 2.7" }`.
- The authentication section was incorrect. The Archive provider does not authenticate to an external API and the official docs state that it requires no configuration. I removed the fake environment variables and replaced them with an empty `provider "archive" {}` block.
- The example resource `provider_example_resource` does not exist. I replaced it with a valid `archive_file` resource using documented arguments `type`, `source_dir`, and `output_path`.
- The variables and outputs were tied to the placeholder resource and would not work. I updated them to use real inputs (`source_dir`, `output_path`) and real outputs (`output_path`, `output_base64sha256`).
- The introduction and conclusion inaccurately described the provider as managing generic "Archive resources" like a remote service. I corrected the framing to match the actual provider behavior: it creates local `zip` and `tar.gz` archives.
- The best-practices section included irrelevant advice about API keys and provider aliases/workspaces. I replaced it with validated guidance around version pinning, committing `.terraform.lock.hcl`, using the resource vs. data source appropriately, deterministic file modes, and `excludes`.

## Review Notes
- The provider currently offers both an `archive_file` resource and an `archive_file` data source. The official docs note that the data source generates the archive during plan, so the resource is the safer default when the artifact must survive through apply or multi-phase CI.
- As of 2026-05-06, the latest tagged Archive provider release I verified is `v2.7.1`, published on May 13, 2025. The post now pins the current `2.7` line with `~> 2.7`.
- I did not run `tofu init` or `tofu plan` locally because neither `tofu` nor `terraform` is installed in this workspace.
