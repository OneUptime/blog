# Validation Summary: How to Configure the Local Provider in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- HashiCorp Local provider (`hashicorp/local`)
- HCL
- Local filesystem resources (`local_file`, `local_sensitive_file`)

## Sources Consulted
- OpenTofu provider requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu `tofu init`: https://opentofu.org/docs/cli/init/
- OpenTofu `tofu validate`: https://opentofu.org/docs/cli/commands/validate/
- OpenTofu `tofu plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `tofu apply`: https://opentofu.org/docs/cli/commands/apply/
- Local provider overview: https://github.com/hashicorp/terraform-provider-local
- `local_file` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-local/main/docs/resources/file.md
- `local_sensitive_file` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-local/main/docs/resources/sensitive_file.md
- `local_file` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-local/main/docs/data-sources/file.md

## Issues Found
- The original post was a generic placeholder for an API-backed provider (`hashicorp/example`) and did not describe the Local provider at all. I replaced the provider block with the correct `hashicorp/local` requirement and removed fictional provider authentication.
- The prerequisites incorrectly required API credentials. I removed that requirement because the Local provider does not authenticate to any external service.
- The resource examples used nonexistent `example_*` resource types unrelated to the Local provider. I replaced them with working `local_file` and `local_sensitive_file` examples, including valid permission settings and outputs supported by the provider schema.
- The common issues section discussed authentication errors and rate limiting, which do not apply to the Local provider. I replaced those with provider-specific caveats from the docs: cross-machine recreation noise, deprecated `sensitive_content`, and `local_file` data source read failures when a file is missing.
- The conclusion overstated the provider as a way to manage an external service. I updated it to accurately describe local filesystem artifact generation and the caveat that behavior depends on the machine running OpenTofu.
- I verified the replacement configuration locally with OpenTofu v1.11.6 using `tofu init -backend=false`, `tofu validate`, `tofu plan`, and `tofu apply`.

## Review Notes
- Verified against OpenTofu v1.11.6 on April 29, 2026. The HCL used in the post is also compatible with the stated OpenTofu v1.6+ requirement because it relies on standard provider requirements, `local_file`, `local_sensitive_file`, and basic outputs.
- The Local provider docs note that applying from multiple machines can produce recreation diffs because the resources depend on the local filesystem. The post now mentions this caveat.
