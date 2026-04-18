# Validation Summary: How to Troubleshoot State File Conflicts in OpenTofu

## Status
validated

## Post Type
Troubleshooting guide / Tutorial

## Technologies Covered
- OpenTofu (CLI: `tofu` subcommands — `force-unlock`, `state pull/push/mv/list`, `import`, `refresh`, `plan`, `apply`)
- AWS S3 (state backend, versioning, native locking in OpenTofu 1.10+)
- AWS DynamoDB (legacy state locking)
- AWS CLI (`aws s3`, `aws s3api`, `aws dynamodb`)
- HCL configuration (`aws_s3_bucket_versioning` resource)
- GitHub Actions (concurrency groups)

## Sources Consulted
- OpenTofu State Commands: https://opentofu.org/docs/cli/commands/state/
- OpenTofu force-unlock: https://opentofu.org/docs/cli/commands/force-unlock/
- OpenTofu S3 backend native locking (1.10+): https://opentofu.org/docs/language/settings/backends/s3/
- AWS CLI `s3api get-object` reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/get-object.html
- GitHub Actions concurrency docs: https://docs.github.com/actions/writing-workflows/choosing-what-your-workflow-does/control-the-concurrency-of-workflows-and-jobs
- Terraform `aws_s3_bucket_versioning` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_versioning

## Issues Found
No technical issues found.

## Review Notes
- `tofu refresh` (referenced in the "State Drift" section) is technically deprecated in favor of `tofu apply -refresh-only` (which prompts before updating state) or `tofu plan -refresh-only`. The standalone `refresh` command still works and produces the same effect, so the post is not incorrect — but in a future revision the author may want to recommend the `-refresh-only` forms as the modern idiom.
- Native S3 state locking with `use_lockfile = true` also requires S3 object versioning to be enabled on the bucket; the post already recommends enabling versioning as a safety net, which covers this.
- The error message in the "State Locked" section shows `ConditionalCheckFailedException`, which is the DynamoDB-backed error. When using native S3 locking, the underlying error is a `PreconditionFailed` / `412` response rather than the DynamoDB exception — but since the section is primarily illustrating the generic "Error acquiring the state lock" wrapper and the lock-info block (which is emitted by OpenTofu regardless of backend), this is acceptable.
- Commands, flags, error-message formats, HCL syntax, and GitHub Actions YAML all verified against official documentation.
