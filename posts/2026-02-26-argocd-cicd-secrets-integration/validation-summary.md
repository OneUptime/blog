# Validation Summary: How to Handle CI/CD Secrets for ArgoCD Integration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD CLI, API tokens, RBAC, AppProject roles, and webhooks
- Kubernetes ConfigMaps and Secrets
- GitHub Actions, GitHub CLI, GitHub Apps, and repository secrets
- GitLab CI/CD variables and SSH deploy keys
- Jenkins Credentials Binding
- AWS Secrets Manager GitHub Action
- HashiCorp Vault GitHub Action
- TruffleHog secret scanning

## Sources Consulted
- Argo CD local users and account management documentation: https://argo-cd.readthedocs.io/en/release-3.0/operator-manual/user-management/
- Argo CD CLI environment variables: https://argo-cd.readthedocs.io/en/latest/user-guide/environment-variables/
- Argo CD `argocd account generate-token` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_generate-token/
- Argo CD `argocd proj role add-policy` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj_role_add-policy/
- Argo CD `argocd proj role create-token` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_role_create-token/
- Argo CD webhook configuration documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/webhook/
- GitHub CLI `gh secret set` manual: https://cli.github.com/manual/gh_secret_set
- GitHub Actions environments documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
- `actions/create-github-app-token` README: https://github.com/actions/create-github-app-token
- GitLab CI/CD variables documentation: https://docs.gitlab.com/ci/variables/
- GitLab SSH keys with CI/CD documentation: https://docs.gitlab.com/ci/jobs/ssh_keys/
- Jenkins Credentials Binding documentation: https://www.jenkins.io/doc/pipeline/steps/credentials-binding/
- AWS Secrets Manager GitHub Action README: https://github.com/aws-actions/aws-secretsmanager-get-secrets
- HashiCorp Vault GitHub Action README: https://github.com/hashicorp/vault-action
- TruffleHog README: https://github.com/trufflesecurity/trufflehog

## Issues Found
- The GitHub App token example used `actions/create-github-app-token@v1` and `app-id`. Updated it to the current `@v3` action, the recommended `client-id` input, and explicit `permission-contents: write` because the example pushes manifest changes.
- The GitLab deploy-key example mixed an undefined file variable with `ssh-agent`, and disabled host key checking. Replaced it with a GitLab CI/CD File variable pattern, `chmod 400`, `ssh-keyscan`, and `GIT_SSH_COMMAND` using the file variable.
- The AWS Secrets Manager example exported `ARGOCD_TOKEN`, but the later Argo CD CLI command relied on environment lookup. Changed the alias to `ARGOCD_AUTH_TOKEN`, which is the environment variable the Argo CD CLI reads.
- The log-safety example redirected `argocd account generate-token` to `/dev/null`, which discards the generated token and is not a usable rotation pattern. Changed it to capture the token in a variable and pass it directly to `gh secret set`.
- The TruffleHog example used the older `--only-verified` flag. Updated it to the current documented `--results=verified --fail` form.

## Review Notes
The remaining examples are intentionally illustrative and assume the runner already has network access to the Argo CD API server and any required baseline authentication or cloud identity configuration. For production use, pinning third-party GitHub Actions to immutable SHAs would further reduce supply-chain risk.
