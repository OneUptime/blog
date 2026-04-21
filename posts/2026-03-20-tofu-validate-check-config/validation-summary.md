# Validation Summary: How to Use tofu validate to Check Configuration - Tofu Check Config

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu HCL configuration
- AWS provider resource schema examples
- GitHub Actions
- pre-commit hooks
- pre-commit-terraform

## Sources Consulted
- OpenTofu validate command documentation: https://opentofu.org/docs/cli/commands/validate/
- OpenTofu CLI `-chdir` documentation: https://opentofu.org/docs/cli/commands/
- OpenTofu init command documentation: https://opentofu.org/docs/cli/commands/init/
- OpenTofu fmt command documentation: https://opentofu.org/docs/cli/commands/fmt/
- opentofu/setup-opentofu README: https://github.com/opentofu/setup-opentofu
- actions/checkout release tags: https://github.com/actions/checkout
- pre-commit-terraform README: https://github.com/antonbabenko/pre-commit-terraform
- AWS provider `aws_instance` resource source documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/instance.html.markdown

## Issues Found
- `tofu validate /path/to/module/` is not valid current OpenTofu CLI usage. The official usage is `tofu validate [options]`, with `-chdir` as the supported global directory switch. Changed the example to `cd /path/to/module/ && tofu validate` and kept the `tofu -chdir=/path/to/config validate` example.
- The GitHub Actions example used older action majors. Updated `actions/checkout@v4` to `actions/checkout@v6` and `opentofu/setup-opentofu@v1` to `opentofu/setup-opentofu@v2` based on current upstream releases and documentation.
- The JSON failure example showed `error_count: 2` with only one diagnostic. Changed `error_count` to `1` so the example is internally consistent with OpenTofu's JSON output schema.
- The type mismatch description and example were imprecise: the example declared an unused variable named `count` while assigning the resource `count` meta-argument directly. Updated the wording to cover argument values and variable defaults, and simplified the example to show an invalid string value for the numeric `count` meta-argument.
- The missing `ami` example used older simplified AWS provider wording. Updated the note and sample diagnostic to reflect current `aws_instance` schema behavior where `ami` is required unless a launch template supplies it.
- The invalid reference error output was marked as `hcl`. Changed the code fence to `text`.
- The pre-commit example could run Terraform instead of OpenTofu when both binaries are installed, because `pre-commit-terraform` discovers `terraform` before `tofu` unless configured otherwise. Added `--hook-config=--tf-path=tofu` and updated the pinned hook revision to the latest verified tag, `v1.105.0`.

## Review Notes
- `tofu validate` can still emit non-JSON output before validation starts even when `-json` is requested, so CI consumers should be prepared for invalid JSON in initialization or early CLI failure cases.
- The post correctly states that `tofu validate` does not access remote state or provider APIs, but validation still requires an initialized working directory with referenced plugins and modules installed.
