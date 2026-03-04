# How to Use Terraform Output Values to Export Kubernetes Cluster Endpoints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Outputs

Description: Master Terraform output values to export Kubernetes cluster endpoints, service URLs, and connection information for use in other modules and external tools.

---

Terraform outputs provide a way to extract and expose information from your infrastructure after it's created. In Kubernetes environments, outputs are essential for sharing cluster endpoints, service URLs, load balancer IPs, and connection details with other Terraform modules, CI/CD pipelines, or team members. Properly structured outputs make your infrastructure more composable and easier to integrate with external systems.

## Basic Output Syntax

Outputs declare what information to extract from your resources. Each output has a value, and optionally a description and sensitivity flag:

```hcl
output "cluster_endpoint" {
  description = "Kubernetes cluster API endpoint"
  value       = data.kubernetes_service.api.status[0].load_balancer[0].ingress[0].hostname
}
```

Access outputs after applying with `terraform output` or reference them from other modules.

## Exporting Cluster Connection Information

When managing Kubernetes clusters, export connection details for kubectl configuration:

```hcl
data "aws_eks_cluster" "main" {
  name = "production-cluster"
}

data "aws_eks_cluster_auth" "main" {
  name = "production-cluster"
}

output "cluster_endpoint" {
  description = "Kubernetes cluster API server endpoint"
  value       = data.aws_eks_cluster.main.endpoint
}

output "cluster_ca_certificate" {
  description = "Cluster CA certificate for TLS verification"
  value       = base64decode(data.aws_eks_cluster.main.certificate_authority[0].data)
  sensitive   = true
}

output "cluster_token" {
  description = "Authentication token for cluster access"
  value       = data.aws_eks_cluster_auth.main.token
  sensitive   = true
}

output "cluster_name" {
  description = "Name of the Kubernetes cluster"
  value       = data.aws_eks_cluster.main.name
}

output "kubeconfig" {
  description = "Complete kubeconfig for cluster access"
  value = templatefile("${path.module}/templates/kubeconfig.tpl", {
    cluster_name     = data.aws_eks_cluster.main.name
    cluster_endpoint = data.aws_eks_cluster.main.endpoint
    cluster_ca       = data.aws_eks_cluster.main.certificate_authority[0].data
    cluster_token    = data.aws_eks_cluster_auth.main.token
  })
  sensitive = true
}
```

The kubeconfig template might look like:

```yaml
# templates/kubeconfig.tpl
apiVersion: v1
kind: Config
clusters:
- cluster:
    certificate-authority-data: ${cluster_ca}
    server: ${cluster_endpoint}
  name: ${cluster_name}
contexts:
- context:
    cluster: ${cluster_name}
    user: ${cluster_name}
  name: ${cluster_name}
current-context: ${cluster_name}
users:
- name: ${cluster_name}
  user:
    token: ${cluster_token}
```

## Outputting Service Endpoints

Export service endpoints for applications to consume:

```hcl
resource "kubernetes_service" "api" {
  metadata {
    name      = "api-gateway"
    namespace = "production"
  }

  spec {
    selector = {
      app = "api"
    }

    port {
      port        = 80
      target_port = 8080
    }

    type = "LoadBalancer"
  }
}

resource "kubernetes_service" "database" {
  metadata {
    name      = "postgres"
    namespace = "production"
  }

  spec {
    selector = {
      app = "postgres"
    }

    port {
      port        = 5432
      target_port = 5432
    }

    type = "ClusterIP"
  }
}

output "api_endpoint" {
  description = "External API endpoint"
  value       = "http://${kubernetes_service.api.status[0].load_balancer[0].ingress[0].hostname}"
}

output "api_internal_endpoint" {
  description = "Internal API endpoint for in-cluster communication"
  value       = "${kubernetes_service.api.metadata[0].name}.${kubernetes_service.api.metadata[0].namespace}.svc.cluster.local:80"
}

output "database_endpoint" {
  description = "Internal database endpoint"
  value       = "${kubernetes_service.database.metadata[0].name}.${kubernetes_service.database.metadata[0].namespace}.svc.cluster.local:5432"
}

output "service_endpoints" {
  description = "Map of all service endpoints"
  value = {
    api      = "http://${kubernetes_service.api.status[0].load_balancer[0].ingress[0].hostname}"
    database = "${kubernetes_service.database.metadata[0].name}.${kubernetes_service.database.metadata[0].namespace}.svc.cluster.local:5432"
  }
}
```

## Exporting Ingress URLs

When using ingress controllers, export the configured URLs:

