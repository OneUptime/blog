# Validation Summary: How to Create OIDC Identity Providers in Terraform

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- Terraform (HCL)
- AWS IAM (`aws_iam_openid_connect_provider`, `aws_iam_role`, `aws_iam_role_policy_attachment`, `aws_iam_policy_document`)
- AWS EKS (IRSA — IAM Roles for Service Accounts)
- AWS STS (`sts:AssumeRoleWithWebIdentity`)
- HashiCorp TLS provider (`tls_certificate` data source)
- OpenID Connect (OIDC) federation
- GitHub Actions OIDC
- GitLab CI OIDC
- Bitbucket Pipelines OIDC
- Self-hosted OIDC (Keycloak example)

## Sources Consulted
- [Terraform Registry — aws_iam_openid_connect_provider resource](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_openid_connect_provider)
- [Terraform Registry — tls_certificate data source](https://registry.terraform.io/providers/hashicorp/tls/latest/docs/data-sources/certificate)
- [Terraform Registry — aws_eks_cluster data source](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/eks_cluster)
- [AWS IAM — Obtain the thumbprint for an OIDC identity provider](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc_verify-thumbprint.html)
- [AWS EKS — IAM Roles for Service Accounts](https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html)
- [GitHub Docs — OpenID Connect reference (sub claim format)](https://docs.github.com/en/actions/reference/openid-connect-reference)
- [GitHub Docs — Configuring OpenID Connect in Amazon Web Services](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
- [GitHub Changelog — OIDC integration with AWS no longer requires thumbprint pinning (2023-07-13)](https://github.blog/changelog/2023-07-13-github-actions-oidc-integration-with-aws-no-longer-requires-pinning-of-intermediate-tls-certificates/)
- [GitLab Docs — Configure OpenID Connect in AWS](https://docs.gitlab.com/ci/cloud_services/aws/)
- [Atlassian — Deploy on AWS using Bitbucket Pipelines OpenID Connect](https://support.atlassian.com/bitbucket-cloud/docs/deploy-on-aws-using-bitbucket-pipelines-openid-connect/)

## Issues Found
No technical issues found. Specifically verified:

- `aws_iam_openid_connect_provider` argument names (`url`, `client_id_list`, `thumbprint_list`, `tags`) — correct.
- `tls_certificate` data source attribute path `certificates[0].sha1_fingerprint` — correct.
- `data.aws_eks_cluster.<name>.identity[0].oidc[0].issuer` attribute path — correct.
- GitHub Actions OIDC issuer URL (`https://token.actions.githubusercontent.com`) and sub claim format `repo:OWNER/REPO:ref:refs/heads/BRANCH` — correct.
- GitHub thumbprint `6938fd4d98bab03faadb97b34396831e3780aea1` — historically valid. Since 2023‑07‑13 AWS no longer enforces thumbprint pinning for GitHub Actions (validation now uses trusted root CAs), so this value is accepted; the post already notes this caveat in the Thumbprint Management section.
- GitLab CI issuer URL (`https://gitlab.com`), sub claim format `project_path:GROUP/PROJECT:ref_type:branch:ref:NAME`, and `https://gitlab.com` audience — all correct per GitLab's official AWS OIDC docs.
- Bitbucket Pipelines provider URL `https://api.bitbucket.org/2.0/workspaces/{workspaceSlug}/pipelines-config/identity/oidc` and audience format `ari:cloud:bitbucket::workspace/{workspace_uuid}` — correct per Atlassian docs.
- EKS IRSA sub claim format `system:serviceaccount:NAMESPACE:SERVICE_ACCOUNT_NAME` — correct.
- `sts:AssumeRoleWithWebIdentity` action and `Federated` principal type in trust policies — correct.

## Review Notes
- **GitHub thumbprint rotation (optional improvement, not a defect).** During GitHub's June 2023 certificate rotation, the second valid intermediate thumbprint was `1c58a3a8518e8759bf075b76b750d4f2df264fcd`. Tutorials that pin thumbprints sometimes list both for resilience. Since the post already explains that AWS now validates GitHub tokens via trusted root CAs, listing a single thumbprint is acceptable.
- **Bitbucket placeholder ambiguity (optional clarification).** The Bitbucket example uses `my-workspace` (workspace slug) in the provider URL and `workspace-uuid` (workspace UUID) in the `client_id_list`. These are two different identifiers — the URL takes the slug, the audience takes the UUID. The current placeholders are technically correct but readers may not realize they need different values for each.
- **`thumbprint_list` optionality.** Since AWS provider v5.x the `thumbprint_list` argument became optional (AWS will derive a thumbprint server-side if omitted). The post still treats it as required, which is the safe/portable approach and remains valid.
- No deprecated APIs or syntax errors in any of the Terraform examples.
