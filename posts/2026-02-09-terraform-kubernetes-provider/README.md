# How to Set Up Terraform Kubernetes Provider for Managing Resources Inside Running Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Infrastructure-as-Code

Description: Learn how to configure and use the Terraform Kubernetes provider to manage resources inside existing Kubernetes clusters, enabling unified infrastructure management across cloud and cluster resources.

---

Terraform excels at provisioning cloud infrastructure like EKS clusters and VPCs. The Kubernetes provider extends this to resources inside clusters, letting you manage deployments, services, and config maps alongside the infrastructure they run on. This creates a unified workflow where one Terraform configuration provisions everything from cluster creation to application deployment.

This guide shows you how to configure the Kubernetes provider and use it effectively for managing in-cluster resources.

## Understanding the Kubernetes Provider

The Terraform Kubernetes provider interacts with the Kubernetes API server. It translates Terraform HCL into Kubernetes API calls, creating and managing resources through standard Kubernetes APIs. Unlike tools that generate YAML, the provider manages resources directly.

The provider supports most Kubernetes resources including deployments, services, ingresses, and custom resources. It tracks state like any Terraform resource, detecting drift and allowing updates.

## Configuring Basic Provider Authentication

Start with kubeconfig authentication:

```hcl
# provider.tf
terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
  }
}

provider "kubernetes" {
  config_path = "~/.kube/config"
  config_context = "my-cluster-context"
}
```

This uses your local kubeconfig file. For team environments, use more secure authentication methods.

## Integrating with EKS Cluster Creation

Combine AWS provider with Kubernetes provider:

```hcl
# main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
  }
}

provider "aws" {
  region = "us-west-2"
}

# Create EKS cluster
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name    = "my-cluster"
  cluster_version = "1.28"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  eks_managed_node_groups = {
    main = {
      desired_size = 3
      min_size     = 1
      max_size     = 5

      instance_types = ["t3.medium"]
    }
  }
}

# Configure Kubernetes provider to use the EKS cluster
provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)

  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args = [
      "eks",
      "get-token",
      "--cluster-name",
      module.eks.cluster_name
    ]
  }
}

# Now create Kubernetes resources
resource "kubernetes_namespace" "app" {
  metadata {
    name = "application"
    labels = {
      environment = "production"
    }
  }
}
```

The exec block dynamically retrieves authentication tokens from AWS, eliminating the need for static credentials.

## Creating Deployments and Services

Manage application workloads:

```hcl
# deployment.tf
resource "kubernetes_deployment" "app" {
  metadata {
    name      = "web-app"
    namespace = kubernetes_namespace.app.metadata[0].name
    labels = {
      app = "web"
    }
  }

  spec {
    replicas = 3

    selector {
      match_labels = {
        app = "web"
      }
    }

    template {
      metadata {
        labels = {
          app = "web"
        }
      }

      spec {
        container {
          name  = "web"
          image = "nginx:1.25"

          port {
            container_port = 80
            name           = "http"
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

          liveness_probe {
            http_get {
              path = "/health"
              port = 80
            }
            initial_delay_seconds = 10
            period_seconds        = 5
          }

          readiness_probe {
            http_get {
              path = "/ready"
              port = 80
            }
            initial_delay_seconds = 5
            period_seconds        = 10
          }

          env {
            name  = "ENVIRONMENT"
            value = "production"
          }

          env {
            name = "DATABASE_URL"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.db_credentials.metadata[0].name
                key  = "url"
              }
            }
          }
        }
      }
    }
  }
}

resource "kubernetes_service" "app" {
  metadata {
    name      = "web-app"
    namespace = kubernetes_namespace.app.metadata[0].name
    labels = {
      app = "web"
    }
  }

  spec {
    type = "LoadBalancer"

    selector = {
      app = "web"
    }

    port {
      port        = 80
      target_port = 80
      protocol    = "TCP"
    }
  }
}

output "service_endpoint" {
  value = kubernetes_service.app.status[0].load_balancer[0].ingress[0].hostname
}
```

Terraform manages the deployment lifecycle, updating resources when you change configuration.

## Managing ConfigMaps and Secrets

Store configuration securely:

```hcl
# config.tf
resource "kubernetes_config_map" "app_config" {
  metadata {
    name      = "app-config"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  data = {
    "app.properties" = <<-EOT
      server.port=8080
      log.level=INFO
      cache.ttl=3600
    EOT

    "database.properties" = <<-EOT
      max.connections=100
      timeout=30
    EOT
  }
}

resource "kubernetes_secret" "db_credentials" {
  metadata {
    name      = "db-credentials"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  type = "Opaque"

  data = {
    username = base64encode("dbuser")
    password = base64encode(var.db_password)
    url      = base64encode("postgres://db:5432/app")
  }
}

# Reference in deployment
resource "kubernetes_deployment" "app_with_config" {
  metadata {
    name      = "app-with-config"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  spec {
    replicas = 2

    selector {
      match_labels = {
        app = "configured-app"
      }
    }

    template {
      metadata {
        labels = {
          app = "configured-app"
        }
      }

      spec {
        container {
          name  = "app"
          image = "myapp:latest"

          # Mount ConfigMap as volume
          volume_mount {
            name       = "config"
            mount_path = "/etc/config"
          }

          # Environment from Secret
          env_from {
            secret_ref {
              name = kubernetes_secret.db_credentials.metadata[0].name
            }
          }
        }

        volume {
          name = "config"
          config_map {
            name = kubernetes_config_map.app_config.metadata[0].name
          }
        }
      }
    }
  }
}
```

