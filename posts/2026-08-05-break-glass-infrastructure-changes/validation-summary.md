# Validation Summary: Break-Glass Infrastructure Changes

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Break-glass infrastructure access and emergency change management
- AWS IAM Identity Center emergency access
- Microsoft Entra emergency access accounts and privileged-account monitoring
- Terraform refresh-only planning, state reconciliation, imports, and lifecycle controls
- HashiCorp AWS provider VPC security group egress rules
- Cloud audit logging, privileged-session controls, and incident response

## Sources Consulted

- [AWS IAM Identity Center: Set up emergency access to the AWS Management Console](https://docs.aws.amazon.com/singlesignon/latest/userguide/emergency-access.html)
- [Microsoft Entra ID: Manage emergency access admin accounts](https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/security-emergency-access)
- [Microsoft Entra ID: Security operations for privileged accounts](https://learn.microsoft.com/en-us/entra/architecture/security-operations-privileged-accounts)
- [HashiCorp: Use refresh-only mode to sync Terraform state](https://developer.hashicorp.com/terraform/tutorials/state/refresh)
- [HashiCorp: `terraform plan` command reference](https://developer.hashicorp.com/terraform/cli/commands/plan)
- [HashiCorp: `terraform show` command reference](https://developer.hashicorp.com/terraform/cli/commands/show)
- [HashiCorp: `terraform refresh` deprecation and safety guidance](https://developer.hashicorp.com/terraform/cli/commands/refresh)
- [HashiCorp: Terraform import block reference](https://developer.hashicorp.com/terraform/language/block/import)
- [HashiCorp: `terraform import` command reference](https://developer.hashicorp.com/terraform/cli/commands/import)
- [HashiCorp: Purpose of Terraform state](https://developer.hashicorp.com/terraform/language/state/purpose)
- [HashiCorp: Terraform lifecycle `ignore_changes` reference](https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle)
- [HashiCorp AWS provider: `aws_vpc_security_group_egress_rule`](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_egress_rule)

## Issues Found

No technical issues found.

## Review Notes

- The `terraform plan -refresh-only -out=refresh.tfplan` and `terraform show -no-color refresh.tfplan` commands use current, documented flags. The warning about reviewing refresh-only changes before applying them is accurate, including the example risk of a wrong provider region causing an existing resource to appear absent.
- The HCL import example is syntactically valid and matches the current AWS provider schema. The separate `aws_vpc_security_group_egress_rule` resource accepts the shown arguments and imports by the `sgr-...` security group rule ID.
- Refresh-only mode requires Terraform 1.1 or later. Configuration-driven `import` blocks and the shown `id`-based import workflow require Terraform 1.5 or later. The post does not claim compatibility with earlier versions.
- The description of `ignore_changes` is accurate: attribute-specific shared management can be intentional, while `ignore_changes = all` prevents Terraform from proposing updates to any resource attribute.
- AWS and Microsoft both recommend preconfigured, regularly tested emergency access. Microsoft currently recommends at least two cloud-only emergency access accounts, alerting on every use or change, and validation at least every 90 days, consistent with the post.
- All external links in the post returned successful HTTP responses during validation.
