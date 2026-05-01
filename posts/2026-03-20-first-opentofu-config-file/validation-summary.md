# Validation Summary: How to Write Your First OpenTofu Configuration File

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- HCL (HashiCorp Configuration Language)
- OpenTofu CLI
- OpenTofu providers (`hashicorp/local`, `hashicorp/aws`)
- AWS EC2 configuration examples

## Sources Consulted
- OpenTofu Docs: Files and Directories — https://opentofu.org/docs/language/files/
- OpenTofu Docs: Configuration Syntax — https://opentofu.org/docs/language/syntax/configuration/
- OpenTofu Docs: Provider Requirements — https://opentofu.org/docs/language/providers/requirements/
- OpenTofu Docs: Provider Configuration — https://opentofu.org/docs/language/providers/configuration/
- OpenTofu Docs: `tofu init` — https://opentofu.org/docs/cli/init/
- OpenTofu Docs: `tofu plan` — https://opentofu.org/docs/cli/commands/plan/
- OpenTofu Docs: `tofu apply` — https://opentofu.org/docs/cli/commands/apply/
- OpenTofu Docs: `tofu output` — https://opentofu.org/docs/cli/commands/output/
- OpenTofu Docs: `tofu destroy` — https://opentofu.org/docs/cli/commands/destroy/
- HashiCorp local provider docs: `local_file` resource — https://raw.githubusercontent.com/hashicorp/terraform-provider-local/main/docs/resources/file.md
- HashiCorp AWS provider docs: `aws_instance` resource — https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/instance.html.markdown

## Issues Found
1. **Configuration file extensions were too narrow.** The post said OpenTofu configurations consist of `.tf` files, but OpenTofu also supports `.tofu` files. Updated the text to mention both supported extensions.

2. **The generic resource description was too specific to infrastructure providers.** The post said a resource block creates an "infrastructure object," but the article's first working example uses the `local` provider, where the managed object is a local file. Updated the wording to "managed object" so it is accurate across providers.

3. **The EC2 AMI example used a stale hard-coded AMI ID.** A fixed AMI ID is region-specific and can become invalid over time. Replaced it with the current Amazon Linux 2023 SSM parameter format shown in the official `aws_instance` provider docs.

## Review Notes
- The empty `provider "local" {}` block is valid, but OpenTofu can also infer an empty default provider configuration when a provider has no required configuration arguments.
- `tofu` was not installed in the local workspace, so CLI command verification was done against the official OpenTofu documentation rather than local `--help` output.
- The `local_file` example is technically correct, but the local provider documentation notes that applying the same configuration from another machine where the file does not exist can cause OpenTofu to plan recreating it.
