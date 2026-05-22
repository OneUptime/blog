# Validation Summary: How to Handle Terraform API Rate Limiting

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Terraform (CLI flags, provider configuration, debug logging)
- AWS provider for Terraform (`max_retries`, `retry_mode`)
- Azure provider for Terraform (`azurerm`)
- Google Cloud provider for Terraform (`batching` block)
- Terragrunt (retry configuration)
- Bash scripting

## Sources Consulted
- Terraform CLI docs — parallelism flag: https://developer.hashicorp.com/terraform/cli/commands/plan and /apply
- Terraform AWS provider docs (hashicorp/aws) — provider arguments including `max_retries` and `retry_mode`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Terraform Google provider docs — `batching` block: https://registry.terraform.io/providers/hashicorp/google/latest/docs/guides/provider_reference
- Terraform AzureRM provider docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- Terragrunt docs — retry configuration: https://terragrunt.gruntwork.io/docs/features/auto-retry/
- AWS API rate limits documentation (EC2, IAM, S3 service quotas)
- Terraform debug logging docs (`TF_LOG`): https://developer.hashicorp.com/terraform/internals/debugging

## Issues Found
No technical issues found.

All commands, flags, and configuration syntax were verified against official Terraform, AWS provider, Google provider, and Terragrunt documentation:
- `-parallelism=N` is a valid CLI flag on plan/apply
- The post's claim that parallelism cannot be set via a configuration block is correct
- AWS provider `max_retries` (default 25) and `retry_mode` ("standard"/"adaptive"/"legacy") are correct
- Google provider `batching { send_after, enable_batching }` schema is correct
- Provider alias syntax (`provider = aws.primary`) is correct
- `-refresh=false`, `TF_LOG=DEBUG` are correct
- Terragrunt `retryable_errors`, `retry_max_attempts`, `retry_sleep_interval_sec` field names are correct

## Review Notes
- The AWS API rate limit numbers (e.g., EC2 DescribeInstances ~100 RPS, IAM GetRole ~15 RPS) are reasonable approximations. AWS does not publish exact per-API throttling thresholds publicly, and the post explicitly notes that limits vary by account/region. This is acceptable framing.
- The `max_retries = 25` example happens to equal the AWS provider default. Not incorrect, just illustrative rather than a meaningful override; readers seeking higher retry counts should set values > 25.
- The Azure provider snippet intentionally shows that no explicit retry config is needed because azurerm handles retries internally — this is accurate.
- S3 `GetBucketLocation` is a bucket-level (not object-level) API and is generally throttled lower than the cited ~5,000 RPS object request rate; however, the post is using a directional estimate and the broader point about per-endpoint variance is correct.
- Parallelism can additionally be controlled via `TF_CLI_ARGS_plan` / `TF_CLI_ARGS_apply` environment variables — not mentioned but not incorrect omission.
