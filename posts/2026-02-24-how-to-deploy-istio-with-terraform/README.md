# How to Deploy Istio with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Terraform, Kubernetes, Infrastructure as Code, DevOps

Description: Complete guide to deploying and managing Istio service mesh using Terraform with the Helm and Kubernetes providers.

---

Terraform is a natural fit for managing Istio installations. If you are already using Terraform to provision your Kubernetes clusters, extending it to install Istio keeps everything in one place. Your cluster and its service mesh get defined, versioned, and applied together.

This guide walks through deploying Istio with Terraform using the Helm provider, managing the lifecycle, and handling upgrades safely.

## Setting Up the Terraform Providers

You need two Terraform providers: the Kubernetes provider for cluster access and the Helm provider for installing charts.

```hcl
# providers.tf
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.27"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
  }
}

provider "kubernetes" {
  config_path = var.kubeconfig_path
}

provider "helm" {
  kubernetes {
    config_path = var.kubeconfig_path
  }
}

variable "kubeconfig_path" {
  description = "Path to kubeconfig file"
  type        = string
  default     = "~/.kube/config"
}
```

If your cluster is provisioned by Terraform (say on EKS or GKE), you can wire the providers directly to the cluster output:

```hcl
provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
  token                  = data.aws_eks_cluster_auth.cluster.token
}

provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
    token                  = data.aws_eks_cluster_auth.cluster.token
  }
}
```

## Defining Variables

Create variables for the settings you want to be configurable:

```hcl
# variables.tf
variable "istio_version" {
  description = "Version of Istio to install"
  type        = string
  default     = "1.22.0"
}

variable "istio_namespace" {
  description = "Namespace for Istio control plane"
  type        = string
  default     = "istio-system"
}

variable "enable_ingress_gateway" {
  description = "Whether to install the ingress gateway"
  type        = bool
  default     = true
}

variable "ingress_gateway_type" {
  description = "Service type for ingress gateway"
  type        = string
  default     = "LoadBalancer"
}

variable "pilot_resources" {
  description = "Resource requests and limits for istiod"
  type = object({
    cpu_request    = string
    memory_request = string
    cpu_limit      = string
    memory_limit   = string
  })
  default = {
    cpu_request    = "500m"
    memory_request = "2Gi"
    cpu_limit      = "1000m"
    memory_limit   = "4Gi"
  }
}
```

## Creating the Namespace

Define the Istio namespace as a Terraform resource:

```hcl
# namespace.tf
resource "kubernetes_namespace" "istio_system" {
  metadata {
    name = var.istio_namespace
    labels = {
      "istio-injection" = "disabled"
    }
  }
}

resource "kubernetes_namespace" "istio_ingress" {
  count = var.enable_ingress_gateway ? 1 : 0

  metadata {
    name = "istio-ingress"
    labels = {
      "istio-injection" = "enabled"
    }
  }
}
```

## Installing Istio Charts

Now define the Helm releases for each Istio component:

