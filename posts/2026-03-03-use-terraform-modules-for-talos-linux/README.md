# How to Use Terraform Modules for Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Terraform, Modules, Infrastructure as Code, Reusable Code

Description: Learn how to build and use Terraform modules for Talos Linux to create reusable, composable infrastructure components for cluster deployment.

---

As your Talos Linux infrastructure grows, you will find yourself repeating the same Terraform patterns across clusters and environments. Terraform modules solve this by encapsulating common patterns into reusable components. Instead of copying and pasting Terraform code for each new cluster, you define a module once and instantiate it with different parameters.

This guide covers building Terraform modules for Talos Linux, from simple single-purpose modules to comprehensive cluster modules that handle the entire deployment.

## Why Use Modules?

Without modules, each Talos cluster deployment is a standalone Terraform project with its own copy of all the configuration code. This leads to:

- **Code duplication**: The same patterns repeated across dozens of projects
- **Inconsistency**: Small differences between clusters that are hard to track
- **Maintenance burden**: Bug fixes and improvements need to be applied everywhere manually

Modules solve these problems by providing a single, versioned source of truth for your infrastructure patterns.

## Building a Basic Talos Cluster Module

Let's build a module that creates a complete Talos cluster:

```text
modules/
  talos-cluster/
    main.tf
    variables.tf
    outputs.tf
    versions.tf
```

### Module Structure

```hcl
# modules/talos-cluster/versions.tf
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    talos = {
      source  = "siderolabs/talos"
      version = "~> 0.5.0"
    }
  }
}
```

```hcl
# modules/talos-cluster/variables.tf
variable "cluster_name" {
  description = "Name of the cluster"
  type        = string
}

variable "talos_version" {
  description = "Talos Linux version"
  type        = string
  default     = "v1.7.0"
}

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "v1.30.0"
}

variable "cluster_endpoint" {
  description = "Kubernetes API endpoint URL"
  type        = string
}

variable "controlplane_nodes" {
  description = "Control plane node definitions"
  type = list(object({
    ip       = string
    hostname = string
  }))
}

variable "worker_nodes" {
  description = "Worker node definitions"
  type = list(object({
    ip       = string
    hostname = string
    labels   = optional(map(string), {})
  }))
  default = []
}

variable "installer_image" {
  description = "Custom installer image (from Image Factory)"
  type        = string
  default     = ""
}

variable "controlplane_patches" {
  description = "Config patches for control plane nodes"
  type        = list(string)
  default     = []
}

variable "worker_patches" {
  description = "Config patches for worker nodes"
  type        = list(string)
  default     = []
}

variable "common_patches" {
  description = "Config patches for all nodes"
  type        = list(string)
  default     = []
}
```

```hcl
# modules/talos-cluster/main.tf

locals {
  base_install_patch = var.installer_image != "" ? [
    yamlencode({
      machine = {
        install = {
          image = var.installer_image
        }
      }
    })
  ] : []
}

# Generate cluster secrets
resource "talos_machine_secrets" "this" {
  talos_version = var.talos_version
}

# Control plane configuration
data "talos_machine_configuration" "controlplane" {
  cluster_name       = var.cluster_name
  machine_type       = "controlplane"
  cluster_endpoint   = var.cluster_endpoint
  machine_secrets    = talos_machine_secrets.this.machine_secrets
  kubernetes_version = var.kubernetes_version
  talos_version      = var.talos_version

  config_patches = concat(
    local.base_install_patch,
    var.common_patches,
    var.controlplane_patches
  )
}

# Worker configuration
data "talos_machine_configuration" "worker" {
  cluster_name       = var.cluster_name
  machine_type       = "worker"
  cluster_endpoint   = var.cluster_endpoint
  machine_secrets    = talos_machine_secrets.this.machine_secrets
  kubernetes_version = var.kubernetes_version
  talos_version      = var.talos_version

  config_patches = concat(
    local.base_install_patch,
    var.common_patches,
    var.worker_patches
  )
}

# Apply control plane configs
resource "talos_machine_configuration_apply" "controlplane" {
  for_each = {
    for node in var.controlplane_nodes : node.hostname => node
  }

  client_configuration        = talos_machine_secrets.this.client_configuration
  machine_configuration_input = data.talos_machine_configuration.controlplane.machine_configuration
  node                        = each.value.ip

  config_patches = [
    yamlencode({
      machine = {
        network = {
          hostname = each.key
        }
      }
    })
  ]
}

# Apply worker configs
resource "talos_machine_configuration_apply" "worker" {
  for_each = {
    for node in var.worker_nodes : node.hostname => node
  }

  depends_on = [talos_machine_bootstrap.this]

  client_configuration        = talos_machine_secrets.this.client_configuration
  machine_configuration_input = data.talos_machine_configuration.worker.machine_configuration
  node                        = each.value.ip

  config_patches = [
    yamlencode({
      machine = {
        network = {
          hostname = each.key
        }
        nodeLabels = each.value.labels
      }
    })
  ]
}

# Bootstrap
resource "talos_machine_bootstrap" "this" {
  depends_on = [talos_machine_configuration_apply.controlplane]

  client_configuration = talos_machine_secrets.this.client_configuration
  node                 = var.controlplane_nodes[0].ip
}

# Kubeconfig
data "talos_cluster_kubeconfig" "this" {
  depends_on = [talos_machine_bootstrap.this]

  client_configuration = talos_machine_secrets.this.client_configuration
  node                 = var.controlplane_nodes[0].ip
}

# Client configuration
data "talos_client_configuration" "this" {
  cluster_name         = var.cluster_name
  client_configuration = talos_machine_secrets.this.client_configuration
  nodes                = [for node in var.controlplane_nodes : node.ip]
  endpoints            = [for node in var.controlplane_nodes : node.ip]
}
```

