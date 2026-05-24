# Validation Summary: How to Create Migration Plans for Terraform Projects

## Status
validated

## Post Type
Guide / Template (process-oriented documentation with markdown templates and shell helpers)

## Technologies Covered
- Terraform (CLI: `state list`, `state pull`, `state push`, `state mv`, `validate`, `plan`, `version -json`)
- Bash / POSIX shell (inventory script using `find`, `sed`, `sort`, `uniq`, `jq`)
- AWS resources referenced in examples (VPC, subnet, security group, IAM role, S3, EC2, RDS, ElastiCache, ALB, Route 53, CloudWatch)
- S3 + DynamoDB remote state backend
- Markdown (planning templates)

## Sources Consulted
- Terraform CLI documentation — `terraform state` subcommands: https://developer.hashicorp.com/terraform/cli/commands/state
- Terraform `state mv`: https://developer.hashicorp.com/terraform/cli/commands/state/mv
- Terraform `state pull` / `state push`: https://developer.hashicorp.com/terraform/cli/commands/state/pull
- Terraform `version` (JSON output including `provider_selections` field): https://developer.hashicorp.com/terraform/cli/commands/version
- Terraform `validate`: https://developer.hashicorp.com/terraform/cli/commands/validate
- S3 backend with DynamoDB locking: https://developer.hashicorp.com/terraform/language/settings/backends/s3

## Issues Found
No technical issues found. All Terraform CLI commands and flags used in the post (`terraform state list`, `terraform state pull > file`, `terraform state push file`, `terraform state mv <src> <dst>`, `terraform validate`, `terraform plan`, `terraform version -json | jq '.provider_selections'`) match current official documentation. The shell snippets are syntactically valid bash.

## Review Notes
- The post is primarily process and template guidance rather than executable Terraform configuration; most code blocks are markdown templates illustrating planning artifacts. They are presented as examples to be filled in, not run.
- The nested fenced code block in the "Designing the Target State" section uses a `` ```text `` close-fence workaround to render an inner directory tree inside an outer markdown block. This is a documented Markdown rendering convention; not a technical error.
- The `sed 's/\[.*//;s/\..*//'` pipeline in the inventory script correctly reduces flat resource addresses (e.g. `aws_instance.web[0]` → `aws_instance`), but for module-prefixed addresses (e.g. `module.networking.aws_vpc.main`) it would collapse to `module`. This is acceptable as illustrative example code for a top-level state, and not incorrect — just a known limitation worth keeping in mind if readers adapt it to module-heavy states.
- No version-pinning is claimed in the post, so no version-specific drift risk.
