# How to Set Up AKS with Azure Key Vault Provider Using OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, AKS, Key Vault, Secrets Store CSI Driver, Workload Identity, Infrastructure as Code

Description: Learn how to configure AKS with the Azure Key Vault Provider for Secrets Store CSI Driver using OpenTofu to mount Key Vault secrets as Kubernetes volumes without storing secrets in etcd.

## Introduction

The Azure Key Vault Provider for Secrets Store CSI Driver allows Kubernetes pods to mount Azure Key Vault secrets, keys, and certificates as Kubernetes volumes. Secrets are fetched directly from Key Vault at pod startup and, when you mount them only as files, aren't stored as Kubernetes Secrets in etcd-providing a more secure alternative to Kubernetes Secrets. Combined with Workload Identity, pods authenticate to Key Vault using managed identities without any credentials in the pod spec.

## Prerequisites

- OpenTofu v1.6+
- Azure credentials with AKS and Key Vault permissions
- A Key Vault with secrets to mount

## Step 1: Enable Key Vault CSI Driver on AKS

```hcl
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

provider "azurerm" {
  features {}
}

variable "project_name" {
  type = string
}

variable "location" {
  type = string
}

variable "resource_group_name" {
  type = string
}

variable "tenant_id" {
  type = string
}

variable "subnet_id" {
  type = string
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "api_key" {
  type      = string
  sensitive = true
}

resource "azurerm_key_vault" "app" {
  name                        = "${var.project_name}-kv"
  location                    = var.location
  resource_group_name         = var.resource_group_name
  tenant_id                   = var.tenant_id
  sku_name                    = "standard"
  enable_rbac_authorization   = true
  purge_protection_enabled    = true
  soft_delete_retention_days  = 90
}

# Secrets in Key Vault

resource "azurerm_key_vault_secret" "db_password" {
  name         = "database-password"
  value        = var.db_password
  key_vault_id = azurerm_key_vault.app.id
}

resource "azurerm_key_vault_secret" "api_key" {
  name         = "external-api-key"
  value        = var.api_key
  key_vault_id = azurerm_key_vault.app.id
}

resource "azurerm_kubernetes_cluster" "kv_csi" {
  name                = "${var.project_name}-aks"
  location            = var.location
  resource_group_name = var.resource_group_name
  dns_prefix          = var.project_name

  default_node_pool {
    name                = "system"
    vm_size             = "Standard_D4s_v3"
    node_count          = 3
    min_count           = 3
    max_count           = 10
    enable_auto_scaling = true
    vnet_subnet_id      = var.subnet_id
  }

  identity {
    type = "SystemAssigned"
  }

  # Enable Key Vault CSI Driver
  key_vault_secrets_provider {
    secret_rotation_enabled  = true   # Auto-rotate secrets when they change in KV
    secret_rotation_interval = "2m"   # Check for rotation every 2 minutes
  }

  # Enable Workload Identity for pod authentication
  oidc_issuer_enabled       = true
  workload_identity_enabled = true

  network_profile {
    network_plugin    = "azure"
    load_balancer_sku = "standard"
  }

  tags = {
    Name = "${var.project_name}-aks-kv-csi"
  }
}
```

## Step 2: Workload Identity for Key Vault Access

```hcl
# Managed identity for the application pod
resource "azurerm_user_assigned_identity" "app" {
  name                = "${var.project_name}-app-identity"
  location            = var.location
  resource_group_name = var.resource_group_name
}

# Grant identity access to Key Vault secrets
resource "azurerm_role_assignment" "app_kv_secrets" {
  scope                = azurerm_key_vault.app.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}

# Federated credential: links Kubernetes ServiceAccount to managed identity
resource "azurerm_federated_identity_credential" "app" {
  name                = "${var.project_name}-app-federated"
  resource_group_name = var.resource_group_name
  parent_id           = azurerm_user_assigned_identity.app.id

  issuer  = azurerm_kubernetes_cluster.kv_csi.oidc_issuer_url
  subject = "system:serviceaccount:production:app-service-account"

  audience = ["api://AzureADTokenExchange"]
}
```

## Step 3: Kubernetes Resources

```yaml
# kubernetes/00-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
---
# kubernetes/serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-service-account
  namespace: production
  annotations:
    azure.workload.identity/client-id: "<managed-identity-client-id>"
---
# kubernetes/secret-provider-class.yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: app-secrets
  namespace: production
spec:
  provider: azure
  secretObjects:
    # Sync to Kubernetes Secret (optional - for env vars)
    - data:
        - key: database-password
          objectName: database-password
        - key: api-key
          objectName: external-api-key
      secretName: app-k8s-secret
      type: Opaque
  parameters:
    usePodIdentity: "false"
    clientID: "<managed-identity-client-id>"
    keyvaultName: "<key-vault-name>"
    objects: |
      array:
        - |
          objectName: database-password
          objectType: secret
        - |
          objectName: external-api-key
          objectType: secret
    tenantId: "<tenant-id>"
---
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
        azure.workload.identity/use: "true"  # Enable Workload Identity
    spec:
      serviceAccountName: app-service-account
      containers:
        - name: api
          image: myapp:latest
          # Use synced Kubernetes Secret as env vars
          env:
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: app-k8s-secret
                  key: database-password
          # Or mount secrets as files
          volumeMounts:
            - name: secrets
              mountPath: /mnt/secrets
              readOnly: true
      volumes:
        - name: secrets
          csi:
            driver: secrets-store.csi.k8s.io
            readOnly: true
            volumeAttributes:
              secretProviderClass: app-secrets
```

## Step 4: Deploy

```bash
tofu init
tofu plan
tofu apply

# Get credentials
az aks get-credentials \
  --resource-group <rg> \
  --name <cluster-name>

# Apply Kubernetes resources
kubectl apply -f kubernetes/00-namespace.yaml
kubectl apply -f kubernetes/

# Check SecretProviderClassPodStatus
kubectl get secretproviderclasspodstatus -n production

# Check mounted secrets
kubectl exec -n production <pod-name> -- ls /mnt/secrets
kubectl exec -n production <pod-name> -- cat /mnt/secrets/database-password
```

## Conclusion

Enable `secret_rotation_enabled = true` to automatically update mounted secrets when they rotate in Key Vault-pods see the updated files without restart for file mounts, and synced Kubernetes Secret volumes update automatically as well. Pods that consume synced Kubernetes Secrets through environment variables still need a restart to pick up changes. The CSI Driver must mount the volume in at least one pod for the synced Kubernetes Secret to exist and rotate. Grant the pod's managed identity `Key Vault Secrets User` (read-only) rather than `Key Vault Secrets Officer` to follow the principle of least privilege. Never use the node managed identity for Key Vault access-use individual pod identities via Workload Identity to limit blast radius.
