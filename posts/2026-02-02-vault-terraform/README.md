# How to Use Vault with Terraform

Author: [nicktackes](https://www.github.com/nicktackes)

Tags: HashiCorp Vault, Terraform, Secrets Management, Infrastructure as Code, Security

Description: Learn how to integrate HashiCorp Vault with Terraform for secure secrets management in infrastructure deployments.

Managing secrets in infrastructure-as-code can be challenging. HashiCorp Vault provides a robust solution for secrets management, and when combined with Terraform, you can securely provision infrastructure while keeping sensitive data protected. In this guide, you will learn how to integrate Vault with Terraform for secure, automated infrastructure deployments.

## Understanding the Vault-Terraform Integration

Vault stores, generates, and controls access to secrets like API keys, passwords, and certificates. Terraform can read these secrets during provisioning, ensuring your infrastructure code never contains hardcoded sensitive values.

The following diagram illustrates how Vault and Terraform work together:

```mermaid
flowchart LR
    subgraph Vault["HashiCorp Vault"]
        S1[KV Secrets Engine]
        S2[Database Secrets Engine]
        S3[PKI Secrets Engine]
    end

    subgraph Terraform["Terraform"]
        P[Vault Provider]
        D[Data Sources]
        R[Resources]
    end

    subgraph Infrastructure["Cloud Infrastructure"]
        EC2[EC2 Instances]
        RDS[RDS Databases]
        K8S[Kubernetes]
    end

    P --> |Authenticate| Vault
    D --> |Read Secrets| S1
    D --> |Read Secrets| S2
    D --> |Read Secrets| S3
    R --> |Provision with Secrets| Infrastructure
```

## Prerequisites

Before getting started, ensure you have the following:

- Terraform 1.0 or later installed
- HashiCorp Vault server running and accessible
- Vault CLI installed for initial setup
- Basic understanding of Terraform and HCL syntax

## Setting Up Vault for Terraform

### Starting a Development Vault Server

For testing purposes, you can start a development Vault server. Keep in mind that dev mode stores everything in memory and should never be used in production.

```bash
# Start Vault in development mode with a root token
# The -dev flag enables an in-memory backend with auto-unsealing
vault server -dev -dev-root-token-id="dev-token"

# In another terminal, set the Vault address
export VAULT_ADDR='http://127.0.0.1:8200'
export VAULT_TOKEN='dev-token'
```

### Enabling the KV Secrets Engine

The Key-Value secrets engine stores arbitrary secrets. Version 2 provides versioning capabilities for your secrets.

```bash
# Enable KV secrets engine version 2 at the path 'secret'
# Version 2 supports secret versioning and soft deletes
vault secrets enable -version=2 -path=secret kv

# Store a database credential
# These values will be retrieved by Terraform during deployment
vault kv put secret/database \
    username="app_user" \
    password="SecureP@ssw0rd123" \
    host="db.example.com" \
    port="5432"
```

## Configuring the Terraform Vault Provider

### Basic Provider Configuration

The Vault provider configuration tells Terraform how to connect to your Vault server. Multiple authentication methods are supported.

```hcl
# providers.tf
# Configure the Terraform version and required providers
terraform {
  required_version = ">= 1.0.0"

  required_providers {
    vault = {
      source  = "hashicorp/vault"
      version = "~> 3.0"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Configure the Vault provider with address and authentication
# Using token auth for simplicity - production should use AppRole or other methods
provider "vault" {
  # Vault server address - can also be set via VAULT_ADDR environment variable
  address = var.vault_address

  # Authentication token - prefer environment variable VAULT_TOKEN for security
  token   = var.vault_token

  # Skip TLS verification only for development environments
  skip_tls_verify = var.environment == "dev" ? true : false
}
```

### Using Variables for Provider Configuration

Storing sensitive configuration in variables allows for environment-specific settings and better security practices.

```hcl
# variables.tf
# Define variables for Vault provider configuration
variable "vault_address" {
  description = "The address of the Vault server"
  type        = string
  default     = "http://127.0.0.1:8200"
}

variable "vault_token" {
  description = "Vault authentication token"
  type        = string
  sensitive   = true  # Prevents value from appearing in logs
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}
```

## Reading Secrets from Vault

### Using the KV Secrets Data Source

Data sources allow you to read existing secrets from Vault. The retrieved values can then be used in your resource configurations.

```hcl
# secrets.tf
# Read database credentials from Vault KV v2 secrets engine
# The path format for KV v2 is: <mount>/data/<secret-path>
data "vault_kv_secret_v2" "database" {
  mount = "secret"
  name  = "database"
}

# Read API keys for external services
data "vault_kv_secret_v2" "api_keys" {
  mount = "secret"
  name  = "api-keys"
}

# Output the retrieved values (be careful with sensitive data in outputs)
# Mark outputs as sensitive to prevent them from appearing in logs
output "db_host" {
  description = "Database hostname from Vault"
  value       = data.vault_kv_secret_v2.database.data["host"]
  sensitive   = true
}
```

### Using Generic Secret Data Source

For older KV v1 secrets or other secret engines, use the generic secret data source.

```hcl
# generic_secrets.tf
# Read secrets using the generic data source
# Useful for KV v1 or custom secret engines
data "vault_generic_secret" "app_config" {
  path = "secret/app/config"
}

# Access individual fields from the secret
locals {
  # Extract specific values from the generic secret
  app_api_key    = data.vault_generic_secret.app_config.data["api_key"]
  app_api_secret = data.vault_generic_secret.app_config.data["api_secret"]
  app_endpoint   = data.vault_generic_secret.app_config.data["endpoint"]
}
```

## Practical Example: Provisioning AWS Infrastructure with Vault Secrets

The following diagram shows the complete workflow of using Vault secrets to provision AWS resources:

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant TF as Terraform
    participant Vault as HashiCorp Vault
    participant AWS as AWS Cloud

    Dev->>TF: terraform apply
    TF->>Vault: Authenticate with token
    Vault-->>TF: Authentication successful
    TF->>Vault: Read database secrets
    Vault-->>TF: Return credentials
    TF->>Vault: Read SSH key
    Vault-->>TF: Return SSH public key
    TF->>AWS: Create RDS instance with credentials
    AWS-->>TF: RDS created
    TF->>AWS: Create EC2 instance with SSH key
    AWS-->>TF: EC2 created
    TF-->>Dev: Apply complete
```

### Complete Infrastructure Example

Here is a complete example that provisions an RDS database and EC2 instance using secrets from Vault.

```hcl
# main.tf
# Retrieve database credentials from Vault
data "vault_kv_secret_v2" "rds_credentials" {
  mount = "secret"
  name  = "aws/rds/production"
}

# Retrieve SSH public key for EC2 instances
data "vault_kv_secret_v2" "ssh_keys" {
  mount = "secret"
  name  = "aws/ssh-keys"
}

# Create an AWS Key Pair using the public key from Vault
resource "aws_key_pair" "app_server" {
  key_name   = "app-server-key-${var.environment}"
  public_key = data.vault_kv_secret_v2.ssh_keys.data["public_key"]

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Create a security group for the RDS instance
resource "aws_security_group" "rds" {
  name        = "rds-security-group-${var.environment}"
  description = "Security group for RDS database"
  vpc_id      = var.vpc_id

  ingress {
    description = "PostgreSQL from VPC"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "rds-sg-${var.environment}"
    Environment = var.environment
  }
}

# Create RDS PostgreSQL instance using credentials from Vault
# The username and password are never stored in Terraform state in plain text
resource "aws_db_instance" "application" {
  identifier     = "app-database-${var.environment}"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = var.environment == "prod" ? "db.r6g.large" : "db.t3.micro"

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_encrypted     = true

  db_name  = "application"
  username = data.vault_kv_secret_v2.rds_credentials.data["username"]
  password = data.vault_kv_secret_v2.rds_credentials.data["password"]

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = var.db_subnet_group

  backup_retention_period = var.environment == "prod" ? 30 : 7
  skip_final_snapshot     = var.environment != "prod"

  tags = {
    Name        = "app-db-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Create EC2 instance with the SSH key from Vault
resource "aws_instance" "app_server" {
  ami           = var.ami_id
  instance_type = var.environment == "prod" ? "t3.large" : "t3.micro"
  key_name      = aws_key_pair.app_server.key_name
  subnet_id     = var.subnet_id

  vpc_security_group_ids = [var.app_security_group_id]

  # Pass database connection info via user data
  # Secrets are injected at boot time, not stored in the AMI
  user_data = base64encode(templatefile("${path.module}/templates/user_data.sh", {
    db_host     = aws_db_instance.application.endpoint
    db_name     = aws_db_instance.application.db_name
    db_username = data.vault_kv_secret_v2.rds_credentials.data["username"]
    db_password = data.vault_kv_secret_v2.rds_credentials.data["password"]
  }))

  root_block_device {
    volume_size = 30
    encrypted   = true
  }

  tags = {
    Name        = "app-server-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}
```

## Using AppRole Authentication

For production environments, AppRole provides a more secure authentication method than using root tokens. AppRole uses role IDs and secret IDs instead of long-lived tokens.

```mermaid
flowchart TB
    subgraph Setup["Initial Setup (Admin)"]
        A1[Enable AppRole Auth] --> A2[Create Policy]
        A2 --> A3[Create AppRole]
        A3 --> A4[Get Role ID]
        A3 --> A5[Generate Secret ID]
    end

    subgraph Runtime["Terraform Runtime"]
        B1[Terraform Starts] --> B2[Authenticate with AppRole]
        B2 --> B3[Receive Token]
        B3 --> B4[Read Secrets]
        B4 --> B5[Provision Infrastructure]
    end

    A4 --> B2
    A5 --> B2
```

### Setting Up AppRole in Vault

First, configure AppRole authentication in Vault using the CLI or API.

```bash
# Enable AppRole authentication method
vault auth enable approle

# Create a policy that grants read access to specific secrets
# Policies follow the principle of least privilege
vault policy write terraform-policy - <<EOF
# Allow reading database secrets
path "secret/data/database/*" {
  capabilities = ["read", "list"]
}

# Allow reading AWS credentials
path "secret/data/aws/*" {
  capabilities = ["read", "list"]
}

# Allow reading API keys
path "secret/data/api-keys/*" {
  capabilities = ["read"]
}
EOF

# Create an AppRole with the terraform policy attached
# token_ttl sets how long tokens are valid
# secret_id_ttl sets how long secret IDs are valid
vault write auth/approle/role/terraform \
    token_policies="terraform-policy" \
    token_ttl=1h \
    token_max_ttl=4h \
    secret_id_ttl=24h \
    secret_id_num_uses=10

# Retrieve the Role ID (this is not sensitive and can be stored in config)
vault read auth/approle/role/terraform/role-id

# Generate a Secret ID (this IS sensitive and should be protected)
vault write -f auth/approle/role/terraform/secret-id
```

### Configuring Terraform for AppRole

Configure the Vault provider to use AppRole authentication instead of a static token.

```hcl
# approle_auth.tf
# Configure the Vault provider with AppRole authentication
# AppRole is recommended for machine-to-machine authentication
provider "vault" {
  address = var.vault_address

  # Use AppRole authentication instead of token auth
  auth_login {
    path = "auth/approle/login"

    parameters = {
      role_id   = var.vault_role_id
      secret_id = var.vault_secret_id
    }
  }
}

# Variables for AppRole authentication
variable "vault_role_id" {
  description = "Vault AppRole Role ID"
  type        = string
}

variable "vault_secret_id" {
  description = "Vault AppRole Secret ID"
  type        = string
  sensitive   = true  # Never log this value
}
```

## Dynamic Database Credentials

Vault can generate short-lived database credentials on demand, reducing the risk of credential exposure.

```mermaid
flowchart LR
    TF[Terraform] --> |1. Request Credentials| Vault
    Vault --> |2. Connect & Create User| DB[(Database)]
    DB --> |3. Confirm User Created| Vault
    Vault --> |4. Return Temp Credentials| TF
    TF --> |5. Configure App with Creds| App[Application]

    Note[Credentials expire automatically after TTL]
```

### Configuring the Database Secrets Engine

Set up Vault to dynamically generate database credentials with automatic expiration.

```bash
# Enable the database secrets engine
vault secrets enable database

# Configure the PostgreSQL database connection
# Vault will use this connection to create dynamic credentials
vault write database/config/postgres \
    plugin_name=postgresql-database-plugin \
    connection_url="postgresql://{{username}}:{{password}}@db.example.com:5432/mydb?sslmode=require" \
    allowed_roles="app-readonly,app-readwrite" \
    username="vault_admin" \
    password="VaultAdminP@ss"

# Create a role for read-only access
# Credentials generated from this role expire after 1 hour
vault write database/roles/app-readonly \
    db_name=postgres \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
        GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
    revocation_statements="DROP ROLE IF EXISTS \"{{name}}\";" \
    default_ttl="1h" \
    max_ttl="24h"

# Create a role for read-write access
vault write database/roles/app-readwrite \
    db_name=postgres \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
    revocation_statements="DROP ROLE IF EXISTS \"{{name}}\";" \
    default_ttl="1h" \
    max_ttl="24h"
```

### Using Dynamic Credentials in Terraform

Read dynamically generated credentials from the database secrets engine.

```hcl
# dynamic_credentials.tf
# Request dynamic database credentials from Vault
# These credentials are generated on-demand and expire automatically
data "vault_database_secret" "app_db" {
  backend = "database"
  role    = "app-readwrite"
}

# Use the dynamic credentials in your infrastructure
resource "kubernetes_secret" "db_credentials" {
  metadata {
    name      = "app-db-credentials"
    namespace = "application"
  }

  data = {
    # Dynamic credentials from Vault
    username = data.vault_database_secret.app_db.username
    password = data.vault_database_secret.app_db.password

    # Connection string for the application
    connection_string = "postgresql://${data.vault_database_secret.app_db.username}:${data.vault_database_secret.app_db.password}@${var.db_host}:5432/${var.db_name}"
  }

  type = "Opaque"
}

# Output lease information for monitoring
output "credential_lease_duration" {
  description = "Time until credentials expire"
  value       = data.vault_database_secret.app_db.lease_duration
}
```

## Managing Vault Resources with Terraform

Terraform can also manage Vault itself, enabling infrastructure-as-code for your secrets management platform.

### Creating Policies and Auth Methods

Use Terraform to define Vault policies and authentication methods consistently across environments.

```hcl
# vault_config.tf
# Create a Vault policy using Terraform
# Policies define what paths and operations are allowed
resource "vault_policy" "application" {
  name = "application-policy"

  policy = <<-EOT
    # Allow reading application secrets
    path "secret/data/application/*" {
      capabilities = ["read", "list"]
    }

    # Allow reading database credentials
    path "database/creds/app-readonly" {
      capabilities = ["read"]
    }

    # Allow renewing leases for database credentials
    path "sys/leases/renew" {
      capabilities = ["update"]
    }

    # Deny access to admin paths
    path "sys/policies/*" {
      capabilities = ["deny"]
    }
  EOT
}

# Create an AppRole for the application
resource "vault_approle_auth_backend_role" "application" {
  backend        = "approle"
  role_name      = "application"
  token_policies = [vault_policy.application.name]

  # Token settings
  token_ttl         = 3600   # 1 hour
  token_max_ttl     = 14400  # 4 hours
  token_num_uses    = 0      # Unlimited uses

  # Secret ID settings
  secret_id_ttl       = 86400  # 24 hours
  secret_id_num_uses  = 0      # Unlimited uses

  # Bind to specific CIDR blocks for additional security
  secret_id_bound_cidrs = var.environment == "prod" ? ["10.0.0.0/8"] : null
}

# Enable and configure the KV secrets engine
resource "vault_mount" "kv" {
  path        = "secret"
  type        = "kv"
  description = "KV Version 2 secrets engine"

  options = {
    version = "2"
  }
}

# Create initial secrets using Terraform
# Note: Be cautious about storing secrets in Terraform state
resource "vault_kv_secret_v2" "database_config" {
  mount = vault_mount.kv.path
  name  = "database/config"

  data_json = jsonencode({
    host     = var.db_host
    port     = var.db_port
    database = var.db_name
    # Avoid storing actual passwords in Terraform
    # Use this for non-sensitive configuration only
  })
}
```

## Best Practices and Security Considerations

### Protecting Terraform State

Terraform state may contain sensitive values read from Vault. Follow these practices to keep state secure.

```hcl
# backend.tf
# Configure remote state with encryption
# Never store Terraform state locally when using secrets
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true                    # Enable server-side encryption
    kms_key_id     = "alias/terraform-state" # Use customer-managed KMS key
    dynamodb_table = "terraform-locks"       # Enable state locking

    # Require MFA for state access in production
    # role_arn = "arn:aws:iam::123456789012:role/TerraformStateAccess"
  }
}
```

### Environment-Specific Configuration

Organize your Vault paths and policies by environment to maintain separation of concerns.

```hcl
# environment_config.tf
# Define environment-specific Vault paths
locals {
  # Construct Vault paths based on environment
  vault_secret_path = "secret/data/${var.environment}"

  # Environment-specific settings
  env_config = {
    dev = {
      vault_path_prefix = "secret/data/dev"
      token_ttl        = 3600   # 1 hour for dev
      approle_enabled  = false  # Use token auth in dev
    }
    staging = {
      vault_path_prefix = "secret/data/staging"
      token_ttl        = 1800   # 30 minutes for staging
      approle_enabled  = true
    }
    prod = {
      vault_path_prefix = "secret/data/prod"
      token_ttl        = 900    # 15 minutes for prod
      approle_enabled  = true
    }
  }

  current_env = local.env_config[var.environment]
}

# Read environment-specific secrets
data "vault_kv_secret_v2" "app_secrets" {
  mount = "secret"
  name  = "${var.environment}/application"
}
```

### Security Architecture Overview

The following diagram shows a recommended security architecture for Vault and Terraform integration:

```mermaid
flowchart TB
    subgraph CI_CD["CI/CD Pipeline"]
        GH[GitHub Actions]
        TF_Cloud[Terraform Cloud]
    end

    subgraph Auth["Authentication Layer"]
        OIDC[OIDC Provider]
        AppRole[AppRole Backend]
    end

    subgraph Vault_Cluster["Vault Cluster"]
        V1[Vault Node 1]
        V2[Vault Node 2]
        V3[Vault Node 3]
        Consul[(Consul Backend)]
        V1 & V2 & V3 --> Consul
    end

    subgraph Secrets["Secret Engines"]
        KV[KV Secrets]
        DB[Database Engine]
        PKI[PKI Engine]
        AWS_SE[AWS Engine]
    end

    GH --> |OIDC Auth| OIDC
    TF_Cloud --> |AppRole Auth| AppRole
    OIDC & AppRole --> Vault_Cluster
    Vault_Cluster --> Secrets
```

## Troubleshooting Common Issues

### Permission Denied Errors

When Terraform cannot read secrets, verify your policy grants the correct capabilities.

```bash
# Check what policies are attached to your token
vault token lookup

# Test if you can read the secret path manually
vault kv get secret/database

# Verify the policy allows read access
vault policy read terraform-policy

# Check the exact path your Terraform is trying to access
# For KV v2, the actual path includes 'data' in the middle
# secret/database becomes secret/data/database internally
```

### Token Expiration During Long Runs

For long-running Terraform operations, configure token renewal or use longer TTLs.

```hcl
# long_running.tf
# Configure the Vault provider with token renewal
provider "vault" {
  address = var.vault_address

  auth_login {
    path = "auth/approle/login"

    parameters = {
      role_id   = var.vault_role_id
      secret_id = var.vault_secret_id
    }
  }

  # Enable token renewal for long-running operations
  # Terraform will automatically renew the token before it expires
  skip_child_token = true
}
```

## Conclusion

Integrating Vault with Terraform provides a secure foundation for managing secrets in your infrastructure deployments. By following the patterns shown in this guide, you can eliminate hardcoded credentials, implement least-privilege access, and maintain a complete audit trail of secret access.

Key takeaways from this guide:

1. Always use environment variables or AppRole authentication instead of hardcoded tokens
2. Organize secrets by environment and application for clear separation
3. Use dynamic secrets when possible to minimize credential lifetime
4. Protect your Terraform state with encryption and access controls
5. Implement policies that follow the principle of least privilege

Start with a simple integration and gradually adopt more advanced features like dynamic credentials and policy-as-code as your infrastructure matures.
