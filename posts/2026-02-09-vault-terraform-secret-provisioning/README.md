# How to Use Vault with Terraform for Automated Secret Provisioning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Vault, Terraform, Infrastructure as Code, Secret Management, Automation

Description: Learn how to use HashiCorp Vault with Terraform to automate secret provisioning, policy management, and auth configuration as infrastructure code in Kubernetes environments.

---

Managing HashiCorp Vault configuration manually becomes impractical as your infrastructure grows. Terraform's Vault provider enables infrastructure-as-code approaches to secret provisioning, policy management, and auth method configuration. This guide demonstrates using Terraform to automate Vault management in Kubernetes environments.

## Setting Up the Vault Provider

Configure the Vault provider in your Terraform configuration:

```hcl
# versions.tf
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    vault = {
      source  = "hashicorp/vault"
      version = "~> 3.23"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.24"
    }
  }
}

# provider.tf
provider "vault" {
  address = "https://vault.example.com:8200"

  # For local development
  # token = var.vault_token

  # For production, use Kubernetes auth
  auth_login {
    path = "auth/kubernetes/login"

    parameters = {
      role = "terraform"
      jwt  = file("/var/run/secrets/kubernetes.io/serviceaccount/token")
    }
  }
}

provider "kubernetes" {
  config_path = "~/.kube/config"
}
```

## Provisioning KV Secrets

Manage secrets as Terraform resources:

```hcl
# secrets.tf
resource "vault_mount" "kv_v2" {
  path        = "secret"
  type        = "kv-v2"
  description = "KV Version 2 secret engine"

  options = {
    version = "2"
  }
}

resource "vault_kv_secret_v2" "database_credentials" {
  mount = vault_mount.kv_v2.path
  name  = "production/database"

  data_json = jsonencode({
    username = "app_user"
    password = var.database_password
    host     = "postgres.production.svc.cluster.local"
    port     = 5432
  })

  custom_metadata {
    max_versions = 5
    data = {
      environment = "production"
      managed_by  = "terraform"
    }
  }
}

resource "vault_kv_secret_v2" "api_keys" {
  mount = vault_mount.kv_v2.path
  name  = "production/api-keys"

  data_json = jsonencode({
    stripe_key    = var.stripe_api_key
    sendgrid_key  = var.sendgrid_api_key
    datadog_key   = var.datadog_api_key
  })

  custom_metadata {
    max_versions = 3
    data = {
      environment = "production"
      team        = "platform"
    }
  }
}

# variables.tf
variable "database_password" {
  type      = string
  sensitive = true
}

variable "stripe_api_key" {
  type      = string
  sensitive = true
}

variable "sendgrid_api_key" {
  type      = string
  sensitive = true
}

variable "datadog_api_key" {
  type      = string
  sensitive = true
}
```

## Configuring Database Secrets Engine

Automate database secrets engine configuration:

```hcl
# database.tf
resource "vault_database_secrets_mount" "postgres" {
  path = "database"

  postgresql {
    name              = "production-postgres"
    username          = "vault"
    password          = var.postgres_vault_password
    connection_url    = "postgresql://{{username}}:{{password}}@postgres.production.svc.cluster.local:5432/myapp"
    verify_connection = true
    allowed_roles = [
      "readonly",
      "readwrite",
      "admin"
    ]
  }
}

resource "vault_database_secret_backend_role" "readonly" {
  backend = vault_database_secrets_mount.postgres.path
  name    = "readonly"
  db_name = vault_database_secrets_mount.postgres.postgresql[0].name

  creation_statements = [
    "CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}';",
    "GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";"
  ]

  default_ttl = 3600
  max_ttl     = 86400
}

resource "vault_database_secret_backend_role" "readwrite" {
  backend = vault_database_secrets_mount.postgres.path
  name    = "readwrite"
  db_name = vault_database_secrets_mount.postgres.postgresql[0].name

  creation_statements = [
    "CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}';",
    "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";"
  ]

  default_ttl = 1800
  max_ttl     = 43200
}
```

## Managing PKI Secrets Engine

Configure PKI for certificate management:

