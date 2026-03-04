# How to Use HashiCorp Vault with Terraform for Secrets

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HashiCorp Vault, Secrets, Security, IaC, DevOps

Description: A hands-on guide to integrating HashiCorp Vault with Terraform for dynamic secret management, covering Vault provider setup, secret retrieval, dynamic credentials, and advanced patterns.

---

HashiCorp Vault is a secrets management tool that pairs naturally with Terraform. Instead of hardcoding passwords, API keys, and certificates in your Terraform configurations, you can retrieve them dynamically from Vault at plan and apply time. This guide covers the practical integration patterns, from basic secret retrieval to dynamic cloud credentials.

## Why Vault with Terraform?

Static secrets in Terraform have well-known problems. They end up in state files, can leak through plan output, and are often stored in `.tfvars` files that get accidentally committed to version control. Vault addresses these issues by:

- Centralizing secret storage with fine-grained access control
- Supporting dynamic secrets that are generated on demand and automatically revoked
- Providing audit logging for every secret access
- Enabling secret rotation without changing Terraform configurations

## Setting Up the Vault Provider

Configure Terraform to connect to your Vault instance:

```hcl
# providers.tf
terraform {
  required_providers {
    vault = {
      source  = "hashicorp/vault"
      version = "~> 3.25"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Authenticate to Vault
provider "vault" {
  address = "https://vault.example.com:8200"

  # Option 1: Token authentication (simplest, but tokens expire)
  # token = var.vault_token

  # Option 2: AppRole authentication (recommended for automation)
  auth_login {
    path = "auth/approle/login"
    parameters = {
      role_id   = var.vault_role_id
      secret_id = var.vault_secret_id
    }
  }
}
```

For CI/CD pipelines, pass Vault credentials via environment variables:

```bash
# Set Vault address and authentication
export VAULT_ADDR="https://vault.example.com:8200"
export VAULT_TOKEN="s.xxxxxxxxxxxxxxx"

# Or use AppRole credentials
export TF_VAR_vault_role_id="your-role-id"
export TF_VAR_vault_secret_id="your-secret-id"
```

## Reading Static Secrets from Vault

The most basic integration is reading pre-stored secrets:

```hcl
# Read a secret from the KV v2 secrets engine
data "vault_kv_secret_v2" "database" {
  mount = "secret"
  name  = "production/database"
}

# Use the secret in a resource
resource "aws_db_instance" "main" {
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t3.medium"
  db_name        = "myapp"

  username = data.vault_kv_secret_v2.database.data["username"]
  password = data.vault_kv_secret_v2.database.data["password"]

  # Other configuration...
}
```

For the KV v1 secrets engine:

```hcl
data "vault_generic_secret" "database" {
  path = "secret/production/database"
}

resource "aws_db_instance" "main" {
  username = data.vault_generic_secret.database.data["username"]
  password = data.vault_generic_secret.database.data["password"]
}
```

## Dynamic AWS Credentials

One of Vault's most powerful features is dynamic secret generation. Instead of using static AWS credentials, Vault can generate temporary credentials on demand:

### Configure the AWS Secrets Engine in Vault

```bash
# Enable the AWS secrets engine
vault secrets enable aws

# Configure Vault with AWS credentials that can create IAM users/roles
vault write aws/config/root \
  access_key=AKIAIOSFODNN7EXAMPLE \
  secret_key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY \
  region=us-east-1

# Create a role that defines what permissions the generated credentials will have
vault write aws/roles/terraform-deploy \
  credential_type=iam_user \
  policy_document=-<<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:*",
        "rds:*",
        "s3:*",
        "iam:*"
      ],
      "Resource": "*"
    }
  ]
}
EOF
```

### Use Dynamic Credentials in Terraform

```hcl
# Generate dynamic AWS credentials from Vault
data "vault_aws_access_credentials" "deploy" {
  backend = "aws"
  role    = "terraform-deploy"
  type    = "iam_user"
}

# Use the dynamic credentials for the AWS provider
provider "aws" {
  region     = "us-east-1"
  access_key = data.vault_aws_access_credentials.deploy.access_key
  secret_key = data.vault_aws_access_credentials.deploy.secret_key
}
```

These credentials are temporary and automatically revoked by Vault after the TTL expires. Each Terraform run gets its own unique credentials, making audit trailing straightforward.

## Dynamic Database Credentials

Vault can also generate database credentials on the fly:

```bash
# Enable the database secrets engine
vault secrets enable database

# Configure a PostgreSQL connection
vault write database/config/myapp-db \
  plugin_name=postgresql-database-plugin \
  allowed_roles="readonly","readwrite" \
  connection_url="postgresql://{{username}}:{{password}}@db.example.com:5432/myapp" \
  username="vault_admin" \
  password="vault_admin_password"

# Create a role that generates read-only credentials
vault write database/roles/readonly \
  db_name=myapp-db \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
  default_ttl="1h" \
  max_ttl="24h"
```

