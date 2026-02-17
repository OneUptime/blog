# How to Implement GitOps for Azure AKS with ArgoCD and Terraform-Provisioned Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, AKS, ArgoCD, GitOps, Terraform, Kubernetes, Infrastructure as Code

Description: Implement a GitOps workflow for Azure AKS using ArgoCD on Terraform-provisioned clusters for declarative application delivery.

---

GitOps is the practice of using Git as the single source of truth for both infrastructure and application configuration. For Kubernetes workloads on Azure AKS, this means your cluster infrastructure lives in Terraform, and your application deployments live in Git repositories that ArgoCD watches and syncs automatically. When someone pushes a change to the application repo, ArgoCD detects the diff and reconciles the cluster state to match.

This post covers the full pipeline: provisioning an AKS cluster with Terraform, installing ArgoCD on it, and configuring the GitOps workflow for application delivery.

## Provisioning the AKS Cluster with Terraform

Start with a production-ready AKS cluster. This is the foundation that ArgoCD runs on.

```hcl
# aks-cluster/main.tf
# Provisions an AKS cluster with features needed for GitOps

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "stterraformstate001"
    container_name       = "tfstate"
    key                  = "aks-gitops.tfstate"
  }
}

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "aks" {
  name     = "rg-aks-gitops"
  location = "eastus"
}

# AKS cluster with RBAC and workload identity enabled
resource "azurerm_kubernetes_cluster" "main" {
  name                = "aks-gitops-production"
  location            = azurerm_resource_group.aks.location
  resource_group_name = azurerm_resource_group.aks.name
  dns_prefix          = "aks-gitops"
  kubernetes_version  = "1.28"

  # System node pool for cluster services (including ArgoCD)
  default_node_pool {
    name                = "system"
    node_count          = 3
    vm_size             = "Standard_D4s_v5"
    os_disk_size_gb     = 128
    os_disk_type        = "Managed"
    vnet_subnet_id      = azurerm_subnet.aks.id
    max_pods            = 50
    zones               = [1, 2, 3]

    node_labels = {
      "role" = "system"
    }
  }

  # Azure AD RBAC for cluster access
  azure_active_directory_role_based_access_control {
    managed                = true
    azure_rbac_enabled     = true
    admin_group_object_ids = [var.admin_group_id]
  }

  identity {
    type = "SystemAssigned"
  }

  # Enable workload identity for pod-level Azure access
  oidc_issuer_enabled       = true
  workload_identity_enabled = true

  # Network configuration
  network_profile {
    network_plugin    = "azure"
    network_policy    = "calico"
    load_balancer_sku = "standard"
    service_cidr      = "172.16.0.0/16"
    dns_service_ip    = "172.16.0.10"
  }

  tags = {
    environment = "production"
    managed_by  = "terraform"
    gitops      = "argocd"
  }
}

# Application node pool for workloads
resource "azurerm_kubernetes_cluster_node_pool" "apps" {
  name                  = "apps"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
  vm_size               = "Standard_D8s_v5"
  node_count            = 2
  max_count             = 10
  min_count             = 2
  enable_auto_scaling   = true
  zones                 = [1, 2, 3]
  vnet_subnet_id        = azurerm_subnet.aks.id

  node_labels = {
    "role" = "application"
  }

  node_taints = []
}

# Output kubeconfig for ArgoCD installation
output "kube_config" {
  value     = azurerm_kubernetes_cluster.main.kube_config_raw
  sensitive = true
}

output "cluster_name" {
  value = azurerm_kubernetes_cluster.main.name
}
```

## Installing ArgoCD with Terraform

Once the cluster is provisioned, install ArgoCD using the Helm provider. This keeps the ArgoCD installation in Terraform as well.

```hcl
# argocd/main.tf
# Installs ArgoCD on the AKS cluster using Helm

terraform {
  required_providers {
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.24"
    }
  }
}

# Configure providers using the AKS cluster output
provider "helm" {
  kubernetes {
    host                   = data.terraform_remote_state.aks.outputs.kube_config[0].host
    client_certificate     = base64decode(data.terraform_remote_state.aks.outputs.kube_config[0].client_certificate)
    client_key             = base64decode(data.terraform_remote_state.aks.outputs.kube_config[0].client_key)
    cluster_ca_certificate = base64decode(data.terraform_remote_state.aks.outputs.kube_config[0].cluster_ca_certificate)
  }
}

provider "kubernetes" {
  host                   = data.terraform_remote_state.aks.outputs.kube_config[0].host
  client_certificate     = base64decode(data.terraform_remote_state.aks.outputs.kube_config[0].client_certificate)
  client_key             = base64decode(data.terraform_remote_state.aks.outputs.kube_config[0].client_key)
  cluster_ca_certificate = base64decode(data.terraform_remote_state.aks.outputs.kube_config[0].cluster_ca_certificate)
}

# Reference the AKS cluster state
data "terraform_remote_state" "aks" {
  backend = "azurerm"
  config = {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "stterraformstate001"
    container_name       = "tfstate"
    key                  = "aks-gitops.tfstate"
  }
}

# Create namespace for ArgoCD
resource "kubernetes_namespace" "argocd" {
  metadata {
    name = "argocd"
    labels = {
      "app.kubernetes.io/managed-by" = "terraform"
    }
  }
}

# Install ArgoCD via Helm
resource "helm_release" "argocd" {
  name       = "argocd"
  repository = "https://argoproj.github.io/argo-helm"
  chart      = "argo-cd"
  version    = "5.51.0"
  namespace  = kubernetes_namespace.argocd.metadata[0].name

  # High availability mode for production
  set {
    name  = "controller.replicas"
    value = "2"
  }

  set {
    name  = "server.replicas"
    value = "2"
  }

  set {
    name  = "repoServer.replicas"
    value = "2"
  }

  # Schedule ArgoCD on system nodes
  set {
    name  = "controller.nodeSelector.role"
    value = "system"
  }

  set {
    name  = "server.nodeSelector.role"
    value = "system"
  }

  # Enable server-side apply for better resource management
  set {
    name  = "controller.args.appResyncPeriod"
    value = "180"
  }

  # Configure the ArgoCD server
  set {
    name  = "server.extraArgs[0]"
    value = "--insecure"  # TLS terminated at ingress
  }

  values = [
    yamlencode({
      server = {
        ingress = {
          enabled = true
          annotations = {
            "kubernetes.io/ingress.class" = "nginx"
          }
          hosts = ["argocd.example.com"]
        }
      }
    })
  ]
}
```