```hcl
# pki.tf
resource "vault_mount" "pki_root" {
  path                      = "pki"
  type                      = "pki"
  description               = "Root CA"
  default_lease_ttl_seconds = 315360000  # 10 years
  max_lease_ttl_seconds     = 315360000
}

resource "vault_pki_secret_backend_root_cert" "root" {
  backend = vault_mount.pki_root.path

  type                 = "internal"
  common_name          = "Example Root CA"
  ttl                  = "315360000"
  format               = "pem"
  private_key_format   = "der"
  key_type             = "rsa"
  key_bits             = 4096
  exclude_cn_from_sans = true

  organization = "Example Corp"
  ou           = "IT Security"
  country      = "US"
}

resource "vault_mount" "pki_intermediate" {
  path                      = "pki_int"
  type                      = "pki"
  description               = "Intermediate CA"
  default_lease_ttl_seconds = 2592000  # 30 days
  max_lease_ttl_seconds     = 31536000 # 1 year
}

resource "vault_pki_secret_backend_intermediate_cert_request" "intermediate" {
  backend     = vault_mount.pki_intermediate.path
  type        = "internal"
  common_name = "Example Intermediate CA"
}

resource "vault_pki_secret_backend_root_sign_intermediate" "intermediate" {
  backend     = vault_mount.pki_root.path
  csr         = vault_pki_secret_backend_intermediate_cert_request.intermediate.csr
  common_name = "Example Intermediate CA"
  ttl         = "31536000"
}

resource "vault_pki_secret_backend_intermediate_set_signed" "intermediate" {
  backend     = vault_mount.pki_intermediate.path
  certificate = vault_pki_secret_backend_root_sign_intermediate.intermediate.certificate
}

resource "vault_pki_secret_backend_role" "server_certs" {
  backend = vault_mount.pki_intermediate.path
  name    = "server-certs"

  allowed_domains    = ["example.com"]
  allow_subdomains   = true
  allow_bare_domains = false
  allow_localhost    = false
  allow_ip_sans      = false

  key_type  = "rsa"
  key_bits  = 2048
  max_ttl   = "2592000"  # 30 days
  ttl       = "604800"   # 7 days
}
```

## Creating Policies

Define policies as Terraform resources:

```hcl
# policies.tf
resource "vault_policy" "app_readonly" {
  name = "app-readonly"

  policy = <<EOT
# Read application secrets
path "secret/data/production/*" {
  capabilities = ["read", "list"]
}

# Read database credentials
path "database/creds/readonly" {
  capabilities = ["read"]
}

# Renew leases
path "sys/leases/renew" {
  capabilities = ["update"]
}
EOT
}

resource "vault_policy" "app_readwrite" {
  name = "app-readwrite"

  policy = <<EOT
# Read and write application secrets
path "secret/data/production/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Generate database credentials
path "database/creds/readwrite" {
  capabilities = ["read"]
}

# Use transit encryption
path "transit/encrypt/app-data" {
  capabilities = ["update"]
}

path "transit/decrypt/app-data" {
  capabilities = ["update"]
}
EOT
}

resource "vault_policy" "ci_cd" {
  name = "ci-cd"

  policy = <<EOT
# Read CI/CD secrets
path "secret/data/ci-cd/*" {
  capabilities = ["read"]
}

# Generate certificates
path "pki_int/issue/server-certs" {
  capabilities = ["create", "update"]
}
EOT
}
```

## Configuring Kubernetes Auth

Set up Kubernetes authentication method:

```hcl
# auth.tf
resource "vault_auth_backend" "kubernetes" {
  type = "kubernetes"
  path = "kubernetes"
}

data "kubernetes_service_account" "vault" {
  metadata {
    name      = "vault"
    namespace = "vault-system"
  }
}

resource "vault_kubernetes_auth_backend_config" "kubernetes" {
  backend         = vault_auth_backend.kubernetes.path
  kubernetes_host = "https://kubernetes.default.svc.cluster.local"
  kubernetes_ca_cert = base64decode(
    data.kubernetes_service_account.vault.secret[0].data["ca.crt"]
  )
  token_reviewer_jwt = data.kubernetes_service_account.vault.secret[0].data.token
}

resource "vault_kubernetes_auth_backend_role" "production_apps" {
  backend                          = vault_auth_backend.kubernetes.path
  role_name                        = "production-apps"
  bound_service_account_names      = ["app"]
  bound_service_account_namespaces = ["production"]
  token_ttl                        = 3600
  token_policies                   = [vault_policy.app_readonly.name]
}

resource "vault_kubernetes_auth_backend_role" "ci_cd" {
  backend                          = vault_auth_backend.kubernetes.path
  role_name                        = "ci-cd"
  bound_service_account_names      = ["gitlab-runner"]
  bound_service_account_namespaces = ["ci-cd"]
  token_ttl                        = 1800
  token_policies                   = [vault_policy.ci_cd.name]
}
```

## Managing Transit Encryption Keys

Provision transit encryption keys:

