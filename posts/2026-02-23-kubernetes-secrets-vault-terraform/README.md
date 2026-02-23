# How to Handle Kubernetes Secrets from Vault with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, HashiCorp Vault, Secrets Management, Security, DevOps

Description: Learn how to integrate HashiCorp Vault with Kubernetes through Terraform, including the Vault CSI driver, External Secrets Operator, and direct secret injection patterns.

---

Storing secrets in Kubernetes Secrets objects is fine for development, but production workloads need something better. The base64 encoding in Kubernetes Secrets is not encryption, RBAC controls are coarse, and there is no audit trail for secret access. HashiCorp Vault solves these problems, and Terraform can wire everything together - deploying Vault, configuring authentication, and setting up secret synchronization to Kubernetes.

This guide covers the main patterns for getting Vault secrets into Kubernetes pods using Terraform.

## The Three Approaches

There are three common ways to bridge Vault and Kubernetes:

1. **Vault Agent Sidecar Injector** - A mutating webhook injects a Vault agent sidecar into pods
2. **Vault CSI Provider** - Mounts secrets as files using the Secrets Store CSI driver
3. **External Secrets Operator** - Syncs Vault secrets to Kubernetes Secret objects

Each has tradeoffs. Let us set up all three with Terraform.

## Deploying Vault on Kubernetes

First, deploy Vault itself using the official Helm chart.

```hcl
# Create the vault namespace
resource "kubernetes_namespace" "vault" {
  metadata {
    name = "vault"
  }
}

# Deploy Vault using Helm
resource "helm_release" "vault" {
  name       = "vault"
  repository = "https://helm.releases.hashicorp.com"
  chart      = "vault"
  namespace  = kubernetes_namespace.vault.metadata[0].name
  version    = "0.27.0"

  values = [
    yamlencode({
      server = {
        ha = {
          enabled  = true
          replicas = 3
          raft = {
            enabled   = true
            setNodeId = true
            config = <<-EOT
              ui = true
              listener "tcp" {
                tls_disable = 1
                address = "[::]:8200"
                cluster_address = "[::]:8201"
              }
              storage "raft" {
                path = "/vault/data"
              }
              service_registration "kubernetes" {}
            EOT
          }
        }
        dataStorage = {
          enabled      = true
          size         = "10Gi"
          storageClass = "gp3"
        }
      }
      injector = {
        enabled = true
      }
    })
  ]

  wait    = true
  timeout = 600
}
```

## Configuring Vault Kubernetes Auth

The Kubernetes auth method lets pods authenticate with Vault using their service account tokens.

```hcl
# Configure the Vault provider
provider "vault" {
  address = var.vault_address
  token   = var.vault_token
}

# Enable Kubernetes auth method
resource "vault_auth_backend" "kubernetes" {
  type = "kubernetes"
}

# Configure the Kubernetes auth method
resource "vault_kubernetes_auth_backend_config" "config" {
  backend            = vault_auth_backend.kubernetes.path
  kubernetes_host    = var.kubernetes_host
  kubernetes_ca_cert = var.kubernetes_ca_cert
}

# Create a policy that grants access to app secrets
resource "vault_policy" "app" {
  name = "app-policy"

  policy = <<EOT
# Allow reading secrets for the application
path "secret/data/production/app/*" {
  capabilities = ["read", "list"]
}

# Allow reading database credentials
path "database/creds/app-role" {
  capabilities = ["read"]
}
EOT
}

# Create a Kubernetes auth role that maps service accounts to policies
resource "vault_kubernetes_auth_backend_role" "app" {
  backend                          = vault_auth_backend.kubernetes.path
  role_name                        = "app"
  bound_service_account_names      = ["app-sa"]
  bound_service_account_namespaces = ["production"]
  token_ttl                        = 3600
  token_policies                   = [vault_policy.app.name]
}
```

## Pattern 1: Vault Agent Sidecar Injector

The Vault Agent Injector is a mutating admission webhook that adds a Vault sidecar to pods. Pods request secrets through annotations.

```hcl
# The injector is included in the Vault Helm chart
# Make sure injector.enabled = true (default)

# Create the application service account
resource "kubernetes_service_account" "app" {
  metadata {
    name      = "app-sa"
    namespace = "production"
  }
}

# Deploy the application with Vault annotations
resource "kubernetes_deployment" "app" {
  metadata {
    name      = "my-app"
    namespace = "production"
  }

  spec {
    replicas = 3

    selector {
      match_labels = {
        app = "my-app"
      }
    }

    template {
      metadata {
        labels = {
          app = "my-app"
        }

        # Vault Agent Injector annotations
        annotations = {
          # Enable Vault agent injection
          "vault.hashicorp.com/agent-inject"             = "true"
          # Vault role to authenticate with
          "vault.hashicorp.com/role"                     = "app"
          # Inject database credentials as a file
          "vault.hashicorp.com/agent-inject-secret-db"   = "secret/data/production/app/database"
          # Custom template for the injected secret
          "vault.hashicorp.com/agent-inject-template-db" = <<-EOT
            {{- with secret "secret/data/production/app/database" -}}
            DB_HOST={{ .Data.data.host }}
            DB_PORT={{ .Data.data.port }}
            DB_USER={{ .Data.data.username }}
            DB_PASS={{ .Data.data.password }}
            {{- end }}
          EOT
          # Inject API keys
          "vault.hashicorp.com/agent-inject-secret-api"  = "secret/data/production/app/api-keys"
        }
      }

      spec {
        service_account_name = kubernetes_service_account.app.metadata[0].name

        container {
          name  = "app"
          image = "my-app:1.0.0"

          # Read secrets from the injected file
          command = ["/bin/sh", "-c"]
          args    = ["source /vault/secrets/db && exec ./app"]
        }
      }
    }
  }
}
```

