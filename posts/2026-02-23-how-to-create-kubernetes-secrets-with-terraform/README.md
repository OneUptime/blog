# How to Create Kubernetes Secrets with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Secrets, Security, Infrastructure as Code, DevOps

Description: How to create and manage Kubernetes Secrets using Terraform with practical examples for different secret types and security best practices.

---

Kubernetes Secrets store sensitive data like passwords, API keys, and TLS certificates separately from your application code. While they are not encrypted by default in etcd (just base64 encoded), they provide a structured way to handle sensitive configuration. Managing Secrets through Terraform lets you automate their creation while keeping them in your infrastructure pipeline, though it requires careful handling to avoid leaking sensitive values.

This post covers creating different types of Kubernetes Secrets with Terraform, along with practical advice on security.

## Provider Setup

```hcl
# providers.tf
terraform {
  required_version = ">= 1.0"

  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
  }
}

provider "kubernetes" {
  config_path = "~/.kube/config"
}
```

## Opaque Secrets

Opaque is the default Secret type and the most common. It stores arbitrary key-value pairs.

```hcl
# secrets.tf - Opaque secret for application credentials
resource "kubernetes_secret" "app_credentials" {
  metadata {
    name      = "app-credentials"
    namespace = "backend"

    labels = {
      app        = "my-app"
      managed-by = "terraform"
    }
  }

  type = "Opaque"

  # Use data for string values (Terraform handles the base64 encoding)
  data = {
    DATABASE_USER     = var.db_username
    DATABASE_PASSWORD = var.db_password
    API_KEY           = var.api_key
    REDIS_URL         = "redis://:${var.redis_password}@redis.cache.svc.cluster.local:6379"
  }
}

# Variables for sensitive values
variable "db_username" {
  type      = string
  sensitive = true
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "api_key" {
  type      = string
  sensitive = true
}

variable "redis_password" {
  type      = string
  sensitive = true
}
```

Mark your variables as `sensitive = true` to prevent Terraform from showing their values in plan output and logs.

## TLS Secrets

TLS Secrets store certificate and key pairs. Kubernetes validates the format when you create them.

```hcl
# tls_secret.tf - Store TLS certificates
resource "kubernetes_secret" "tls_cert" {
  metadata {
    name      = "app-tls-cert"
    namespace = "frontend"
  }

  type = "kubernetes.io/tls"

  data = {
    "tls.crt" = file("${path.module}/certs/server.crt")
    "tls.key" = file("${path.module}/certs/server.key")
  }
}

# Or generate a self-signed cert with Terraform's TLS provider
resource "tls_private_key" "app" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "tls_self_signed_cert" "app" {
  private_key_pem = tls_private_key.app.private_key_pem

  subject {
    common_name  = "app.example.com"
    organization = "Example Inc"
  }

  validity_period_hours = 8760  # 1 year

  allowed_uses = [
    "key_encipherment",
    "digital_signature",
    "server_auth",
  ]
}

resource "kubernetes_secret" "generated_tls" {
  metadata {
    name      = "generated-tls-cert"
    namespace = "frontend"
  }

  type = "kubernetes.io/tls"

  data = {
    "tls.crt" = tls_self_signed_cert.app.cert_pem
    "tls.key" = tls_private_key.app.private_key_pem
  }
}
```

## Docker Registry Secrets

Image pull secrets let Kubernetes authenticate with private container registries.

```hcl
# registry_secret.tf - Docker registry credentials
resource "kubernetes_secret" "docker_registry" {
  metadata {
    name      = "registry-credentials"
    namespace = "default"
  }

  type = "kubernetes.io/dockerconfigjson"

  data = {
    ".dockerconfigjson" = jsonencode({
      auths = {
        "myregistry.azurecr.io" = {
          username = var.registry_username
          password = var.registry_password
          auth     = base64encode("${var.registry_username}:${var.registry_password}")
        }
      }
    })
  }
}

variable "registry_username" {
  type      = string
  sensitive = true
}

variable "registry_password" {
  type      = string
  sensitive = true
}
```

Then reference this Secret in your Deployments:

```hcl
resource "kubernetes_deployment" "app" {
  metadata {
    name      = "private-app"
    namespace = "default"
  }

  spec {
    replicas = 1

    selector {
      match_labels = {
        app = "private-app"
      }
    }

    template {
      metadata {
        labels = {
          app = "private-app"
        }
      }

      spec {
        # Reference the registry secret for pulling images
        image_pull_secrets {
          name = kubernetes_secret.docker_registry.metadata[0].name
        }

        container {
          name  = "app"
          image = "myregistry.azurecr.io/my-app:latest"

          resources {
            requests = {
              cpu    = "100m"
              memory = "128Mi"
            }
          }
        }
      }
    }
  }
}
```

