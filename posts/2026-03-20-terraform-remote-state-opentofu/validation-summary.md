# Validation Summary: How to Use the terraform_remote_state Data Source in OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- terraform_remote_state data source
- OpenTofu S3 and local backends
- OpenTofu workspaces
- Terraform/OpenTofu HCL
- AWS IAM
- AWS EC2 and security groups

## Sources Consulted
- OpenTofu terraform_remote_state data source documentation: https://opentofu.org/docs/language/state/remote-state-data/
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu local backend documentation: https://opentofu.org/docs/language/settings/backends/local/
- OpenTofu built-in provider documentation: https://opentofu.org/docs/language/providers/builtin/
- OpenTofu output values documentation: https://opentofu.org/docs/language/values/outputs/
- AWS provider aws_instance resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/instance.html.markdown
- AWS provider aws_security_group resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/security_group.html.markdown
- AWS provider aws_vpc_security_group_ingress_rule resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/vpc_security_group_ingress_rule.html.markdown

## Issues Found
- The EC2 example used a hardcoded AMI ID. I replaced it with the AWS provider's documented SSM public parameter form so the example is not tied to a stale, region-specific AMI ID.
- The Step 2 comment said the instance referenced both VPC and subnet from remote state, but the resource only used the subnet output. I corrected the comment.
- The post said all outputs are available under `.outputs`. OpenTofu exposes root-level outputs only, so I changed the wording to "root-level outputs."
- The security group example used an inline `ingress` block. Current AWS provider guidance recommends `aws_vpc_security_group_ingress_rule`, so I updated the example to use a separate ingress rule resource.
- The S3 IAM read policy only allowed `s3:GetObject`. OpenTofu's S3 backend documentation includes `s3:ListBucket` on the bucket, so I added a bucket list statement scoped by prefix and kept object access read-only for the state object.

## Review Notes
- The OpenTofu `terraform_remote_state` examples for `backend`, `config`, `workspace`, `defaults`, S3, and local backends match the official OpenTofu documentation.
- OpenTofu/Terraform CLI validation was not run because neither CLI is installed in the workspace.
