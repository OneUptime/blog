# How to Use Terraform with Boundary for Access Management

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Boundary, Access Management, HashiCorp, Security, Zero Trust

Description: Learn how to use Terraform with HashiCorp Boundary for secure access management, including setting up targets, credential injection, and session management.

---

Traditional approaches to infrastructure access management rely on SSH keys, VPN connections, and bastion hosts. These methods are difficult to audit, prone to credential sprawl, and create a poor user experience. HashiCorp Boundary provides a modern, identity-based approach to access management that works with your existing identity provider. Terraform integrates with Boundary to provision both the Boundary infrastructure and its access policies.

This guide covers how to deploy Boundary with Terraform and configure secure access to your infrastructure resources.

## Understanding Boundary's Access Model

Boundary uses a scope-based organizational model. At the top level, you have organizations. Within organizations, you have projects. Projects contain targets (the resources users want to access), host catalogs (collections of hosts), and credential stores. Users authenticate through an identity provider and are granted access to targets based on roles and permissions.

## Deploying Boundary Infrastructure

Start by deploying the Boundary controller and worker nodes.

```hcl
# KMS keys for Boundary encryption
resource "aws_kms_key" "boundary_root" {
  description             = "Boundary root KMS key"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Name    = "boundary-root-key"
    Purpose = "boundary"
  }
}

resource "aws_kms_key" "boundary_worker_auth" {
  description             = "Boundary worker auth KMS key"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Name    = "boundary-worker-auth-key"
    Purpose = "boundary"
  }
}

resource "aws_kms_key" "boundary_recovery" {
  description             = "Boundary recovery KMS key"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Name    = "boundary-recovery-key"
    Purpose = "boundary"
  }
}

# RDS PostgreSQL for Boundary backend
resource "aws_db_instance" "boundary" {
  identifier     = "boundary-db-${var.environment}"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t3.medium"

  allocated_storage = 20
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = "boundary"
  username = var.boundary_db_username
  password = var.boundary_db_password

  vpc_security_group_ids = [aws_security_group.boundary_db.id]
  db_subnet_group_name   = aws_db_subnet_group.boundary.name

  skip_final_snapshot = var.environment != "production"

  tags = {
    Name        = "boundary-db"
    Environment = var.environment
  }
}

# Boundary controller instance
resource "aws_instance" "boundary_controller" {
  count         = var.controller_count
  ami           = var.boundary_ami_id
  instance_type = "t3.medium"
  key_name      = var.key_name
  subnet_id     = var.private_subnet_ids[count.index % length(var.private_subnet_ids)]

  vpc_security_group_ids = [aws_security_group.boundary_controller.id]
  iam_instance_profile   = aws_iam_instance_profile.boundary.name

  user_data = templatefile("${path.module}/templates/boundary-controller.sh", {
    db_url              = "postgresql://${var.boundary_db_username}:${var.boundary_db_password}@${aws_db_instance.boundary.address}:5432/boundary"
    root_kms_key_id     = aws_kms_key.boundary_root.id
    worker_kms_key_id   = aws_kms_key.boundary_worker_auth.id
    recovery_kms_key_id = aws_kms_key.boundary_recovery.id
    region              = var.region
  })

  tags = {
    Name        = "boundary-controller-${count.index}"
    Environment = var.environment
  }
}

# Boundary worker instance
resource "aws_instance" "boundary_worker" {
  count         = var.worker_count
  ami           = var.boundary_ami_id
  instance_type = "t3.medium"
  key_name      = var.key_name
  subnet_id     = var.private_subnet_ids[count.index % length(var.private_subnet_ids)]

  vpc_security_group_ids = [aws_security_group.boundary_worker.id]
  iam_instance_profile   = aws_iam_instance_profile.boundary.name

  user_data = templatefile("${path.module}/templates/boundary-worker.sh", {
    controller_addresses = [for c in aws_instance.boundary_controller : "${c.private_ip}:9201"]
    worker_kms_key_id    = aws_kms_key.boundary_worker_auth.id
    region               = var.region
  })

  tags = {
    Name        = "boundary-worker-${count.index}"
    Environment = var.environment
  }
}
```

## Configuring Boundary Resources

Use the Boundary provider to set up the organizational structure and access targets.

```hcl
# Configure the Boundary provider
provider "boundary" {
  addr             = "https://${aws_lb.boundary.dns_name}"
  recovery_kms_hcl = <<-EOT
    kms "awskms" {
      purpose    = "recovery"
      region     = "${var.region}"
      kms_key_id = "${aws_kms_key.boundary_recovery.id}"
    }
  EOT
}

# Organization scope
resource "boundary_scope" "org" {
  scope_id                 = "global"
  name                     = "company"
  description              = "Company organization"
  auto_create_admin_role   = true
  auto_create_default_role = true
}

# Project scope for each environment
resource "boundary_scope" "environments" {
  for_each = toset(["development", "staging", "production"])

  name                     = each.value
  description              = "${each.value} environment access"
  scope_id                 = boundary_scope.org.id
  auto_create_admin_role   = true
  auto_create_default_role = false
}

# Auth method using password (can be replaced with OIDC)
resource "boundary_auth_method" "password" {
  scope_id = boundary_scope.org.id
  type     = "password"
  name     = "password-auth"
}

# OIDC auth method for SSO integration
resource "boundary_auth_method_oidc" "sso" {
  scope_id             = boundary_scope.org.id
  name                 = "company-sso"
  description          = "OIDC authentication via company SSO"
  issuer               = var.oidc_issuer_url
  client_id            = var.oidc_client_id
  client_secret        = var.oidc_client_secret
  signing_algorithms   = ["RS256"]
  api_url_prefix       = "https://${aws_lb.boundary.dns_name}"
  is_primary_for_scope = true
}
```