## Basic Auth Secrets

```hcl
# basic_auth.tf - Basic authentication secret
resource "kubernetes_secret" "basic_auth" {
  metadata {
    name      = "basic-auth"
    namespace = "default"
  }

  type = "kubernetes.io/basic-auth"

  data = {
    username = var.basic_auth_user
    password = var.basic_auth_pass
  }
}
```

## Consuming Secrets in Pods

### As Environment Variables

```hcl
# deployment_secret_env.tf - Use secret as env vars
resource "kubernetes_deployment" "app_with_secrets" {
  metadata {
    name      = "app-with-secrets"
    namespace = "backend"
  }

  spec {
    replicas = 2

    selector {
      match_labels = {
        app = "app-with-secrets"
      }
    }

    template {
      metadata {
        labels = {
          app = "app-with-secrets"
        }
      }

      spec {
        container {
          name  = "app"
          image = "myregistry.io/app:latest"

          # Load specific secret keys as environment variables
          env {
            name = "DB_PASSWORD"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.app_credentials.metadata[0].name
                key  = "DATABASE_PASSWORD"
              }
            }
          }

          # Load all secret keys as environment variables
          env_from {
            secret_ref {
              name = kubernetes_secret.app_credentials.metadata[0].name
            }
          }

          resources {
            requests = {
              cpu    = "100m"
              memory = "128Mi"
            }
          }
        }
      }
    }
  }
}
```

### As Volume Mounts

```hcl
# deployment_secret_vol.tf - Mount secrets as files
resource "kubernetes_deployment" "app_with_mounted_secrets" {
  metadata {
    name      = "app-mounted-secrets"
    namespace = "backend"
  }

  spec {
    replicas = 1

    selector {
      match_labels = {
        app = "app-mounted-secrets"
      }
    }

    template {
      metadata {
        labels = {
          app = "app-mounted-secrets"
        }
      }

      spec {
        container {
          name  = "app"
          image = "myregistry.io/app:latest"

          volume_mount {
            name       = "secret-volume"
            mount_path = "/etc/secrets"
            read_only  = true
          }

          resources {
            requests = {
              cpu    = "100m"
              memory = "128Mi"
            }
          }
        }

        volume {
          name = "secret-volume"
          secret {
            secret_name  = kubernetes_secret.app_credentials.metadata[0].name
            default_mode = "0400"  # Read-only for owner

            # Optionally select specific keys
            items {
              key  = "DATABASE_PASSWORD"
              path = "db-password"  # Mounted as /etc/secrets/db-password
            }
          }
        }
      }
    }
  }
}
```

## Security Best Practices

### Use a Remote State Backend with Encryption

Terraform stores secret values in its state file. Never store state locally for projects with secrets.

```hcl
# backend.tf - Use encrypted remote state
terraform {
  backend "gcs" {
    bucket = "my-terraform-state"
    prefix = "kubernetes/secrets"

    # GCS encrypts data at rest by default
  }
}
```

### Integrate with External Secret Managers

For production workloads, consider pulling secrets from HashiCorp Vault, AWS Secrets Manager, or GCP Secret Manager instead of storing them directly in Terraform.

```hcl
# vault_integration.tf - Pull secrets from Vault
data "vault_generic_secret" "db_creds" {
  path = "secret/data/production/database"
}

resource "kubernetes_secret" "db_from_vault" {
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

### Use terraform.tfvars with .gitignore

```bash
# .gitignore - never commit secret values
*.tfvars
!example.tfvars
.terraform/
terraform.tfstate*
```

```hcl
# example.tfvars - template for developers
# Copy this to terraform.tfvars and fill in real values
db_username     = "REPLACE_ME"
db_password     = "REPLACE_ME"
api_key         = "REPLACE_ME"
redis_password  = "REPLACE_ME"
```

## Monitoring Secret Usage

Track which pods consume which Secrets and get alerted when Secrets are approaching expiration (especially TLS certificates). [OneUptime](https://oneuptime.com) can monitor SSL certificate expiry on your endpoints and alert you well before they expire, preventing outages caused by forgotten certificate renewals.

## Summary

Kubernetes Secrets managed through Terraform provide a structured approach to handling sensitive configuration. The main secret types - Opaque, TLS, Docker registry, and basic-auth - each serve specific use cases. The critical thing to remember is that Terraform state contains the plaintext values of your secrets, so always use encrypted remote state backends and mark variables as sensitive. For production environments, integrating with an external secret manager like Vault gives you the best of both worlds: Terraform automation with proper secret lifecycle management.

For non-sensitive configuration, check out our guide on [Kubernetes ConfigMaps with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-kubernetes-configmaps-with-terraform/view).
