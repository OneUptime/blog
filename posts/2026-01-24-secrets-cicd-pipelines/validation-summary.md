# Validation Summary: How to Handle Secrets in CI/CD Pipelines

## Status
validated

## Post Type
Guide

## Technologies Covered
- GitHub Actions secrets, environments, OIDC, workflow commands, and workflow syntax
- AWS IAM OIDC federation, AWS Secrets Manager, Amazon RDS, Amazon ECS, and AWS CLI
- GitLab CI/CD variables, protected/masked variables, ID tokens, and Vault secrets integration
- Jenkins Pipeline credentials binding and HashiCorp Vault plugin
- HashiCorp Vault and hashicorp/vault-action
- Secret scanning with detect-secrets, TruffleHog, and Gitleaks
- Docker BuildKit build secrets
- Kubernetes Secrets and External Secrets Operator

## Sources Consulted
- GitHub Docs: Workflow syntax for GitHub Actions - https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions
- GitHub Docs: Using secrets in GitHub Actions - https://docs.github.com/actions/security-guides/using-secrets-in-github-actions
- GitHub Docs: Workflow commands for GitHub Actions - https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands
- GitHub Docs: Configuring OpenID Connect in Amazon Web Services - https://docs.github.com/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services
- aws-actions/configure-aws-credentials README - https://github.com/aws-actions/configure-aws-credentials
- GitLab Docs: CI/CD variables - https://docs.gitlab.com/ci/variables/
- GitLab Docs: Use HashiCorp Vault secrets in GitLab CI/CD - https://docs.gitlab.com/ci/secrets/hashicorp_vault/
- GitLab Docs: Update HashiCorp Vault configuration to use ID Tokens - https://docs.gitlab.com/ci/secrets/convert-to-id-tokens/
- Jenkins Docs: Credentials Binding Plugin Pipeline steps - https://www.jenkins.io/doc/pipeline/steps/credentials-binding/
- Jenkins Docs: HashiCorp Vault Plugin Pipeline steps - https://www.jenkins.io/doc/pipeline/steps/hashicorp-vault-plugin/
- HashiCorp vault-action README - https://github.com/hashicorp/vault-action
- AWS CLI Docs: secretsmanager get-secret-value - https://docs.aws.amazon.com/cli/latest/reference/secretsmanager/get-secret-value.html
- AWS CLI Docs: secretsmanager put-secret-value - https://docs.aws.amazon.com/cli/latest/reference/secretsmanager/put-secret-value.html
- AWS CLI Docs: rds modify-db-cluster - https://docs.aws.amazon.com/cli/latest/reference/rds/modify-db-cluster.html
- Docker Docs: Build secrets - https://docs.docker.com/build/building/secrets/
- Kubernetes Docs: kubectl create secret - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret/
- External Secrets Operator Docs: ExternalSecret API - https://external-secrets.io/latest/api/externalsecret/
- Yelp detect-secrets README - https://github.com/Yelp/detect-secrets
- TruffleHog GitHub Action definition - https://github.com/trufflesecurity/trufflehog/blob/main/action.yml
- Gitleaks Action v2 documentation - https://github.com/gitleaks/gitleaks-action/blob/master/v2.md

## Issues Found
- Several GitHub Actions examples were presented as full workflow files but omitted an `on:` trigger. Added `workflow_dispatch` triggers to the OIDC, AWS Secrets Manager, and Vault examples so the workflows are valid GitHub Actions workflows.
- The GitHub Actions HashiCorp Vault example used JWT/OIDC authentication without granting `id-token: write`. Added job-level `permissions` with `id-token: write` and `contents: read`, matching the vault-action OIDC requirements.
- The GitLab Vault example used `CI_JOB_JWT`, which GitLab documents as deprecated and removed in GitLab 17.0. Replaced it with `id_tokens` and GitLab's `secrets:vault` integration using `$VAULT_ID_TOKEN`.
- The AWS RDS rotation example generated a base64 password, which can include characters not allowed by `modify-db-cluster --master-user-password`. Changed the generated password to 32 alphanumeric characters.
- The secret rotation example updated AWS Secrets Manager before updating the database password, creating a possible mismatch if the database update failed. Reordered the commands so the database update succeeds before publishing the new secret value.
- The Docker build example wrote the npm token to a temporary file in the workspace. Replaced it with Docker BuildKit's `--secret id=...,env=...` form so the secret is passed directly from the environment.

## Review Notes
The examples remain illustrative and still assume the surrounding infrastructure exists: AWS IAM roles and trust policies, Vault auth roles and policies, GitLab Runner support for external secrets, Jenkins plugins, Kubernetes credentials, and External Secrets Operator `SecretStore` resources must be configured separately. The GitLab `only:` keyword still works but `rules:` is preferred for newer GitLab CI configurations.
