# Validation Summary: How to Create AWS SSO Permission Sets with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- AWS IAM Identity Center
- AWS SSO Admin
- AWS Identity Store
- AWS IAM policies and permissions boundaries

## Sources Consulted
- AWS IAM Identity Center User Guide: Manage AWS accounts with permission sets: https://docs.aws.amazon.com/singlesignon/latest/userguide/permissionsetsconcept.html
- AWS CLI Command Reference: put-permissions-boundary-to-permission-set: https://docs.aws.amazon.com/cli/latest/reference/sso-admin/put-permissions-boundary-to-permission-set.html
- Terraform Registry: aws_ssoadmin_permission_set: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssoadmin_permission_set
- Terraform Registry: aws_ssoadmin_permissions_boundary_attachment: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssoadmin_permissions_boundary_attachment
- Terraform Registry: aws_ssoadmin_instances data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ssoadmin_instances
- Terraform Registry: aws_identitystore_group data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/identitystore_group
- AWS Billing User Guide: Mapping fine-grained IAM actions reference: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/migrate-granularaccess-iam-mapping-reference.html
- AWS Service Authorization Reference: AWS Billing actions: https://docs.aws.amazon.com/service-authorization/latest/reference/list_awsbilling.html

## Issues Found
- The permissions boundary example used `managed_policy_arn = aws_iam_policy.sandbox_boundary.arn` for a customer-managed IAM policy. Terraform's `managed_policy_arn` field is for AWS-managed policy ARNs. I changed the example to use `customer_managed_policy_reference` with the policy name and path, matching the Terraform provider and AWS SSO Admin API behavior.
- The billing deny policy used the retired `aws-portal:*` namespace. I replaced it with current fine-grained billing, account, cost, invoicing, payment, purchase order, tax, and budget service prefixes.
- The permissions boundary example did not state that a customer-managed boundary policy must exist with the same name and path in each AWS account where the permission set is assigned. I added a brief code comment to avoid implying that creating the policy in only one account is sufficient for multi-account assignments.

## Review Notes
The remaining Terraform snippets use current AWS provider resources and data sources for IAM Identity Center permission sets, managed policy attachments, inline policies, permissions boundaries, and account assignments. The provider version constraint `~> 5.0` is not the latest major version as of this review, but the referenced resources and arguments remain valid.