## Creating Access Targets

Define the infrastructure targets users can connect to.

```hcl
# Static host catalog for known servers
resource "boundary_host_catalog_static" "servers" {
  for_each = boundary_scope.environments

  name     = "server-catalog"
  scope_id = each.value.id
}

# Register hosts in the catalog
resource "boundary_host_static" "web_servers" {
  for_each = {
    for idx, server in aws_instance.web_servers :
    "web-${idx}" => server.private_ip
  }

  host_catalog_id = boundary_host_catalog_static.servers["production"].id
  name            = each.key
  address         = each.value
}

# Host set grouping web servers
resource "boundary_host_set_static" "web" {
  host_catalog_id = boundary_host_catalog_static.servers["production"].id
  name            = "web-servers"
  host_ids        = [for h in boundary_host_static.web_servers : h.id]
}

# SSH target for web servers
resource "boundary_target" "ssh_web" {
  scope_id     = boundary_scope.environments["production"].id
  name         = "web-server-ssh"
  description  = "SSH access to web servers"
  type         = "tcp"
  default_port = 22

  host_source_ids = [boundary_host_set_static.web.id]

  # Session settings
  session_max_seconds      = 3600
  session_connection_limit = 5

  # Inject credentials automatically
  injected_application_credential_source_ids = [
    boundary_credential_library_vault.ssh_creds.id
  ]
}

# Database target
resource "boundary_target" "database" {
  scope_id     = boundary_scope.environments["production"].id
  name         = "production-database"
  description  = "Access to production PostgreSQL"
  type         = "tcp"
  default_port = 5432

  host_source_ids = [boundary_host_set_static.database.id]

  session_max_seconds      = 1800
  session_connection_limit = 1
}
```

## Credential Management with Vault Integration

Connect Boundary to Vault for dynamic credential injection.

```hcl
# Vault credential store
resource "boundary_credential_store_vault" "main" {
  scope_id    = boundary_scope.environments["production"].id
  name        = "vault-creds"
  description = "Vault credential store for production"
  address     = var.vault_address
  token       = var.boundary_vault_token
  namespace   = "admin"
}

# Vault credential library for SSH certificates
resource "boundary_credential_library_vault" "ssh_creds" {
  credential_store_id = boundary_credential_store_vault.main.id
  name                = "ssh-credentials"
  description         = "SSH credentials from Vault"
  path                = "ssh/creds/admin"
  http_method         = "POST"
  http_request_body   = jsonencode({
    ip = "{{.Host}}"
  })
  credential_type = "ssh_private_key"
}

# Vault credential library for database access
resource "boundary_credential_library_vault" "db_creds" {
  credential_store_id = boundary_credential_store_vault.main.id
  name                = "database-credentials"
  description         = "Dynamic database credentials from Vault"
  path                = "database/creds/readonly"
  http_method         = "GET"
  credential_type     = "username_password"
}
```

## Role-Based Access Control

Define roles that control who can access what.

```hcl
# Role for developers - access to dev and staging
resource "boundary_role" "developer" {
  scope_id       = boundary_scope.org.id
  name           = "developer"
  description    = "Developer access role"
  principal_ids  = var.developer_user_ids
  grant_scope_ids = [
    boundary_scope.environments["development"].id,
    boundary_scope.environments["staging"].id,
  ]
  grant_strings = [
    "ids=*;type=target;actions=authorize-session",
    "ids=*;type=session;actions=read,read:self",
  ]
}

# Role for SREs - access to all environments
resource "boundary_role" "sre" {
  scope_id       = boundary_scope.org.id
  name           = "sre"
  description    = "SRE full access role"
  principal_ids  = var.sre_user_ids
  grant_scope_ids = [for env in boundary_scope.environments : env.id]
  grant_strings = [
    "ids=*;type=target;actions=authorize-session",
    "ids=*;type=session;actions=read,cancel,read:self,cancel:self",
    "ids=*;type=host-catalog;actions=read,list",
  ]
}

# Role for read-only audit access
resource "boundary_role" "auditor" {
  scope_id       = boundary_scope.org.id
  name           = "auditor"
  description    = "Read-only audit access"
  principal_ids  = var.auditor_user_ids
  grant_scope_ids = [for env in boundary_scope.environments : env.id]
  grant_strings = [
    "ids=*;type=session;actions=list,read",
    "ids=*;type=target;actions=list,read",
  ]
}
```

## Best Practices

Use OIDC authentication to integrate Boundary with your existing identity provider rather than managing users directly in Boundary. Connect Boundary to Vault for dynamic credential injection so users never see or handle actual credentials. Set session time limits and connection limits on all targets to reduce the window of exposure if a session is compromised.

For related security tools, see our guides on [using Terraform with Vault for secret management](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-with-vault-for-secret-management/view) and [using Terraform with Consul for service discovery](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-with-consul-for-service-discovery/view).

## Conclusion

Terraform and Boundary together provide a modern, identity-based approach to infrastructure access management. Boundary eliminates the need for SSH keys, VPNs, and bastion hosts by providing a secure proxy that authenticates users through your identity provider and injects credentials dynamically. Terraform manages the entire lifecycle, from deploying the Boundary infrastructure to configuring targets, roles, and credential stores. This combination delivers the security, auditability, and user experience that traditional access management approaches cannot match.
