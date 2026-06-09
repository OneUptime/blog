# Validation Summary: How to Implement GitHub Actions OIDC for AWS Authentication

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- GitHub Actions OIDC
- AWS IAM (OIDC Identity Provider, IAM Roles, Trust Policies)
- AWS STS (AssumeRoleWithWebIdentity)
- Terraform (aws_iam_openid_connect_provider, aws_iam_role, tls_certificate data source)
- AWS CloudFormation (AWS::IAM::OIDCProvider)
- AWS CLI (iam create-open-id-connect-provider, sts get-caller-identity, iam simulate-principal-policy)
- aws-actions/configure-aws-credentials@v4
- aws-actions/amazon-ecr-login@v2
- actions/checkout@v4
- Amazon ECR / ECS
- AWS CloudWatch Logs metric filters and alarms
- GitHub CLI (gh secret delete)

## Sources Consulted
- AWS IAM OIDC identity provider docs: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html
- AWS CLI reference for create-open-id-connect-provider: https://docs.aws.amazon.com/cli/latest/reference/iam/create-open-id-connect-provider.html
- GitHub Actions OIDC security hardening: https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect
- Knowledge of aws-actions/configure-aws-credentials (v4 current major version) and aws-actions/amazon-ecr-login (v2 current major version)
- AWS announcement (July 2023) regarding thumbprint validation behavior for trusted root CA OIDC providers (including GitHub)

## Issues Found
No technical issues found. Verified items:
- The aws iam create-open-id-connect-provider command syntax is correct; --thumbprint-list is now optional but still accepted.
- The GitHub thumbprint `6938fd4d98bab03faadb97b34396831e3780aea1` is one of the historical thumbprints still referenced; AWS now primarily validates against trusted root CAs for GitHub-hosted OIDC and only falls back to thumbprint verification when needed.
- The Terraform configuration using `data "tls_certificate"` to dynamically retrieve the thumbprint is the recommended approach and uses valid resource/data source names and attributes (`certificates[0].sha1_fingerprint`).
- The CloudFormation `AWS::IAM::OIDCProvider` resource properties (Url, ClientIdList, ThumbprintList, Tags) are correctly specified.
- IAM trust policy structure (Version, Statement, Effect, Principal.Federated, Action sts:AssumeRoleWithWebIdentity, Condition with StringEquals/StringLike) is correct.
- The condition keys `token.actions.githubusercontent.com:aud` and `token.actions.githubusercontent.com:sub` are the correct claim mapping keys for the GitHub OIDC provider URL.
- StringLike with a list value (e.g., `local.allowed_subjects`) is valid IAM policy syntax (OR semantics across list entries).
- The OIDC sub claim formats (`repo:OWNER/REPO:ref:refs/heads/BRANCH`, `repo:OWNER/REPO:environment:NAME`, etc.) match the documented GitHub OIDC token claim formats.
- max_session_duration default (3600s = 1 hour) and max (12 hours / 43200s) are correctly described.
- The GitHub Actions workflow `permissions: id-token: write` and `contents: read` requirements for OIDC are correctly stated.
- aws-actions/configure-aws-credentials@v4, aws-actions/amazon-ecr-login@v2, and actions/checkout@v4 are current major versions.
- The `role-to-assume`, `aws-region`, `role-session-name`, and `role-duration-seconds` inputs to configure-aws-credentials are valid.
- AWS CLI commands `aws sts get-caller-identity`, `aws iam list-role-policies`, `aws iam list-attached-role-policies`, `aws iam simulate-principal-policy`, `aws iam update-access-key`, and `aws iam delete-access-key` use correct syntax and flags.
- GitHub CLI `gh secret delete` is valid syntax.
- The IAM policy examples for ECR and ECS actions (ecr:GetAuthorizationToken, ecr:BatchCheckLayerAvailability, ecr:PutImage, ecs:UpdateService, etc.) use real action names with appropriate resource scoping patterns.

## Review Notes
- The thumbprint explanation ("AWS uses it to validate tokens") is a simplification. Since July 2023, AWS validates the JWKS endpoint TLS certificate against its library of trusted root CAs for well-known IdPs like GitHub and only falls back to thumbprint verification if the cert cannot be retrieved or if it's not signed by a trusted CA. The thumbprint parameter remains accepted (and historically required), so the code examples still work, but the explanatory comment is mildly outdated. Not flagged as an issue because the technical claim isn't wrong — AWS may still use the thumbprint as a fallback.
- The claim that GitHub OIDC tokens are "valid for about 5 minutes" is approximate. GitHub does not publicly document an exact TTL beyond describing tokens as "short-lived" and "valid for a single job". The placeholder example in GitHub's OIDC docs shows a ~15-minute window, but in practice tokens are short-lived; the article's general guidance to obtain credentials early in the workflow is sound regardless.
- The CloudWatch Logs metric filter pattern `{ $.eventName = AssumeRoleWithWebIdentity && $.errorCode = * }` uses `= *` to match "any value present". This pattern is permitted by CloudWatch's JSON metric filter syntax (wildcard match on string values). A stricter equivalent would be `$.errorCode IS NOT NULL`, but the supplied pattern is acceptable.
- The `Resource = "*"` scope on some example ECR/ECS read actions is acceptable for the documented use case (CI role needing broad descriptive read), but readers should consider tightening to specific repository ARNs in stricter environments. This is a hardening suggestion, not a technical error.
- The `ecs:UpdateService` permission in the deploy role is sufficient for the `--force-new-deployment` example, but real-world deployments often also need ecs:DescribeServices, iam:PassRole (for task role), and ecs:RegisterTaskDefinition for updated task definitions. Not flagged as an error since the example specifically targets a "force-new-deployment" of an existing service definition.
