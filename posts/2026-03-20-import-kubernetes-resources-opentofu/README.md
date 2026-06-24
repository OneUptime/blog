# How to Import Kubernetes Resources into OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Kubernetes, Import, Namespace, ConfigMap

Description: Learn how to import existing Kubernetes resources including namespaces, ConfigMaps, Secrets, and Deployments into OpenTofu state using the Kubernetes provider.

## Introduction

Kubernetes resources created via kubectl or Helm can be imported into OpenTofu using the Kubernetes provider. This enables management of cluster-level resources (namespaces, RBAC, storage classes) alongside application resources as infrastructure-as-code.

## Kubernetes Provider Configuration

```hcl
provider "kubernetes" {
  config_path    = "~/.kube/config"
  config_context = "my-cluster-context"
}
```

## Importing Namespaces

```hcl
resource "kubernetes_namespace" "app" {
  metadata {
    name = "my-app"
    labels = {
      "app.kubernetes.io/managed-by" = "opentofu"
      "environment"                  = "prod"
    }
  }
}

# Kubernetes namespace import ID: NAME

import {
  to = kubernetes_namespace.app
  id = "my-app"
}
```

## Importing ConfigMaps

```hcl
resource "kubernetes_config_map" "app_config" {
  metadata {
    name      = "app-config"
    namespace = "my-app"
  }

  data = {
    LOG_LEVEL    = "INFO"
    CACHE_TTL    = "300"
    MAX_CONNECTIONS = "100"
  }
}

# ConfigMap import ID: NAMESPACE/NAME
import {
  to = kubernetes_config_map.app_config
  id = "my-app/app-config"
}
```

## Importing Deployments

```hcl
resource "kubernetes_deployment" "app" {
  metadata {
    name      = "my-app"
    namespace = "my-app"
    labels = {
      app = "my-app"
    }
  }

  spec {
    replicas = 3
    selector {
      match_labels = { app = "my-app" }
    }

    template {
      metadata {
        labels = { app = "my-app" }
      }
      spec {
        container {
          name  = "app"
          image = "my-app:v1.2.0"

          port {
            container_port = 8080
          }

          resources {
            requests = {
              cpu    = "100m"
              memory = "128Mi"
            }
            limits = {
              cpu    = "500m"
              memory = "512Mi"
            }
          }
        }
      }
    }
  }

  lifecycle {
    # Let Helm or the deployment pipeline manage the image tag
    ignore_changes = [spec[0].template[0].spec[0].container[0].image]
  }
}

# Deployment import ID: NAMESPACE/NAME
import {
  to = kubernetes_deployment.app
  id = "my-app/my-app"
}
```

## Importing Services

```hcl
resource "kubernetes_service" "app" {
  metadata {
    name      = "my-app"
    namespace = "my-app"
  }

  spec {
    selector = { app = "my-app" }
    type     = "ClusterIP"

    port {
      port        = 80
      target_port = 8080
      protocol    = "TCP"
    }
  }
}

import {
  to = kubernetes_service.app
  id = "my-app/my-app"
}
```

## Importing RBAC Resources

```hcl
resource "kubernetes_cluster_role_binding" "app_admin" {
  metadata {
    name = "app-admin-binding"
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "ClusterRole"
    name      = "cluster-admin"
  }

  subject {
    kind      = "ServiceAccount"
    name      = "app-admin"
    namespace = "my-app"
  }
}

# ClusterRoleBinding import ID: NAME (no namespace)
import {
  to = kubernetes_cluster_role_binding.app_admin
  id = "app-admin-binding"
}
```

## Conclusion

Kubernetes resource import IDs use `NAMESPACE/NAME` for namespaced resources and just `NAME` for cluster-scoped resources (ClusterRoles, ClusterRoleBindings, StorageClasses). Use `ignore_changes` on container images to allow deployment pipelines to manage rollouts while OpenTofu manages configuration. Import cluster-level resources first (namespaces, RBAC), then namespace-level resources.
