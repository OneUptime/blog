# How to Use External Secret Stores with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Secret, Security, IaC, DevOps, Vault, SOPS

Description: Learn how to integrate Terraform with external secret stores including HashiCorp Vault, cloud-native secret managers, SOPS, and custom secret backends for secure infrastructure management.

---

Terraform needs access to sensitive values like database passwords, API keys, and certificates to provision infrastructure. Rather than storing these values directly in Terraform configurations, you can retrieve them from external secret stores at runtime. This guide covers the major options and helps you pick the right approach for your setup.

## The Problem: Secrets in Terraform

Terraform's handling of secrets has a fundamental challenge. The tool needs actual values to create resources, and those values end up in the state file. No external secret store changes that fact. What external stores do help with is:

- Keeping secrets out of your source code
- Centralizing secret management across teams and tools
- Enabling rotation without changing Terraform configurations
- Providing audit logs for secret access
- Supporting fine-grained access control

## Option 1: Cloud-Native Secret Managers

Each cloud provider offers a managed secret service that integrates directly with their Terraform provider.

### AWS Secrets Manager

```hcl
data "aws_secretsmanager_secret_version" "db_creds" {
  secret_id = "production/database/credentials"
}

locals {
  db_creds = jsondecode(data.aws_secretsmanager_secret_version.db_creds.secret_string)
}

resource "aws_db_instance" "main" {
  username = local.db_creds["username"]
  password = local.db_creds["password"]
  # ...
}
```

### AWS SSM Parameter Store

For simpler secrets, Parameter Store is a cost-effective alternative:

```hcl
data "aws_ssm_parameter" "db_password" {
  name            = "/production/database/password"
  with_decryption = true
}

resource "aws_db_instance" "main" {
  password = data.aws_ssm_parameter.db_password.value
  # ...
}
```

### Azure Key Vault

```hcl
data "azurerm_key_vault_secret" "db_password" {
  name         = "database-password"
  key_vault_id = data.azurerm_key_vault.main.id
}

resource "azurerm_postgresql_server" "main" {
  administrator_login_password = data.azurerm_key_vault_secret.db_password.value
  # ...
}
```

### GCP Secret Manager

```hcl
data "google_secret_manager_secret_version" "db_password" {
  secret = "database-password"
}

resource "google_sql_user" "main" {
  password = data.google_secret_manager_secret_version.db_password.secret_data
  # ...
}
```

## Option 2: HashiCorp Vault

Vault is the most full-featured option, especially for multi-cloud environments:

```hcl
provider "vault" {
  address = "https://vault.example.com:8200"
}

# Read static secrets
data "vault_kv_secret_v2" "db" {
  mount = "secret"
  name  = "production/database"
}

# Generate dynamic credentials
data "vault_aws_access_credentials" "deploy" {
  backend = "aws"
  role    = "terraform-deploy"
}

provider "aws" {
  access_key = data.vault_aws_access_credentials.deploy.access_key
  secret_key = data.vault_aws_access_credentials.deploy.secret_key
}
```

Vault's unique advantage is dynamic secrets - credentials that are generated on demand and automatically expire.

## Option 3: SOPS (Secrets OPerationS)

SOPS by Mozilla encrypts files while keeping their structure visible. You can commit encrypted files to version control:

```bash
# Install SOPS
brew install sops

# Create a SOPS config file
cat > .sops.yaml << 'EOF'
creation_rules:
  - path_regex: \.enc\.json$
    kms: arn:aws:kms:us-east-1:123456789012:key/abcd1234
  - path_regex: \.enc\.yaml$
    gcp_kms: projects/my-project/locations/global/keyRings/sops/cryptoKeys/sops-key
EOF

# Create a secrets file
cat > secrets.json << 'EOF'
{
  "database_password": "my-secret-password",
  "api_key": "sk-1234567890"
}
EOF

# Encrypt it with SOPS
sops --encrypt secrets.json > secrets.enc.json

# The encrypted file is safe to commit
git add secrets.enc.json .sops.yaml
```

Use the SOPS provider in Terraform:

```hcl
terraform {
  required_providers {
    sops = {
      source  = "carlpett/sops"
      version = "~> 1.0"
    }
  }
}

provider "sops" {}

# Read the encrypted file
data "sops_file" "secrets" {
  source_file = "secrets.enc.json"
}

# Use the decrypted values
resource "aws_db_instance" "main" {
  password = data.sops_file.secrets.data["database_password"]
  # ...
}
```

## Option 4: 1Password (via CLI or Connect)

1Password works well for teams that already use it:

```hcl
terraform {
  required_providers {
    onepassword = {
      source  = "1Password/onepassword"
      version = "~> 1.0"
    }
  }
}

provider "onepassword" {
  url   = "http://localhost:8080"  # 1Password Connect server
  token = var.op_token
}

data "onepassword_item" "database" {
  vault = "Infrastructure"
  title = "Production Database"
}

resource "aws_db_instance" "main" {
  username = data.onepassword_item.database.username
  password = data.onepassword_item.database.password
  # ...
}
```

