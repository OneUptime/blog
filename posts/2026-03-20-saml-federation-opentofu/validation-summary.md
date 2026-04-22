# Validation Summary: How to Set Up SAML Federation with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS IAM
- AWS STS
- SAML 2.0 federation
- Terraform/OpenTofu HCL
- Okta
- Microsoft Entra ID

## Sources Consulted
- AWS IAM User Guide, SAML 2.0 federation: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_saml.html
- AWS IAM User Guide, IAM and AWS STS condition context keys: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_iam-condition-keys.html
- AWS STS API Reference, AssumeRoleWithSAML: https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRoleWithSAML.html
- Terraform AWS Provider resource docs, aws_iam_saml_provider: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_saml_provider
- Terraform AWS Provider resource docs, aws_iam_role: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role
- Terraform AWS Provider resource docs, aws_iam_role_policy_attachment: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment
- OpenTofu CLI docs, init command: https://opentofu.org/docs/cli/commands/init/
- OpenTofu CLI docs, plan command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI docs, apply command: https://opentofu.org/docs/cli/commands/apply/
- Microsoft Learn, New name for Azure Active Directory: https://learn.microsoft.com/en-us/entra/fundamentals/new-name

## Issues Found
- The post referred to Azure AD by its old product name. Updated both references to Microsoft Entra ID, the current Microsoft product name.
- The "Scoping Access with SAML Attributes" section described a `SAML:sub` condition as an IdP group restriction. AWS documents `saml:sub` as the SAML subject/NameID for an individual principal, not a group attribute. Updated the wording and inline comment to describe subject matching instead of group matching.

## Review Notes
- The IAM SAML provider, IAM role trust policy, managed policy attachment resources, and OpenTofu commands are consistent with the consulted official documentation.
- AWS recommends regional SAML sign-in endpoints for federation resiliency, but the global `https://signin.aws.amazon.com/saml` audience used in the examples is still documented as an optional endpoint.
- The OpenTofu and Terraform CLIs were not installed in this workspace, so I could not run local `tofu validate` or formatting checks. The snippets were reviewed against official HCL/provider documentation instead.