## Pattern 2: Vault CSI Provider

The Secrets Store CSI driver mounts secrets as volumes. The Vault CSI provider plugs into this driver.

```hcl
# Install the Secrets Store CSI Driver
resource "helm_release" "csi_secrets_store" {
  name       = "csi-secrets-store"
  repository = "https://kubernetes-sigs.github.io/secrets-store-csi-driver/charts"
  chart      = "secrets-store-csi-driver"
  namespace  = "kube-system"
  version    = "1.4.0"

  set {
    name  = "syncSecret.enabled"
    value = "true"
  }

  set {
    name  = "enableSecretRotation"
    value = "true"
  }
}

# Install the Vault CSI Provider
resource "helm_release" "vault_csi" {
  name       = "vault-csi-provider"
  repository = "https://helm.releases.hashicorp.com"
  chart      = "vault"
  namespace  = "vault"
  version    = "0.27.0"

  values = [
    yamlencode({
      # Only install the CSI provider, not the full Vault server
      server = {
        enabled = false
      }
      injector = {
        enabled = false
      }
      csi = {
        enabled = true
      }
    })
  ]

  depends_on = [helm_release.csi_secrets_store]
}

# Create a SecretProviderClass for the application
resource "kubectl_manifest" "vault_secret_provider" {
  yaml_body = <<YAML
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: vault-db-secrets
  namespace: production
spec:
  provider: vault
  parameters:
    vaultAddress: "http://vault.vault.svc.cluster.local:8200"
    roleName: "app"
    objects: |
      - objectName: "db-host"
        secretPath: "secret/data/production/app/database"
        secretKey: "host"
      - objectName: "db-password"
        secretPath: "secret/data/production/app/database"
        secretKey: "password"
  # Optionally sync to a Kubernetes Secret
  secretObjects:
    - secretName: app-db-secret
      type: Opaque
      data:
        - objectName: db-host
          key: DB_HOST
        - objectName: db-password
          key: DB_PASSWORD
YAML

  depends_on = [helm_release.vault_csi]
}
```

## Pattern 3: External Secrets Operator

The External Secrets Operator (ESO) syncs secrets from Vault to Kubernetes Secrets.

```hcl
# Install External Secrets Operator
resource "helm_release" "external_secrets" {
  name             = "external-secrets"
  repository       = "https://charts.external-secrets.io"
  chart            = "external-secrets"
  namespace        = "external-secrets"
  create_namespace = true
  version          = "0.9.11"

  wait = true
}

# Create a SecretStore pointing to Vault
resource "kubectl_manifest" "vault_secret_store" {
  yaml_body = <<YAML
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: vault-backend
spec:
  provider:
    vault:
      server: "http://vault.vault.svc.cluster.local:8200"
      path: "secret"
      version: "v2"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "app"
          serviceAccountRef:
            name: "external-secrets-sa"
            namespace: "external-secrets"
YAML

  depends_on = [helm_release.external_secrets]
}

# Create an ExternalSecret that syncs from Vault
resource "kubectl_manifest" "app_external_secret" {
  yaml_body = <<YAML
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-secrets
  namespace: production
spec:
  refreshInterval: "5m"
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: app-secrets
    creationPolicy: Owner
  data:
    - secretKey: DB_HOST
      remoteRef:
        key: production/app/database
        property: host
    - secretKey: DB_PASSWORD
      remoteRef:
        key: production/app/database
        property: password
    - secretKey: API_KEY
      remoteRef:
        key: production/app/api-keys
        property: main-key
YAML

  depends_on = [kubectl_manifest.vault_secret_store]
}
```

## Writing Secrets to Vault with Terraform

You can also use Terraform to populate Vault with the secrets your applications need.

```hcl
# Write application secrets to Vault
resource "vault_kv_secret_v2" "app_database" {
  mount = "secret"
  name  = "production/app/database"

  data_json = jsonencode({
    host     = aws_db_instance.main.endpoint
    port     = aws_db_instance.main.port
    username = aws_db_instance.main.username
    password = random_password.db.result
    name     = "app_production"
  })
}

resource "vault_kv_secret_v2" "app_api_keys" {
  mount = "secret"
  name  = "production/app/api-keys"

  data_json = jsonencode({
    main-key  = var.api_key
    stripe    = var.stripe_key
  })
}
```

## Choosing the Right Pattern

- **Vault Agent Injector**: Best for teams already using Vault heavily. No Kubernetes Secrets created, so secrets stay in memory only. The downside is every pod gets a sidecar, which uses extra resources.

- **CSI Provider**: Good balance of security and Kubernetes-native workflow. Secrets are mounted as files. Can optionally sync to Kubernetes Secrets for environment variable usage.

- **External Secrets Operator**: Most Kubernetes-native. Creates real Kubernetes Secret objects that work with any pod spec. Easiest adoption path but means secrets exist as Kubernetes Secrets (encrypted at rest if you have configured etcd encryption).

For more on managing secrets in Kubernetes with Terraform, see our guide on [deploying cert-manager with Terraform](https://oneuptime.com/blog/post/2026-02-23-cert-manager-terraform/view).
