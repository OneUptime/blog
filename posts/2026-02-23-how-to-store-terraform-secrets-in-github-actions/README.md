# How to Store Terraform Secrets in GitHub Actions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GitHub Actions, Secrets, Security, CI/CD, DevOps, OIDC

Description: Securely manage Terraform secrets in GitHub Actions using repository secrets, environment secrets, OIDC authentication, and external secret stores like AWS Secrets Manager and HashiCorp Vault.

---

Terraform needs credentials to manage cloud infrastructure - AWS access keys, Azure service principal secrets, GCP service account keys, and API tokens for various providers. How you store and access these credentials in GitHub Actions determines the security of your entire deployment pipeline. Get it wrong and you are one compromised workflow away from an attacker owning your cloud account.

This post covers the different approaches to managing Terraform secrets in GitHub Actions, from the simplest (repository secrets) to the most secure (OIDC with no stored credentials at all).

## Approach 1: Repository Secrets

The most straightforward approach is storing credentials as repository secrets. Go to Settings, then Secrets and variables, then Actions, and add your secrets.

```yaml
# .github/workflows/terraform.yml
name: Terraform

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.7.5"

      - name: Terraform Init
        run: terraform init
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

      - name: Terraform Apply
        run: terraform apply -auto-approve
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

This works, but has limitations. Any workflow in the repository can access these secrets. You cannot scope them to specific environments. And you are storing long-lived credentials that need to be rotated manually.

## Approach 2: Environment Secrets

Environment secrets improve on repository secrets by scoping credentials to specific deployment targets:

```yaml
jobs:
  deploy-production:
    runs-on: ubuntu-latest
    environment: production  # This job uses production environment secrets
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Apply
        run: terraform apply -auto-approve
        env:
          # These come from the "production" environment, not the repository
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

Environment secrets have several advantages:
- Different credentials for dev, staging, and production
- Required reviewers can gate access to production secrets
- Branch protection ensures only main can use production secrets
- Separate rotation schedules per environment

## Approach 3: OIDC - No Stored Secrets

The most secure approach eliminates stored credentials entirely. OIDC (OpenID Connect) lets GitHub Actions exchange a short-lived token for temporary cloud credentials.

### AWS OIDC Setup

First, create an OIDC identity provider in AWS:

```hcl
# oidc.tf - Create the OIDC provider and role in AWS

# The OIDC identity provider for GitHub Actions
resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = ["sts.amazonaws.com"]

  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

# IAM role that GitHub Actions will assume
resource "aws_iam_role" "github_actions" {
  name = "github-actions-terraform"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            # Restrict to specific repo and branch
            "token.actions.githubusercontent.com:sub" = "repo:myorg/myrepo:ref:refs/heads/main"
          }
        }
      }
    ]
  })
}

# Attach the necessary permissions
resource "aws_iam_role_policy_attachment" "terraform" {
  role       = aws_iam_role.github_actions.name
  policy_arn = "arn:aws:iam::policy/AdministratorAccess"
  # In production, use a more restrictive policy
}
```

Then use the role in your workflow:

```yaml
name: Terraform with OIDC

on:
  push:
    branches: [main]

permissions:
  id-token: write  # Required for OIDC
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Get temporary AWS credentials via OIDC
      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-actions-terraform
          aws-region: us-east-1

      - uses: hashicorp/setup-terraform@v3

      # No secrets needed - credentials are in the environment
      - name: Terraform Init
        run: terraform init

      - name: Terraform Apply
        run: terraform apply -auto-approve
```

### Azure OIDC Setup

For Azure, configure a federated identity credential:

```yaml
- name: Azure Login
  uses: azure/login@v2
  with:
    client-id: ${{ secrets.AZURE_CLIENT_ID }}
    tenant-id: ${{ secrets.AZURE_TENANT_ID }}
    subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

# Note: client-id and tenant-id are not secrets - they are safe to expose
# No client secret needed with OIDC
```

### GCP OIDC Setup

For Google Cloud:

```yaml
- name: Authenticate to Google Cloud
  uses: google-github-actions/auth@v2
  with:
    workload_identity_provider: 'projects/123456/locations/global/workloadIdentityPools/github/providers/github-actions'
    service_account: 'terraform@myproject.iam.gserviceaccount.com'
```

## Approach 4: External Secret Stores

For organizations that already use a secret management service, pull credentials from there:

### AWS Secrets Manager

```yaml
- name: Get secrets from AWS Secrets Manager
  uses: aws-actions/aws-secretsmanager-get-secrets@v2
  with:
    secret-ids: |
      terraform/database-password
      terraform/api-key
    parse-json-secrets: true

- name: Terraform Apply
  run: terraform apply -auto-approve
  env:
    TF_VAR_db_password: ${{ env.TERRAFORM_DATABASE_PASSWORD }}
    TF_VAR_api_key: ${{ env.TERRAFORM_API_KEY }}
```

### HashiCorp Vault

```yaml
- name: Import secrets from Vault
  uses: hashicorp/vault-action@v3
  with:
    url: https://vault.mycompany.com
    method: jwt
    role: github-actions
    secrets: |
      secret/data/terraform/aws access_key | AWS_ACCESS_KEY_ID ;
      secret/data/terraform/aws secret_key | AWS_SECRET_ACCESS_KEY ;
      secret/data/terraform/database password | TF_VAR_db_password

- name: Terraform Apply
  run: terraform apply -auto-approve
```

## Handling Terraform Variables

Some Terraform variables contain sensitive values like database passwords or API keys. Pass them through environment variables:

```yaml
- name: Terraform Apply
  run: terraform apply -auto-approve
  env:
    # Cloud provider credentials
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    # Terraform variables (TF_VAR_ prefix)
    TF_VAR_db_password: ${{ secrets.DB_PASSWORD }}
    TF_VAR_api_key: ${{ secrets.API_KEY }}
    TF_VAR_ssl_certificate_arn: ${{ secrets.SSL_CERT_ARN }}
```

Never put secrets in `.tfvars` files that get committed to the repository.

## Terraform Cloud API Token

If you use Terraform Cloud as a remote backend, you need an API token:

```yaml
- uses: hashicorp/setup-terraform@v3
  with:
    cli_config_credentials_token: ${{ secrets.TF_API_TOKEN }}
```

Store the token as a repository or environment secret. For better security, use team tokens with limited scope rather than organization tokens.

## Security Best Practices

**Rotate credentials regularly.** Even with secrets stored safely in GitHub, the underlying credentials should be rotated every 90 days. Better yet, use OIDC to eliminate long-lived credentials entirely.

**Use least-privilege permissions.** Your Terraform IAM role should only have the permissions it needs. Do not use AdministratorAccess in production. Create a custom policy that covers exactly what Terraform manages.

**Restrict secret access with environments.** Use environment protection rules to ensure that only approved workflows on approved branches can access production secrets.

**Audit secret access.** GitHub provides audit logs showing when secrets are used. Review these periodically to ensure secrets are only accessed by expected workflows.

**Never echo secrets.** GitHub Actions automatically masks secret values in logs, but be careful with commands that might print environment variables. Avoid `env`, `printenv`, or `set` in your workflow steps.

```yaml
# Bad - might leak secrets
- run: env

# Good - only prints what you need
- run: echo "Region is $AWS_DEFAULT_REGION"
```

## Conclusion

The right approach depends on your security requirements. Repository secrets work for small teams and simple setups. Environment secrets add proper scoping for multi-environment deployments. OIDC eliminates stored credentials entirely and is the gold standard for security. If your cloud provider supports OIDC with GitHub Actions (and AWS, Azure, and GCP all do), that should be your default choice for new workflows.

For more on OIDC authentication, see our detailed guide on [OIDC authentication for Terraform in GitHub Actions](https://oneuptime.com/blog/post/2026-02-23-how-to-use-oidc-authentication-for-terraform-in-github-actions/view).
