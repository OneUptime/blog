# How to Use the yamldecode and yamlencode Functions in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use the yamldecode and yamlencode functions in OpenTofu to parse and generate YAML for Kubernetes manifests and configuration files.

## Introduction

The `yamldecode` and `yamlencode` functions in OpenTofu convert between HCL data structures and YAML strings. They are particularly useful for working with Kubernetes manifests, Helm values, and other YAML-based configuration systems.

## Syntax

```hcl
yamldecode(string)
yamlencode(value)
```

## Basic Examples

```hcl
output "decode_yaml" {
  value = yamldecode("name: example\ncount: 3")
  # Returns: {count = 3, name = "example"}
}

output "encode_yaml" {
  value = yamlencode({name = "example", count = 3})
  # Returns: "count: 3\nname: example\n"
}
```

## Practical Use Cases

### Reading YAML Config Files

```hcl
locals {
  app_config = yamldecode(file("${path.module}/config/app.yaml"))
}

output "replica_count" {
  value = local.app_config.replicas
}

resource "kubernetes_deployment" "app" {
  metadata {
    name = local.app_config.name
  }

  spec {
    replicas = local.app_config.replicas
    # ...
  }
}
```

### Generating Kubernetes Manifests

```hcl
locals {
  deployment = yamlencode({
    apiVersion = "apps/v1"
    kind       = "Deployment"
    metadata = {
      name      = "app"
      namespace = var.namespace
    }
    spec = {
      replicas = var.replicas
      selector = {
        matchLabels = {
          app = "app"
        }
      }
      template = {
        metadata = {
          labels = {
            app = "app"
          }
        }
        spec = {
          containers = [{
            name  = "app"
            image = var.image
            ports = [{ containerPort = 8080 }]
          }]
        }
      }
    }
  })
}

resource "local_file" "deployment" {
  content  = local.deployment
  filename = "${path.module}/manifests/deployment.yaml"
}
```

### Parsing Helm Values

```hcl
locals {
  helm_values = yamldecode(file("${path.module}/helm/values.yaml"))
}

resource "helm_release" "app" {
  name       = "my-app"
  chart      = "app-chart"
  repository = "https://charts.example.com"

  values = [yamlencode(merge(local.helm_values, {
    image = {
      tag = var.app_version
    }
    replicaCount = var.replicas
  }))]
}
```

### Decoding YAML from a Variable

```hcl
variable "config_yaml" {
  type    = string
  default = "environment: production\ndebug: false"
}

locals {
  config = yamldecode(var.config_yaml)
}

output "is_production" {
  value = local.config.environment == "production"
}
```

## Step-by-Step Usage

1. Use `yamldecode(file(...))` to parse YAML configuration files.
2. Use `yamlencode(object)` to generate YAML output for Kubernetes or Helm.
3. Test in `tofu console`:

```bash
tofu console

> yamldecode("key: value\ncount: 5")
{count = 5, key = "value"}
> yamlencode({key = "value"})
"key: value\n"
```

## yamldecode vs jsondecode

Both produce the same HCL data types. Use whichever matches your input format. JSON and YAML are largely interchangeable for OpenTofu data processing.

## Conclusion

The `yamldecode` and `yamlencode` functions bridge the gap between OpenTofu's HCL and the YAML-heavy world of Kubernetes and Helm. Use them to read YAML configuration files, generate Kubernetes manifests, and pass structured data to Helm charts.
