# Validation Summary: Who Should Approve Terraform Apply?

## Status

validated

## Post Type

Technical guide / governance guide

## Technologies Covered

- Terraform CLI and saved execution plans
- Terraform plan JSON output
- HCP Terraform workspace permissions and run tasks
- GitHub Actions environments and deployment protection rules
- GitLab protected environments and deployment approvals
- CI/CD approval workflows and infrastructure change governance
- YAML configuration

## Sources Consulted

- [Terraform `plan` command and saved plans](https://developer.hashicorp.com/terraform/cli/commands/plan)
- [Terraform `show` command and sensitive JSON output](https://developer.hashicorp.com/terraform/cli/commands/show)
- [Terraform `apply` command and saved plan mode](https://developer.hashicorp.com/terraform/cli/commands/apply)
- [Terraform JSON output format](https://developer.hashicorp.com/terraform/internals/json-format)
- [Terraform sensitive data guidance](https://developer.hashicorp.com/terraform/language/manage-sensitive-data)
- [Terraform configuration-driven import](https://developer.hashicorp.com/terraform/language/import)
- [Terraform `removed` block reference](https://developer.hashicorp.com/terraform/language/block/removed)
- [HCP Terraform workspace permissions](https://developer.hashicorp.com/terraform/cloud-docs/users-teams-organizations/permissions/workspace)
- [HCP Terraform run tasks](https://developer.hashicorp.com/terraform/cloud-docs/workspaces/settings/run-tasks)
- [GitHub Actions deployments and environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)
- [GitHub Actions environment configuration](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)
- [GitHub Actions workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
- [GitLab protected environments](https://docs.gitlab.com/ci/environments/protected_environments/)
- [GitLab deployment approvals](https://docs.gitlab.com/ci/environments/deployment_approvals/)

## Issues Found

No technical issues found.

## Review Notes

- The Terraform CLI sequence was executed successfully with Terraform 1.5.7 against a disposable local `terraform_data` resource. The saved plan was rendered as text and JSON, hashed with `sha256sum`, and applied with `terraform apply -input=false tfplan` as described.
- All YAML snippets parse successfully. The approver matrix is intentionally product-neutral pseudoconfiguration, as the post states, rather than a schema accepted directly by a named CI product.
- Configuration-driven import entries require Terraform 1.5 or later, and `removed` blocks used to forget resources without destroying them require Terraform 1.7 or later. The post records a concrete Terraform version with each approval, which is the appropriate way to make these plan features unambiguous.
- Applying a saved plan does not prompt for Terraform's own interactive confirmation; in the described workflow, the CI/CD environment or external authorization gate supplies the approval before the apply step starts.
- GitHub required reviewers and custom deployment protection rules vary by repository visibility and subscription. The current GitHub documentation also labels custom deployment protection rules as public preview.
- GitLab protected environments and deployment approvals are currently available on Premium and Ultimate tiers. The post appropriately advises readers to verify product behavior and subscription tier.
