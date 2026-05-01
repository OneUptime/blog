# How to Use Ephemeral Resources for Temporary Credentials in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Ephemeral Resources, Temporary Credentials, Secret, AWS, HCL, Infrastructure as Code

Description: Learn how to use ephemeral resources in OpenTofu to obtain and use temporary credentials that are never stored in state, improving security for secrets and access tokens.

---

Temporary credentials - like AWS STS credentials issued by a secrets broker, Vault dynamic secrets, or short-lived API tokens - are perfect candidates for ephemeral resources. They should only exist for the duration of an OpenTofu operation, not be persisted to state files.

---

## AWS Temporary Credentials via STS

```hcl
# Get temporary AWS credentials from Vault's AWS secrets engine
ephemeral "vault_aws_access_credentials" "cross_account" {
  backend  = "aws"
  role     = "deploy-role"
  type     = "sts"
  role_arn = "arn:aws:iam::987654321098:role/deploy-role"
  ttl      = "1h"
  region   = "us-east-1"
}

# Use the temporary credentials to configure a provider for the target account
provider "aws" {
  alias       = "target_account"
  region      = "us-east-1"
  access_key  = ephemeral.vault_aws_access_credentials.cross_account.access_key
  secret_key  = ephemeral.vault_aws_access_credentials.cross_account.secret_key
  token       = ephemeral.vault_aws_access_credentials.cross_account.security_token
}

# Deploy resources in the target account using temporary credentials
resource "aws_s3_bucket" "data" {
  provider = aws.target_account
  bucket   = "cross-account-data-${var.environment}"
}
```

---

## Reading Secrets from AWS Secrets Manager

```hcl
# Fetch the database password - never stored in state
ephemeral "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "production/database/password"
}

resource "aws_db_instance" "main" {
  identifier        = "production-db"
  allocated_storage = 20
  db_name           = "app"
  engine            = "postgres"
  instance_class    = "db.t3.medium"
  username          = "dbadmin"

  # Write-only attribute - uses ephemeral value without storing it
  password_wo         = ephemeral.aws_secretsmanager_secret_version.db_password.secret_string
  password_wo_version = 1

  # The password is never written to the state file
}
```

---

## Vault Dynamic Database Credentials

```hcl
# Request short-lived database credentials from Vault
ephemeral "vault_database_secret" "db_creds" {
  mount = "database"
  name  = "production-postgres-role"
}

# Use them immediately without storing
resource "null_resource" "run_migration" {
  triggers = {
    migration_hash = filemd5("${path.module}/migrations/latest.sql")
  }

  provisioner "local-exec" {
    command = "psql -h ${aws_db_instance.main.address} -p ${aws_db_instance.main.port} -d app < ${path.module}/migrations/latest.sql"

    environment = {
      PGUSER     = ephemeral.vault_database_secret.db_creds.username
      PGPASSWORD = ephemeral.vault_database_secret.db_creds.password
    }
  }
}
```

---

## SSH Keys for Provisioners

```hcl
# Read an SSH private key from Secrets Manager
ephemeral "aws_secretsmanager_secret_version" "ssh_key" {
  secret_id = "production/ssh/deploy-key"
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"
  key_name      = aws_key_pair.deploy.key_name

  # Provision using the ephemeral SSH key - never stored in state
  connection {
    type        = "ssh"
    user        = "ec2-user"
    private_key = ephemeral.aws_secretsmanager_secret_version.ssh_key.secret_string
    host        = self.public_ip
  }

  provisioner "remote-exec" {
    inline = [
      "sudo yum update -y",
      "sudo systemctl start app",
    ]
  }
}
```

---

## API Tokens for Provider Configuration

```hcl
# Fetch an API token from Parameter Store
ephemeral "aws_ssm_parameter" "github_token" {
  arn             = "arn:aws:ssm:us-east-1:123456789012:parameter/production/github/token"
  with_decryption = true
}

# Use it to configure the GitHub provider without storing the token
provider "github" {
  token = ephemeral.aws_ssm_parameter.github_token.value
}
```

---

## Benefits Over Regular Approaches

| Approach | Token in State? | Token in Plan Output? |
|---|---|---|
| `var.token` (no sensitive) | Yes | Yes |
| `var.token` (sensitive = true) | Yes | No |
| `data "aws_ssm_parameter"` | Yes | No |
| `ephemeral "aws_ssm_parameter"` | No | No |

---

## Summary

Ephemeral resources are ideal for temporary credentials and secrets because they are fetched fresh during each operation and never persisted to state. Use them for AWS STS credentials, Vault dynamic secrets, SSH keys used in provisioners, and API tokens for provider configurations. This ensures that short-lived credentials remain short-lived and sensitive material is not exposed in state files or backups.
