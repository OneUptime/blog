# How to Create Terraform Modules for Kubernetes Addons

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Kubernetes, EKS, Addons, Helm, Infrastructure as Code

Description: Build reusable Terraform modules for Kubernetes addons including ingress controllers, cert-manager, monitoring stacks, and service mesh using Helm and Kubernetes providers.

---

When you manage EKS or other managed Kubernetes clusters with Terraform, the cluster itself is only half the story. The real value comes from the addons you install - ingress controllers, certificate managers, monitoring stacks, and more. Building Terraform modules for these addons ensures every cluster gets the same baseline tooling with consistent configuration.

## Setting Up the Kubernetes and Helm Providers

Before creating addon modules, you need to configure the Kubernetes and Helm providers. These should be set up in your root module.

```hcl
# Root module - providers.tf

# Get EKS cluster details for provider configuration
data "aws_eks_cluster" "this" {
  name = module.eks.cluster_name
}

data "aws_eks_cluster_auth" "this" {
  name = module.eks.cluster_name
}

# Kubernetes provider configuration
provider "kubernetes" {
  host                   = data.aws_eks_cluster.this.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.this.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.this.token
}

# Helm provider configuration
provider "helm" {
  kubernetes {
    host                   = data.aws_eks_cluster.this.endpoint
    cluster_ca_certificate = base64decode(data.aws_eks_cluster.this.certificate_authority[0].data)
    token                  = data.aws_eks_cluster_auth.this.token
  }
}
```

## Ingress Controller Module

The NGINX ingress controller is one of the most common addons. This module installs it with an AWS Network Load Balancer.

```hcl
# modules/k8s-addons/ingress-nginx/variables.tf
variable "namespace" {
  description = "Kubernetes namespace for the ingress controller"
  type        = string
  default     = "ingress-nginx"
}

variable "chart_version" {
  description = "Helm chart version for ingress-nginx"
  type        = string
  default     = "4.9.0"
}

variable "replica_count" {
  description = "Number of ingress controller replicas"
  type        = number
  default     = 2
}

variable "enable_metrics" {
  description = "Whether to expose Prometheus metrics"
  type        = bool
  default     = true
}

variable "load_balancer_type" {
  description = "Type of AWS load balancer (nlb or elb)"
  type        = string
  default     = "nlb"
}
```

```hcl
# modules/k8s-addons/ingress-nginx/main.tf

# Create the namespace
resource "kubernetes_namespace" "ingress_nginx" {
  metadata {
    name = var.namespace
    labels = {
      "app.kubernetes.io/name"       = "ingress-nginx"
      "app.kubernetes.io/managed-by" = "terraform"
    }
  }
}

# Install the ingress controller via Helm
resource "helm_release" "ingress_nginx" {
  name       = "ingress-nginx"
  repository = "https://kubernetes.github.io/ingress-nginx"
  chart      = "ingress-nginx"
  version    = var.chart_version
  namespace  = kubernetes_namespace.ingress_nginx.metadata[0].name

  # Controller configuration
  set {
    name  = "controller.replicaCount"
    value = var.replica_count
  }

  # AWS NLB configuration
  set {
    name  = "controller.service.type"
    value = "LoadBalancer"
  }

  set {
    name  = "controller.service.annotations.service\\.beta\\.kubernetes\\.io/aws-load-balancer-type"
    value = var.load_balancer_type
  }

  set {
    name  = "controller.service.annotations.service\\.beta\\.kubernetes\\.io/aws-load-balancer-cross-zone-load-balancing-enabled"
    value = "true"
  }

  # Prometheus metrics
  set {
    name  = "controller.metrics.enabled"
    value = var.enable_metrics
  }

  # Pod disruption budget for high availability
  set {
    name  = "controller.podDisruptionBudget.enabled"
    value = "true"
  }

  set {
    name  = "controller.podDisruptionBudget.minAvailable"
    value = "1"
  }

  # Resource requests and limits
  set {
    name  = "controller.resources.requests.cpu"
    value = "100m"
  }

  set {
    name  = "controller.resources.requests.memory"
    value = "128Mi"
  }

  wait    = true
  timeout = 600
}

output "load_balancer_hostname" {
  description = "Hostname of the ingress load balancer"
  value       = "Retrieve via: kubectl get svc -n ${var.namespace} ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'"
}
```

## Cert-Manager Module

Cert-manager handles TLS certificate provisioning and renewal automatically.

```hcl
# modules/k8s-addons/cert-manager/main.tf

resource "kubernetes_namespace" "cert_manager" {
  metadata {
    name = "cert-manager"
    labels = {
      "app.kubernetes.io/managed-by" = "terraform"
    }
  }
}

resource "helm_release" "cert_manager" {
  name       = "cert-manager"
  repository = "https://charts.jetstack.io"
  chart      = "cert-manager"
  version    = var.chart_version
  namespace  = kubernetes_namespace.cert_manager.metadata[0].name

  # Install CRDs
  set {
    name  = "installCRDs"
    value = "true"
  }

  # Enable Prometheus monitoring
  set {
    name  = "prometheus.enabled"
    value = var.enable_metrics
  }

  # Resource requests
  set {
    name  = "resources.requests.cpu"
    value = "50m"
  }

  set {
    name  = "resources.requests.memory"
    value = "64Mi"
  }

  wait    = true
  timeout = 600
}

# Create a ClusterIssuer for Let's Encrypt production
resource "kubernetes_manifest" "letsencrypt_prod" {
  count = var.create_cluster_issuer ? 1 : 0

  manifest = {
    apiVersion = "cert-manager.io/v1"
    kind       = "ClusterIssuer"
    metadata = {
      name = "letsencrypt-prod"
    }
    spec = {
      acme = {
        server = "https://acme-v02.api.letsencrypt.org/directory"
        email  = var.acme_email
        privateKeySecretRef = {
          name = "letsencrypt-prod-key"
        }
        solvers = [
          {
            http01 = {
              ingress = {
                class = "nginx"
              }
            }
          }
        ]
      }
    }
  }

  depends_on = [helm_release.cert_manager]
}
```

