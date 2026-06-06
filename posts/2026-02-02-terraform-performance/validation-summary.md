# Validation Summary: How to Optimize Terraform Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (CLI commands, configuration, state management)
- HashiCorp Configuration Language (HCL)
- AWS provider (assume_role, aws_vpc, aws_subnet, aws_instance, aws_db_instance, aws_cloudwatch_metric_alarm)
- Terraform remote state (S3 backend with DynamoDB locking)
- GitHub Actions (actions/checkout@v4, actions/cache@v4, hashicorp/setup-terraform@v3)
- Terraform CLI configuration file (`~/.terraformrc`) with `provider_installation` block
- Bash scripting for automation
- AWS CloudWatch metrics

## Sources Consulted
- Terraform CLI plan command docs: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform CLI apply command docs: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform CLI environment variables: https://developer.hashicorp.com/terraform/cli/config/environment-variables
- Terraform CLI configuration file: https://developer.hashicorp.com/terraform/cli/config/config-file
- Terraform internals/debugging: https://developer.hashicorp.com/terraform/internals/debugging
- HashiCorp blog on `-refresh-only` planning option
- AWS provider `assume_role` reference (v5.x) and GitHub issue #23028 confirming `duration` (Go duration string) replaces deprecated `duration_seconds`
- GNU grep manual (character classes / bracket expressions)

## Issues Found
1. **Missing heading marker for "Resource Targeting"** — The section header on the line was a bare line of text without the `##` prefix, breaking the document structure. Fixed by changing `Resource Targeting` to `## Resource Targeting`.

2. **Non-portable grep regex `\d`** — The example `grep -E "^\d{4}" terraform.log | head -100` would not work as intended on GNU grep in ERE mode. `\d` is a PCRE shorthand and is not part of POSIX ERE, so under `-E` it is interpreted literally (matching the character `d`) rather than as a digit class. Replaced with the portable equivalent: `grep -E "^[0-9]{4}" terraform.log | head -100`.

## Review Notes
- The `assume_role` block uses `duration = "1h"` (Go duration string), which is the correct modern syntax for AWS provider v4.x+ (v5.x). The legacy `duration_seconds` was deprecated in v4 and removed in v5, so the post is current.
- Terraform's default `-parallelism` value of 10 is confirmed in the official CLI docs.
- `-refresh-only` was introduced in Terraform v0.15.4; usage with `-auto-approve` and `-target` is valid.
- `TF_CLI_ARGS_plan`, `TF_CLI_ARGS_apply`, `TF_PLUGIN_CACHE_DIR`, `TF_LOG`, and `TF_LOG_PATH` are all documented environment variables.
- The `provider_installation { filesystem_mirror { include = [...] } direct { exclude = [...] } }` block in `~/.terraformrc` matches the documented syntax.
- TF_LOG levels TRACE, DEBUG, INFO match the documented set (the full set also includes WARN, ERROR, and JSON; using TRACE/DEBUG/INFO as shown is fine).
- The `data.aws_ami.ubuntu` reference in the compute example is used without a corresponding `data "aws_ami" "ubuntu"` block being shown; this is acceptable as illustrative snippet style for a tutorial but readers would need to define it themselves.
- The hardcoded AMI IDs (`ami-12345678`) in the `for_each` example are clearly placeholders and would not work in production, but this is conventional for documentation examples.
