# Validation Summary: How to Report Bugs in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu language / HCL
- AWS provider
- GitHub issue reporting
- LocalStack

## Sources Consulted
- OpenTofu bug reporting process: https://github.com/opentofu/opentofu/blob/main/BUG_REPORTS.md
- OpenTofu `tofu version` command docs: https://opentofu.org/docs/cli/commands/version/
- OpenTofu `tofu providers` command docs: https://opentofu.org/docs/cli/commands/providers/
- OpenTofu dependency lock file docs: https://opentofu.org/docs/language/files/dependency-lock/
- OpenTofu debugging docs: https://opentofu.org/docs/internals/debugging/
- OpenTofu provider requirements docs: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu provider configuration docs: https://opentofu.org/docs/language/providers/configuration/
- OpenTofu `for_each` docs: https://opentofu.org/docs/language/meta-arguments/for_each/
- OpenTofu types and values docs: https://opentofu.org/docs/language/expressions/types/
- AWS provider docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources
- AWS provider custom endpoints guide: https://registry.terraform.io/providers/hashicorp/aws/2.33.0/docs/guides/custom-service-endpoints
- AWS provider v5 upgrade guide: https://registry.terraform.io/providers/-/aws/latest/docs/guides/version-5-upgrade
- OpenTofu releases: https://github.com/opentofu/opentofu/releases
- OpenTofu core issues chooser: https://github.com/opentofu/opentofu/issues/new/choose
- OpenTofu registry issues chooser: https://github.com/opentofu/registry/issues/new/choose

## Issues Found
- The "Verify you're on the latest version" step used `tofu version`, which reports the currently installed OpenTofu version and installed providers rather than checking GitHub for the latest release. I changed the wording to "Check your current version" and kept the separate retest-on-latest-release step.
- The debug-information section said `tofu providers` would show provider versions. Official OpenTofu docs state that `tofu providers` shows provider requirements, not selected versions. I replaced it with appending `.terraform.lock.hcl`, which OpenTofu documents as the file that records selected provider versions.
- The LocalStack provider example only overrode `sts` even though the sample resource was `aws_s3_bucket`, so it did not provide full isolation for the resource under test. I added `s3_use_path_style = true` and an `s3` endpoint to align the example with the AWS provider's LocalStack guidance.
- The post presented a specific nil-pointer panic example as though it were a verified OpenTofu bug, but that behavior could not be substantiated from official OpenTofu docs or issue guidance. I converted the sample report into a generic bug-report template, removed the unsupported panic claim, and removed the "BUG" inline comment from the HCL example.
- The reproduction steps in the template omitted `tofu init` and repeated an incomplete snippet that did not include the required provider and provider configuration. I changed the steps to reference the full minimal configuration above and added `tofu init` before `tofu plan`.
- The `go version` command was grouped under OS information even though it is only relevant when using a self-built binary. I kept the command but clarified that it is optional context for self-built OpenTofu binaries.

## Review Notes
- As of 2026-04-23, the latest OpenTofu release listed on the official releases page is `v1.11.6`. The post still uses `1.9.0`, `1.8.5`, and `hashicorp/aws 5.31.0` as illustrative version strings, which is acceptable because they are examples rather than current-version recommendations.
