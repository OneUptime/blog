# How to Generate Dynamic AWS Credentials with Vault and OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Vault, Dynamic Credential, AWS, IAM, Security

Description: Learn how to use HashiCorp Vault's AWS secrets engine with OpenTofu to generate short-lived AWS access keys instead of storing long-lived IAM credentials.

## Introduction

Vault's AWS secrets engine generates temporary IAM access keys or assumed-role credentials on demand. OpenTofu can request fresh AWS credentials from Vault at the start of each run, eliminating long-lived access keys that are frequently the source of AWS credential leaks.

## Configuring the AWS Secrets Engine

```hcl
# Enable and configure the AWS secrets engine
# (this resource creates its own mount at the given path)
resource "vault_aws_secret_backend" "aws" {
  path       = "aws"
  access_key = var.vault_aws_access_key  # Root/admin key for Vault
  secret_key = var.vault_aws_secret_key
  region     = "us-east-1"

  default_lease_ttl_seconds = 3600   # 1 hour
  max_lease_ttl_seconds     = 14400  # 4 hours
}

# Create a role that generates assumed-role credentials
resource "vault_aws_secret_backend_role" "opentofu_deployer" {
  backend         = vault_aws_secret_backend.aws.path
  name            = "opentofu-deployer"
  credential_type = "assumed_role"
  role_arns       = ["arn:aws:iam::123456789012:role/opentofu-deploy-role"]
  external_id     = "vault-aws-secrets-engine"
  default_sts_ttl = 3600
  max_sts_ttl     = 14400
}

# Create a role that generates IAM access keys
resource "vault_aws_secret_backend_role" "readonly_user" {
  backend         = vault_aws_secret_backend.aws.path
  name            = "readonly-user"
  credential_type = "iam_user"

  policy_document = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:GetObject", "s3:ListBucket"]
      Resource = "*"
    }]
  })
}
```

## Reading Dynamic AWS Credentials in OpenTofu

```hcl
# Get temporary AWS credentials from Vault
data "vault_aws_access_credentials" "deploy" {
  backend = "aws"
  role    = "opentofu-deployer"
  type    = "sts"  # Use STS for assumed-role credentials
}

# Use the dynamic credentials to configure the AWS provider
provider "aws" {
  region     = "us-east-1"
  access_key = data.vault_aws_access_credentials.deploy.access_key
  secret_key = data.vault_aws_access_credentials.deploy.secret_key
  token      = data.vault_aws_access_credentials.deploy.security_token
}
```

## Multi-Account Deployments

```hcl
# Configure roles for multiple accounts
resource "vault_aws_secret_backend_role" "prod_deployer" {
  backend         = vault_aws_secret_backend.aws.path
  name            = "prod-deployer"
  credential_type = "assumed_role"
  role_arns       = ["arn:aws:iam::111111111111:role/opentofu-deploy"]
}

resource "vault_aws_secret_backend_role" "staging_deployer" {
  backend         = vault_aws_secret_backend.aws.path
  name            = "staging-deployer"
  credential_type = "assumed_role"
  role_arns       = ["arn:aws:iam::222222222222:role/opentofu-deploy"]
}

# In deployment configuration:
data "vault_aws_access_credentials" "prod" {
  backend = "aws"
  role    = "prod-deployer"
  type    = "sts"
}

data "vault_aws_access_credentials" "staging" {
  backend = "aws"
  role    = "staging-deployer"
  type    = "sts"
}

provider "aws" {
  alias      = "prod"
  region     = "us-east-1"
  access_key = data.vault_aws_access_credentials.prod.access_key
  secret_key = data.vault_aws_access_credentials.prod.secret_key
  token      = data.vault_aws_access_credentials.prod.security_token
}

provider "aws" {
  alias      = "staging"
  region     = "us-west-2"
  access_key = data.vault_aws_access_credentials.staging.access_key
  secret_key = data.vault_aws_access_credentials.staging.secret_key
  token      = data.vault_aws_access_credentials.staging.security_token
}
```

## IAM Role for Vault to Use

```hcl
# The IAM role that Vault's root credentials can assume
resource "aws_iam_role" "opentofu_deploy" {
  name = "opentofu-deploy-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { AWS = "arn:aws:iam::${data.aws_caller_identity.vault.account_id}:root" }
      Action    = "sts:AssumeRole"
      Condition = {
        StringEquals = {
          "sts:ExternalId" = "vault-aws-secrets-engine"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "deployer" {
  role       = aws_iam_role.opentofu_deploy.name
  policy_arn = aws_iam_policy.opentofu_deploy.arn
}
```

## Conclusion

Vault's AWS secrets engine replaces long-lived IAM access keys with short-lived STS credentials. The assumed_role credential type is preferred over iam_user because it doesn't require Vault to have `iam:CreateUser` permissions and credentials expire automatically without explicit revocation. This pattern is especially valuable for multi-account deployments where each account needs separate, short-lived credentials.
