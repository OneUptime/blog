# Validation Summary: How to Use OIDC for Cloud Authentication in GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide — step-by-step setup of GitHub Actions OIDC authentication for AWS, Azure, and GCP.

## Technologies Covered
- GitHub Actions (OIDC token issuance, `permissions: id-token: write`)
- OpenID Connect (OIDC) / JWT
- AWS IAM (OIDC identity provider, `sts:AssumeRoleWithWebIdentity`, trust policies)
- `aws-actions/configure-aws-credentials` and `aws-actions/amazon-ecr-login`
- Azure AD app registration, federated credentials, `azure/login`, `azure/webapps-deploy`
- GCP Workload Identity Federation (pools/providers), `google-github-actions/auth`, `google-github-actions/setup-gcloud`
- Terraform (`hashicorp/setup-terraform`), Docker/ECR, ECS, Cloud Run

## Sources Consulted
- aws-actions/configure-aws-credentials — https://github.com/aws-actions/configure-aws-credentials (release tags / breaking changes)
- AWS: Use IAM roles to connect GitHub Actions to AWS — https://aws.amazon.com/blogs/security/use-iam-roles-to-connect-github-actions-to-actions-in-aws/
- GitHub Docs: Configuring OIDC in AWS / Azure / GCP — https://docs.github.com/en/actions/deployment/security-hardening-your-deployments
- google-github-actions/auth — https://github.com/google-github-actions/auth
- Google Cloud: Enabling keyless authentication from GitHub Actions — https://cloud.google.com/blog/products/identity-security/enabling-keyless-authentication-from-github-actions
- Azure: azure/login action and federated identity credential docs — https://github.com/Azure/login

## Issues Found
No technical issues found.

All commands, configuration snippets, and workflow YAML were verified as syntactically correct and accurate:
- The AWS OIDC provider thumbprint (`6938fd4d98bab03faadb97b34396831e3780aea1`) is the valid, well-known GitHub Actions value, and the `aws iam create-open-id-connect-provider` invocation is correct.
- The IAM trust policy (`sts:AssumeRoleWithWebIdentity` with `aud`/`sub` conditions, `StringEquals`/`StringLike`) matches AWS's documented format, including the `repo:org/repo:ref:refs/heads/main` and `:environment:production` subject patterns.
- Azure federated-credential JSON (`issuer`, `subject`, `audiences: ["api://AzureADTokenExchange"]`) and the `azure/login@v2` / `azure/webapps-deploy@v3` workflow are correct.
- GCP Workload Identity Pool/provider commands, attribute mappings, and the `principalSet://.../attribute.repository/org/repo` member format are correct, as is the `google-github-actions/auth@v2` configuration.
- The `permissions: id-token: write` requirement and the OIDC token debug snippet are accurate.

## Review Notes
- **Action version currency:** `aws-actions/configure-aws-credentials` is now at v6 (v6.0.0 was released 2026-02-04, after this post's 2025-12-20 date). The only v6 breaking change is moving the action runtime to node24; the inputs used here (`role-to-assume`, `aws-region`) are unchanged, so the `@v4` examples remain fully functional and are not deprecated. A future refresh could bump pins to `@v6` for AWS actions. Other action versions (`azure/login@v2`, `azure/webapps-deploy@v3`, `google-github-actions/auth@v2`, `setup-gcloud@v2`, `amazon-ecr-login@v2`, `setup-terraform@v3`, `checkout@v4`) are current.
- **AWS thumbprint relevance:** AWS now validates GitHub's OIDC IdP certificate against its own trust store, so the thumbprint is effectively ignored for `token.actions.githubusercontent.com`. The command as written still works and remains the documented setup.
- **JWT debug snippet:** GitHub's OIDC token uses base64url encoding; `base64 -d` may need padding/character handling on some platforms, but the `2>/dev/null | jq .` pattern is a reasonable best-effort debug helper as presented.
- **Multi-cloud example:** The final example deploys a Cloud Run service referencing an ECR image (`${{ vars.ECR_REGISTRY }}/app`). This is illustrative; in practice Cloud Run pulls from Google Artifact Registry/GCR, so a real multi-cloud pipeline would push to a GCP registry. This is a contrived demonstration, not a technical error in the OIDC mechanics the post is teaching.