```hcl
# transit.tf
resource "vault_mount" "transit" {
  path                      = "transit"
  type                      = "transit"
  description               = "Transit encryption engine"
  default_lease_ttl_seconds = 3600
  max_lease_ttl_seconds     = 86400
}

resource "vault_transit_secret_backend_key" "app_data" {
  backend          = vault_mount.transit.path
  name             = "app-data"
  type             = "aes256-gcm96"
  deletion_allowed = false
  exportable       = false

  min_decryption_version = 1
  min_encryption_version = 1
}

resource "vault_transit_secret_backend_key" "pii_data" {
  backend          = vault_mount.transit.path
  name             = "pii-data"
  type             = "aes256-gcm96"
  deletion_allowed = false
  exportable       = false

  # Automatic key rotation
  auto_rotate_period = 2592000  # 30 days
}
```

## Organizing Configuration with Modules

Create reusable modules for common patterns:

```hcl
# modules/app-secrets/main.tf
variable "app_name" {
  type = string
}

variable "namespace" {
  type = string
}

variable "secrets" {
  type = map(string)
}

resource "vault_kv_secret_v2" "app_secret" {
  mount     = "secret"
  name      = "${var.namespace}/${var.app_name}"
  data_json = jsonencode(var.secrets)
}

resource "vault_policy" "app_policy" {
  name = "${var.namespace}-${var.app_name}"

  policy = <<EOT
path "secret/data/${var.namespace}/${var.app_name}" {
  capabilities = ["read"]
}
EOT
}

resource "vault_kubernetes_auth_backend_role" "app_role" {
  backend                          = "kubernetes"
  role_name                        = "${var.namespace}-${var.app_name}"
  bound_service_account_names      = [var.app_name]
  bound_service_account_namespaces = [var.namespace]
  token_ttl                        = 3600
  token_policies                   = [vault_policy.app_policy.name]
}

output "secret_path" {
  value = vault_kv_secret_v2.app_secret.path
}

# Usage in root module
module "web_app_secrets" {
  source = "./modules/app-secrets"

  app_name  = "web-app"
  namespace = "production"

  secrets = {
    api_key      = var.web_app_api_key
    database_url = "postgres://host:5432/db"
  }
}

module "worker_secrets" {
  source = "./modules/app-secrets"

  app_name  = "background-worker"
  namespace = "production"

  secrets = {
    redis_url = "redis://redis:6379/0"
    queue_url = "rabbitmq://rabbitmq:5672"
  }
}
```

## Implementing State Management

Store Terraform state securely:

```hcl
# backend.tf
terraform {
  backend "kubernetes" {
    secret_suffix    = "vault-state"
    namespace        = "terraform"
    in_cluster_config = true
  }
}

# Or use remote backend
terraform {
  backend "s3" {
    bucket         = "terraform-state"
    key            = "vault/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

## Running Terraform in CI/CD

Integrate with GitLab CI:

```yaml
# .gitlab-ci.yml
stages:
  - validate
  - plan
  - apply

variables:
  TF_ROOT: ${CI_PROJECT_DIR}/terraform
  TF_ADDRESS: ${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/terraform/state/vault

cache:
  paths:
    - ${TF_ROOT}/.terraform

before_script:
  - cd ${TF_ROOT}
  - terraform init

validate:
  stage: validate
  script:
    - terraform fmt -check
    - terraform validate

plan:
  stage: plan
  script:
    - terraform plan -out=tfplan
  artifacts:
    paths:
      - ${TF_ROOT}/tfplan

apply:
  stage: apply
  script:
    - terraform apply tfplan
  when: manual
  only:
    - master
```

## Monitoring Terraform-Managed Resources

Track changes with audit logging:

```bash
# Query Terraform-managed resources
vault list -format=json sys/policy | jq -r '.[]' | \
    xargs -I {} vault policy read {} | grep "managed_by.*terraform"

# Monitor for drift
terraform plan -detailed-exitcode
```

## Best Practices

Store sensitive variables in secure locations. Use environment variables, encrypted files, or external secret managers rather than committing secrets to version control.

Use modules for repeated patterns. This reduces duplication and ensures consistency across environments.

Implement proper state locking to prevent concurrent modifications. Use remote backends that support locking like S3 with DynamoDB or Kubernetes.

Version your Terraform configuration and track changes through Git. This provides audit trails and enables rollbacks.

Test changes in non-production environments first. Use workspace or separate state files for different environments.

## Conclusion

Managing Vault with Terraform brings infrastructure-as-code benefits to secret management. By codifying policies, auth methods, and secret engines, you gain version control, consistency, and automation. This approach scales better than manual configuration and provides clear audit trails of changes. Implement Terraform-based Vault management to improve operational efficiency and maintain secure, reproducible configurations across environments.
