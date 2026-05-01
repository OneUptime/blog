# Validation Summary: How to Configure the External Provider in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HashiCorp External provider (`hashicorp/external`)
- HCL
- Bash
- `jq`

## Sources Consulted
- OpenTofu Provider Requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu Provider Configuration: https://opentofu.org/docs/language/providers/configuration/
- OpenTofu `init`: https://opentofu.org/docs/cli/init/
- OpenTofu `validate`: https://opentofu.org/docs/v1.9/cli/commands/validate/
- OpenTofu `plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply`: https://opentofu.org/docs/v1.11/cli/commands/apply/
- HashiCorp External provider documentation: https://registry.terraform.io/providers/hashicorp/external/latest/docs/data-sources/external
- External provider source documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-external/main/docs/data-sources/external.md
- External provider example configuration: https://raw.githubusercontent.com/hashicorp/terraform-provider-external/main/examples/data-sources/external.tf
- External provider shell example: https://raw.githubusercontent.com/hashicorp/terraform-provider-external/main/examples/json-processing.sh

## Issues Found
- The post used a fictitious `hashicorp/example` provider and nonexistent `example_*` resources, which do not describe the external provider. I replaced them with the real `hashicorp/external` provider requirement and `data "external"` examples.
- The original post implied that the external provider manages resources. I corrected the examples and conclusion to show that it exposes read-only data from an external program.
- The original authentication guidance used arbitrary provider environment variables that are not defined by the external provider. I changed this to a technically accurate pattern where the external script reads environment variables passed through from the OpenTofu process.
- The original post omitted the external program protocol. I updated the examples and issue notes to reflect that the program reads JSON from `stdin`, writes JSON to `stdout`, and that both query inputs and result values must be strings.

## Review Notes
- `tofu` was not installed in the local environment, so CLI behavior was verified against official OpenTofu documentation rather than local `--help` output.
- The external provider is best treated as a fallback when no dedicated provider or native data source is available.
