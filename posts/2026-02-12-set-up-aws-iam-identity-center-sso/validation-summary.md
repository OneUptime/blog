# Validation Summary: How to Set Up AWS IAM Identity Center (SSO)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS IAM Identity Center
- AWS Organizations
- AWS CLI v2
- AWS Identity Store API
- AWS SSO Admin API
- IAM policies and permission sets
- Terraform AWS provider
- Multi-factor authentication

## Sources Consulted
- AWS IAM Identity Center User Guide: Enable IAM Identity Center - https://docs.aws.amazon.com/singlesignon/latest/userguide/enable-identity-center.html
- AWS IAM Identity Center User Guide: IAM Identity Center and AWS Organizations - https://docs.aws.amazon.com/singlesignon/latest/userguide/identity-center-and-orgs.html
- AWS CLI Command Reference: sso-admin create-instance - https://docs.aws.amazon.com/cli/latest/reference/sso-admin/create-instance.html
- AWS CLI Command Reference: identitystore create-user - https://docs.aws.amazon.com/cli/latest/reference/identitystore/create-user.html
- AWS CLI Command Reference: identitystore create-group - https://docs.aws.amazon.com/cli/latest/reference/identitystore/create-group.html
- AWS CLI Command Reference: identitystore create-group-membership - https://docs.aws.amazon.com/cli/latest/reference/identitystore/create-group-membership.html
- AWS CLI Command Reference: sso-admin create-permission-set - https://docs.aws.amazon.com/cli/latest/reference/sso-admin/create-permission-set.html
- AWS CLI Command Reference: sso-admin attach-managed-policy-to-permission-set - https://docs.aws.amazon.com/cli/latest/reference/sso-admin/attach-managed-policy-to-permission-set.html
- AWS CLI Command Reference: sso-admin put-inline-policy-to-permission-set - https://docs.aws.amazon.com/cli/latest/reference/sso-admin/put-inline-policy-to-permission-set.html
- AWS CLI Command Reference: sso-admin create-account-assignment - https://docs.aws.amazon.com/cli/latest/reference/sso-admin/create-account-assignment.html
- AWS CLI User Guide: Configuring IAM Identity Center authentication - https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html
- AWS IAM Identity Center User Guide: MFA types and MFA prompt configuration - https://docs.aws.amazon.com/singlesignon/latest/userguide/mfa-types.html and https://docs.aws.amazon.com/singlesignon/latest/userguide/mfa-getting-started.html
- Terraform Registry: aws_ssoadmin_instances data source and ssoadmin resources - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ssoadmin_instances

## Issues Found
- The post stated that IAM Identity Center requires AWS Organizations. AWS Organizations is recommended and required for an organization instance with multi-account access, but IAM Identity Center also supports account instances. Updated the prerequisite wording to be accurate for the guide's multi-account scope.
- The post said the Identity Center region cannot be changed later. AWS documents that changing the enabled region requires deleting the current instance and creating one in another Region. Updated the wording to reflect that caveat.
- The setup section included `aws sso-admin create-instance-metadata`, which is not a current AWS CLI command. Replaced it with console-based organization setup guidance and clarified that `aws sso-admin create-instance` is for account instances and is rejected in the organization management account.
- The post used "Azure AD" in current identity provider references. Updated this to "Microsoft Entra ID" while preserving the existing link target.
- Several sample IAM Identity Center permission set ARNs used invalid placeholder lengths for `ssoins-*` and `ps-*` components. Updated them to match the ARN patterns documented by AWS CLI.
- Sample Identity Store user/group IDs and account assignment principal IDs used informal placeholders that do not match AWS's GUID-style validation patterns. Replaced them with valid-shaped placeholder IDs.
- The Terraform snippet indexed `data.aws_ssoadmin_instances.main.arns[0]` directly even though the Terraform AWS provider exposes `arns` as a set. Updated these references to `tolist(data.aws_ssoadmin_instances.main.arns)[0]`.

## Review Notes
The AWS CLI is not installed in this workspace, so CLI validation was performed against the official AWS CLI command reference rather than local `--help` output. The OneUptime internal related-post URLs are plausible and were left unchanged.
