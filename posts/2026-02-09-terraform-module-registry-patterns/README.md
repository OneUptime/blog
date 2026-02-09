# How to Build Terraform Module Registry for Reusable Kubernetes Patterns

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Modules

Description: Create a private Terraform module registry to share reusable Kubernetes deployment patterns across your organization, improving consistency and reducing duplication.

---

As your Kubernetes infrastructure grows, you'll notice patterns emerging across deployments. Rather than duplicating configuration, Terraform modules let you package these patterns for reuse. A module registry provides a centralized location to store, version, and distribute modules across teams. This approach improves consistency, reduces errors, and accelerates development by giving teams pre-built, tested components.

## Understanding Terraform Modules

A Terraform module is a container for multiple resources used together. Modules have inputs (variables), outputs, and can include other modules. The simplest module is a directory with Terraform files.

## Creating a Basic Deployment Module

Start with a module that deploys a standard Kubernetes application:

```hcl
# modules/k8s-app/variables.tf
variable "app_name" {
  description = "Application name"
  type        = string
}

variable "namespace" {
  description = "Kubernetes namespace"
  type        = string
}

variable "image" {
  description = "Container image"
  type        = string
}

variable "replicas" {
  description = "Number of replicas"
  type        = number
  default     = 2
}

variable "port" {
  description = "Container port"
  type        = number
  default     = 8080
}

variable "resources" {
  description = "Resource requests and limits"
  type = object({
    cpu_request    = string
    memory_request = string
    cpu_limit      = string
    memory_limit   = string
  })
  default = {
    cpu_request    = "100m"
    memory_request = "128Mi"
    cpu_limit      = "500m"
    memory_limit   = "512Mi"
  }
}

variable "env_vars" {
  description = "Environment variables"
  type        = map(string)
  default     = {}
}

# modules/k8s-app/main.tf
resource "kubernetes_deployment" "app" {
  metadata {
    name      = var.app_name
    namespace = var.namespace
    labels = {
      app = var.app_name
    }
  }

  spec {
    replicas = var.replicas

    selector {
      match_labels = {
        app = var.app_name
      }
    }

    template {
      metadata {
        labels = {
          app = var.app_name
        }
      }

      spec {
        container {
          name  = var.app_name
          image = var.image

          port {
            container_port = var.port
          }

          resources {
            requests = {
              cpu    = var.resources.cpu_request
              memory = var.resources.memory_request
            }
            limits = {
              cpu    = var.resources.cpu_limit
              memory = var.resources.memory_limit
            }
          }

          dynamic "env" {
            for_each = var.env_vars
            content {
              name  = env.key
              value = env.value
            }
          }

          liveness_probe {
            http_get {
              path = "/health"
              port = var.port
            }
            initial_delay_seconds = 30
            period_seconds        = 10
          }

          readiness_probe {
            http_get {
              path = "/ready"
              port = var.port
            }
            initial_delay_seconds = 10
            period_seconds        = 5
          }
        }
      }
    }
  }
}

resource "kubernetes_service" "app" {
  metadata {
    name      = var.app_name
    namespace = var.namespace
  }

  spec {
    selector = {
      app = var.app_name
    }

    port {
      port        = 80
      target_port = var.port
    }

    type = "ClusterIP"
  }
}

# modules/k8s-app/outputs.tf
output "deployment_name" {
  description = "Name of the deployment"
  value       = kubernetes_deployment.app.metadata[0].name
}

output "service_name" {
  description = "Name of the service"
  value       = kubernetes_service.app.metadata[0].name
}

output "service_endpoint" {
  description = "Internal service endpoint"
  value       = "${kubernetes_service.app.metadata[0].name}.${kubernetes_service.app.metadata[0].namespace}.svc.cluster.local"
}
```

Use the module in your root configuration:

```hcl
module "api_service" {
  source = "./modules/k8s-app"

  app_name  = "api"
  namespace = "production"
  image     = "myapp/api:v1.0.0"
  replicas  = 3
  port      = 8080

  env_vars = {
    DATABASE_URL = "postgres://db:5432/app"
    LOG_LEVEL    = "info"
  }

  resources = {
    cpu_request    = "500m"
    memory_request = "512Mi"
    cpu_limit      = "1000m"
    memory_limit   = "1Gi"
  }
}

module "worker_service" {
  source = "./modules/k8s-app"

  app_name  = "worker"
  namespace = "production"
  image     = "myapp/worker:v1.0.0"
  replicas  = 2
  port      = 9000

  env_vars = {
    QUEUE_URL = "redis://redis:6379"
  }
}
```

## Creating a StatefulSet Module

Build a module for stateful applications:

```hcl
# modules/k8s-statefulset/variables.tf
variable "app_name" {
  description = "Application name"
  type        = string
}

variable "namespace" {
  description = "Kubernetes namespace"
  type        = string
}

variable "image" {
  description = "Container image"
  type        = string
}

variable "replicas" {
  description = "Number of replicas"
  type        = number
  default     = 3
}

variable "port" {
  description = "Container port"
  type        = number
}

variable "storage_size" {
  description = "Storage size per pod"
  type        = string
  default     = "10Gi"
}

variable "storage_class" {
  description = "Storage class name"
  type        = string
  default     = "standard"
}

# modules/k8s-statefulset/main.tf
resource "kubernetes_service" "headless" {
  metadata {
    name      = var.app_name
    namespace = var.namespace
  }

  spec {
    selector = {
      app = var.app_name
    }

    port {
      port        = var.port
      target_port = var.port
    }

    cluster_ip = "None"
  }
}

resource "kubernetes_stateful_set" "app" {
  metadata {
    name      = var.app_name
    namespace = var.namespace
  }

  spec {
    service_name = kubernetes_service.headless.metadata[0].name
    replicas     = var.replicas

    selector {
      match_labels = {
        app = var.app_name
      }
    }

    template {
      metadata {
        labels = {
          app = var.app_name
        }
      }

      spec {
        container {
          name  = var.app_name
          image = var.image

          port {
            container_port = var.port
            name          = "main"
          }

          volume_mount {
            name       = "data"
            mount_path = "/data"
          }
        }
      }
    }

    volume_claim_template {
      metadata {
        name = "data"
      }

      spec {
        access_modes = ["ReadWriteOnce"]
        resources {
          requests = {
            storage = var.storage_size
          }
        }
        storage_class_name = var.storage_class
      }
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

# modules/k8s-statefulset/outputs.tf
output "statefulset_name" {
  value = kubernetes_stateful_set.app.metadata[0].name
}

output "service_name" {
  value = kubernetes_service.headless.metadata[0].name
}

output "pod_fqdns" {
  description = "FQDNs for each pod"
  value = [
    for i in range(var.replicas) :
    "${var.app_name}-${i}.${kubernetes_service.headless.metadata[0].name}.${var.namespace}.svc.cluster.local"
  ]
}
```

## Creating a Namespace Module with RBAC

Package namespace creation with standard RBAC:

```hcl
# modules/k8s-namespace/variables.tf
variable "name" {
  description = "Namespace name"
  type        = string
}

variable "resource_quota" {
  description = "Resource quota limits"
  type = object({
    cpu    = string
    memory = string
  })
  default = null
}

variable "service_accounts" {
  description = "Service accounts to create"
  type        = set(string)
  default     = []
}

# modules/k8s-namespace/main.tf
resource "kubernetes_namespace" "this" {
  metadata {
    name = var.name
    labels = {
      name       = var.name
      managed-by = "terraform"
    }
  }
}

resource "kubernetes_resource_quota" "this" {
  count = var.resource_quota != null ? 1 : 0

  metadata {
    name      = "default-quota"
    namespace = kubernetes_namespace.this.metadata[0].name
  }

  spec {
    hard = {
      "requests.cpu"    = var.resource_quota.cpu
      "requests.memory" = var.resource_quota.memory
      "limits.cpu"      = var.resource_quota.cpu
      "limits.memory"   = var.resource_quota.memory
    }
  }
}

resource "kubernetes_service_account" "this" {
  for_each = var.service_accounts

  metadata {
    name      = each.key
    namespace = kubernetes_namespace.this.metadata[0].name
  }
}

resource "kubernetes_network_policy" "deny_all_ingress" {
  metadata {
    name      = "deny-all-ingress"
    namespace = kubernetes_namespace.this.metadata[0].name
  }

  spec {
    pod_selector {}
    policy_types = ["Ingress"]
  }
}

# modules/k8s-namespace/outputs.tf
output "name" {
  value = kubernetes_namespace.this.metadata[0].name
}

output "service_accounts" {
  value = {
    for sa in kubernetes_service_account.this :
    sa.metadata[0].name => sa.metadata[0].name
  }
}
```

## Publishing to GitHub for Module Registry

Terraform can use GitHub releases as a module source. Structure your repository:

```
terraform-k8s-modules/
├── README.md
├── modules/
│   ├── k8s-app/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── k8s-statefulset/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── k8s-namespace/
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
└── examples/
    ├── simple-app/
    │   └── main.tf
    └── stateful-app/
        └── main.tf
```

Tag releases following semantic versioning:

```bash
git tag -a v1.0.0 -m "Initial release"
git push origin v1.0.0
```

Reference modules from GitHub:

