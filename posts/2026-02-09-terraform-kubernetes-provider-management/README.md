# How to Configure Terraform Kubernetes Provider for Cluster Resource Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Infrastructure as Code

Description: Learn how to configure and use the Terraform Kubernetes provider to manage cluster resources including deployments, services, and configurations.

---

The Terraform Kubernetes provider enables infrastructure as code management of Kubernetes resources. Instead of manually applying YAML manifests or using kubectl, you can define, version, and manage your Kubernetes infrastructure alongside other cloud resources using Terraform's declarative syntax.

This approach provides several advantages over traditional Kubernetes resource management. Terraform tracks resource state, detects drift, manages dependencies, and provides a consistent workflow for provisioning infrastructure across multiple clouds and platforms.

## Setting Up the Kubernetes Provider

The Terraform Kubernetes provider needs credentials to connect to your cluster. There are multiple authentication methods depending on your environment.

```hcl
terraform {
  required_version = ">= 1.0"

  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.24"
    }
  }
}

# Configure using kubeconfig file
provider "kubernetes" {
  config_path    = "~/.kube/config"
  config_context = "my-cluster-context"
}

# Or configure using explicit credentials
provider "kubernetes" {
  host = "https://cluster-api.example.com:6443"

  client_certificate     = file("~/.kube/client-cert.pem")
  client_key             = file("~/.kube/client-key.pem")
  cluster_ca_certificate = file("~/.kube/cluster-ca-cert.pem")
}

# Or use exec plugin (for AWS EKS, GKE, etc.)
provider "kubernetes" {
  host                   = data.aws_eks_cluster.cluster.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)

  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args = [
      "eks",
      "get-token",
      "--cluster-name",
      data.aws_eks_cluster.cluster.name
    ]
  }
}
```

Choose the authentication method that fits your environment. For local development, kubeconfig works well. For CI/CD pipelines, explicit credentials or exec plugins are more reliable.

## Managing Namespaces

Namespaces are logical boundaries in Kubernetes. Terraform makes it easy to create and configure namespaces with labels and annotations.

```hcl
resource "kubernetes_namespace" "development" {
  metadata {
    name = "development"

    labels = {
      environment = "dev"
      managed-by  = "terraform"
      team        = "platform"
    }

    annotations = {
      "description" = "Development environment namespace"
    }
  }
}

resource "kubernetes_namespace" "staging" {
  metadata {
    name = "staging"

    labels = {
      environment = "staging"
      managed-by  = "terraform"
      team        = "platform"
    }
  }
}

resource "kubernetes_namespace" "production" {
  metadata {
    name = "production"

    labels = {
      environment = "production"
      managed-by  = "terraform"
      team        = "platform"
    }

    annotations = {
      "description"           = "Production environment namespace"
      "compliance-required"   = "true"
      "backup-enabled"        = "true"
    }
  }
}
```

Terraform tracks namespace state and can update labels or annotations without recreating resources.

## Creating Deployments

Deployments manage replica sets and pods. Here's how to define a deployment in Terraform.

```hcl
resource "kubernetes_deployment" "web_app" {
  metadata {
    name      = "web-app"
    namespace = kubernetes_namespace.development.metadata[0].name

    labels = {
      app = "web-app"
    }
  }

  spec {
    replicas = 3

    selector {
      match_labels = {
        app = "web-app"
      }
    }

    template {
      metadata {
        labels = {
          app     = "web-app"
          version = "v1.0.0"
        }
      }

      spec {
        container {
          name  = "web-app"
          image = "myorg/web-app:v1.0.0"

          port {
            container_port = 8080
            name           = "http"
          }

          env {
            name  = "ENVIRONMENT"
            value = "development"
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

          resources {
            requests = {
              cpu    = "250m"
              memory = "256Mi"
            }
            limits = {
              cpu    = "500m"
              memory = "512Mi"
            }
          }

          liveness_probe {
            http_get {
              path = "/health"
              port = 8080
            }
            initial_delay_seconds = 30
            period_seconds        = 10
          }

          readiness_probe {
            http_get {
              path = "/ready"
              port = 8080
            }
            initial_delay_seconds = 10
            period_seconds        = 5
          }
        }
      }
    }
  }
}
```

