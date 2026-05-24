# Validation Summary: How to Create SAML Identity Providers in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (1.0+)
- AWS IAM SAML Provider (`aws_iam_saml_provider`)
- AWS IAM Roles and managed policy attachments
- SAML 2.0 federation with AWS STS (`sts:AssumeRoleWithSAML`)
- AWS S3 data source (`aws_s3_object`)
- Terraform remote state (S3 backend)
- AWS Organizations / multi-account setups with provider aliases
- Third-party IdPs (Okta, Azure AD, ADFS, PingFederate)

## Sources Consulted
- AWS IAM User Guide — Create a SAML identity provider in IAM: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_saml.html
- AWS IAM User Guide — Configure SAML assertions for the authentication response (SAML:aud, role attribute format): https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_saml_assertions.html
- Terraform AWS Provider — `aws_iam_saml_provider`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_saml_provider
- Terraform AWS Provider — `aws_iam_policy_document` data source
- Terraform AWS Provider — `aws_iam_role` (max_session_duration range 3600–43200)
- AWS managed policy reference (AdministratorAccess, PowerUserAccess, ReadOnlyAccess, SecurityAudit, IAMReadOnlyAccess, AmazonEC2ReadOnlyAccess, AmazonS3ReadOnlyAccess, CloudWatchReadOnlyAccess)

## Issues Found
No technical issues found.

The post's Terraform code is syntactically correct and uses current, non-deprecated APIs. Specifically verified:
- `aws_iam_saml_provider` arguments (`name`, `saml_metadata_document`, `tags`) are accurate.
- Trust policy uses `Federated` principal type with the SAML provider ARN and the `sts:AssumeRoleWithSAML` action — correct.
- The `SAML:aud` condition value `https://signin.aws.amazon.com/saml` is the AWS-defined audience for console SSO — correct.
- All AWS managed policy ARNs cited (`AdministratorAccess`, `PowerUserAccess`, `AmazonEC2ReadOnlyAccess`, `AmazonS3ReadOnlyAccess`, `CloudWatchReadOnlyAccess`, `ReadOnlyAccess`, `SecurityAudit`, `IAMReadOnlyAccess`) exist and are correctly formed.
- `max_session_duration` values computed via `hours * 3600` fall within AWS limits (1–12 hours / 3600–43200 seconds): 4h=14400, 8h=28800, 12h=43200.
- Provider alias usage in the multi-account section is syntactically correct.
- The role-attribute mapping format `role_arn,provider_arn` matches the AWS-required value for the `https://aws.amazon.com/SAML/Attributes/Role` SAML attribute.
- `flatten`/`for` expressions and `for_each` patterns are valid HCL.
- `terraform_remote_state` data source usage with the S3 backend is correct.

## Review Notes
- The `aws_s3_object` data source's `body` attribute is only populated when the S3 object's `Content-Type` is text-like (e.g., `text/*`, `application/json`, `application/xml`). Readers using this pattern should ensure the SAML metadata is uploaded with an appropriate `Content-Type` (and that it fits the body size limit). This is a documented caveat, not an error in the post.
- The post does not explicitly mention that metadata updates rotate certificates server-side; the claim that updates are "non-disruptive — existing sessions continue to work" is accurate because session credentials issued by STS are independent of the provider metadata once granted, but new authentications use the updated cert immediately. The wording is fine.
- The developer role's description "Read access for developers with CloudWatch access" is a slight understatement (it includes EC2 + S3 + CloudWatch read), but it is a descriptive string, not a technical error.
- The post relies on `aws_iam_role_policy_attachment` rather than the deprecated inline `managed_policy_arns` argument on `aws_iam_role`, which is the current best practice — good.
