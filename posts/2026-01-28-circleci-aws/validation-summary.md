# Validation Summary: How to Use CircleCI with AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CircleCI (CI/CD platform, config version 2.1)
- AWS (IAM, OIDC, AWS CLI, S3, STS)
- OIDC (OpenID Connect) for federated authentication
- Terraform (mentioned briefly)
- CircleCI convenience images (cimg/aws)

## Sources Consulted
- CircleCI OpenID Connect documentation: https://circleci.com/docs/openid-connect-tokens/
- CircleCI configuration reference (version 2.1): https://circleci.com/docs/configuration-reference/
- CircleCI convenience images (cimg/aws): https://hub.docker.com/r/cimg/aws
- AWS IAM OIDC identity provider documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html
- AWS STS AssumeRoleWithWebIdentity documentation: https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRoleWithWebIdentity.html
- AWS CLI configuration documentation (web identity / role ARN env vars): https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html

## Issues Found
No technical issues found. All claims and code in the post are technically correct:
- CircleCI does support OIDC tokens (exposed as `CIRCLE_OIDC_TOKEN`) which can be used to assume AWS IAM roles via `sts:AssumeRoleWithWebIdentity`, removing the need for long-lived AWS access keys.
- The CircleCI config syntax (`version: 2.1`, `docker:` executor, `steps:` with `checkout` and `run`) is valid.
- The `cimg/aws:2023.12` convenience image tag follows the correct YYYY.MM versioning scheme used by CircleCI's `cimg/aws` image.
- `aws sts get-caller-identity` and `aws s3 ls` are valid AWS CLI commands.
- The recommended best practices (least-privilege IAM roles, avoiding long-lived keys, restricting deployments to protected branches) are accurate and widely accepted.

## Review Notes
- The post is intentionally high-level and brief. It correctly identifies the right approach (OIDC over long-lived keys) but does not show the full plumbing required to actually exchange the CircleCI OIDC token for AWS credentials. In a production setup, the user would also need to either (a) write `$CIRCLE_OIDC_TOKEN` to a file and set `AWS_WEB_IDENTITY_TOKEN_FILE` so the AWS CLI/SDK auto-loads credentials, or (b) call `aws sts assume-role-with-web-identity` explicitly. This omission is a completeness gap, not a technical error — nothing in the post is incorrect.
- The trust policy details (OIDC provider URL `https://oidc.circleci.com/org/<organization-id>`, audience, subject claim constraints) are not shown. A future revision could include a concrete example trust policy.
- The `cimg/aws:2023.12` image is dated; readers in 2026 may want to use a newer tag, but the tag itself is valid and the image still exists.
