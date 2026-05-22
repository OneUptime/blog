# Validation Summary: How to Split Large Terraform Projects for Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform CLI
- Terraform state management
- Terraform remote state
- AWS S3 Terraform backend
- AWS Systems Manager Parameter Store
- AWS provider `aws_ssm_parameter`
- GitHub Actions

## Sources Consulted
- HashiCorp Terraform CLI `state mv` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/mv
- HashiCorp Terraform CLI `state push` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/push
- HashiCorp Terraform `terraform_remote_state` data source documentation: https://developer.hashicorp.com/terraform/language/state/remote-state-data
- HashiCorp Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp Terraform CLI `apply` command reference: https://developer.hashicorp.com/terraform/cli/commands/apply
- HashiCorp AWS provider `aws_ssm_parameter` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_parameter
- AWS Systems Manager Parameter Store documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax

## Issues Found
- The state migration section only pushed the new split state. Because the examples use local `-state` and `-state-out` files, the updated source state also needs to be pushed back to its configured backend. Added `terraform state push monolith.tfstate` before pushing `networking.tfstate`.
- The `terraform_remote_state` caveat said it exposes the entire source state to the consuming project. HashiCorp documents that only root outputs are exposed in Terraform configuration, but the consumer needs access to the full state snapshot. Updated the wording to preserve that nuance.
- The monolith cleanup warning said Terraform would try to destroy moved resources if the old configuration remained. After the resources are removed from the monolith state, leaving the old configuration would cause Terraform to plan creating them again. Corrected "destroy" to "create".

## Review Notes
The threshold numbers for splitting, state size, and resources per state are practical heuristics rather than Terraform limits. The GitHub Actions example is structurally valid for demonstrating `needs`, but a production workflow should normally include checkout, setup, init, plan review, locking/backends, credentials, and approval controls before `terraform apply -auto-approve`.
