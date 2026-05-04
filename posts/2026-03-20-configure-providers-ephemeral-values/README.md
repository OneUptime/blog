# How to Configure Providers with Ephemeral Values in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Ephemeral Resources, Provider Configuration, Secret, HCL, Infrastructure as Code

Description: Learn how to use ephemeral values to configure providers in OpenTofu so that credentials and tokens are never stored in state files.

---

Provider configurations often need credentials like API tokens, passwords, or access keys. Using ephemeral resources to supply these values ensures that sensitive credentials are used at runtime but never written to the state file.

---

## The Problem: Credentials in Provider Configs

Provider credentials specified directly or through variables end up in state:

```hcl
# BAD: API token could end up in state or plan output

provider "github" {
  token = var.github_token   # stored in state as part of provider config hash
}
```

With ephemeral values, the credential is fetched at runtime and discarded.

---

## GitHub Provider with Ephemeral Token

```hcl
# Fetch the GitHub token from AWS Parameter Store ephemerally
ephemeral "aws_ssm_parameter" "github_token" {
  name            = "/production/github/token"
  with_decryption = true
}

# Configure the provider with the ephemeral value
provider "github" {
  token = ephemeral.aws_ssm_parameter.github_token.value
  # The token is used to configure the provider but never stored in state
}
```

---

## Kubernetes Provider with Ephemeral Credentials

```hcl
# Fetch kubeconfig credentials from Secrets Manager
ephemeral "aws_secretsmanager_secret_version" "kubeconfig" {
  secret_id = "production/kubernetes/admin-credentials"
}

locals {
  k8s_creds = jsondecode(ephemeral.aws_secretsmanager_secret_version.kubeconfig.secret_string)
}

provider "kubernetes" {
  host                   = local.k8s_creds.host
  client_certificate     = base64decode(local.k8s_creds.client_certificate)
  client_key             = base64decode(local.k8s_creds.client_key)
  cluster_ca_certificate = base64decode(local.k8s_creds.cluster_ca)
}
```

---

## Database Provider with Vault Dynamic Credentials

```hcl
# Get short-lived database credentials from Vault
ephemeral "vault_database_secret" "pg_creds" {
  mount = "database"
  name  = "postgresql-production"
}

provider "postgresql" {
  host     = aws_db_instance.main.address
  port     = aws_db_instance.main.port
  database = "app"
  username = ephemeral.vault_database_secret.pg_creds.username
  password = ephemeral.vault_database_secret.pg_creds.password
  # Credentials are ephemeral - not stored in state
}
```

---

## Cross-Account AWS Provider with Vault-Issued Credentials

```hcl
# Get short-lived AWS credentials from Vault's AWS secrets engine
ephemeral "vault_aws_access_credentials" "production_access" {
  backend = "aws"
  role    = "opentofu-deploy"
  type    = "sts"
  region  = "us-east-1"
}

# Configure an aliased provider for the production account
provider "aws" {
  alias  = "production"
  region = "us-east-1"

  access_key = ephemeral.vault_aws_access_credentials.production_access.access_key
  secret_key = ephemeral.vault_aws_access_credentials.production_access.secret_key
  token      = ephemeral.vault_aws_access_credentials.production_access.security_token
}

# Deploy into production using the temporary credentials
resource "aws_s3_bucket" "deploy" {
  provider = aws.production
  bucket   = "production-deployments"
}
```

---

## DataDog Provider with Ephemeral API Key

```hcl
ephemeral "aws_secretsmanager_secret_version" "datadog" {
  secret_id = "monitoring/datadog/api-keys"
}

locals {
  dd_secrets = jsondecode(ephemeral.aws_secretsmanager_secret_version.datadog.secret_string)
}

provider "datadog" {
  api_key = local.dd_secrets.api_key
  app_key = local.dd_secrets.app_key
}
```

---

## Ephemeral Values for Third-Party Provider Credentials

Any provider that accepts a credential argument can be configured with an ephemeral value pulled from a secrets store:

```hcl
ephemeral "aws_ssm_parameter" "license_key" {
  name            = "/enterprise/license-key"
  with_decryption = true
}

terraform {
  required_providers {
    someenterprise = {
      source  = "enterprise/someenterprise"
      version = "~> 2.0"
    }
  }
}

provider "someenterprise" {
  license_key = ephemeral.aws_ssm_parameter.license_key.value
}
```

---

## Why This Matters

State files are often stored in S3 or remote backends with broad access. Any value stored in state is accessible to anyone who can read the state. By using ephemeral values in provider configurations, you ensure:

1. Provider credentials are never written to state files
2. Temporary credentials expire naturally
3. Audit trails show credential fetches from the secrets store
4. Rotating secrets doesn't require state updates

---

## Summary

Use ephemeral resources to supply provider credentials dynamically - API tokens, database passwords, temporary AWS credentials, and TLS certificates. The provider uses the value during the operation, but it is never written to the state file. This is the recommended approach for any sensitive provider configuration value in OpenTofu 1.11+.
