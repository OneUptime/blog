# Validation Summary: How to Create IAM Roles for CI/CD in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- AWS IAM (roles, policies, OIDC providers)
- AWS STS (AssumeRoleWithWebIdentity)
- GitHub Actions OIDC federation
- GitLab CI OIDC federation
- AWS ECR / ECS / S3 / DynamoDB (for example deployment permissions)
- `aws-actions/configure-aws-credentials` GitHub Action
- GitHub Actions workflow YAML

## Sources Consulted
- AWS IAM documentation: Creating OpenID Connect (OIDC) identity providers — https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html
- AWS docs: Configuring OpenID Connect in Amazon Web Services (GitHub Actions) — https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services
- Terraform AWS Provider: `aws_iam_openid_connect_provider` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_openid_connect_provider
- Terraform AWS Provider: `aws_iam_role`, `aws_iam_policy`, `aws_iam_role_policy_attachment`, `aws_iam_policy_document`
- GitLab CI/CD: ID tokens and OIDC with AWS — https://docs.gitlab.com/ee/ci/cloud_services/aws/
- GitHub Actions OIDC token claims reference (sub/aud format)
- `aws-actions/configure-aws-credentials` README (current major version v4)

## Issues Found
No technical issues found.

All Terraform resources, attribute names, and argument values are valid:
- `aws_iam_openid_connect_provider` URL, `client_id_list`, and `thumbprint_list` are correct.
- Trust policy uses `sts:AssumeRoleWithWebIdentity` with the correct `Federated` principal.
- GitHub `sub` claim format (`repo:ORG/REPO:ref:refs/heads/BRANCH`) and `aud` value (`sts.amazonaws.com`) match GitHub's OIDC token spec.
- GitLab `sub` claim format (`project_path:GROUP/PROJECT:ref_type:branch:ref:BRANCH`) and audience pattern match GitLab's documented JWT claims.
- `aws-actions/configure-aws-credentials@v4` and `actions/checkout@v4` are current valid action references.
- `permissions: id-token: write` is correctly identified as the required workflow permission for OIDC.
- `max_session_duration = 3600` is at the IAM minimum (1 hour), consistent with the post's recommendation.
- IAM policy JSON structure (Version, Statement, Sid, Effect, Action, Resource) is correct, and the deny-overrides-allow logic in the guardrails section is sound.
- `for_each`, `flatten`, and nested-loop constructs in the multi-stage roles example are syntactically valid HCL.

## Review Notes
- The GitHub OIDC thumbprint shown (`6938fd4d98bab03faadb97b34396831e3780aea1`) is a historically valid thumbprint. Since mid-2023, AWS no longer relies on the thumbprint for the well-known `token.actions.githubusercontent.com` provider — it is verified against AWS's trusted CA list — so the exact value does not affect functionality. Newer AWS provider versions also accept an omitted `thumbprint_list` for this URL, but supplying any plausible value (as the post does) still works.
- The comment "Restrict to specific repository" sits above the `aud` condition rather than the `sub` condition that actually restricts the repo; this is cosmetic and not a technical error.
- The `branches` variable name in the multi-stage example holds full `sub` claim values (including non-branch wildcards like `repo:my-org/my-repo:*`); the naming is slightly loose but the values themselves are valid `sub` patterns.
- The Terraform-specific role uses broad `iam:*` and `ec2:*`-style wildcards. This is acceptable for the post's stated purpose (a CI/CD role that runs Terraform) and is correctly paired with deny guardrails, but readers should scope these down in real deployments.
