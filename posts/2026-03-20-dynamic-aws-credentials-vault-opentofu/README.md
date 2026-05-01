# How to Use Dynamic AWS Credentials with Vault and OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, HashiCorp Vault, AWS, Security, IAM, Dynamic Credential, Terraform

Description: Learn how to configure HashiCorp Vault's AWS secrets engine to generate dynamic, short-lived IAM credentials for use with OpenTofu, eliminating long-lived access keys.

---

Long-lived AWS access keys are a security liability. HashiCorp Vault's AWS secrets engine generates dynamic, short-lived IAM credentials on demand. Integrated with OpenTofu, this pattern eliminates static credentials from your CI/CD pipeline and infrastructure code entirely.

---

## Architecture

```text
OpenTofu → Vault (AWS Secrets Engine) → AWS IAM → Temporary Credentials
                                                         ↓
                                              OpenTofu uses creds
                                              (expire after TTL)
```

---

## Prerequisites

- HashiCorp Vault server running and unsealed
- Vault CLI authenticated
- AWS IAM user with permissions to create IAM users/roles

---

## Step 1: Configure Vault AWS Secrets Engine

```bash
# Enable the AWS secrets engine

vault secrets enable aws

# Configure root credentials (one-time setup)
vault write aws/config/root \
    access_key=AKIAIOSFODNN7EXAMPLE \
    secret_key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY \
    region=us-east-1

# Configure lease TTL
vault write aws/config/lease \
    lease=1h \
    lease_max=24h
```

---

## Step 2: Create an IAM Role in Vault

```bash
# Create a Vault role that maps to AWS IAM permissions
vault write aws/roles/opentofu-deploy \
    credential_type=iam_user \
    policy_arns=arn:aws:iam::aws:policy/AdministratorAccess

# Or with inline policy (more restrictive)
vault write aws/roles/opentofu-infra \
    credential_type=iam_user \
    policy_document='{
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Action": [
            "ec2:*",
            "s3:*",
            "rds:*"
          ],
          "Resource": "*"
        }
      ]
    }'
```

### Using Assumed Role (Preferred for Production)

```bash
vault write aws/roles/opentofu-assumed \
    credential_type=assumed_role \
    role_arns=arn:aws:iam::123456789012:role/OpenTofuDeployRole \
    default_sts_ttl=1h \
    max_sts_ttl=4h
```

---

## Step 3: Test Credential Generation

```bash
# Generate dynamic credentials
vault read aws/creds/opentofu-deploy

# Output:
# Key                Value
# ---                -----
# lease_id           aws/creds/opentofu-deploy/abc123
# lease_duration     1h
# access_key         AKIAIOSFODNN7EXAMPLE2
# secret_key         ...
# security_token     (empty for iam_user type)
```

---

## Step 4: Configure OpenTofu to Use Vault Credentials

### Method 1: Vault Provider in OpenTofu

```hcl
# providers.tf
terraform {
  required_providers {
    vault = {
      source  = "hashicorp/vault"
      version = "~> 5.0"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "vault" {
  address = "https://vault.corp.example.com:8200"
  # Auth via VAULT_TOKEN env var or other auth method
}

# Generate dynamic AWS credentials from Vault
data "vault_aws_access_credentials" "deploy" {
  backend = "aws"
  role    = "opentofu-deploy"
  type    = "creds"
}

provider "aws" {
  access_key = data.vault_aws_access_credentials.deploy.access_key
  secret_key = data.vault_aws_access_credentials.deploy.secret_key
  region     = "us-east-1"
}
```

### Method 2: Vault Agent for CI/CD

```hcl
# vault-agent-config.hcl
vault {
  address = "https://vault.corp.example.com:8200"
}

auto_auth {
  method "aws" {
    config = {
      type = "iam"
      role = "cicd-role"
    }
  }
}

template {
  contents = <<EOT
export AWS_ACCESS_KEY_ID="{{ with secret "aws/creds/opentofu-deploy" }}{{ .Data.access_key }}{{ end }}"
export AWS_SECRET_ACCESS_KEY="{{ with secret "aws/creds/opentofu-deploy" }}{{ .Data.secret_key }}{{ end }}"
EOT
  destination = "/tmp/aws_creds.sh"
}
```

---

## Step 5: CI/CD Pipeline Integration

```yaml
# .github/workflows/deploy.yml
name: Deploy Infrastructure

on:
  push:
    branches: [main]

jobs:
  deploy:
    permissions:
      contents: read
      id-token: write
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Get Vault Token
        uses: hashicorp/vault-action@v2
        with:
          url: https://vault.corp.example.com:8200
          method: jwt
          role: github-actions
          secrets: |
            aws/creds/opentofu-deploy access_key | AWS_ACCESS_KEY_ID ;
            aws/creds/opentofu-deploy secret_key | AWS_SECRET_ACCESS_KEY

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v2

      - name: OpenTofu Apply
        run: |
          tofu init
          tofu apply -auto-approve
        env:
          AWS_DEFAULT_REGION: us-east-1
```

---

## Vault Policy for OpenTofu

```hcl
# vault-policy.hcl
path "aws/creds/opentofu-deploy" {
  capabilities = ["read"]
}

path "aws/creds/opentofu-infra" {
  capabilities = ["read"]
}

path "aws/config/lease" {
  capabilities = ["read"]
}
```

```bash
vault policy write opentofu-policy vault-policy.hcl
vault token create -policy=opentofu-policy -ttl=24h
```

---

## Revoking Credentials

```bash
# Revoke a specific lease
vault lease revoke aws/creds/opentofu-deploy/abc123

# Revoke all credentials for a role
vault lease revoke -prefix aws/creds/opentofu-deploy

# View active leases
vault list sys/leases/lookup/aws/creds/opentofu-deploy
```

---

## Best Practices

1. **Use assumed_role** over iam_user - STS tokens are temporary by nature and leave no IAM user artifacts
2. **Set short TTLs** - 1 hour is sufficient for most deployments
3. **Scope permissions tightly** - use role-specific policies, not AdministratorAccess
4. **Use Vault Agent** in CI/CD to handle token renewal automatically
5. **Audit Vault logs** - every credential generation is logged with identity and timestamp

---

## Conclusion

Dynamic AWS credentials via Vault eliminate the risk of long-lived access key exposure. OpenTofu integrates cleanly via the Vault provider or environment variable injection. Every deployment uses fresh, short-lived credentials that expire automatically.

---

*Secure your infrastructure deployments and monitor your AWS environment with [OneUptime](https://oneuptime.com).*
