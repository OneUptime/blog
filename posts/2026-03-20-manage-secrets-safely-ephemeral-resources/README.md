# How to Manage Secrets Safely with Ephemeral Resources in OpenTofu - Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Ephemeral Resources, Secrets Management, Security, HCL, Infrastructure as Code, DevOps

Description: Learn best practices for managing secrets safely in OpenTofu using ephemeral resources to avoid storing sensitive values in state files.

---

State files are one of the biggest security risks in infrastructure as code. Marking a value `sensitive` only redacts it from CLI output - it does not keep the value out of state. In OpenTofu 1.11+, ephemeral resources and write-only attributes solve this problem for providers that support them by fetching secrets at runtime and discarding them without ever touching state.

---

## The State File Problem

```hcl
# BAD: The database password ends up in state

resource "aws_db_instance" "main" {
  identifier = "production-db"
  username   = "dbadmin"
  password   = var.db_password   # stored in state in plaintext
}

# Even with sensitive = true, the value is in the state file
variable "db_password" {
  sensitive = true
  # The value is still written to .tfstate
}
```

---

## The Ephemeral Solution

```hcl
# GOOD: Password never stored in state
ephemeral "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "production/database/password"
}

resource "aws_db_instance" "main" {
  identifier = "production-db"
  username   = "dbadmin"

  # write-only attribute - uses ephemeral value, not stored in state
  password_wo         = ephemeral.aws_secretsmanager_secret_version.db_password.secret_string
  password_wo_version = 1
}
```

---

## Pattern 1: Database Passwords

```hcl
ephemeral "aws_secretsmanager_secret_version" "rds_password" {
  secret_id = "${var.environment}/rds/admin-password"
}

resource "aws_db_instance" "postgres" {
  identifier          = "${var.environment}-postgres"
  engine              = "postgres"
  engine_version      = "15.4"
  instance_class      = "db.t3.medium"
  username            = "dbadmin"
  password_wo         = ephemeral.aws_secretsmanager_secret_version.rds_password.secret_string
  password_wo_version = 1
  # password never in state
}
```

---

## Pattern 2: Provider Credentials

```hcl
# Fetch provider credentials ephemerally
ephemeral "aws_secretsmanager_secret_version" "datadog_keys" {
  secret_id = "monitoring/datadog"
}

locals {
  dd = jsondecode(ephemeral.aws_secretsmanager_secret_version.datadog_keys.secret_string)
}

provider "datadog" {
  api_key = local.dd.api_key
  app_key = local.dd.app_key
  # Neither key stored in state
}
```

---

## Pattern 3: Kubernetes Secrets

```hcl
ephemeral "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = "${var.environment}/app/secrets"
}

locals {
  app_secrets = jsondecode(ephemeral.aws_secretsmanager_secret_version.app_secrets.secret_string)
}

resource "kubernetes_secret_v1" "app" {
  metadata {
    name      = "app-secrets"
    namespace = var.namespace
  }

  data_wo = {
    # Passed via a write-only attribute, so not stored in OpenTofu state
    db_password = local.app_secrets.db_password
    api_key     = local.app_secrets.api_key
    jwt_secret  = local.app_secrets.jwt_secret
  }
  data_wo_revision = 1

  type = "Opaque"
}
```

---

## Pattern 4: TLS Key Generation

```hcl
# Generate a TLS key ephemerally - never stored in state
ephemeral "tls_private_key" "server" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

# Store the keypair in Secrets Manager (where it belongs)
resource "aws_secretsmanager_secret_version" "server_key" {
  secret_id = aws_secretsmanager_secret.server_key.id
  secret_string_wo = jsonencode({
    public_key_openssh = ephemeral.tls_private_key.server.public_key_openssh
    private_key_pem    = ephemeral.tls_private_key.server.private_key_pem
  })
  secret_string_wo_version = 1
  # Note: secret_string_wo is a write-only attribute - not stored in state
}
```

---

## Pattern 5: SSH-Based Provisioning

```hcl
ephemeral "aws_secretsmanager_secret_version" "deploy_key" {
  secret_id = "production/ssh/deploy"
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"

  connection {
    type        = "ssh"
    user        = "ec2-user"
    host        = self.public_ip
    private_key = ephemeral.aws_secretsmanager_secret_version.deploy_key.secret_string
  }

  provisioner "remote-exec" {
    inline = ["sudo /opt/app/configure.sh"]
  }
}
```

---

## Security Checklist

When managing secrets in OpenTofu:

- Store secrets in AWS Secrets Manager, SSM Parameter Store, or HashiCorp Vault
- Use `ephemeral` resources together with write-only attributes when the provider supports them
- Avoid passing secrets directly as variable values via CLI or `.tfvars`
- Use write-only resource attributes when available
- Avoid interpolating secrets into command strings (use environment variables)
- Audit your state files for accidentally stored secrets
- Enable encryption at rest for your remote state backend

---

## Summary

Ephemeral resources and write-only attributes remove one of the biggest security risks in infrastructure as code: secrets persisting in state files. In OpenTofu 1.11+ and with providers that support these features, fetch database passwords, API keys, SSH keys, and provider credentials through ephemeral resources and use them in write-only attributes, provider configurations, connection blocks, and provisioner environment variables. This keeps sensitive values in your dedicated secrets store - where they belong - and out of state files and CI/CD logs.
