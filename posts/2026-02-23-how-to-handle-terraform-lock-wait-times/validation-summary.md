# Validation Summary: How to Handle Terraform Lock Wait Times

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform CLI
- Terraform state locking
- Terraform S3, AzureRM, GCS, HCP Terraform, and Consul backends
- AWS DynamoDB legacy Terraform lock tables
- GitHub Actions concurrency
- GitLab CI resource groups
- Bash, AWS CLI, and jq

## Sources Consulted
- Terraform state locking documentation: https://developer.hashicorp.com/terraform/language/state/locking
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform AzureRM backend documentation: https://developer.hashicorp.com/terraform/language/settings/backends/azurerm
- Terraform GCS backend documentation: https://developer.hashicorp.com/terraform/language/backend/gcs
- Terraform Consul backend documentation: https://developer.hashicorp.com/terraform/language/settings/backends/consul
- Terraform plan command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform apply command documentation: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform force-unlock documentation: https://developer.hashicorp.com/terraform/cli/commands/force-unlock
- Terraform state command documentation: https://developer.hashicorp.com/terraform/cli/commands/state
- Terraform state pull documentation: https://developer.hashicorp.com/terraform/cli/commands/state/pull
- Terraform state list documentation: https://developer.hashicorp.com/terraform/cli/commands/state/list
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitLab CI resource group documentation: https://docs.gitlab.com/ci/resource_groups/

## Issues Found
- The post said Terraform locks state for operations that read or modify state. Terraform's documentation says locking applies to operations that could write state, so the wording was corrected.
- The post described S3 locking as S3 plus DynamoDB and used `dynamodb_table` in recommended backend snippets. Current Terraform S3 backend documentation supports native S3 lock files with `use_lockfile = true`, while DynamoDB-based locking is deprecated. The S3 descriptions and recommended backend snippets were updated to use `use_lockfile = true`, and DynamoDB-specific checks were labeled as legacy.
- The post said Terraform keeps retrying by default when a lock is held. Terraform retries lock acquisition for the duration configured with `-lock-timeout`, so that explanation was corrected.
- The GitHub Actions concurrency examples used `cancel-in-progress: false` and said additional runs queue up. Current GitHub Actions documentation says only one pending run is kept by default; multiple pending runs require `queue: max`. The examples and explanation were updated.
- The `terraform plan -lock=false` example was presented as simply safe for read-only operations. The post now distinguishes pure state inspection commands from `plan -lock=false`, which can race with concurrent state changes.

## Review Notes
Terraform CLI was not installed in the local environment, so CLI behavior was verified against current official Terraform documentation rather than local `terraform --help` output.
