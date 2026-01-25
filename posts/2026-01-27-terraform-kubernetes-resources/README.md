# How to Deploy Kubernetes Resources with Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Infrastructure as Code, DevOps, Helm

Description: Learn how to manage Kubernetes resources with Terraform using the kubernetes and helm providers. Covers deployments, services, configmaps, and integration with cluster provisioning.

---

Terraform can manage Kubernetes resources alongside the clusters that host them. This unifies infrastructure management: provision an EKS cluster and deploy applications in the same workflow.

## When to Use Terraform for Kubernetes

Terraform works well for:
- **Cluster-level resources**: Namespaces, RBAC, network policies
- **Infrastructure components**: Ingress controllers, monitoring stacks
- **Initial application deployment**: Bootstrap applications
- **Resources tied to infrastructure**: Service accounts with IAM roles

Consider kubectl or GitOps (ArgoCD) for:
- Frequent application updates
- Developers managing their own deployments
- Complex rollout strategies

## Provider Setup

### Kubernetes Provider

```hcl
# versions.tf

terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }
}
```

### Configure for EKS

```hcl
# providers.tf

# Get EKS cluster data
data "aws_eks_cluster" "cluster" {
  name = var.cluster_name
}

data "aws_eks_cluster_auth" "cluster" {
  name = var.cluster_name
}

# Kubernetes provider
provider "kubernetes" {
  host                   = data.aws_eks_cluster.cluster.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.cluster.token
}

# Helm provider (uses same auth)
provider "helm" {
  kubernetes {
    host                   = data.aws_eks_cluster.cluster.endpoint
    cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)
    token                  = data.aws_eks_cluster_auth.cluster.token
  }
}
```

### Configure with kubeconfig

```hcl
provider "kubernetes" {
  config_path    = "~/.kube/config"
  config_context = "my-cluster"
}

provider "helm" {
  kubernetes {
    config_path    = "~/.kube/config"
    config_context = "my-cluster"
  }
}
```

## Managing Namespaces

```hcl
# namespaces.tf

resource "kubernetes_namespace" "applications" {
  for_each = toset(["frontend", "backend", "monitoring", "logging"])

  metadata {
    name = each.key

    labels = {
      environment = var.environment
      managed-by  = "terraform"
    }

    annotations = {
      "description" = "${each.key} namespace for ${var.environment}"
    }
  }
}

# Namespace with resource quotas
resource "kubernetes_namespace" "production" {
  metadata {
    name = "production"
  }
}

resource "kubernetes_resource_quota" "production" {
  metadata {
    name      = "production-quota"
    namespace = kubernetes_namespace.production.metadata[0].name
  }

  spec {
    hard = {
      "requests.cpu"    = "10"
      "requests.memory" = "20Gi"
      "limits.cpu"      = "20"
      "limits.memory"   = "40Gi"
      "pods"            = "50"
    }
  }
}
```

## Deploying Applications

### Deployment and Service

```hcl
# app.tf

resource "kubernetes_deployment" "api" {
  metadata {
    name      = "api"
    namespace = kubernetes_namespace.applications["backend"].metadata[0].name

    labels = {
      app = "api"
    }
  }

  spec {
    replicas = var.api_replicas

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
        service_account_name = kubernetes_service_account.api.metadata[0].name

        container {
          name  = "api"
          image = "${var.ecr_repository}:${var.api_version}"

          port {
            container_port = 8080
          }

          env {
            name  = "ENVIRONMENT"
            value = var.environment
          }

          env {
            name = "DATABASE_URL"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.database.metadata[0].name
                key  = "url"
              }
            }
          }

          resources {
            requests = {
              cpu    = "100m"
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
            initial_delay_seconds = 5
            period_seconds        = 5
          }
        }
      }
    }
  }
}

resource "kubernetes_service" "api" {
  metadata {
    name      = "api"
    namespace = kubernetes_namespace.applications["backend"].metadata[0].name
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
```

### ConfigMaps and Secrets

```hcl
# config.tf

resource "kubernetes_config_map" "api_config" {
  metadata {
    name      = "api-config"
    namespace = kubernetes_namespace.applications["backend"].metadata[0].name
  }

  data = {
    "config.yaml" = yamlencode({
      server = {
        port    = 8080
        timeout = "30s"
      }
      logging = {
        level  = var.environment == "prod" ? "info" : "debug"
        format = "json"
      }
    })
  }
}

resource "kubernetes_secret" "database" {
  metadata {
    name      = "database-credentials"
    namespace = kubernetes_namespace.applications["backend"].metadata[0].name
  }

  data = {
    url      = "postgresql://${var.db_user}:${var.db_password}@${var.db_host}:5432/${var.db_name}"
    password = var.db_password
  }

  type = "Opaque"
}
```

## RBAC Configuration

```hcl
# rbac.tf

# Service Account
resource "kubernetes_service_account" "api" {
  metadata {
    name      = "api"
    namespace = kubernetes_namespace.applications["backend"].metadata[0].name

    annotations = {
      # For AWS IRSA
      "eks.amazonaws.com/role-arn" = aws_iam_role.api.arn
    }
  }
}

# Role for namespace-scoped permissions
resource "kubernetes_role" "api" {
  metadata {
    name      = "api-role"
    namespace = kubernetes_namespace.applications["backend"].metadata[0].name
  }

  rule {
    api_groups = [""]
    resources  = ["configmaps", "secrets"]
    verbs      = ["get", "list", "watch"]
  }

  rule {
    api_groups = [""]
    resources  = ["pods"]
    verbs      = ["get", "list"]
  }
}

# Bind role to service account
resource "kubernetes_role_binding" "api" {
  metadata {
    name      = "api-role-binding"
    namespace = kubernetes_namespace.applications["backend"].metadata[0].name
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "Role"
    name      = kubernetes_role.api.metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.api.metadata[0].name
    namespace = kubernetes_namespace.applications["backend"].metadata[0].name
  }
}

# ClusterRole for cluster-wide permissions
resource "kubernetes_cluster_role" "monitoring" {
  metadata {
    name = "monitoring-reader"
  }

  rule {
    api_groups = [""]
    resources  = ["nodes", "pods", "services"]
    verbs      = ["get", "list", "watch"]
  }
}
```