```hcl
module "api_service" {
  source = "github.com/yourorg/terraform-k8s-modules//modules/k8s-app?ref=v1.0.0"

  app_name  = "api"
  namespace = "production"
  image     = "myapp/api:v1.0.0"
}
```

## Using Private Module Registry

For private registries (Terraform Cloud or Enterprise), publish modules following the naming convention:

```
terraform-<PROVIDER>-<NAME>
```

For Kubernetes modules:

```
terraform-kubernetes-application
terraform-kubernetes-statefulset
terraform-kubernetes-namespace
```

Configure the module with version constraints:

```hcl
module "api_service" {
  source  = "app.terraform.io/yourorg/application/kubernetes"
  version = "~> 1.0"

  app_name  = "api"
  namespace = "production"
  image     = "myapp/api:v1.0.0"
}
```

## Creating a Complete Application Stack Module

Combine multiple modules into higher-level abstractions:

```hcl
# modules/k8s-microservice-stack/variables.tf
variable "stack_name" {
  description = "Stack name"
  type        = string
}

variable "namespace" {
  description = "Kubernetes namespace"
  type        = string
}

variable "services" {
  description = "Microservices to deploy"
  type = map(object({
    image    = string
    replicas = number
    port     = number
  }))
}

variable "ingress_host" {
  description = "Ingress hostname"
  type        = string
}

# modules/k8s-microservice-stack/main.tf
module "services" {
  source   = "../k8s-app"
  for_each = var.services

  app_name  = "${var.stack_name}-${each.key}"
  namespace = var.namespace
  image     = each.value.image
  replicas  = each.value.replicas
  port      = each.value.port
}

resource "kubernetes_ingress_v1" "stack" {
  metadata {
    name      = var.stack_name
    namespace = var.namespace
  }

  spec {
    dynamic "rule" {
      for_each = var.services
      content {
        host = var.ingress_host

        http {
          path {
            path      = "/${rule.key}"
            path_type = "Prefix"

            backend {
              service {
                name = module.services[rule.key].service_name
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
}
```

Use the stack module:

```hcl
module "ecommerce_stack" {
  source = "./modules/k8s-microservice-stack"

  stack_name   = "ecommerce"
  namespace    = "production"
  ingress_host = "api.example.com"

  services = {
    products = {
      image    = "myapp/products:v1.0"
      replicas = 3
      port     = 8080
    }
    cart = {
      image    = "myapp/cart:v1.0"
      replicas = 2
      port     = 8081
    }
    checkout = {
      image    = "myapp/checkout:v1.0"
      replicas = 3
      port     = 8082
    }
  }
}
```

## Module Documentation

Document modules with clear README files:

```markdown
# Kubernetes Application Module

Deploys a standard Kubernetes application with deployment and service.

## Usage

```hcl
module "api" {
  source = "github.com/yourorg/terraform-k8s-modules//modules/k8s-app"

  app_name  = "api"
  namespace = "production"
  image     = "myapp/api:v1.0.0"
  replicas  = 3
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| app_name | Application name | string | n/a | yes |
| namespace | Kubernetes namespace | string | n/a | yes |
| image | Container image | string | n/a | yes |
| replicas | Number of replicas | number | 2 | no |

## Outputs

| Name | Description |
|------|-------------|
| deployment_name | Name of the deployment |
| service_endpoint | Internal service endpoint |
```

## Module Testing

Test modules with example configurations:

```hcl
# examples/simple-app/main.tf
provider "kubernetes" {
  config_path = "~/.kube/config"
}

module "test_app" {
  source = "../../modules/k8s-app"

  app_name  = "test"
  namespace = "default"
  image     = "nginx:latest"
}

output "service_endpoint" {
  value = module.test_app.service_endpoint
}
```

Run tests:

```bash
cd examples/simple-app
terraform init
terraform apply
terraform destroy
```

## Module Versioning Strategy

Follow semantic versioning for modules:

- **Major** (1.0.0 -> 2.0.0): Breaking changes requiring configuration updates
- **Minor** (1.0.0 -> 1.1.0): New features, backwards compatible
- **Patch** (1.0.0 -> 1.0.1): Bug fixes, no feature changes

Use version constraints in module references:

```hcl
module "api" {
  source  = "github.com/yourorg/terraform-k8s-modules//modules/k8s-app"
  version = "~> 1.0"  # Allow 1.x versions, but not 2.0

  # Configuration...
}
```

Building a Terraform module registry for Kubernetes patterns accelerates development and ensures consistency across your organization. By packaging common deployment patterns into reusable modules, you reduce duplication, minimize errors, and create a shared vocabulary for infrastructure that empowers teams to deploy applications confidently and quickly.
