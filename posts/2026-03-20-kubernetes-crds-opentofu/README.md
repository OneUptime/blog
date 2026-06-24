# How to Manage CRDs with OpenTofu on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Kubernetes, Infrastructure as Code, IaC, CRD, Custom Resources

Description: Learn how to install and manage Kubernetes Custom Resource Definitions with OpenTofu for operator-managed resources.

## Introduction

This guide covers How to Manage CRDs with OpenTofu on Kubernetes using OpenTofu with practical examples for defining a CRD and then managing an instance of that custom resource. The same workflow applies to operator-managed resources after their CRDs are installed in the cluster.

## Prerequisites

- OpenTofu v1.6+
- Access to a Kubernetes cluster and a kubeconfig entry for it
- HashiCorp Kubernetes provider configured

## Step 1: Configure the Provider

```hcl
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 3.0"
    }
  }
}

provider "kubernetes" {
  config_path    = "~/.kube/config"
  config_context = var.kube_context
}
```

## Step 2: Define Variables

```hcl
variable "kube_context" {
  description = "Kubernetes context to use from kubeconfig. Leave null to use the current context."
  type        = string
  default     = null
}

variable "namespace" {
  description = "Namespace for namespaced custom resources"
  type        = string
  default     = "default"
}

variable "crontab_name" {
  description = "Name of the sample custom resource"
  type        = string
  default     = "my-new-cron-object"
}

variable "cron_image" {
  description = "Image value stored in the sample custom resource"
  type        = string
  default     = "busybox:1.36"
}
```

## Step 3: Create the Namespace and CRD

```hcl
# Namespace for namespaced custom resources
resource "kubernetes_namespace_v1" "app" {
  metadata {
    name = var.namespace
    labels = {
      "managed-by" = "opentofu"
    }
  }
}

resource "kubernetes_manifest" "crontab_crd" {
  manifest = {
    apiVersion = "apiextensions.k8s.io/v1"
    kind       = "CustomResourceDefinition"

    metadata = {
      name = "crontabs.stable.example.com"
    }

    spec = {
      group = "stable.example.com"
      scope = "Namespaced"

      names = {
        plural     = "crontabs"
        singular   = "crontab"
        kind       = "CronTab"
        shortNames = ["ct"]
      }

      versions = [{
        name    = "v1"
        served  = true
        storage = true

        schema = {
          openAPIV3Schema = {
            type = "object"

            properties = {
              spec = {
                type = "object"

                properties = {
                  cronSpec = {
                    type = "string"
                  }
                  image = {
                    type = "string"
                  }
                  replicas = {
                    type    = "integer"
                    minimum = 1
                    maximum = 10
                  }
                }

                required = ["cronSpec", "image"]
              }
            }
          }
        }
      }]
    }
  }

  wait {
    condition {
      type   = "Established"
      status = "True"
    }
  }
}
```

## Step 4: Create a Custom Resource

```hcl
# OpenTofu can only plan this resource after the CRD exists in the cluster.
resource "kubernetes_manifest" "my_crontab" {
  manifest = {
    apiVersion = "stable.example.com/v1"
    kind       = "CronTab"

    metadata = {
      name      = var.crontab_name
      namespace = var.namespace
      labels = {
        "managed-by" = "opentofu"
      }
    }

    spec = {
      cronSpec = "*/5 * * * *"
      image    = var.cron_image
      replicas = 1
    }
  }

  depends_on = [
    kubernetes_namespace_v1.app,
    kubernetes_manifest.crontab_crd,
  ]
}
```

## Step 5: Manage the Apply Order

`depends_on` controls the apply order, but `kubernetes_manifest` also validates custom resources against the live Kubernetes API during planning. Because of that, the CRD must already exist before OpenTofu can plan the `CronTab` resource.

## Step 6: Define Outputs

```hcl
output "namespace" {
  value = kubernetes_namespace_v1.app.metadata[0].name
}

output "crd_name" {
  value = kubernetes_manifest.crontab_crd.object.metadata.name
}

output "custom_resource_name" {
  value = kubernetes_manifest.my_crontab.object.metadata.name
}
```

## Step 7: Deploy

```bash
tofu init
tofu apply -target=kubernetes_manifest.crontab_crd
tofu plan
tofu apply
```

## Best Practices

- Apply CRDs before custom resources because `kubernetes_manifest` validates against the live Kubernetes API during planning
- Use `apiextensions.k8s.io/v1` with a structural `openAPIV3Schema` for CRD definitions
- Wait for the CRD `Established` condition before creating instances of that custom resource
- Keep cluster creation separate from the OpenTofu configuration that uses `kubernetes_manifest`, because the provider needs API access during planning
- Remember that a CRD only defines the API; a controller or operator is still required if the custom resource should reconcile into running workloads

## Conclusion

You have successfully configured How to Manage CRDs with OpenTofu on Kubernetes using OpenTofu. This approach lets you manage cluster extensions alongside your infrastructure code. For operator-managed resources, install the CRDs first and then manage the custom resources with `kubernetes_manifest`.
