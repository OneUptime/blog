# How to Manage Crds Kubernetes with OpenTofu on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Kubernetes, Infrastructure as Code, K8s, Container Orchestration

Description: Learn how to manage Kubernetes manage crds kubernetes with OpenTofu for declarative, version-controlled Kubernetes configuration.

## Introduction

CustomResourceDefinitions (CRDs) extend the Kubernetes API with new resource types. With OpenTofu, you can manage those definitions declaratively after your cluster is reachable. This guide covers a working configuration for managing CRDs with the Kubernetes provider.

## Provider Setup

```hcl
terraform {
  required_providers {
    kubernetes = {
      source = "hashicorp/kubernetes"
    }
  }
}

provider "kubernetes" {
  config_path    = "~/.kube/config"
  config_context = var.kube_context
}
```

Resource Configuration

```hcl
resource "kubernetes_manifest" "crontab_crd" {
  manifest = {
    apiVersion = "apiextensions.k8s.io/v1"
    kind       = "CustomResourceDefinition"

    metadata = {
      name = "${var.crd_plural}.${var.crd_group}"
    }

    spec = {
      group = var.crd_group

      names = {
        kind       = var.crd_kind
        plural     = var.crd_plural
        singular   = var.crd_singular
        shortNames = var.crd_short_names
      }

      scope = var.crd_scope

      versions = [
        {
          name    = var.crd_version
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
                  }
                }
              }
            }
          }
        }
      ]
    }
  }
}
```

## Variables

```hcl
variable "kube_context"    { type = string }
variable "crd_group"       { type = string; default = "stable.example.com" }
variable "crd_kind"        { type = string; default = "CronTab" }
variable "crd_plural"      { type = string; default = "crontabs" }
variable "crd_singular"    { type = string; default = "crontab" }
variable "crd_short_names" { type = list(string); default = ["ct"] }
variable "crd_scope"       { type = string; default = "Namespaced" }
variable "crd_version"     { type = string; default = "v1" }
```

## Conclusion

CRDs managed with OpenTofu benefit from the same declarative workflow as other infrastructure code, but `kubernetes_manifest` validates against the live Kubernetes API during planning, so the cluster must already be reachable. Use `kubernetes_manifest` for CRDs and other resources not yet modeled by first-class provider resources, define a structural `openAPIV3Schema` for `apiextensions.k8s.io/v1`, and apply the CRD before creating custom resources that depend on it.
