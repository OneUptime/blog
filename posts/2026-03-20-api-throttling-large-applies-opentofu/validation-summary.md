# Validation Summary: How to Handle API Throttling During Large Applies in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- AWS provider for Terraform/OpenTofu
- AWS IAM
- HashiCorp time provider
- Bash

## Sources Consulted
- OpenTofu `apply` command documentation: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu `plan` command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `show` command documentation: https://opentofu.org/docs/cli/commands/show/
- AWS provider documentation (official source): https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/index.html.markdown
- AWS IAM troubleshooting documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/troubleshoot.html#troubleshoot_general_eventual-consistency
- Time provider `time_sleep` documentation (official source): https://raw.githubusercontent.com/hashicorp/terraform-provider-time/main/docs/resources/sleep.md

## Issues Found
- The post used `tofu apply -out=tfplan`, but `-out` is a `tofu plan` option rather than an `apply` option. I corrected the parallelism examples to valid `tofu apply` commands.
- The AWS retry example set `max_retries = 10` while the comment said to increase beyond the default of `25`. I corrected the snippet to use `max_retries = 30` and added the supported `retry_mode = "adaptive"` setting.
- The provider snippet said custom `endpoints` were useful for retry debugging. Official AWS provider docs describe `endpoints` as custom service endpoint configuration, so I removed that misleading guidance.
- The “Splitting Large Configurations” section said to split into independently applied configurations, but the example still used `-target` against modules in one configuration. I corrected the commands to use separate configuration directories with `tofu -chdir=... apply`.
- The `-target` section presented targeting as a normal large-apply technique. OpenTofu documents targeting as an exceptional workflow, so I updated the wording to reflect that.
- The retry script had incorrect attempt counting and would report success on attempt `0` if the first run succeeded. I corrected the counter logic and changed the scripted example to a valid non-interactive `tofu apply -parallelism=5 -auto-approve` retry loop.

## Review Notes
- The IAM eventual consistency guidance is technically sound. AWS documents that IAM changes are not always immediately visible and recommends verifying propagation before depending on those changes.
- The `time_sleep` example is valid, but the time provider docs characterize it as a workaround. In practice, the exact wait duration may need tuning based on the AWS service and account behavior.
- The post does not pin OpenTofu or provider versions. The validated commands and arguments match the official documentation consulted on 2026-05-07.
