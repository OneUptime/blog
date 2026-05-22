# Validation Summary: How to Implement Least Privilege for Terraform Service Accounts

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform
- AWS IAM, CloudTrail, IAM Access Analyzer, and AWS CLI
- Azure RBAC, AzureRM Terraform provider, Azure CLI, and Azure Storage data-plane permissions
- Google Cloud IAM, Google Terraform provider, and gcloud CLI
- iamlive

## Sources Consulted
- AWS CLI `accessanalyzer start-policy-generation` command reference: https://docs.aws.amazon.com/cli/latest/reference/accessanalyzer/start-policy-generation.html
- AWS CLI `accessanalyzer get-generated-policy` command reference: https://docs.aws.amazon.com/cli/latest/reference/accessanalyzer/get-generated-policy.html
- AWS CloudTrail `lookup-events` command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/lookup-events.html
- AWS IAM permissions boundaries documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html
- AWS Service Authorization Reference for Amazon EC2: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonec2.html
- AWS Service Authorization Reference for Amazon RDS: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonrds.html
- AWS CLI `iam generate-service-last-accessed-details` command reference: https://docs.aws.amazon.com/cli/latest/reference/iam/generate-service-last-accessed-details.html
- Terraform AWS provider `aws_iam_policy` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy
- Terraform AzureRM provider `azurerm_role_definition` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_definition
- Terraform AzureRM provider `azurerm_role_assignment` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment
- Microsoft Azure RBAC role definitions documentation: https://learn.microsoft.com/en-us/azure/role-based-access-control/role-definitions
- Microsoft Azure custom roles documentation: https://learn.microsoft.com/en-us/azure/role-based-access-control/custom-roles
- Azure CLI `az role assignment list` documentation: https://learn.microsoft.com/en-us/cli/azure/role/assignment
- Terraform Google provider `google_project_iam_custom_role` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_project_iam_custom_role
- Terraform Google provider project IAM documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_project_iam
- Google Cloud SDK `gcloud projects get-iam-policy` documentation: https://cloud.google.com/sdk/gcloud/reference/projects/get-iam-policy
- iamlive README and Go package documentation: https://pkg.go.dev/github.com/iann0036/iamlive

## Issues Found
- The AWS IAM Access Analyzer example used `aws accessanalyzer generate-policy`, which is not a current AWS CLI command. Changed it to `aws accessanalyzer start-policy-generation`, added the required `--policy-generation-details` argument for the principal ARN, and added `get-generated-policy` to retrieve the generated policy after the job succeeds.
- The CloudTrail lookup example claimed to query all actions by the Terraform role using `Username=terraform-deploy`. CloudTrail lookup filters `Username` values, which for assumed roles are commonly session names. Clarified the comment and changed the placeholder to a role session name.
- The permissions boundary explanation said boundaries cap permissions regardless of attached policies. Tightened the wording to identity-based permissions, matching AWS IAM's boundary semantics.
- The AWS EC2 VPC-scoped example used `ec2:*` with `ec2:Vpc`, but not every EC2 action supports that condition key. Narrowed the example to `ec2:RunInstances`, where VPC scoping is applicable through request resources such as network interfaces and subnets.
- The Azure RBAC example described `not_actions` as an explicit deny. Azure `NotActions` only subtracts actions from that role and does not deny access granted by another role assignment. Updated the comment accordingly.
- The Azure role example listed storage container management actions as required for Terraform state management. Added `data_actions` for blob data access, which is required when the backend uses Azure AD authentication for state blobs.
- The production AWS policy used `ec2:ResourceTag/Environment` for `ec2:RunInstances`, which does not enforce tags on newly created instances. Split the statement so `RunInstances` uses `aws:RequestTag/Environment` and `aws:TagKeys`, while `TerminateInstances` remains resource-tag scoped.

## Review Notes
The post remains a high-level least-privilege guide. Some examples still use broad wildcard actions to demonstrate strategy rather than a complete production policy; a future update could add provider-specific notes on dependent actions such as `iam:PassRole`.
