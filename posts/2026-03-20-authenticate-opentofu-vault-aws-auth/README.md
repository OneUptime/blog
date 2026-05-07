# How to Authenticate OpenTofu with Vault Using AWS Auth

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Vault, AWS Auth, IAM, Authentication

Description: Learn how to configure OpenTofu to authenticate with HashiCorp Vault using the AWS auth method, enabling IAM roles and EC2 instances to authenticate without managing Vault tokens.

## Introduction

Vault's AWS auth method supports both `iam` and `ec2`, but the Vault provider's `auth_login_aws` block signs an IAM `GetCallerIdentity` request. That means OpenTofu can authenticate using existing AWS role credentials from CI/CD systems and EC2 instance profiles without managing separate Vault credentials.

## Setting Up AWS Auth in Vault

```hcl
# Enable AWS auth method

resource "vault_auth_backend" "aws" {
  type = "aws"
  path = "aws"
}

# Configure AWS auth to use a regional STS endpoint
resource "vault_aws_auth_backend_client" "config" {
  backend      = vault_auth_backend.aws.path
  sts_endpoint = "https://sts.us-east-1.amazonaws.com"
  sts_region   = "us-east-1"
  # Example with explicit credentials.
  # If Vault runs on AWS, omit access_key and secret_key and use the instance profile instead.
  access_key   = var.vault_aws_access_key
  secret_key   = var.vault_aws_secret_key
}

# Create a role for the CI/CD IAM role
resource "vault_aws_auth_backend_role" "cicd_role" {
  backend                         = vault_auth_backend.aws.path
  role                            = "opentofu-cicd"
  auth_type                       = "iam"
  bound_iam_principal_arns        = [
    "arn:aws:iam::123456789012:role/github-actions-opentofu",
    "arn:aws:iam::123456789012:role/ec2-bastion"
  ]
  token_policies                  = ["opentofu-policy"]
  token_ttl                       = 3600
  token_max_ttl                   = 14400
  resolve_aws_unique_ids          = false
}
```

## OpenTofu Provider Configuration for AWS Auth

```hcl
# provider.tf
provider "vault" {
  address = "https://vault.example.com:8200"

  auth_login_aws {
    role    = "opentofu-cicd"
    # Uses the current AWS credentials from environment/instance profile
    # No explicit credentials needed if running on AWS
  }
}
```

## GitHub Actions with OIDC and AWS Auth

```yaml
# .github/workflows/deploy.yml
name: Deploy via Vault AWS Auth

permissions:
  id-token: write  # Required for OIDC
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - name: Configure AWS credentials via OIDC
        uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-actions-opentofu
          aws-region: us-east-1

      # Now OpenTofu can use AWS credentials to auth with Vault
      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v2

      - name: OpenTofu Apply
        run: |
          tofu init
          tofu apply -auto-approve
        env:
          VAULT_ADDR: ${{ secrets.VAULT_ADDR }}
          # No VAULT_TOKEN needed - AWS auth handles it via provider
```

## EC2 Instance Auth

```hcl
# For OpenTofu running on EC2, use the instance profile with IAM auth
resource "vault_aws_auth_backend_role" "ec2_role" {
  backend                    = vault_auth_backend.aws.path
  role                       = "ec2-bastion"
  auth_type                  = "iam"
  bound_iam_principal_arns   = ["arn:aws:iam::123456789012:role/ec2-bastion"]
  bound_ami_ids              = ["ami-0123456789abcdef0"]
  bound_account_ids          = ["123456789012"]
  bound_regions              = ["us-east-1"]
  bound_vpc_ids              = ["vpc-12345678"]
  bound_subnet_ids           = ["subnet-12345678"]
  token_policies             = ["opentofu-policy"]
  inferred_entity_type       = "ec2_instance"
  inferred_aws_region        = "us-east-1"
}
```

```hcl
# provider.tf on EC2 instance
provider "vault" {
  address = "https://vault.example.com:8200"

  auth_login_aws {
    role = "ec2-bastion"
    # Uses the EC2 instance profile credentials to sign GetCallerIdentity
  }
}
```

## Explicit IAM Auth Configuration

```hcl
provider "vault" {
  address = "https://vault.example.com:8200"

  auth_login_aws {
    role                  = "opentofu-cicd"
    aws_access_key_id     = var.aws_access_key_id
    aws_secret_access_key = var.aws_secret_access_key
    aws_session_token     = var.aws_session_token
    aws_sts_endpoint      = "https://sts.us-east-1.amazonaws.com"
    aws_iam_endpoint      = "https://iam.amazonaws.com"
  }
}
```

## Conclusion

Vault's AWS auth method is the most seamless way to authenticate OpenTofu on AWS infrastructure. When running in GitHub Actions with OIDC, the pipeline assumes an IAM role which is bound to a Vault role - no long-lived secrets to rotate. The `auth_login_aws` block in the Vault provider handles the STS `GetCallerIdentity` signing automatically.
