# Validation Summary: How to Build Terraform Workspace Patterns

## Status
validated

## Post Type
Guide / Tutorial — patterns and reference implementations for organizing Terraform workspaces across environments.

## Technologies Covered
- Terraform (workspaces, locals, variables, validation, backends)
- Terraform S3 backend with DynamoDB state locking
- HCL configuration language
- AWS provider (aws_instance, aws_s3_bucket, aws_dynamodb_table, aws_budgets_budget, aws_ssm_parameter, default_tags)
- GitHub Actions (hashicorp/setup-terraform, aws-actions/configure-aws-credentials, actions/github-script)
- Bash scripting

## Sources Consulted
- Terraform workspaces documentation: https://developer.hashicorp.com/terraform/language/state/workspaces
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- terraform_remote_state data source: https://developer.hashicorp.com/terraform/language/state/remote-state-data
- Terraform built-in functions (`regex`, `split`, `contains`, `timestamp`): https://developer.hashicorp.com/terraform/language/functions
- Terraform variable validation: https://developer.hashicorp.com/terraform/language/values/variables#custom-validation-rules
- AWS provider `default_tags`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs#default_tags
- AWS provider `aws_budgets_budget`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/budgets_budget
- GitHub Actions actions/github-script: https://github.com/actions/github-script
- hashicorp/setup-terraform v3: https://github.com/hashicorp/setup-terraform

## Issues Found

1. **Pattern 2 — Workspace name parsing was broken for AWS region names containing hyphens.**
   The original code used `split("-", terraform.workspace)`, which would parse a workspace like `oneuptime-prod-us-east-1-blue` into `["oneuptime", "prod", "us", "east", "1", "blue"]`, leaving `local.region = "us"` and `local.variant = "east"`. Replaced with a `regex(...)` call using named capture groups so the region (`[a-z]{2}-[a-z]+-[0-9]+`) and optional variant are extracted correctly. Added a brief comment explaining why regex is used.

2. **Pattern 4 — `terraform_remote_state` for the S3 backend was misconfigured.**
   The original example embedded `env:/platform-networking-${local.environment}/terraform.tfstate` directly in the `key`. The S3 backend constructs the full path as `<workspace_key_prefix>/<workspace>/<key>` internally; the consumer should pass the original `key` and select the workspace via the `workspace` argument on the data source. Updated the config to pass `key = "infrastructure/terraform.tfstate"` and use `workspace = "platform-networking-${local.environment}"`. Added a short comment explaining the path construction.

3. **Pattern 6 — Unescaped triple backticks inside a JavaScript template literal.**
   In the GitHub Actions `actions/github-script` step, the inline JS template literal contained literal ` ``` ` markers. The first triple-backtick would terminate the JS template literal, producing a syntax error at runtime. Replaced with `\`\`\`` so the backticks are escaped inside the template literal (matching the pattern documented for this action in the Terraform CI examples).

4. **Pattern 7 — `timestamp()` in `default_tags` causes constant drift.**
   The `cost_tags` map included `CreatedAt = timestamp()`. Because `timestamp()` returns a new value on every run and `default_tags` is applied to every resource, every plan would show a tag diff on every resource. Removed the `CreatedAt` tag and added a comment warning future readers about this pitfall.

## Review Notes

- **S3 backend state locking (Pattern 3).** The post uses `dynamodb_table` on the S3 backend, which is correct for Terraform `1.6.0` (the version pinned in the CI workflow). Terraform 1.10+ introduced native S3 lock files (`use_lockfile = true`) and is moving away from DynamoDB locking, but the example as written remains functional and matches the pinned version. No change made.
- **`null_resource` validation hack (Pattern 5).** The `tobool("ERROR: ...")` trick is a well-known pre-1.5 workaround that surfaces the message via a type-conversion error. Modern Terraform offers `precondition`/`postcondition` blocks (1.2+) and `check` blocks (1.5+), which are more idiomatic. The shown pattern still works and is left as-is since it is intentionally framed as a workspace-level guard pattern.
- **`var.environment` without a default (Pattern 1).** The local `env = var.environment != "" ? var.environment : terraform.workspace` implies an empty-string sentinel, but the variable has no default. The expression still works (Terraform requires a value to be provided), and switching to `default = ""` would change the contract. Left as-is.
- **CI matrix strategy (Pattern 6).** The plan job uses a matrix over `[dev, staging, prod]`, but `apply-staging`/`apply-prod` re-run `terraform plan` implicitly via `terraform apply -var-file=...` instead of consuming the uploaded plan artifact. This is intentional in the post (only the dev apply uses the saved plan), so it is left unchanged, but readers should be aware that strict plan-then-apply parity is only enforced for dev.
- **Workspace select-or-create.** The CI script uses `terraform workspace select X || terraform workspace new X`. Terraform 1.4+ supports `terraform workspace select -or-create=true X`, which is cleaner; the existing approach is still valid.