```hcl
# Generate dynamic database credentials
data "vault_generic_secret" "db_creds" {
  path = "database/creds/readonly"
}

# Use in your application configuration
resource "kubernetes_secret" "db_credentials" {
  metadata {
    name      = "db-credentials"
    namespace = "production"
  }

  data = {
    username = data.vault_generic_secret.db_creds.data["username"]
    password = data.vault_generic_secret.db_creds.data["password"]
  }
}
```

## Managing Vault Resources with Terraform

Beyond reading secrets, you can use Terraform to manage Vault itself:

```hcl
# Create a KV v2 secrets engine mount
resource "vault_mount" "kv" {
  path = "secret"
  type = "kv-v2"
}

# Create a secret
resource "vault_kv_secret_v2" "database" {
  mount = vault_mount.kv.path
  name  = "production/database"

  data_json = jsonencode({
    username = "admin"
    password = random_password.database.result
  })
}

# Create a policy
resource "vault_policy" "app" {
  name = "app-policy"

  policy = <<EOT
# Allow reading production secrets
path "secret/data/production/*" {
  capabilities = ["read"]
}

# Allow generating dynamic AWS credentials
path "aws/creds/terraform-deploy" {
  capabilities = ["read"]
}
EOT
}

# Create an AppRole for CI/CD
resource "vault_auth_backend" "approle" {
  type = "approle"
}

resource "vault_approle_auth_backend_role" "terraform" {
  backend   = vault_auth_backend.approle.path
  role_name = "terraform"

  token_policies = [vault_policy.app.name]
  token_ttl      = 3600
  token_max_ttl  = 7200
}
```

## Authentication Patterns

### Token Authentication

Simple but limited. Tokens expire and need regular renewal:

```hcl
provider "vault" {
  address = "https://vault.example.com:8200"
  token   = var.vault_token
}
```

### AppRole Authentication

Best for CI/CD pipelines. Uses a role ID and secret ID:

```hcl
provider "vault" {
  address = "https://vault.example.com:8200"

  auth_login {
    path = "auth/approle/login"
    parameters = {
      role_id   = var.vault_role_id
      secret_id = var.vault_secret_id
    }
  }
}
```

### Kubernetes Authentication

If Terraform runs in Kubernetes, use the Kubernetes auth method:

```hcl
provider "vault" {
  address = "https://vault.example.com:8200"

  auth_login {
    path = "auth/kubernetes/login"
    parameters = {
      role = "terraform"
      jwt  = file("/var/run/secrets/kubernetes.io/serviceaccount/token")
    }
  }
}
```

### AWS IAM Authentication

If Terraform runs on AWS (EC2, ECS, Lambda), use IAM auth:

```hcl
provider "vault" {
  address = "https://vault.example.com:8200"

  auth_login {
    path = "auth/aws/login"
    parameters = {
      role = "terraform-role"
    }
  }
}
```

## Best Practices

1. **Use dynamic secrets when possible.** They are generated on demand, have limited lifetimes, and are automatically revoked.

2. **Separate Vault management from application infrastructure.** Use one Terraform workspace to manage Vault policies and configuration, and another for application infrastructure that reads secrets from Vault.

3. **Use the narrowest possible Vault policies.** Only grant access to the specific secret paths needed:

```hcl
# Good: specific path
path "secret/data/production/database" {
  capabilities = ["read"]
}

# Bad: overly broad
path "secret/*" {
  capabilities = ["read", "list"]
}
```

4. **Rotate static secrets regularly.** Even though Vault stores them securely, rotation limits the impact of any compromise.

5. **Enable audit logging.** Vault can log every secret access:

```bash
vault audit enable file file_path=/var/log/vault/audit.log
```

## Monitoring Your Infrastructure

Vault and Terraform handle your secrets, but you need to monitor the infrastructure those secrets protect. [OneUptime](https://oneuptime.com) provides uptime monitoring and alerting for your deployed services, helping you catch issues whether they come from infrastructure changes or external factors.

## Conclusion

HashiCorp Vault and Terraform together provide a mature secrets management workflow for infrastructure as code. Start with static secret retrieval for quick wins, then move to dynamic credentials for better security posture. The key is reducing the number of places where secrets exist in plain text and ensuring every secret access is logged and auditable.

For more on Terraform security, see our guides on [using AWS Secrets Manager](https://oneuptime.com/blog/post/2026-02-23-how-to-use-aws-secrets-manager-with-terraform/view) and [handling sensitive variables](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-sensitive-variables-in-terraform-securely/view).