## Helm Releases

### Deploy NGINX Ingress Controller

```hcl
# ingress.tf

resource "helm_release" "nginx_ingress" {
  name       = "nginx-ingress"
  repository = "https://kubernetes.github.io/ingress-nginx"
  chart      = "ingress-nginx"
  version    = "4.8.0"
  namespace  = "ingress-nginx"

  create_namespace = true

  set {
    name  = "controller.replicaCount"
    value = var.environment == "prod" ? "3" : "1"
  }

  set {
    name  = "controller.service.type"
    value = "LoadBalancer"
  }

  set {
    name  = "controller.service.annotations.service\\.beta\\.kubernetes\\.io/aws-load-balancer-type"
    value = "nlb"
  }

  set {
    name  = "controller.metrics.enabled"
    value = "true"
  }

  values = [
    yamlencode({
      controller = {
        resources = {
          requests = {
            cpu    = "100m"
            memory = "128Mi"
          }
          limits = {
            cpu    = "500m"
            memory = "256Mi"
          }
        }
      }
    })
  ]
}
```

### Deploy Prometheus Stack

```hcl
# monitoring.tf

resource "helm_release" "prometheus" {
  name       = "prometheus"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  version    = "52.0.0"
  namespace  = kubernetes_namespace.applications["monitoring"].metadata[0].name

  values = [
    file("${path.module}/helm-values/prometheus.yaml")
  ]

  set {
    name  = "grafana.adminPassword"
    value = var.grafana_password
  }

  set_sensitive {
    name  = "alertmanager.config.global.slack_api_url"
    value = var.slack_webhook_url
  }
}
```

### Helm values file

```yaml
# helm-values/prometheus.yaml

grafana:
  enabled: true
  persistence:
    enabled: true
    size: 10Gi

prometheus:
  prometheusSpec:
    retention: 15d
    storageSpec:
      volumeClaimTemplate:
        spec:
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 50Gi

alertmanager:
  alertmanagerSpec:
    storage:
      volumeClaimTemplate:
        spec:
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 10Gi
```

## Ingress Resources

```hcl
# ingress.tf

resource "kubernetes_ingress_v1" "api" {
  metadata {
    name      = "api-ingress"
    namespace = kubernetes_namespace.applications["backend"].metadata[0].name

    annotations = {
      "kubernetes.io/ingress.class"                = "nginx"
      "nginx.ingress.kubernetes.io/ssl-redirect"   = "true"
      "cert-manager.io/cluster-issuer"             = "letsencrypt-prod"
    }
  }

  spec {
    tls {
      hosts       = ["api.example.com"]
      secret_name = "api-tls"
    }

    rule {
      host = "api.example.com"

      http {
        path {
          path      = "/"
          path_type = "Prefix"

          backend {
            service {
              name = kubernetes_service.api.metadata[0].name
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
```

## Raw Kubernetes Manifests

For resources not supported by the provider:

```hcl
# custom-resources.tf

resource "kubernetes_manifest" "prometheus_rule" {
  manifest = {
    apiVersion = "monitoring.coreos.com/v1"
    kind       = "PrometheusRule"
    metadata = {
      name      = "api-alerts"
      namespace = kubernetes_namespace.applications["backend"].metadata[0].name
    }
    spec = {
      groups = [
        {
          name = "api"
          rules = [
            {
              alert = "HighErrorRate"
              expr  = "rate(http_requests_total{status=~\"5..\"}[5m]) > 0.1"
              for   = "5m"
              labels = {
                severity = "critical"
              }
              annotations = {
                summary = "High error rate detected"
              }
            }
          ]
        }
      ]
    }
  }
}
```

## Ordering Dependencies

Ensure resources are created in the right order:

```hcl
# The deployment depends on config and secrets being ready
resource "kubernetes_deployment" "api" {
  depends_on = [
    kubernetes_config_map.api_config,
    kubernetes_secret.database,
    kubernetes_service_account.api,
  ]

  # ... deployment spec
}

# Ingress depends on the service
resource "kubernetes_ingress_v1" "api" {
  depends_on = [
    kubernetes_service.api,
    helm_release.nginx_ingress,
  ]

  # ... ingress spec
}
```

## Wait for Readiness

```hcl
resource "kubernetes_deployment" "api" {
  # ...

  wait_for_rollout = true  # Wait for deployment to be ready

  timeouts {
    create = "5m"
    update = "5m"
  }
}

resource "helm_release" "nginx_ingress" {
  # ...

  wait          = true    # Wait for all resources to be ready
  wait_for_jobs = true    # Wait for hooks to complete

  timeout = 600  # 10 minutes
}
```

## Best Practices

1. **Use namespaces** for isolation
2. **Set resource limits** on all workloads
3. **Use Helm for complex apps** with many resources
4. **Store Helm values** in separate files
5. **Use depends_on** for ordering
6. **Wait for rollouts** to ensure deployment success
7. **Combine with GitOps** for application deployments

---

Terraform's Kubernetes and Helm providers bridge infrastructure and application deployment. Use them for cluster-level resources and initial bootstrapping, then consider GitOps tools for ongoing application management.
