# Validation Summary: How to Integrate IAM Identity Center with Okta

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- AWS IAM Identity Center
- Okta
- SAML 2.0
- SCIM 2.0
- AWS CLI
- AWS CloudTrail
- Terraform AWS Provider

## Sources Consulted
- AWS IAM Identity Center: Configure SAML and SCIM with Okta and IAM Identity Center: https://docs.aws.amazon.com/singlesignon/latest/userguide/gs-okta.html
- AWS IAM Identity Center: Using SAML and SCIM identity federation with external identity providers: https://docs.aws.amazon.com/singlesignon/latest/userguide/other-idps.html
- AWS IAM Identity Center: Provision users and groups from an external identity provider using SCIM: https://docs.aws.amazon.com/singlesignon/latest/userguide/provision-automatically.html
- AWS IAM Identity Center: Enable automatic provisioning: https://docs.aws.amazon.com/singlesignon/latest/userguide/how-to-with-scim.html
- AWS CLI v2 reference: sso-admin create-permission-set: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/sso-admin/create-permission-set.html
- AWS CLI v2 reference: sso-admin attach-managed-policy-to-permission-set: https://docs.aws.amazon.com/cli/latest/reference/sso-admin/attach-managed-policy-to-permission-set.html
- AWS CLI v2 reference: sso-admin create-account-assignment: https://docs.aws.amazon.com/cli/latest/reference/sso-admin/create-account-assignment.html
- AWS CLI v2 reference: identitystore list-users: https://docs.aws.amazon.com/cli/latest/reference/identitystore/list-users.html
- Terraform AWS Provider: aws_identitystore_group data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/identitystore_group
- Terraform AWS Provider: aws_ssoadmin_account_assignment resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssoadmin_account_assignment
- Okta documentation: Provisioning and SCIM app integrations: https://help.okta.com/oie/en-us/Content/Topics/Provisioning/lcm/con-okta-prov.htm

## Issues Found
- The introduction said offboarding is instant. SCIM provisioning updates are controlled by the identity provider and are reflected after the identity provider sends the change. Changed the wording to say offboarding is managed centrally through Okta and SCIM provisioning.
- Step 6 assigned and pushed the same Okta groups. AWS currently says using the same Okta group for both assignments and group push is not supported. Updated the instructions to use separate Okta groups for app assignment and group push.
- Step 8 used `$PERMISSION_SET_ARN` without assigning it. The AWS CLI `create-permission-set` command returns `PermissionSet.PermissionSetArn`, so the snippet now captures it with `--query 'PermissionSet.PermissionSetArn' --output text`.
- The token expiration section said only that the SCIM token expires. AWS documents a one-year validity period and reminders when the token has 90 days or less remaining. Updated the section to include those details.

## Review Notes
- The local environment did not have the AWS CLI installed, so CLI validation was performed against the official AWS CLI v2 command reference instead of local `aws help` output.
- The Terraform registry pages require JavaScript for full rendering, but the Terraform snippets match the documented HashiCorp AWS Provider arguments exposed in indexed official registry content.