## Monitoring Stack Module

This module installs Prometheus and Grafana using the kube-prometheus-stack chart.

```hcl
# modules/k8s-addons/monitoring/main.tf

resource "kubernetes_namespace" "monitoring" {
  metadata {
    name = "monitoring"
    labels = {
      "app.kubernetes.io/managed-by" = "terraform"
    }
  }
}

resource "helm_release" "kube_prometheus_stack" {
  name       = "kube-prometheus-stack"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  version    = var.chart_version
  namespace  = kubernetes_namespace.monitoring.metadata[0].name

  # Grafana configuration
  set {
    name  = "grafana.enabled"
    value = "true"
  }

  set {
    name  = "grafana.adminPassword"
    value = var.grafana_admin_password
  }

  set_sensitive {
    name  = "grafana.adminPassword"
    value = var.grafana_admin_password
  }

  # Prometheus retention
  set {
    name  = "prometheus.prometheusSpec.retention"
    value = var.prometheus_retention
  }

  # Persistent storage for Prometheus
  set {
    name  = "prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.accessModes[0]"
    value = "ReadWriteOnce"
  }

  set {
    name  = "prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage"
    value = var.prometheus_storage_size
  }

  # Alert manager
  set {
    name  = "alertmanager.enabled"
    value = "true"
  }

  values = [
    yamlencode({
      # Additional scrape configurations
      prometheus = {
        prometheusSpec = {
          additionalScrapeConfigs = var.additional_scrape_configs
        }
      }
    })
  ]

  wait    = true
  timeout = 900
}
```

## External DNS Module

External DNS automatically manages DNS records for Kubernetes services and ingresses.

```hcl
# modules/k8s-addons/external-dns/main.tf

# IAM role for external-dns with IRSA
module "external_dns_irsa" {
  source = "../irsa"

  name                = "external-dns"
  namespace           = "external-dns"
  service_account     = "external-dns"
  oidc_provider_arn   = var.oidc_provider_arn
  oidc_provider_url   = var.oidc_provider_url

  policy_json = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "route53:ChangeResourceRecordSets"
        ]
        Resource = ["arn:aws:route53:::hostedzone/${var.hosted_zone_id}"]
      },
      {
        Effect = "Allow"
        Action = [
          "route53:ListHostedZones",
          "route53:ListResourceRecordSets"
        ]
        Resource = ["*"]
      }
    ]
  })
}

resource "kubernetes_namespace" "external_dns" {
  metadata {
    name = "external-dns"
  }
}

resource "helm_release" "external_dns" {
  name       = "external-dns"
  repository = "https://kubernetes-sigs.github.io/external-dns"
  chart      = "external-dns"
  version    = var.chart_version
  namespace  = kubernetes_namespace.external_dns.metadata[0].name

  set {
    name  = "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = module.external_dns_irsa.role_arn
  }

  set {
    name  = "provider"
    value = "aws"
  }

  set {
    name  = "domainFilters[0]"
    value = var.domain_name
  }

  set {
    name  = "policy"
    value = "sync"
  }

  set {
    name  = "txtOwnerId"
    value = var.cluster_name
  }

  wait = true
}
```

## Composing All Addons Together

```hcl
# Root module - install all addons after cluster creation

module "ingress" {
  source = "./modules/k8s-addons/ingress-nginx"

  chart_version   = "4.9.0"
  replica_count   = 3
  enable_metrics  = true

  depends_on = [module.eks]
}

module "cert_manager" {
  source = "./modules/k8s-addons/cert-manager"

  chart_version        = "1.14.0"
  create_cluster_issuer = true
  acme_email           = "devops@mycompany.com"

  depends_on = [module.eks]
}

module "monitoring" {
  source = "./modules/k8s-addons/monitoring"

  chart_version          = "56.0.0"
  grafana_admin_password = var.grafana_password
  prometheus_retention   = "30d"
  prometheus_storage_size = "50Gi"

  depends_on = [module.eks]
}

module "external_dns" {
  source = "./modules/k8s-addons/external-dns"

  chart_version     = "1.14.0"
  cluster_name      = module.eks.cluster_name
  domain_name       = "example.com"
  hosted_zone_id    = var.hosted_zone_id
  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_provider_url = module.eks.oidc_provider_url

  depends_on = [module.eks]
}
```

## Conclusion

Kubernetes addon modules let you define a standard platform baseline that every cluster gets automatically. Build individual modules for each addon, keep Helm chart versions pinnable, and compose them in your root module. This approach makes it easy to add new addons, upgrade versions independently, and keep all your clusters consistent.

For more on infrastructure modules, check out our guides on [how to create Terraform modules for CI/CD infrastructure](https://oneuptime.com/blog/post/2026-02-23-how-to-create-terraform-modules-for-ci-cd-infrastructure/view) and [how to use module abstractions for platform engineering](https://oneuptime.com/blog/post/2026-02-23-how-to-use-module-abstractions-for-platform-engineering/view).