```hcl
# modules/talos-cluster/outputs.tf
output "kubeconfig" {
  description = "Kubeconfig for cluster access"
  value       = data.talos_cluster_kubeconfig.this.kubeconfig_raw
  sensitive   = true
}

output "talosconfig" {
  description = "Talos client configuration"
  value       = data.talos_client_configuration.this.talos_config
  sensitive   = true
}

output "client_configuration" {
  description = "Client configuration for additional operations"
  value       = talos_machine_secrets.this.client_configuration
  sensitive   = true
}

output "machine_secrets" {
  description = "Machine secrets for the cluster"
  value       = talos_machine_secrets.this.machine_secrets
  sensitive   = true
}

output "cluster_name" {
  description = "Name of the cluster"
  value       = var.cluster_name
}
```

## Using the Module

Now you can create clusters with a few lines of code:

```hcl
# environments/production/main.tf
module "production_cluster" {
  source = "../../modules/talos-cluster"

  cluster_name     = "production"
  cluster_endpoint = "https://10.0.0.1:6443"
  talos_version    = "v1.7.0"

  controlplane_nodes = [
    { ip = "10.0.0.10", hostname = "prod-cp-01" },
    { ip = "10.0.0.11", hostname = "prod-cp-02" },
    { ip = "10.0.0.12", hostname = "prod-cp-03" },
  ]

  worker_nodes = [
    { ip = "10.0.0.20", hostname = "prod-worker-01", labels = {} },
    { ip = "10.0.0.21", hostname = "prod-worker-02", labels = {} },
    { ip = "10.0.0.22", hostname = "prod-worker-03", labels = {} },
  ]

  installer_image = "factory.talos.dev/installer/abc123:v1.7.0"

  common_patches = [
    file("${path.module}/patches/network.yaml"),
    file("${path.module}/patches/time.yaml"),
  ]
}

output "kubeconfig" {
  value     = module.production_cluster.kubeconfig
  sensitive = true
}
```

### Creating Multiple Clusters

```hcl
# environments/multi-cluster/main.tf

module "staging" {
  source = "../../modules/talos-cluster"

  cluster_name     = "staging"
  cluster_endpoint = "https://10.1.0.1:6443"

  controlplane_nodes = [
    { ip = "10.1.0.10", hostname = "staging-cp-01" },
  ]

  worker_nodes = [
    { ip = "10.1.0.20", hostname = "staging-worker-01", labels = {} },
  ]
}

module "production" {
  source = "../../modules/talos-cluster"

  cluster_name     = "production"
  cluster_endpoint = "https://10.0.0.1:6443"

  controlplane_nodes = [
    { ip = "10.0.0.10", hostname = "prod-cp-01" },
    { ip = "10.0.0.11", hostname = "prod-cp-02" },
    { ip = "10.0.0.12", hostname = "prod-cp-03" },
  ]

  worker_nodes = [
    { ip = "10.0.0.20", hostname = "prod-worker-01", labels = {} },
    { ip = "10.0.0.21", hostname = "prod-worker-02", labels = {} },
    { ip = "10.0.0.22", hostname = "prod-worker-03", labels = {} },
    { ip = "10.0.0.23", hostname = "prod-worker-04", labels = {} },
    { ip = "10.0.0.24", hostname = "prod-worker-05", labels = {} },
  ]
}
```

