# Validation Summary: How to Manage Secrets in GitHub Actions

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- GitHub Actions
- GitHub Actions secrets and environments
- GitHub CLI
- GITHUB_TOKEN permissions
- OpenID Connect (OIDC)
- AWS IAM role authentication from GitHub Actions
- Google Cloud Workload Identity Federation
- HashiCorp Vault GitHub Action
- Docker login action
- Workflow artifacts

## Sources Consulted
- GitHub Docs: Using secrets in GitHub Actions - https://docs.github.com/actions/security-guides/using-secrets-in-github-actions
- GitHub Docs: Secrets concepts - https://docs.github.com/en/actions/concepts/security/secrets
- GitHub Docs: GITHUB_TOKEN - https://docs.github.com/en/actions/concepts/security/github_token
- GitHub Docs: Workflow syntax and permissions - https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Docs: OpenID Connect reference - https://docs.github.com/actions/reference/openid-connect-reference
- GitHub Docs: OIDC in AWS - https://docs.github.com/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services
- GitHub Docs: OIDC in Google Cloud Platform - https://docs.github.com/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-google-cloud-platform
- GitHub Docs: Workflow commands, masking, and passing secrets - https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands
- GitHub CLI manual: gh secret set - https://cli.github.com/manual/gh_secret_set
- Docker login action README - https://github.com/docker/login-action
- actions/checkout README and releases - https://github.com/actions/checkout
- actions/github-script README - https://github.com/actions/github-script
- aws-actions/configure-aws-credentials README - https://github.com/aws-actions/configure-aws-credentials
- google-github-actions/auth README - https://github.com/google-github-actions/auth
- HashiCorp Vault GitHub Action README - https://github.com/hashicorp/vault-action
- GNU coreutils base64 help output

## Issues Found
- Updated outdated action major versions: `docker/login-action@v3` to `@v4`, `actions/github-script@v7` to `@v8`, `aws-actions/configure-aws-credentials@v4` to `@v6`, and `google-github-actions/auth@v2` to `@v3`.
- Corrected the `GITHUB_TOKEN` permissions example for `github.rest.issues.createComment`. The Issues API comment call needs `issues: write`, not `pull-requests: write`.
- Corrected the "Passing Secrets Between Jobs" example so it does not write a plaintext secret into an uploaded artifact. The example now passes only non-secret config through artifacts and reads the secret again in the deployment job.
- Updated artifact actions in that example from `actions/upload-artifact@v4` and `actions/download-artifact@v4` to current `@v7` examples.
- Fixed the multi-line secret example's code fences so the shell command and workflow YAML are not mixed in one `bash` block.
- Replaced `base64 -i certificate.pem` with the portable `base64 < certificate.pem | tr -d '\n' | gh secret set CERTIFICATE`; on GNU coreutils, `-i` means `--ignore-garbage` for decoding, not input file.
- Added `contents: read` and `id-token: write` permissions to the Vault JWT example, matching HashiCorp's OIDC guidance for `hashicorp/vault-action`.

## Review Notes
- The post is technically relevant and validated after corrections.
- Secrets from forked pull request workflows and Dependabot-triggered workflows have additional restrictions that are not covered in depth; this is a useful future enhancement but not a correctness blocker for the current guide.
