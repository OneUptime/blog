# How to Manage Vault Policies with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Vault, Policies, ACL, Access Control

Description: Learn how to create, manage, and organize HashiCorp Vault ACL policies using OpenTofu to enforce least-privilege access across your secret management infrastructure.

## Introduction

Vault policies use HCL or JSON syntax to define which paths a token can access and with what capabilities. Managing these policies with OpenTofu ensures they are version-controlled, consistently applied, and can be reviewed through pull requests before taking effect.

## Basic Policy Management

```hcl
# Create a read-only policy for application secrets

resource "vault_policy" "app_readonly" {
  name = "prod-app-readonly"

  policy = <<EOT
# Read application-specific secrets
path "secret/data/prod/app/*" {
  capabilities = ["read"]
}

# List application-specific secrets
path "secret/metadata/prod/app/*" {
  capabilities = ["list"]
}

# Read database credentials
path "database/creds/app-readonly" {
  capabilities = ["read"]
}

# Allow token self-renewal
path "auth/token/renew-self" {
  capabilities = ["update"]
}

# Allow token self-lookup
path "auth/token/lookup-self" {
  capabilities = ["read"]
}
EOT
}
```

## Policy from File

```hcl
# Store complex policies in separate .hcl files for readability
resource "vault_policy" "platform_team" {
  name   = "platform-team"
  policy = file("${path.module}/policies/platform-team.hcl")
}

resource "vault_policy" "dev_team" {
  name   = "dev-team"
  policy = file("${path.module}/policies/dev-team.hcl")
}
```

```hcl
# policies/platform-team.hcl
# Manage infrastructure secrets in KV v2
path "secret/data/infra/*" {
  capabilities = ["create", "read", "update", "delete"]
}

# List infrastructure secrets in KV v2
path "secret/metadata/infra/*" {
  capabilities = ["list"]
}

# Manage PKI certificates
path "pki/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Manage auth method endpoints
path "auth/*" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}

# Enable, disable, and tune auth methods
path "sys/auth/*" {
  capabilities = ["create", "update", "delete", "sudo"]
}

# List enabled auth methods
path "sys/auth" {
  capabilities = ["read"]
}

# List existing ACL policies
path "sys/policies/acl" {
  capabilities = ["list"]
}

# Manage ACL policies
path "sys/policies/acl/*" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}
```

## Environment-Specific Policies

```hcl
locals {
  environments = ["dev", "staging", "prod"]
}

resource "vault_policy" "app_policy" {
  for_each = toset(local.environments)

  name = "${each.key}-app-policy"

  policy = <<EOT
# ${each.key} environment application policy

path "secret/data/${each.key}/app/*" {
  capabilities = ["read"]
}

path "secret/metadata/${each.key}/app/*" {
  capabilities = ["list"]
}

path "database/creds/${each.key}-app" {
  capabilities = ["read"]
}

path "aws/creds/${each.key}-app-role" {
  capabilities = ["read"]
}
EOT
}
```

## Parameterized Policies with Template Functions

```hcl
# Use templatefile to generate policies with variable substitution
resource "vault_policy" "service_policy" {
  for_each = var.services

  name   = "${each.key}-policy"
  policy = templatefile("${path.module}/templates/service-policy.hcl.tpl", {
    environment  = var.environment
    service_name = each.key
    db_role      = each.value.db_role
    aws_role     = each.value.aws_role
  })
}
```

```hcl
# templates/service-policy.hcl.tpl
path "secret/data/${environment}/${service_name}/*" {
  capabilities = ["read"]
}

path "secret/metadata/${environment}/${service_name}/*" {
  capabilities = ["list"]
}

path "database/creds/${db_role}" {
  capabilities = ["read"]
}

path "aws/creds/${aws_role}" {
  capabilities = ["read"]
}

path "auth/token/renew-self" {
  capabilities = ["update"]
}
```

## Attaching Policies to Auth Roles

```hcl
# Kubernetes auth role with policies
resource "vault_kubernetes_auth_backend_role" "app" {
  backend                          = "kubernetes"
  role_name                        = "prod-app"
  bound_service_account_names      = ["app-service-account"]
  bound_service_account_namespaces = ["production"]

  token_policies = [
    vault_policy.app_readonly.name,
    "default"  # Built-in default policy
  ]

  token_ttl     = 3600
  token_max_ttl = 14400
}

# AppRole with policies
resource "vault_approle_auth_backend_role" "cicd" {
  backend        = "approle"
  role_name      = "cicd-role"
  token_policies = [vault_policy.platform_team.name]
}
```

## Audit Logging for Policy Changes

```hcl
# Enable audit device to track all policy changes
resource "vault_audit" "file" {
  type = "file"
  path = "file"

  options = {
    file_path = "/var/log/vault/audit.log"
  }
}
```

## Conclusion

Managing Vault policies with OpenTofu brings infrastructure-as-code discipline to access control. Store complex policies in separate `.hcl` template files, use `for_each` to generate environment-specific variants, and attach them to auth roles in the same configuration. Pull request reviews become the access control approval process, creating an auditable trail for all policy changes.