## Building Specialized Sub-Modules

### Image Factory Module

Create a module that handles Image Factory schematics:

```hcl
# modules/talos-image/main.tf
variable "extensions" {
  description = "List of system extensions"
  type        = list(string)
  default     = []
}

variable "extra_kernel_args" {
  description = "Extra kernel arguments"
  type        = list(string)
  default     = []
}

variable "talos_version" {
  description = "Talos version"
  type        = string
}

locals {
  schematic = yamlencode({
    customization = {
      systemExtensions = {
        officialExtensions = var.extensions
      }
      extraKernelArgs = var.extra_kernel_args
    }
  })
}

# Submit the schematic via HTTP data source
data "http" "schematic" {
  url    = "https://factory.talos.dev/schematics"
  method = "POST"

  request_body = local.schematic
  request_headers = {
    Content-Type = "application/yaml"
  }
}

locals {
  schematic_id = jsondecode(data.http.schematic.response_body).id
}

output "schematic_id" {
  value = local.schematic_id
}

output "installer_image" {
  value = "factory.talos.dev/installer/${local.schematic_id}:${var.talos_version}"
}

output "iso_url" {
  value = "https://factory.talos.dev/image/${local.schematic_id}/${var.talos_version}/metal-amd64.iso"
}
```

### Using the Image Module with the Cluster Module

```hcl
# Combine modules for a complete workflow
module "talos_image" {
  source = "../../modules/talos-image"

  talos_version = "v1.7.0"
  extensions = [
    "siderolabs/intel-ucode",
    "siderolabs/iscsi-tools",
    "siderolabs/util-linux-tools",
  ]
}

module "cluster" {
  source = "../../modules/talos-cluster"

  cluster_name    = "production"
  cluster_endpoint = "https://10.0.0.1:6443"
  installer_image = module.talos_image.installer_image

  controlplane_nodes = [
    { ip = "10.0.0.10", hostname = "cp-01" },
  ]

  worker_nodes = [
    { ip = "10.0.0.20", hostname = "worker-01", labels = {} },
  ]
}
```

## Publishing Modules

Share modules across your organization through a private registry or git:

```hcl
# Using modules from git
module "cluster" {
  source = "git::https://github.com/myorg/terraform-talos-modules.git//modules/talos-cluster?ref=v1.0.0"

  cluster_name = "production"
  # ...
}
```

## Module Versioning

Tag your modules to enable version pinning:

```bash
# Tag a release
git tag v1.0.0
git push origin v1.0.0

# Use specific versions
module "cluster" {
  source = "git::https://github.com/myorg/terraform-talos-modules.git//modules/talos-cluster?ref=v1.0.0"
}
```

## Testing Modules

Validate your modules work correctly:

```bash
# Validate syntax
terraform validate

# Format check
terraform fmt -check -recursive

# Plan without applying (smoke test)
terraform plan -var-file=test.tfvars
```

For automated testing, use tools like Terratest:

```go
// talos_cluster_test.go
package test

import (
    "testing"
    "github.com/gruntwork-io/terratest/modules/terraform"
)

func TestTalosCluster(t *testing.T) {
    opts := &terraform.Options{
        TerraformDir: "../examples/basic-cluster",
    }

    defer terraform.Destroy(t, opts)
    terraform.InitAndApply(t, opts)

    // Verify outputs
    kubeconfig := terraform.Output(t, opts, "kubeconfig")
    if kubeconfig == "" {
        t.Fatal("Expected non-empty kubeconfig")
    }
}
```

## Wrapping Up

Terraform modules bring reusability and consistency to Talos Linux deployments. By encapsulating cluster creation, image management, and configuration patterns into modules, you reduce duplication, standardize your deployments, and make it easy for anyone on your team to create and manage clusters. Start with a single cluster module, add specialized sub-modules as your needs grow, and version everything for safe, predictable upgrades. The investment in building good modules pays off quickly as your infrastructure scales.