## Implementing Ingress Resources

Expose applications with Ingress:

```hcl
# ingress.tf
resource "kubernetes_ingress_v1" "app" {
  metadata {
    name      = "app-ingress"
    namespace = kubernetes_namespace.app.metadata[0].name
    annotations = {
      "kubernetes.io/ingress.class"                = "nginx"
      "cert-manager.io/cluster-issuer"             = "letsencrypt-prod"
      "nginx.ingress.kubernetes.io/ssl-redirect"   = "true"
      "nginx.ingress.kubernetes.io/force-ssl-redirect" = "true"
    }
  }

  spec {
    tls {
      hosts = ["app.example.com"]
      secret_name = "app-tls"
    }

    rule {
      host = "app.example.com"

      http {
        path {
          path = "/"
          path_type = "Prefix"

          backend {
            service {
              name = kubernetes_service.app.metadata[0].name
              port {
                number = 80
              }
            }
          }
        }

        path {
          path = "/api"
          path_type = "Prefix"

          backend {
            service {
              name = kubernetes_service.api.metadata[0].name
              port {
                number = 8080
              }
            }
          }
        }
      }
    }
  }
}
```

## Managing Persistent Volumes

Create storage resources:

```hcl
# storage.tf
resource "kubernetes_storage_class_v1" "fast" {
  metadata {
    name = "fast-ssd"
  }

  storage_provisioner = "kubernetes.io/aws-ebs"
  reclaim_policy      = "Retain"
  volume_binding_mode = "WaitForFirstConsumer"

  parameters = {
    type      = "gp3"
    iops      = "3000"
    throughput = "125"
    encrypted = "true"
  }
}

resource "kubernetes_persistent_volume_claim_v1" "data" {
  metadata {
    name      = "app-data"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  spec {
    access_modes       = ["ReadWriteOnce"]
    storage_class_name = kubernetes_storage_class_v1.fast.metadata[0].name

    resources {
      requests = {
        storage = "10Gi"
      }
    }
  }
}

# Use in StatefulSet
resource "kubernetes_stateful_set_v1" "database" {
  metadata {
    name      = "postgres"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  spec {
    service_name = "postgres"
    replicas     = 1

    selector {
      match_labels = {
        app = "postgres"
      }
    }

    template {
      metadata {
        labels = {
          app = "postgres"
        }
      }

      spec {
        container {
          name  = "postgres"
          image = "postgres:15"

          port {
            container_port = 5432
          }

          volume_mount {
            name       = "data"
            mount_path = "/var/lib/postgresql/data"
          }
        }
      }
    }

    volume_claim_template {
      metadata {
        name = "data"
      }

      spec {
        access_modes       = ["ReadWriteOnce"]
        storage_class_name = kubernetes_storage_class_v1.fast.metadata[0].name

        resources {
          requests = {
            storage = "20Gi"
          }
        }
      }
    }
  }
}
```

## Implementing RBAC

Manage access control:

```hcl
# rbac.tf
resource "kubernetes_service_account_v1" "app" {
  metadata {
    name      = "app-service-account"
    namespace = kubernetes_namespace.app.metadata[0].name
  }
}

resource "kubernetes_role_v1" "app" {
  metadata {
    name      = "app-role"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  rule {
    api_groups = [""]
    resources  = ["pods", "services"]
    verbs      = ["get", "list", "watch"]
  }

  rule {
    api_groups = ["apps"]
    resources  = ["deployments"]
    verbs      = ["get", "list"]
  }
}

resource "kubernetes_role_binding_v1" "app" {
  metadata {
    name      = "app-role-binding"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "Role"
    name      = kubernetes_role_v1.app.metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account_v1.app.metadata[0].name
    namespace = kubernetes_namespace.app.metadata[0].name
  }
}
```

## Using Manifest Resources for Custom CRDs

Manage custom resources:

```hcl
# custom-resources.tf
resource "kubernetes_manifest" "example_crd" {
  manifest = {
    apiVersion = "example.com/v1alpha1"
    kind       = "Application"
    metadata = {
      name      = "my-application"
      namespace = kubernetes_namespace.app.metadata[0].name
    }
    spec = {
      replicas = 3
      image    = "myapp:v1.0.0"
      database = {
        host = "postgres.default.svc.cluster.local"
        port = 5432
      }
    }
  }
}
```

## Implementing Data Sources

Query existing resources:

```hcl
# data.tf
data "kubernetes_service" "existing" {
  metadata {
    name      = "existing-service"
    namespace = "default"
  }
}

resource "kubernetes_config_map" "discovery" {
  metadata {
    name      = "service-discovery"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  data = {
    "existing_service_endpoint" = "${data.kubernetes_service.existing.spec[0].cluster_ip}:${data.kubernetes_service.existing.spec[0].port[0].port}"
  }
}
```

## Summary

The Terraform Kubernetes provider enables unified infrastructure management across cloud and cluster resources. By managing Kubernetes resources alongside the clusters themselves, you maintain a single source of truth for all infrastructure. Authentication integrations with EKS, GKE, and AKS simplify access control, while support for all major Kubernetes resources including CRDs provides complete coverage. This approach scales from simple applications to complex multi-cluster deployments with consistent workflows.