```hcl
resource "kubernetes_ingress_v1" "app" {
  metadata {
    name      = "app-ingress"
    namespace = "production"
    annotations = {
      "kubernetes.io/ingress.class" = "nginx"
      "cert-manager.io/cluster-issuer" = "letsencrypt-prod"
    }
  }

  spec {
    rule {
      host = "api.example.com"
      http {
        path {
          path = "/"
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

    rule {
      host = "admin.example.com"
      http {
        path {
          path = "/"
          path_type = "Prefix"
          backend {
            service {
              name = "admin-service"
              port {
                number = 80
              }
            }
          }
        }
      }
    }

    tls {
      hosts = ["api.example.com"]
      secret_name = "api-tls"
    }

    tls {
      hosts = ["admin.example.com"]
      secret_name = "admin-tls"
    }
  }
}

output "ingress_urls" {
  description = "URLs configured in ingress"
  value = [
    for rule in kubernetes_ingress_v1.app.spec[0].rule :
    "https://${rule.host}"
  ]
}

output "api_url" {
  description = "API URL"
  value = "https://api.example.com"
}

output "admin_url" {
  description = "Admin panel URL"
  value = "https://admin.example.com"
}
```

## Outputting ConfigMap and Secret Names

Export resource names for other modules to reference:

```hcl
resource "kubernetes_config_map" "app_config" {
  metadata {
    name      = "app-config"
    namespace = "production"
  }

  data = {
    database_host = "postgres.production.svc.cluster.local"
    cache_host    = "redis.production.svc.cluster.local"
    log_level     = "info"
  }
}

resource "kubernetes_secret" "app_secrets" {
  metadata {
    name      = "app-secrets"
    namespace = "production"
  }

  data = {
    api_key     = base64encode(var.api_key)
    db_password = base64encode(var.db_password)
  }
}

output "config_map_name" {
  description = "Name of the application ConfigMap"
  value       = kubernetes_config_map.app_config.metadata[0].name
}

output "secret_name" {
  description = "Name of the application Secret"
  value       = kubernetes_secret.app_secrets.metadata[0].name
}

output "config_references" {
  description = "Configuration resource references for deployment"
  value = {
    config_map = {
      name      = kubernetes_config_map.app_config.metadata[0].name
      namespace = kubernetes_config_map.app_config.metadata[0].namespace
    }
    secret = {
      name      = kubernetes_secret.app_secrets.metadata[0].name
      namespace = kubernetes_secret.app_secrets.metadata[0].namespace
    }
  }
}
```

## Creating Structured Outputs

Organize complex information into structured outputs:

```hcl
locals {
  microservices = {
    api = {
      deployment = kubernetes_deployment.api
      service    = kubernetes_service.api
    }
    auth = {
      deployment = kubernetes_deployment.auth
      service    = kubernetes_service.auth
    }
    worker = {
      deployment = kubernetes_deployment.worker
      service    = kubernetes_service.worker
    }
  }
}

output "application_info" {
  description = "Complete application deployment information"
  value = {
    cluster = {
      name     = data.aws_eks_cluster.main.name
      endpoint = data.aws_eks_cluster.main.endpoint
      version  = data.aws_eks_cluster.main.version
    }
    services = {
      for name, resources in local.microservices :
      name => {
        deployment_name = resources.deployment.metadata[0].name
        replicas        = resources.deployment.spec[0].replicas
        service_name    = resources.service.metadata[0].name
        service_type    = resources.service.spec[0].type
        endpoint        = resources.service.spec[0].type == "LoadBalancer" ? resources.service.status[0].load_balancer[0].ingress[0].hostname : "${resources.service.metadata[0].name}.${resources.service.metadata[0].namespace}.svc.cluster.local"
      }
    }
    ingress = {
      urls = [
        for rule in kubernetes_ingress_v1.app.spec[0].rule :
        "https://${rule.host}"
      ]
      class = kubernetes_ingress_v1.app.metadata[0].annotations["kubernetes.io/ingress.class"]
    }
  }
}
```

## Outputting for CI/CD Integration

Create outputs specifically for CI/CD pipelines:

```hcl
output "deployment_commands" {
  description = "Commands for deploying to this cluster"
  value = {
    kubeconfig_setup = "aws eks update-kubeconfig --name ${data.aws_eks_cluster.main.name} --region ${var.aws_region}"
    kubectl_context  = data.aws_eks_cluster.main.name
    namespace        = "production"
    rollout_status   = "kubectl rollout status deployment/api -n production"
  }
}

output "smoke_test_endpoints" {
  description = "Endpoints for smoke testing"
  value = {
    api_health   = "https://api.example.com/health"
    api_ready    = "https://api.example.com/ready"
    admin_health = "https://admin.example.com/health"
  }
}

output "monitoring_urls" {
  description = "Monitoring and observability URLs"
  value = {
    prometheus = "http://${kubernetes_service.prometheus.status[0].load_balancer[0].ingress[0].hostname}:9090"
    grafana    = "http://${kubernetes_service.grafana.status[0].load_balancer[0].ingress[0].hostname}:3000"
    alertmanager = "http://${kubernetes_service.alertmanager.status[0].load_balancer[0].ingress[0].hostname}:9093"
  }
}
```

