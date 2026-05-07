# Validation Summary: How to Set Up AWS Identity Center with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- AWS IAM Identity Center
- AWS Organizations
- AWS Identity Store
- AWS SSO Admin
- SAML 2.0
- SCIM
- Active Directory

## Sources Consulted
- AWS IAM Identity Center getting started: https://docs.aws.amazon.com/singlesignon/latest/userguide/getting-started.html
- AWS IAM Identity Center organization and account instances: https://docs.aws.amazon.com/singlesignon/latest/userguide/identity-center-instances.html
- AWS IAM Identity Center external identity providers: https://docs.aws.amazon.com/singlesignon/latest/userguide/manage-your-identity-source-idp.html
- AWS IAM Identity Center external IdP connection procedure: https://docs.aws.amazon.com/singlesignon/latest/userguide/how-to-connect-idp.html
- AWS IAM Identity Center identity-source change procedure: https://docs.aws.amazon.com/singlesignon/latest/userguide/manage-your-identity-source-change.html
- AWS IAM Identity Center identity-source change considerations: https://docs.aws.amazon.com/singlesignon/latest/userguide/manage-your-identity-source-considerations.html
- AWS IAM Identity Center customer managed applications: https://docs.aws.amazon.com/singlesignon/latest/userguide/customermanagedapps.html
- AWS IAM Identity Center application access overview: https://docs.aws.amazon.com/singlesignon/latest/userguide/manage-your-applications.html
- AWS IAM Identity Center access portal guidance: https://docs.aws.amazon.com/singlesignon/latest/userguide/using-the-portal.html
- AWS IAM Identity Center CloudTrail coverage: https://docs.aws.amazon.com/singlesignon/latest/userguide/sso-info-in-cloudtrail.html
- AWS CLI `sso-admin list-instances`: https://docs.aws.amazon.com/cli/latest/reference/sso-admin/list-instances.html
- OpenTofu `init`: https://opentofu.org/docs/cli/init/
- OpenTofu `plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply`: https://opentofu.org/docs/v1.11/cli/commands/apply/
- OpenTofu `output`: https://opentofu.org/docs/v1.11/cli/commands/output/
- AWS provider `aws_ssoadmin_instances` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/ssoadmin_instances.html.markdown
- AWS provider `aws_identitystore_user` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/identitystore_user.html.markdown
- AWS provider `aws_identitystore_group_membership` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/identitystore_group_membership.html.markdown
- AWS provider `aws_ssoadmin_permission_set` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ssoadmin_permission_set.html.markdown
- AWS provider `aws_ssoadmin_managed_policy_attachment` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ssoadmin_managed_policy_attachment.html.markdown
- AWS provider `aws_ssoadmin_account_assignment` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ssoadmin_account_assignment.html.markdown
- AWS provider `aws_organizations_organization` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/organizations_organization.html.markdown

## Issues Found
- The introduction described Active Directory as an external identity provider. AWS documents Active Directory and external IdPs as separate identity-source types, so I changed that wording to "identity sources."
- Step 2 presented direct `aws_identitystore_*` management without the documented caveat for external IdP or Active Directory deployments. I added the note that direct user and group management is for the built-in Identity Center directory, and that external sources should provision identities into IAM Identity Center instead.
- Step 3 omitted the explicit dependency that the AWS provider docs recommend when `aws_ssoadmin_managed_policy_attachment` and `aws_ssoadmin_account_assignment` are used together. I added `depends_on` to avoid the documented destroy-order issue.
- Step 5 incorrectly suggested the SAML identity-source configuration could be handled via console or CLI and implied a provider-managed resource for that step. I corrected this to a manual console step and aligned the instructions with AWS's documented `Actions > Change identity source` flow.
- Step 5 also omitted the required follow-up provisioning step for external IdPs. I added the SCIM or manual-provisioning reminder so the workflow matches AWS guidance.
- Step 6 was mislabeled as customer-managed or AWS-managed application setup, but the code actually creates AWS account assignments through `aws_ssoadmin_account_assignment`. I retitled the section and corrected the code comments accordingly.
- Step 7 used `tofu output sso_portal_url` even though the post never defined that output. OpenTofu `output` reads declared outputs from state, so I removed the invalid command and pointed readers to the AWS access portal URL in IAM Identity Center.
- The conclusion claimed CloudTrail provides logs of "all sign-ins." AWS documents gaps in sign-in event coverage for some IAM Identity Center scenarios, so I narrowed the claim to centralized audit visibility into IAM Identity Center activity through CloudTrail. I also updated `Azure AD` to the current `Microsoft Entra ID` name.

## Review Notes
- The post is technically sound after these corrections. The HCL resource names, arguments, and OpenTofu workflow commands align with the current AWS provider and OpenTofu documentation reviewed on 2026-05-07.
- Runtime validation with `tofu` was not possible in this workspace because the `tofu` CLI is not installed. The command review was therefore performed against official OpenTofu documentation, and the AWS behavior review relied on official AWS and provider documentation rather than a live AWS deployment.
