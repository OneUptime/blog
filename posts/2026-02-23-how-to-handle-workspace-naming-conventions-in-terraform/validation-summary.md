# Validation Summary: How to Handle Workspace Naming Conventions in Terraform

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform CLI workspaces
- Terraform configuration language
- Terraform S3 backend
- AWS S3
- Amazon Route 53 and DNS naming
- AWS EC2 tags
- Amazon RDS
- Azure Resource Manager resource groups
- Google Cloud resource naming
- Bash scripting
- GitHub Actions

## Sources Consulted
- Terraform CLI workspace command reference: https://developer.hashicorp.com/terraform/cli/commands/workspace
- Terraform CLI `workspace new` command reference: https://developer.hashicorp.com/terraform/cli/commands/workspace/new
- Terraform workspaces state documentation: https://docs.hashicorp.com/terraform/language/state/workspaces
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform check block reference: https://developer.hashicorp.com/terraform/language/block/check
- Terraform `terraform_data` resource reference: https://developer.hashicorp.com/terraform/language/resources/terraform-data
- Terraform lifecycle precondition reference: https://docs.hashicorp.com/terraform/language/meta-arguments/lifecycle
- Terraform Enterprise workspace API documentation for workspace name constraints: https://developer.hashicorp.com/terraform/enterprise/api-docs/workspaces
- AWS S3 bucket naming rules: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html
- Amazon EC2 tag restrictions: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Using_Tags.html
- Amazon RDS naming constraints: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Limits.html
- Microsoft Azure resource naming rules: https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules
- Google Cloud Compute Engine resource naming rules: https://docs.cloud.google.com/compute/docs/naming-resources

## Issues Found
- The RDS identifier constraints were incomplete and overly specific about lowercase. Updated the table to match Amazon RDS naming constraints: 1-63 alphanumeric characters or hyphens, first character must be a letter, and the identifier cannot end with a hyphen or contain consecutive hyphens.
- The Azure resource group constraints omitted parentheses and the rule that names cannot end with a period. Updated the table to match Microsoft Azure Resource Manager documentation.
- The Terraform validation example used `null_resource` with a `local-exec` provisioner while saying it would fail the plan. Provisioners run during apply, not plan, so the example was replaced with a `terraform_data` resource using a lifecycle precondition.
- The post described a Terraform `check` block as a better validation check, but failed check assertions are non-blocking warnings. Updated the wording to describe it as a non-blocking warning.
- The branch-to-workspace script could truncate a sanitized name to a trailing hyphen, producing an invalid workspace name under the post's own convention. Added a final trailing-hyphen removal after truncation and corrected the affected example output.

## Review Notes
Terraform CLI was not installed in the local environment, so Terraform snippets were verified against official HashiCorp documentation rather than by running `terraform validate`. Bash snippets were syntax-checked locally, and the updated branch sanitization pipeline was tested for the corrected example.