Terraform handles deployment updates intelligently, triggering rolling updates when container images or configurations change.

## Managing Services

Services expose deployments to network traffic. Define ClusterIP, NodePort, or LoadBalancer services in Terraform.

```hcl
resource "kubernetes_service" "web_app" {
  metadata {
    name      = "web-app"
    namespace = kubernetes_namespace.development.metadata[0].name

    labels = {
      app = "web-app"
    }
  }

  spec {
    selector = {
      app = kubernetes_deployment.web_app.spec[0].template[0].metadata[0].labels.app
    }

    port {
      name        = "http"
      port        = 80
      target_port = 8080
      protocol    = "TCP"
    }

    type = "ClusterIP"
  }
}

# LoadBalancer service for external access
resource "kubernetes_service" "web_app_external" {
  metadata {
    name      = "web-app-external"
    namespace = kubernetes_namespace.production.metadata[0].name

    annotations = {
      "service.beta.kubernetes.io/aws-load-balancer-type" = "nlb"
    }
  }

  spec {
    selector = {
      app = "web-app"
    }

    port {
      name        = "https"
      port        = 443
      target_port = 8080
      protocol    = "TCP"
    }

    type = "LoadBalancer"
  }
}
```

Services automatically reference deployments through Terraform resource attributes, maintaining dependency relationships.

## ConfigMaps and Secrets

Store configuration data and sensitive information using ConfigMaps and Secrets.

```hcl
resource "kubernetes_config_map" "app_config" {
  metadata {
    name      = "app-config"
    namespace = kubernetes_namespace.development.metadata[0].name
  }

  data = {
    "app.properties" = <<-EOF
      server.port=8080
      logging.level=INFO
      feature.new_ui=true
      cache.ttl=3600
    EOF

    "database.properties" = <<-EOF
      pool.size=10
      connection.timeout=30
      max.connections=100
    EOF
  }
}

resource "kubernetes_secret" "db_credentials" {
  metadata {
    name      = "db-credentials"
    namespace = kubernetes_namespace.development.metadata[0].name
  }

  data = {
    username = base64encode("appuser")
    password = base64encode("securepassword123")
    url      = base64encode("postgresql://appuser:securepassword123@postgres:5432/appdb")
  }

  type = "Opaque"
}

# TLS secret for ingress
resource "kubernetes_secret" "tls_cert" {
  metadata {
    name      = "tls-certificate"
    namespace = kubernetes_namespace.production.metadata[0].name
  }

  data = {
    "tls.crt" = filebase64("${path.module}/certs/tls.crt")
    "tls.key" = filebase64("${path.module}/certs/tls.key")
  }

  type = "kubernetes.io/tls"
}
```

Secrets are base64-encoded automatically by Kubernetes. Terraform handles encoding when using the data attribute.

## Managing Ingress Resources

Ingress resources route external HTTP/HTTPS traffic to services.

```hcl
resource "kubernetes_ingress_v1" "web_app" {
  metadata {
    name      = "web-app-ingress"
    namespace = kubernetes_namespace.production.metadata[0].name

    annotations = {
      "kubernetes.io/ingress.class"                = "nginx"
      "cert-manager.io/cluster-issuer"             = "letsencrypt-prod"
      "nginx.ingress.kubernetes.io/ssl-redirect"   = "true"
      "nginx.ingress.kubernetes.io/rate-limit"     = "100"
    }
  }

  spec {
    tls {
      hosts       = ["app.example.com"]
      secret_name = kubernetes_secret.tls_cert.metadata[0].name
    }

    rule {
      host = "app.example.com"

      http {
        path {
          path      = "/"
          path_type = "Prefix"

          backend {
            service {
              name = kubernetes_service.web_app.metadata[0].name
              port {
                number = 80
              }
            }
          }
        }

        path {
          path      = "/api"
          path_type = "Prefix"

          backend {
            service {
              name = "api-service"
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

Ingress resources work with ingress controllers like NGINX or Traefik to route traffic based on hostnames and paths.

## Persistent Volumes and Claims

Manage persistent storage for stateful applications.

```hcl
resource "kubernetes_persistent_volume_claim" "postgres_data" {
  metadata {
    name      = "postgres-data"
    namespace = kubernetes_namespace.development.metadata[0].name
  }

  spec {
    access_modes = ["ReadWriteOnce"]

    resources {
      requests = {
        storage = "10Gi"
      }
    }

    storage_class_name = "fast-ssd"
  }
}

