# Validation Summary: How to Create IAM Roles for Cross-Account Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Identity and Access Management (IAM)
- AWS Security Token Service (STS)
- AWS CLI
- IAM trust policies and permission policies
- AWS Management Console role switching
- Terraform AWS provider IAM resources
- Mermaid sequence diagrams

## Sources Consulted
- AWS IAM User Guide: Cross account resource access in IAM - https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies-cross-account-resource-access.html
- AWS IAM User Guide: Cross-account policy evaluation logic - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic-cross-account.html
- AWS IAM User Guide: Switch to an IAM role (AWS API) - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-api.html
- AWS IAM User Guide: Switch from a user to an IAM role (console) - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-console.html
- AWS IAM User Guide: Grant a user permissions to switch roles - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_permissions-to-switch.html
- AWS IAM User Guide: Access to AWS accounts owned by third parties - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_common-scenarios_third-party.html
- AWS CLI Command Reference: sts assume-role - https://docs.aws.amazon.com/cli/latest/reference/sts/assume-role.html
- AWS CLI User Guide: Using an IAM role in the AWS CLI - https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-role.html
- AWS CLI Configuration Variables - https://docs.aws.amazon.com/cli/latest/topic/config-vars.html
- Terraform Registry: aws_iam_role - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role

## Issues Found
- The restricted inline-policy command used `--role-name CrossAccountReadOnly`, but the tutorial only created `CrossAccountAdmin` in the preceding setup. Changed it to `--role-name CrossAccountAdmin` so the command applies to the role created in the post.
- The post described the external ID as a "shared secret." AWS documentation states that AWS does not treat external IDs as secrets and that they are visible to principals with permission to view the role. Changed the explanation to describe the external ID as a unique customer identifier rather than a secret.

## Review Notes
- The IAM policy JSON snippets were checked locally with `jq` and are syntactically valid.
- The local environment did not have the AWS CLI or Terraform installed, so CLI flags and Terraform arguments were verified against official AWS and Terraform documentation instead of local `--help` output or `terraform validate`.
