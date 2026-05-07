# Validation Summary: How to Configure the Archive Provider in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- HashiCorp Archive provider (`hashicorp/archive`)
- HCL configuration language
- ZIP archive generation for deployment artifacts

## Sources Consulted
- [OpenTofu Providers documentation](https://opentofu.org/docs/language/providers/)
- [OpenTofu Data Sources documentation](https://opentofu.org/docs/language/data-sources/)
- [Archive provider overview](https://github.com/hashicorp/terraform-provider-archive/blob/main/docs/index.md)
- [Archive provider `archive_file` resource documentation](https://github.com/hashicorp/terraform-provider-archive/blob/main/docs/resources/file.md)
- [Archive provider `archive_file` data source documentation](https://github.com/hashicorp/terraform-provider-archive/blob/main/docs/data-sources/file.md)
- [Archive provider changelog](https://github.com/hashicorp/terraform-provider-archive/blob/main/CHANGELOG.md)
- [Archive provider releases](https://releases.hashicorp.com/terraform-provider-archive/)

## Issues Found
1. **Wrong provider and configuration model**: The post used a placeholder `hashicorp/example` provider and described credential-based provider configuration. The archive provider is `hashicorp/archive` and its official docs state that it requires no configuration. I replaced the provider block with a real `required_providers` stanza and removed the false authentication guidance.
2. **Incorrect prerequisites and authentication section**: The original post claimed API credentials were required and showed environment variables that do not exist for this provider. I replaced that section with local archive input definitions because the archive provider operates on local files only.
3. **Invalid resource examples**: The original `example_project`, `example_team`, `example_alert`, and `example_backup_policy` resources were unrelated to the archive provider and would not work. I replaced them with valid `archive_file` resource examples using `source_dir`, `output_path`, `excludes`, `output_file_mode`, and `exclude_symlink_directories`, all supported by the provider docs.
4. **Incorrect outputs**: The original outputs referenced nonexistent placeholder resources. I changed them to real archive outputs: `output_path`, `output_base64sha256`, and `output_size`.
5. **Misleading operational guidance**: The original common-issues section discussed authentication, rate limiting, and generic provider conflicts. I replaced it with archive-provider-specific notes covering no-auth behavior, empty-archive errors introduced in provider v2.4.2+, and the documented plan-time behavior of `data "archive_file"` versus `resource "archive_file"`.

## Review Notes
- The post is now technically correct for OpenTofu with the `hashicorp/archive` provider.
- The archive provider supports both a data source and a resource. The data source builds the archive during plan, while the resource is better suited to multi-step CI/CD workflows where the generated file must survive between plan and apply.
- The examples pin to `~> 2.7`, which is consistent with the current provider line as of May 7, 2026 and includes earlier additions such as `tar.gz` support and glob-pattern exclusions.