```hcl
# istio.tf
resource "helm_release" "istio_base" {
  name       = "istio-base"
  repository = "https://istio-release.storage.googleapis.com/charts"
  chart      = "base"
  version    = var.istio_version
  namespace  = kubernetes_namespace.istio_system.metadata[0].name

  set {
    name  = "defaultRevision"
    value = "default"
  }
}

resource "helm_release" "istiod" {
  name       = "istiod"
  repository = "https://istio-release.storage.googleapis.com/charts"
  chart      = "istiod"
  version    = var.istio_version
  namespace  = kubernetes_namespace.istio_system.metadata[0].name

  set {
    name  = "pilot.resources.requests.cpu"
    value = var.pilot_resources.cpu_request
  }

  set {
    name  = "pilot.resources.requests.memory"
    value = var.pilot_resources.memory_request
  }

  set {
    name  = "pilot.resources.limits.cpu"
    value = var.pilot_resources.cpu_limit
  }

  set {
    name  = "pilot.resources.limits.memory"
    value = var.pilot_resources.memory_limit
  }

  set {
    name  = "pilot.autoscaleEnabled"
    value = "true"
  }

  set {
    name  = "pilot.autoscaleMin"
    value = "2"
  }

  set {
    name  = "meshConfig.accessLogFile"
    value = "/dev/stdout"
  }

  set {
    name  = "meshConfig.enableAutoMtls"
    value = "true"
  }

  set {
    name  = "meshConfig.defaultConfig.holdApplicationUntilProxyStarts"
    value = "true"
  }

  depends_on = [helm_release.istio_base]
}

resource "helm_release" "istio_ingress" {
  count = var.enable_ingress_gateway ? 1 : 0

  name       = "istio-ingress"
  repository = "https://istio-release.storage.googleapis.com/charts"
  chart      = "gateway"
  version    = var.istio_version
  namespace  = kubernetes_namespace.istio_ingress[0].metadata[0].name

  set {
    name  = "service.type"
    value = var.ingress_gateway_type
  }

  set {
    name  = "autoscaling.enabled"
    value = "true"
  }

  set {
    name  = "autoscaling.minReplicas"
    value = "2"
  }

  depends_on = [helm_release.istiod]
}
```

The `depends_on` blocks are critical. They ensure Terraform installs the charts in the right order even though it normally tries to parallelize everything.

## Using Values Files Instead of Set Blocks

For complex configurations, `set` blocks get unwieldy. You can use a `values` block with a YAML file instead:

```hcl
resource "helm_release" "istiod" {
  name       = "istiod"
  repository = "https://istio-release.storage.googleapis.com/charts"
  chart      = "istiod"
  version    = var.istio_version
  namespace  = kubernetes_namespace.istio_system.metadata[0].name

  values = [
    templatefile("${path.module}/values/istiod.yaml", {
      pilot_cpu_request    = var.pilot_resources.cpu_request
      pilot_memory_request = var.pilot_resources.memory_request
      environment          = var.environment
    })
  ]

  depends_on = [helm_release.istio_base]
}
```

And the corresponding values template:

```yaml
# values/istiod.yaml
pilot:
  resources:
    requests:
      cpu: ${pilot_cpu_request}
      memory: ${pilot_memory_request}
  autoscaleEnabled: true
  autoscaleMin: 2
meshConfig:
  accessLogFile: /dev/stdout
  enableAutoMtls: true
```

## Defining Outputs

Export useful information from the Terraform state:

```hcl
# outputs.tf
output "istio_version" {
  value = var.istio_version
}

output "ingress_gateway_status" {
  value = var.enable_ingress_gateway ? helm_release.istio_ingress[0].status : "disabled"
}
```

## Applying the Configuration

Run through the standard Terraform workflow:

```bash
terraform init
terraform plan -out=istio.plan
terraform apply istio.plan
```

The plan output shows you exactly what will be created before you apply anything. This is one of the big advantages over running Helm commands directly.

## Handling Upgrades

To upgrade Istio, change the `istio_version` variable and run plan and apply again:

```bash
terraform plan -var="istio_version=1.23.0" -out=upgrade.plan
terraform apply upgrade.plan
```

Terraform handles the upgrade ordering through the dependency chain. Base upgrades first, then istiod, then the gateway.

## State Management

Store your Terraform state remotely so the team shares a single source of truth:

```hcl
terraform {
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "istio/terraform.tfstate"
    region = "us-east-1"
  }
}
```

## Tearing Down

If you need to remove Istio completely:

```bash
terraform destroy
```

Terraform destroys resources in reverse dependency order, so the gateway goes first, then istiod, then base, and finally the namespaces.

Using Terraform for Istio deployment gives you all the benefits you already get from infrastructure as code: plan before apply, state tracking, dependency management, and easy integration with the rest of your infrastructure. If Terraform is already your tool of choice for cluster management, extending it to cover Istio is a natural next step.
