# Validation Summary: How to Create IAM Roles for Federated Access in Terraform

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Terraform (HCL)
- AWS IAM (roles, trust policies, policy attachments)
- AWS STS (`AssumeRoleWithSAML`, `AssumeRoleWithWebIdentity`, `TagSession`)
- SAML 2.0 federation (Okta, Azure AD, ADFS, PingFederate)
- OIDC federation (Google, GitHub, Cognito)
- Amazon Cognito (User Pools, Identity Pools)
- `aws_iam_saml_provider`, `aws_iam_openid_connect_provider`, `aws_iam_role`, `aws_iam_role_policy`, `aws_iam_role_policy_attachment`, `aws_cognito_*` resources

## Sources Consulted
- AWS IAM SAML federation docs (saml condition keys: `SAML:aud`, `SAML:sub_type`) — https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_iam-condition-keys.html
- AWS docs on enabling SAML 2.0 federated principals for the AWS Management Console (audience value `https://signin.aws.amazon.com/saml`)
- AWS docs on passing session tags in SAML (`https://aws.amazon.com/SAML/Attributes/PrincipalTag:*`) and the requirement for `sts:TagSession`
- Terraform AWS provider docs for `aws_iam_saml_provider`, `aws_iam_openid_connect_provider`, `aws_iam_role` (incl. `max_session_duration` bounds 3600–43200), `aws_cognito_identity_pool_roles_attachment`
- Cognito Identity docs for trust-policy condition keys (`cognito-identity.amazonaws.com:aud`, `:amr`, `:sub`)
- Google OIDC issuer (`https://accounts.google.com`) and documented thumbprint

## Issues Found
1. **Incorrect SAML group-restriction example.** The "Restricting SAML Roles by Group" section used a condition on `SAML:sub_type = "persistent"` with a comment claiming it restricted access to the "AWS-Admins group". `saml:sub_type` is a SAML claim describing the NameID format (`persistent` / `transient` / `unspecified`), not group membership — the example did not actually restrict by group. Replaced with the standard pattern: add `sts:TagSession` to the trust policy's actions and check `aws:PrincipalTag/Group` (populated by the IdP via the `https://aws.amazon.com/SAML/Attributes/PrincipalTag:Group` SAML attribute). Added comments explaining the IdP-side mapping requirement.

## Review Notes
- All other Terraform resource arguments, condition keys, and IAM action names verified correct.
- `max_session_duration = 43200` is at the AWS-allowed maximum (12 hours); valid but worth noting for readers who may prefer shorter admin sessions (the dynamic-roles example correctly demonstrates shorter durations).
- The Google OIDC `thumbprint_list` is still accepted by the AWS provider, though AWS provider v5+ makes it optional for IdPs AWS validates automatically (Google included). Leaving as-is for compatibility with older provider versions.
- The `$${cognito-identity.amazonaws.com:sub}` escaping inside `jsonencode` is correct Terraform syntax for emitting a literal IAM policy variable.
- The post's two cross-links to companion posts (SAML and OIDC identity providers) reference plausible sibling URLs under `oneuptime.com/blog/post/...`; not independently verified to exist.
