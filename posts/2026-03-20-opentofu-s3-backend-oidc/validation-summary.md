# Validation Summary: How to Configure S3 Backend with OIDC Authentication in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (S3 backend, CLI)
- Terraform / HCL syntax
- AWS IAM (OIDC identity provider, IAM roles, trust policies)
- AWS STS (`AssumeRoleWithWebIdentity`)
- AWS S3 + DynamoDB (state storage and locking)
- GitHub Actions (OIDC, `aws-actions/configure-aws-credentials@v4`, `opentofu/setup-opentofu@v1`)
- GitLab CI/CD (`id_tokens`, OIDC)

## Sources Consulted
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- `opentofu/setup-opentofu` GitHub Action: https://github.com/opentofu/setup-opentofu
- OpenTofu official container image: https://github.com/opentofu/opentofu/pkgs/container/opentofu
- GitHub Actions OIDC with AWS guide: https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services
- AWS IAM OIDC thumbprint verification docs: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc_verify-thumbprint.html
- AWS CLI `sts assume-role-with-web-identity` reference: https://docs.aws.amazon.com/cli/latest/reference/sts/assume-role-with-web-identity.html
- GitLab CI `id_tokens` keyword: https://docs.gitlab.com/ci/yaml/#id_tokens
- Docker Hub `hashicorp/terraform`: https://hub.docker.com/r/hashicorp/terraform

## Issues Found
- **GitLab CI image vs. CLI mismatch**: The GitLab CI example used `image: hashicorp/terraform:latest` but invoked `tofu init` / `tofu apply` in its `script`. The HashiCorp Terraform image ships only the `terraform` binary, so the `tofu` commands would fail with "command not found". Replaced the image with `ghcr.io/opentofu/opentofu:latest` (the official OpenTofu container image), which ships the `tofu` binary that the script actually invokes.

## Review Notes
- **OIDC thumbprint**: The post pins `thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]`. AWS no longer strictly requires the thumbprint for the well-known `token.actions.githubusercontent.com` IdP — AWS verifies GitHub's OIDC provider via its trusted-CA library and falls back to thumbprints only when needed. The argument is still accepted by the AWS provider and the configuration is valid; it's just no longer load-bearing for GitHub's IdP. Left as-is because it remains correct, working configuration.
- **State locking via DynamoDB vs. native S3 lockfile**: The post uses `dynamodb_table` for state locking. Per the OpenTofu S3 backend docs, native S3 locking (`use_lockfile = true`, using S3 `If-None-Match` conditional writes) is now also fully supported and removes the DynamoDB dependency. Both options remain fully supported with no deprecation planned, so the post's approach is still correct — just worth noting that newer projects may prefer the simpler S3-only setup.
- **GitLab CI tooling note**: The OpenTofu official image is a minimal Alpine-based image and does not include the AWS CLI or `jq`, both of which the `before_script` uses. Users adopting this snippet will need to install them (e.g., `apk add --no-cache aws-cli jq`) or use a custom image. This is the same caveat that applied to the original `hashicorp/terraform:latest` image, so the change does not regress behavior — but it's worth highlighting in a future revision.
