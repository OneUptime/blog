# How to Import Existing Kubernetes Resources into Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Import, Infrastructure as Code, Migration

Description: Learn how to import existing Kubernetes resources into Terraform state including namespaces, deployments, services, configmaps, secrets, and RBAC resources.

---

Kubernetes clusters often have resources created through kubectl, Helm, or other tools that you want to manage with Terraform. The Kubernetes provider for Terraform supports importing these resources so you can bring your cluster configuration under infrastructure-as-code management. Kubernetes resources are identified by their API path for import operations.

In this guide, we will walk through importing common Kubernetes resources into Terraform including namespaces, deployments, services, configmaps, secrets, and RBAC resources.

## Provider Setup

```hcl
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.27"
    }
  }
}

provider "kubernetes" {
  config_path = "~/.kube/config"
  context     = var.k8s_context
}

variable "k8s_context" {
  type    = string
  default = "production"
}
```

## Importing Namespaces

```hcl
resource "kubernetes_namespace" "app" {
  metadata {
    name = "application"
    labels = {
      environment = "production"
      managed-by  = "terraform"
    }
  }
}

# Namespace import uses just the name
import {
  to = kubernetes_namespace.app
  id = "application"
}
```

## Importing Deployments

```hcl
resource "kubernetes_deployment" "api" {
  metadata {
    name      = "api-deployment"
    namespace = "application"
    labels = {
      app = "api"
    }
  }

  spec {
    replicas = 3

    selector {
      match_labels = {
        app = "api"
      }
    }

    template {
      metadata {
        labels = {
          app = "api"
        }
      }

      spec {
        container {
          name  = "api"
          image = "myapp/api:latest"

          port {
            container_port = 8080
          }

          resources {
            limits = {
              cpu    = "500m"
              memory = "512Mi"
            }
            requests = {
              cpu    = "250m"
              memory = "256Mi"
            }
          }
        }
      }
    }
  }
}

# Deployment import: {namespace}/{name}
import {
  to = kubernetes_deployment.api
  id = "application/api-deployment"
}
```

## Importing Services

```hcl
resource "kubernetes_service" "api" {
  metadata {
    name      = "api-service"
    namespace = "application"
  }

  spec {
    selector = {
      app = "api"
    }

    port {
      port        = 80
      target_port = 8080
    }

    type = "ClusterIP"
  }
}

import {
  to = kubernetes_service.api
  id = "application/api-service"
}
```

## Importing ConfigMaps

```hcl
resource "kubernetes_config_map" "app_config" {
  metadata {
    name      = "app-config"
    namespace = "application"
  }

  data = {
    "database.host" = "db.internal.svc.cluster.local"
    "database.port" = "5432"
    "log.level"     = "info"
  }
}

import {
  to = kubernetes_config_map.app_config
  id = "application/app-config"
}
```

## Importing Secrets

```hcl
resource "kubernetes_secret" "db_credentials" {
  metadata {
    name      = "db-credentials"
    namespace = "application"
  }

  data = {
    username = base64encode("admin")
    password = base64encode("secret")
  }

  type = "Opaque"
}

import {
  to = kubernetes_secret.db_credentials
  id = "application/db-credentials"
}
```

## Importing Service Accounts

```hcl
resource "kubernetes_service_account" "app" {
  metadata {
    name      = "app-service-account"
    namespace = "application"
  }
}

import {
  to = kubernetes_service_account.app
  id = "application/app-service-account"
}
```

## Importing RBAC Resources

```hcl
resource "kubernetes_cluster_role" "reader" {
  metadata {
    name = "cluster-reader"
  }

  rule {
    api_groups = [""]
    resources  = ["pods", "services", "configmaps"]
    verbs      = ["get", "list", "watch"]
  }
}

resource "kubernetes_cluster_role_binding" "reader" {
  metadata {
    name = "cluster-reader-binding"
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "ClusterRole"
    name      = kubernetes_cluster_role.reader.metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = "app-service-account"
    namespace = "application"
  }
}

import {
  to = kubernetes_cluster_role.reader
  id = "cluster-reader"
}

import {
  to = kubernetes_cluster_role_binding.reader
  id = "cluster-reader-binding"
}
```

## Importing Ingress Resources

```hcl
resource "kubernetes_ingress_v1" "app" {
  metadata {
    name      = "app-ingress"
    namespace = "application"
  }

  spec {
    rule {
      host = "app.example.com"

      http {
        path {
          path      = "/"
          path_type = "Prefix"

          backend {
            service {
              name = "api-service"
              port {
                number = 80
              }
            }
          }
        }
      }
    }
  }
}

import {
  to = kubernetes_ingress_v1.app
  id = "application/app-ingress"
}
```

## Finding Kubernetes Resource Names

```bash
# List resources in a namespace
kubectl get all -n application

# Get specific resource details
kubectl get deployment api-deployment -n application -o yaml

# List configmaps
kubectl get configmaps -n application

# List secrets
kubectl get secrets -n application

# List RBAC resources
kubectl get clusterroles
kubectl get clusterrolebindings
```

## Conclusion

Importing Kubernetes resources into Terraform follows a consistent `{namespace}/{name}` pattern for namespaced resources and just `{name}` for cluster-scoped resources. This makes it straightforward to bring existing clusters under Terraform management. For cloud-specific imports, see our guides on [AWS imports](https://oneuptime.com/blog/post/2026-02-23-how-to-import-existing-aws-resources-into-terraform/view) and [the import block](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-import-block-in-terraform-1-5-plus/view).