## Using Outputs in Other Modules

Reference outputs from child modules:

```hcl
# modules/networking/outputs.tf
output "vpc_id" {
  value = aws_vpc.main.id
}

output "subnet_ids" {
  value = aws_subnet.private[*].id
}

# modules/cluster/main.tf
module "networking" {
  source = "./modules/networking"
}

resource "aws_eks_cluster" "main" {
  name     = "production"
  role_arn = aws_iam_role.cluster.arn

  vpc_config {
    subnet_ids = module.networking.subnet_ids
  }
}

# Root outputs.tf
output "network_vpc_id" {
  description = "VPC ID from networking module"
  value       = module.networking.vpc_id
}

output "cluster_endpoint" {
  description = "Cluster endpoint from cluster module"
  value       = aws_eks_cluster.main.endpoint
}
```

## Conditional Outputs

Create outputs conditionally based on variables:

```hcl
variable "enable_monitoring" {
  type    = bool
  default = false
}

resource "kubernetes_service" "prometheus" {
  count = var.enable_monitoring ? 1 : 0

  metadata {
    name      = "prometheus"
    namespace = "monitoring"
  }

  spec {
    selector = {
      app = "prometheus"
    }

    port {
      port = 9090
    }

    type = "LoadBalancer"
  }
}

output "prometheus_endpoint" {
  description = "Prometheus endpoint (if enabled)"
  value       = var.enable_monitoring ? "http://${kubernetes_service.prometheus[0].status[0].load_balancer[0].ingress[0].hostname}:9090" : null
}
```

## Exporting Namespace Information

Output namespace details for multi-namespace deployments:

```hcl
variable "environments" {
  type    = set(string)
  default = ["dev", "staging", "prod"]
}

resource "kubernetes_namespace" "env" {
  for_each = var.environments

  metadata {
    name = each.key
    labels = {
      environment = each.key
      managed-by  = "terraform"
    }
  }
}

output "namespaces" {
  description = "Created namespace information"
  value = {
    for env, ns in kubernetes_namespace.env :
    env => {
      name = ns.metadata[0].name
      uid  = ns.metadata[0].uid
      labels = ns.metadata[0].labels
    }
  }
}

output "namespace_list" {
  description = "List of namespace names"
  value       = [for ns in kubernetes_namespace.env : ns.metadata[0].name]
}
```

## Formatting Outputs for Documentation

Create human-readable outputs for documentation:

```hcl
output "deployment_summary" {
  description = "Human-readable deployment summary"
  value = <<-EOT
    Kubernetes Cluster Deployment Summary
    =====================================

    Cluster Name: ${data.aws_eks_cluster.main.name}
    Cluster Endpoint: ${data.aws_eks_cluster.main.endpoint}
    Cluster Version: ${data.aws_eks_cluster.main.version}

    Application Endpoints:
    - API: https://api.example.com
    - Admin: https://admin.example.com

    Internal Services:
    - Database: postgres.production.svc.cluster.local:5432
    - Cache: redis.production.svc.cluster.local:6379

    Monitoring:
    - Prometheus: http://${kubernetes_service.prometheus.status[0].load_balancer[0].ingress[0].hostname}:9090
    - Grafana: http://${kubernetes_service.grafana.status[0].load_balancer[0].ingress[0].hostname}:3000
  EOT
}
```

## Sensitive Outputs

Mark sensitive outputs to prevent accidental exposure:

```hcl
output "database_password" {
  description = "Database password"
  value       = var.db_password
  sensitive   = true
}

output "api_keys" {
  description = "API keys for services"
  value = {
    stripe  = var.stripe_api_key
    sendgrid = var.sendgrid_api_key
  }
  sensitive = true
}
```

Sensitive outputs are hidden in terminal output but still accessible programmatically.

## Using Outputs with Remote State

Share outputs across Terraform workspaces:

```hcl
# Infrastructure workspace
output "cluster_endpoint" {
  value = aws_eks_cluster.main.endpoint
}

output "cluster_name" {
  value = aws_eks_cluster.main.name
}

# Application workspace
data "terraform_remote_state" "infrastructure" {
  backend = "s3"
  config = {
    bucket = "terraform-state"
    key    = "infrastructure/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "kubernetes" {
  host = data.terraform_remote_state.infrastructure.outputs.cluster_endpoint
}
```

This pattern separates infrastructure and application concerns while maintaining connectivity.

Terraform outputs make Kubernetes cluster information accessible and reusable. By structuring outputs thoughtfully, you create infrastructure that integrates seamlessly with other tools, modules, and team workflows. Outputs serve as the interface between your Terraform-managed infrastructure and the broader ecosystem of deployment, monitoring, and management tools.
