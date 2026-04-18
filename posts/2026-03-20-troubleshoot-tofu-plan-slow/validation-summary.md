# Validation Summary: How to Troubleshoot tofu plan Hanging or Slow Execution

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- OpenTofu (CLI: `tofu plan`, `tofu init`, `tofu state`)
- HCL2 (HashiCorp Configuration Language)
- AWS provider for OpenTofu/Terraform
- AWS SDK environment variables (AWS_MAX_ATTEMPTS, AWS_RETRY_MODE)
- S3 backend for state storage
- Linux diagnostic utilities (strace, ps, pgrep, awk)

## Sources Consulted
- OpenTofu Plan Command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu Init Command: https://opentofu.org/docs/cli/commands/init/
- OpenTofu Debugging / TF_LOG: https://opentofu.org/docs/internals/debugging/
- OpenTofu S3 Backend: https://opentofu.org/docs/language/settings/backends/s3/
- HCL2 Syntax Specification: https://github.com/hashicorp/hcl2/blob/master/hcl/hclsyntax/spec.md
- AWS SDK Retry Behavior: https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html
- Canonical Ubuntu AMIs on AWS: https://documentation.ubuntu.com/aws/aws-how-to/instances/find-ubuntu-images/

## Issues Found
1. **Invalid HCL block syntax (fixed).** The `aws_ami` data source example used comma-separated attributes on a single line:
   ```hcl
   filter { name = "name", values = ["ubuntu/images/*"] }
   ```
   HCL2 block bodies do not permit commas as attribute separators; attributes must be newline-separated. Replaced with the canonical multi-line form:
   ```hcl
   filter {
     name   = "name"
     values = ["ubuntu/images/*"]
   }
   ```

## Review Notes
- All CLI flags verified against OpenTofu docs: `-parallelism` (default 10), `-refresh=false`, `-target`, `-upgrade` are current and correct.
- `TF_LOG`, `TF_LOG_PROVIDER` and their levels (TRACE/DEBUG/INFO) are accurate. Only DEBUG is demonstrated; TRACE is also available for even more verbose output.
- AWS account `099720109477` is correctly identified as Canonical's Ubuntu AMI publisher account.
- The `.tflock` file reference under "Root Cause 4" is valid for S3 backends using native locking (`use_lockfile = true`). For legacy DynamoDB-based locking, locks live in the DynamoDB table rather than in S3, so the `aws s3 ls ... | grep .tflock` check is only meaningful when native S3 locking is enabled.
- `pgrep tofu` in the `strace` example may match multiple processes; using `pgrep -x tofu` would be more precise, but the current form is a reasonable debugging starting point.
- The example AMI ID `ami-0c7217cdde317cfec` is a plausible-format placeholder and will become stale over time — this is inherent to any hardcoded AMI example.
