# Validation Summary: How to Set Up OIDC Federation with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu (Terraform fork)
- AWS IAM (OIDC identity provider, role trust policies)
- AWS STS (`AssumeRoleWithWebIdentity`)
- GitHub Actions OIDC (`token.actions.githubusercontent.com`)
- GitLab CI OIDC (`gitlab.com`)
- HashiCorp `tls` provider (`tls_certificate` data source)
- HashiCorp `aws` provider (`aws_iam_openid_connect_provider`, `aws_iam_role`, `aws_iam_role_policy_attachment`)
- `aws-actions/configure-aws-credentials@v4`
- `actions/checkout@v4`

## Sources Consulted
- AWS docs: Creating OpenID Connect (OIDC) identity providers — https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html
- AWS docs: `sts:AssumeRoleWithWebIdentity` — https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRoleWithWebIdentity.html
- GitHub docs: About security hardening with OpenID Connect (subject claim format `repo:ORG/REPO:ref:refs/heads/BRANCH`, audience `sts.amazonaws.com`) — https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect
- GitHub docs: Configuring OpenID Connect in Amazon Web Services — https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services
- GitLab docs: Configure OpenID Connect with AWS (subject claim format `project_path:GROUP/PROJECT:ref_type:branch:ref:BRANCH`) — https://docs.gitlab.com/ee/ci/cloud_services/aws/
- Terraform AWS provider: `aws_iam_openid_connect_provider` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_openid_connect_provider
- Terraform TLS provider: `tls_certificate` data source (`sha1_fingerprint` attribute) — https://registry.terraform.io/providers/hashicorp/tls/latest/docs/data-sources/certificate
- `aws-actions/configure-aws-credentials` README (v4, `role-to-assume`, `aws-region`, OIDC `id-token: write` permission) — https://github.com/aws-actions/configure-aws-credentials
- OpenTofu CLI docs (`tofu init`, `tofu plan -out`, `tofu apply <plan>`) — https://opentofu.org/docs/cli/

## Issues Found
- **Missing `data "tls_certificate" "gitlab"` data source.** The GitLab CI section referenced `data.tls_certificate.gitlab.certificates[0].sha1_fingerprint` but no such data source was declared anywhere in the post (only the GitHub equivalent was). The configuration would have failed at `tofu plan` with an "Reference to undeclared resource" error. Added the corresponding `data "tls_certificate" "gitlab" { url = "https://gitlab.com" }` block above the `aws_iam_openid_connect_provider.gitlab` resource so the example matches the GitHub section and is self-contained.

## Review Notes
- Since AWS provider v4.41+ / IAM service updates in mid-2023, `thumbprint_list` is no longer strictly required for the `token.actions.githubusercontent.com` and other AWS-trusted OIDC IdPs (AWS validates the cert chain via its built-in trust store). The thumbprint approach shown still works and is harmless, so it was left as-is. Some teams prefer to omit `thumbprint_list` for known IdPs to avoid having to rotate it when GitHub rotates its certificate.
- The GitLab role's trust policy only restricts the `sub` claim and does not also pin the `aud` claim with a `StringEquals` on `gitlab.com:aud`. This is a defense-in-depth gap relative to the GitHub example (which does pin `aud` to `sts.amazonaws.com`). Not technically incorrect — the post is a minimal illustration — but readers using this in production should also restrict the audience.
- The trust policy uses `arn:aws:iam::aws:policy/PowerUserAccess`, which is broad. The post does not claim this is least-privilege; readers should scope this down for real deployments.
- `aws-actions/configure-aws-credentials@v4` and `actions/checkout@v4` are the current major versions as of the validation date.
- The OIDC subject formats for both GitHub (`repo:ORG/REPO:ref:refs/heads/main`) and GitLab (`project_path:GROUP/PROJECT:ref_type:branch:ref:main`) match the official documentation.
