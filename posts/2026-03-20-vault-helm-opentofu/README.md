# How to Deploy HashiCorp Vault on Kubernetes with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, HashiCorp Vault, Secrets Management, OpenTofu, Helm, Security

Description: Learn how to deploy HashiCorp Vault on Kubernetes using OpenTofu and Helm with HA mode, auto-unseal with AWS KMS, and Kubernetes authentication for application secrets.

## Overview

HashiCorp Vault provides centralized secrets management, encryption as a service, and dynamic credentials. OpenTofu deploys Vault via the official Helm chart with HA mode, auto-unseal, and Kubernetes auth integration.

## Step 1: Deploy Vault with Helm

```hcl
# main.tf - Deploy HashiCorp Vault via Helm

resource "helm_release" "vault" {
  name             = "vault"
  repository       = "https://helm.releases.hashicorp.com"
  chart            = "vault"
  version          = "0.27.0"
  namespace        = "vault"
  create_namespace = true

  values = [yamlencode({
    server = {
      # High Availability mode with Raft storage
      ha = {
        enabled  = true
        replicas = 3

        raft = {
          enabled   = true
          setNodeId = true

          config = <<-VAULT_CONFIG
            ui = true

            listener "tcp" {
              tls_disable = 1
              address = "[::]:8200"
              cluster_address = "[::]:8201"
            }

            storage "raft" {
              path = "/vault/data"

              retry_join {
                leader_api_addr = "http://vault-0.vault-internal:8200"
              }
              retry_join {
                leader_api_addr = "http://vault-1.vault-internal:8200"
              }
              retry_join {
                leader_api_addr = "http://vault-2.vault-internal:8200"
              }
            }

            seal "awskms" {
              region     = "us-east-1"
              kms_key_id = "${aws_kms_key.vault_unseal.key_id}"
            }

            service_registration "kubernetes" {}
          VAULT_CONFIG
        }
      }

      # Resource limits
      resources = {
        requests = { memory = "256Mi", cpu = "250m" }
        limits   = { memory = "512Mi", cpu = "500m" }
      }

      # Persistent storage
      dataStorage = {
        enabled      = true
        size         = "10Gi"
        storageClass = "gp3"
      }

      # Service account for AWS KMS auto-unseal
      serviceAccount = {
        annotations = {
          "eks.amazonaws.com/role-arn" = aws_iam_role.vault.arn
        }
      }
    }

    # Enable Vault UI
    ui = {
      enabled = true
    }

    # Injector for Vault Agent sidecar injection
    injector = {
      enabled = true
      replicas = 2
    }
  })]
}
```

## Step 2: AWS KMS Key for Auto-Unseal

```hcl
# KMS key for Vault auto-unseal
resource "aws_kms_key" "vault_unseal" {
  description             = "Vault auto-unseal key"
  deletion_window_in_days = 30
  enable_key_rotation     = true
}

# IAM role for Vault to use KMS
resource "aws_iam_role" "vault" {
  name = "vault-server"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.eks.arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "${local.oidc_provider}:sub" = "system:serviceaccount:vault:vault"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "vault_kms" {
  role = aws_iam_role.vault.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["kms:Encrypt", "kms:Decrypt", "kms:DescribeKey"]
      Resource = [aws_kms_key.vault_unseal.arn]
    }]
  })
}
```

## Step 3: Configure Kubernetes Auth Method

```hcl
# Bootstrap Vault with Kubernetes auth (run after initial unseal)
resource "vault_auth_backend" "kubernetes" {
  type = "kubernetes"
}

resource "vault_kubernetes_auth_backend_config" "config" {
  backend            = vault_auth_backend.kubernetes.path
  kubernetes_host    = "https://kubernetes.default.svc"
  kubernetes_ca_cert = data.kubernetes_secret.vault_sa_token.data["ca.crt"]
}

# Create a policy for applications
resource "vault_policy" "app_policy" {
  name = "app-policy"

  policy = <<-POLICY
    path "secret/data/app/*" {
      capabilities = ["read"]
    }
    path "database/creds/app-role" {
      capabilities = ["read"]
    }
  POLICY
}

# Bind K8s service accounts to Vault role
resource "vault_kubernetes_auth_backend_role" "app" {
  backend                          = vault_auth_backend.kubernetes.path
  role_name                        = "app-role"
  bound_service_account_names      = ["app-sa"]
  bound_service_account_namespaces = ["default", "production"]
  token_policies                   = [vault_policy.app_policy.name]
  token_ttl                        = 3600
}
```

## Step 4: Vault Agent Sidecar Injection

```hcl
# Deployment using Vault Agent sidecar injection
resource "kubernetes_deployment" "app" {
  metadata {
    name      = "my-app"
    namespace = "default"
  }

  spec {
    template {
      metadata {
        # Injector annotations must live on the Pod template, since the
        # MutatingAdmissionWebhook intercepts Pod CREATE/UPDATE events.
        annotations = {
          "vault.hashicorp.com/agent-inject"                     = "true"
          "vault.hashicorp.com/role"                             = "app-role"
          "vault.hashicorp.com/agent-inject-secret-config.env"   = "secret/data/app/config"
          "vault.hashicorp.com/agent-inject-template-config.env" = <<-TMPL
            {{- with secret "secret/data/app/config" -}}
            export DB_PASSWORD="{{ .Data.data.db_password }}"
            export API_KEY="{{ .Data.data.api_key }}"
            {{- end -}}
          TMPL
        }
      }
      spec {
        service_account_name = "app-sa"
        container {
          name  = "app"
          image = "my-app:latest"
        }
      }
    }
  }
}
```

## Summary

HashiCorp Vault deployed with OpenTofu on Kubernetes provides enterprise-grade secrets management with auto-unseal via AWS KMS eliminating manual unseal operations. The Vault Agent sidecar injector delivers secrets to pods as files without code changes, while the Kubernetes auth method ties secret access to pod identity through service accounts.