## Configuring ArgoCD Applications

With ArgoCD installed, configure it to watch your application repositories. The "App of Apps" pattern is a common approach where one ArgoCD application manages other ArgoCD applications.

```hcl
# argocd-apps/main.tf
# Defines ArgoCD Application resources that point to Git repos

# The root application that manages all other applications
resource "kubernetes_manifest" "app_of_apps" {
  manifest = {
    apiVersion = "argoproj.io/v1alpha1"
    kind       = "Application"
    metadata = {
      name      = "app-of-apps"
      namespace = "argocd"
    }
    spec = {
      project = "default"
      source = {
        repoURL        = "https://github.com/your-org/gitops-config.git"
        targetRevision = "main"
        path           = "apps"
      }
      destination = {
        server    = "https://kubernetes.default.svc"
        namespace = "argocd"
      }
      syncPolicy = {
        automated = {
          prune    = true
          selfHeal = true
        }
        syncOptions = [
          "CreateNamespace=true"
        ]
      }
    }
  }
}

# Individual application definition
resource "kubernetes_manifest" "orders_app" {
  manifest = {
    apiVersion = "argoproj.io/v1alpha1"
    kind       = "Application"
    metadata = {
      name      = "orders-service"
      namespace = "argocd"
    }
    spec = {
      project = "default"
      source = {
        repoURL        = "https://github.com/your-org/orders-service.git"
        targetRevision = "main"
        path           = "k8s/overlays/production"
      }
      destination = {
        server    = "https://kubernetes.default.svc"
        namespace = "orders"
      }
      syncPolicy = {
        automated = {
          prune    = true
          selfHeal = true
        }
        retry = {
          limit = 5
          backoff = {
            duration    = "5s"
            factor      = 2
            maxDuration = "3m"
          }
        }
      }
    }
  }
}
```

## GitOps Repository Structure

Your GitOps configuration repository should have a clear structure. Here is what works well.

```
gitops-config/
  apps/                          # ArgoCD Application definitions
    orders-service.yaml
    payments-service.yaml
    frontend.yaml
  base/                          # Shared base configurations
    namespace.yaml
    network-policies.yaml
  environments/
    production/
      kustomization.yaml
      patches/
    staging/
      kustomization.yaml
      patches/
```

A sample application manifest in the gitops-config repo looks like this.

```yaml
# apps/orders-service.yaml
# ArgoCD Application for the orders microservice
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: orders-service
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "2"
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/orders-service.git
    targetRevision: main
    path: k8s/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: orders
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - PrunePropagationPolicy=foreground
```

## The GitOps Workflow

With everything wired up, the deployment workflow becomes Git-centric.

A developer merges a change to the application repository. The CI pipeline builds a new container image, tags it, and pushes it to ACR. The pipeline then updates the image tag in the GitOps config repository (either through a commit or a PR). ArgoCD detects the change in the GitOps repo and syncs the new configuration to the cluster. If something goes wrong, you revert the Git commit and ArgoCD rolls back automatically.

This separation between CI (building images) and CD (deploying to clusters) is one of the core principles of GitOps. The cluster state always matches what is in Git, and every deployment is traceable to a specific commit.

## Monitoring the GitOps Pipeline

ArgoCD provides built-in Prometheus metrics. Export them to your monitoring stack for visibility.

```yaml
# ArgoCD metrics service monitor
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: argocd-metrics
  namespace: argocd
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: argocd-server
  endpoints:
    - port: metrics
      interval: 30s
```

## Summary

The combination of Terraform for cluster provisioning and ArgoCD for application delivery gives you a complete GitOps pipeline on Azure AKS. Terraform handles the infrastructure layer - the cluster, node pools, networking, and ArgoCD installation. ArgoCD handles the application layer - watching Git repositories and keeping the cluster in sync. Changes flow through Git, are reviewed in pull requests, and are automatically applied to the cluster. This approach gives you an audit trail for every change, easy rollbacks, and the confidence that your cluster state matches what is declared in your repositories.
