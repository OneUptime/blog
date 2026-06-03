# Validation Summary: How to Configure Terraform Cloud Workspaces for Multi-Env Kubernetes Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI and Terraform configuration language
- HCP Terraform / Terraform Cloud workspaces
- HCP Terraform API
- AWS provider and Amazon EKS
- Kubernetes provider exec authentication
- Sentinel policy as code
- Terraform Cloud cost estimation

## Sources Consulted
- HCP Terraform workspaces overview: https://developer.hashicorp.com/terraform/cloud-docs/workspaces
- HCP Terraform Workspaces API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspaces
- HCP Terraform Workspace Variables API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspace-variables
- HCP Terraform Run Triggers API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/run-triggers
- HCP Terraform Team Access API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/team-access
- HCP Terraform Teams API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/teams
- HCP Terraform Organizations API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/organizations
- HCP Terraform Cost Estimates API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/cost-estimates
- Terraform `cloud` block reference: https://developer.hashicorp.com/terraform/language/terraform
- Terraform AWS provider resource tagging guide: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/guides/resource-tagging
- Terraform AWS provider `aws_eks_cluster` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_cluster
- Terraform Kubernetes provider documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs
- Kubernetes exec authentication reference: https://kubernetes.io/docs/reference/access-authn-authz/authentication/
- AWS CLI `eks get-token` documentation: https://docs.aws.amazon.com/cli/latest/reference/eks/get-token.html
- Sentinel `tfplan/v2` import reference: https://docs.hashicorp.com/terraform/enterprise/policy-enforcement/import-reference/tfplan-v2

## Issues Found
- The workspace creation script created workspaces without attaching the key-only tags used by the Terraform `cloud` block. I updated the script to capture each workspace ID and add the `kubernetes` and `eks` tags through the workspace tags relationship API.
- The run trigger description said production would queue a speculative plan. HCP Terraform run triggers queue a run after a successful apply in the source workspace, so I corrected the explanation and noted that production still requires manual approval because auto-apply is disabled.
- The Sentinel tag policy required an `Owner` tag, but the AWS provider default tags did not include one. I added `Owner = "platform-team"` to the default tags.
- The Sentinel policy checked `resource.change.after.tags`, which can miss AWS provider default tags. I changed it to check `tags_all`, the AWS provider attribute that includes provider-level default tags.
- The cost estimation section used the workspace `assessments-enabled` attribute, which enables health assessments rather than cost estimation. I changed the snippet to enable `cost-estimation-enabled` on the organization.

## Review Notes
Terraform CLI is not installed in this workspace, so I could not run `terraform validate`. The edited shell snippet was checked with `bash -n`; API fields and behavior were verified against official HashiCorp documentation.