## Option 5: External Data Source

For custom secret backends, use Terraform's external data source to call any script:

```hcl
# Call an external script to fetch secrets
data "external" "db_password" {
  program = ["python3", "${path.module}/scripts/fetch-secret.py"]

  query = {
    secret_name = "production/database/password"
    region      = "us-east-1"
  }
}

resource "aws_db_instance" "main" {
  password = data.external.db_password.result["value"]
  # ...
}
```

The script must accept JSON on stdin and return JSON on stdout:

```python
#!/usr/bin/env python3
# scripts/fetch-secret.py
import json
import sys
import subprocess

# Read input from Terraform
input_data = json.load(sys.stdin)
secret_name = input_data["secret_name"]

# Fetch the secret (example: from a custom vault)
result = subprocess.run(
    ["custom-vault", "get", secret_name],
    capture_output=True, text=True
)

# Return the result to Terraform
print(json.dumps({"value": result.stdout.strip()}))
```

## Comparing the Options

Here is a quick comparison to help you decide:

```
| Feature              | Cloud-Native | Vault    | SOPS     | 1Password |
|---------------------|-------------|----------|----------|-----------|
| Multi-cloud         | No          | Yes      | Yes      | Yes       |
| Dynamic secrets     | Limited     | Yes      | No       | No        |
| Audit logging       | Yes         | Yes      | Git log  | Yes       |
| Self-hosted option  | No          | Yes      | N/A      | Optional  |
| Complexity          | Low         | High     | Medium   | Low       |
| Cost                | Pay-per-use | License  | Free     | License   |
| Rotation support    | Built-in    | Built-in | Manual   | Manual    |
```

## Best Practices for Any Secret Store

Regardless of which secret store you choose, follow these practices:

### 1. Use Consistent Naming

```bash
# Pattern: {environment}/{service}/{secret-type}
production/myapp/database-password
staging/myapp/api-key
production/shared/tls-certificate
```

### 2. Separate Read and Write Access

```hcl
# Terraform should only need read access to secrets
# A separate process manages secret creation and rotation
```

### 3. Use Data Sources, Not Resources

```hcl
# PREFERRED: Read secrets with data sources
data "aws_secretsmanager_secret_version" "password" {
  secret_id = "my-password"
}

# AVOID: Managing secret values as resources (puts them in state)
# resource "aws_secretsmanager_secret_version" "password" { ... }
```

### 4. Handle Missing Secrets Gracefully

```hcl
# Use try() for optional secrets
locals {
  api_key = try(data.vault_kv_secret_v2.api_key.data["key"], "")
}
```

### 5. Document Secret Dependencies

```hcl
# variables.tf
variable "required_secrets" {
  description = <<-EOT
    The following secrets must exist before running this configuration:
    - production/database/credentials (JSON: username, password)
    - production/api/external-key (plain text)
    - production/tls/wildcard-cert (PEM certificate)
  EOT
  type    = string
  default = ""
}
```

## CI/CD Integration Pattern

A common pattern is to use a CI/CD-native secret mechanism to authenticate to your primary secret store:

```yaml
# GitHub Actions example
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write  # For OIDC
    steps:
      - uses: actions/checkout@v4

      # Step 1: Authenticate to cloud (using OIDC - no static credentials)
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/terraform
          aws-region: us-east-1

      # Step 2: Terraform reads secrets from AWS Secrets Manager
      - run: |
          terraform init
          terraform apply -auto-approve
```

## Monitoring Your Infrastructure

Whichever secret store you use, monitoring the infrastructure that depends on those secrets is critical. [OneUptime](https://oneuptime.com) provides uptime monitoring and alerting across all cloud providers, helping you ensure that services stay healthy regardless of where their secrets come from.

## Conclusion

The best external secret store for Terraform depends on your existing infrastructure and requirements. If you are single-cloud, use the native secret manager. If you are multi-cloud or need dynamic secrets, Vault is the strongest option. For small teams that want simplicity, SOPS offers a good balance of security and ease of use. Whatever you choose, the key principles remain the same: keep secrets out of source code, use data sources to read them, encrypt your state files, and audit all access.

For specific cloud integrations, see our guides on [AWS Secrets Manager](https://oneuptime.com/blog/post/2026-02-23-how-to-use-aws-secrets-manager-with-terraform/view), [Azure Key Vault](https://oneuptime.com/blog/post/2026-02-23-how-to-use-azure-key-vault-secrets-in-terraform/view), and [GCP Secret Manager](https://oneuptime.com/blog/post/2026-02-23-how-to-use-gcp-secret-manager-with-terraform/view).