resource "kubernetes_stateful_set" "postgres" {
  metadata {
    name      = "postgres"
    namespace = kubernetes_namespace.development.metadata[0].name
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
          image = "postgres:16-alpine"

          port {
            container_port = 5432
            name           = "postgres"
          }

          env {
            name  = "POSTGRES_DB"
            value = "appdb"
          }

          env {
            name = "POSTGRES_PASSWORD"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.db_credentials.metadata[0].name
                key  = "password"
              }
            }
          }

          volume_mount {
            name       = "postgres-data"
            mount_path = "/var/lib/postgresql/data"
          }
        }

        volume {
          name = "postgres-data"

          persistent_volume_claim {
            claim_name = kubernetes_persistent_volume_claim.postgres_data.metadata[0].name
          }
        }
      }
    }
  }
}
```

StatefulSets maintain pod identity and ordered deployment, essential for databases and other stateful applications.

## Resource Quotas and Limit Ranges

Enforce resource constraints at the namespace level.

```hcl
resource "kubernetes_resource_quota" "development" {
  metadata {
    name      = "resource-quota"
    namespace = kubernetes_namespace.development.metadata[0].name
  }

  spec {
    hard = {
      "requests.cpu"    = "10"
      "requests.memory" = "20Gi"
      "limits.cpu"      = "20"
      "limits.memory"   = "40Gi"
      "pods"            = "50"
      "services"        = "20"
    }
  }
}

resource "kubernetes_limit_range" "development" {
  metadata {
    name      = "limit-range"
    namespace = kubernetes_namespace.development.metadata[0].name
  }

  spec {
    limit {
      type = "Container"

      default = {
        cpu    = "500m"
        memory = "512Mi"
      }

      default_request = {
        cpu    = "250m"
        memory = "256Mi"
      }

      max = {
        cpu    = "2"
        memory = "4Gi"
      }

      min = {
        cpu    = "100m"
        memory = "128Mi"
      }
    }

    limit {
      type = "Pod"

      max = {
        cpu    = "4"
        memory = "8Gi"
      }
    }
  }
}
```

Quotas prevent resource exhaustion, while limit ranges provide defaults for containers without explicit resource specifications.

## Network Policies

Control network traffic between pods using network policies.

```hcl
resource "kubernetes_network_policy" "web_app" {
  metadata {
    name      = "web-app-network-policy"
    namespace = kubernetes_namespace.development.metadata[0].name
  }

  spec {
    pod_selector {
      match_labels = {
        app = "web-app"
      }
    }

    policy_types = ["Ingress", "Egress"]

    ingress {
      from {
        pod_selector {
          match_labels = {
            role = "frontend"
          }
        }
      }

      ports {
        port     = "8080"
        protocol = "TCP"
      }
    }

    egress {
      to {
        pod_selector {
          match_labels = {
            app = "postgres"
          }
        }
      }

      ports {
        port     = "5432"
        protocol = "TCP"
      }
    }

    egress {
      to {
        namespace_selector {
          match_labels = {
            name = "kube-system"
          }
        }
      }

      ports {
        port     = "53"
        protocol = "UDP"
      }
    }
  }
}
```

Network policies implement zero-trust networking by explicitly defining allowed traffic flows.

## Best Practices

Always use explicit dependencies between resources using depends_on when Terraform cannot infer them automatically. This ensures resources are created in the correct order.

Store sensitive data in Terraform variables or use external secret management systems. Never commit secrets directly to version control.

Use consistent labeling across all resources to enable easy filtering and management. Include labels for environment, team, application, and managed-by.

Implement proper state management with remote backends to enable team collaboration and prevent state corruption.

Use Terraform workspaces or separate state files for different environments to prevent accidental changes to production.

## Conclusion

The Terraform Kubernetes provider enables infrastructure as code management of Kubernetes resources with all the benefits of Terraform's declarative approach. By defining deployments, services, configurations, and policies in HCL, you gain version control, dependency management, and consistent provisioning workflows. This approach scales from simple applications to complex multi-environment deployments while maintaining clear infrastructure definitions.
