# Validation Summary: How to Use IAM Roles with External Identity Providers (SAML)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Identity and Access Management (IAM)
- AWS Security Token Service (STS)
- SAML 2.0 federation
- AWS Management Console federated sign-in
- AWS CLI
- Terraform AWS provider

## Sources Consulted
- AWS IAM User Guide: SAML 2.0 federation - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_saml.html
- AWS IAM User Guide: Enabling SAML 2.0 federated principals to access the AWS Management Console - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_enable-console-saml.html
- AWS IAM User Guide: Configure SAML assertions for the authentication response - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_saml_assertions.html
- AWS IAM User Guide: IAM and AWS STS condition context keys - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_iam-condition-keys.html
- AWS CLI Command Reference: iam create-saml-provider - https://docs.aws.amazon.com/cli/latest/reference/iam/create-saml-provider.html
- AWS CLI Command Reference: sts assume-role-with-saml - https://docs.aws.amazon.com/cli/latest/reference/sts/assume-role-with-saml.html
- AWS CLI Command Reference: iam update-saml-provider - https://docs.aws.amazon.com/cli/latest/reference/iam/update-saml-provider.html
- Terraform Registry: aws_iam_saml_provider - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_saml_provider
- Terraform Registry: aws_iam_role - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role

## Issues Found
- Corrected the console SAML flow diagram. The original diagram showed the browser posting the SAML assertion directly to AWS STS and receiving temporary credentials. AWS documents console SAML federation as posting to the AWS sign-in endpoint, which calls `AssumeRoleWithSAML` and redirects the browser to the console.
- Corrected the `SAML:aud` explanation. AWS documents `saml:aud` as coming from the SAML `Recipient` field, not the SAML `Audience` field.
- Clarified the `SessionDuration` SAML attribute as applying to the AWS Management Console session, matching AWS documentation.
- Replaced the unsupported `SAML:authnContextClassRef` condition example with documented SAML condition keys: `SAML:mail` and `SAML:sub_type`.

## Review Notes
The AWS CLI examples could not be checked with local `aws --help` because the AWS CLI is not installed in the workspace. They were validated against the official AWS CLI command reference instead.
