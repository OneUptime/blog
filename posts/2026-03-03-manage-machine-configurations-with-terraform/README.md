# How to Manage Machine Configurations with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Terraform, Machine Configuration, Infrastructure as Code, Kubernetes

Description: Learn how to manage Talos Linux machine configurations using Terraform, including patches, per-node customization, and configuration updates.

---

Machine configurations are the heart of Talos Linux. They define everything about a node - from network settings and disk layout to Kubernetes configuration and system extensions. Managing these configurations at scale requires tooling that can handle templating, per-node customization, and controlled rollouts. Terraform's declarative approach and state management make it an excellent choice for this task.

This guide explores the details of managing Talos machine configurations with Terraform, focusing on the patterns and techniques that make real-world deployments manageable.

## Machine Configuration Basics

A Talos machine configuration is a YAML document that describes how a node should be configured. It includes sections for:

- **Machine config**: Install disk, network, time, kubelet settings
- **Cluster config**: API server, controller manager, scheduler, etcd, CNI

The Talos Terraform provider generates these configurations from a set of inputs and then applies them to nodes. The key resources are:

- `talos_machine_secrets` - generates the cluster PKI material
- `talos_machine_configuration` (data source) - generates a machine configuration
- `talos_machine_configuration_apply` - applies a configuration to a node

## Generating Base Configurations

Start with base configurations for each node role:

```hcl
# secrets.tf
resource "talos_machine_secrets" "this" {
  talos_version = var.talos_version
}

# configurations.tf
data "talos_machine_configuration" "controlplane" {
  cluster_name       = var.cluster_name
  machine_type       = "controlplane"
  cluster_endpoint   = "https://${var.cluster_vip}:6443"
  machine_secrets    = talos_machine_secrets.this.machine_secrets
  kubernetes_version = var.kubernetes_version
  talos_version      = var.talos_version
}

data "talos_machine_configuration" "worker" {
  cluster_name       = var.cluster_name
  machine_type       = "worker"
  cluster_endpoint   = "https://${var.cluster_vip}:6443"
  machine_secrets    = talos_machine_secrets.this.machine_secrets
  kubernetes_version = var.kubernetes_version
  talos_version      = var.talos_version
}
```

These base configurations include sensible defaults but usually need customization for your environment.

## Using Config Patches

Config patches are the primary mechanism for customizing machine configurations. They use strategic merge patch semantics - you specify only the fields you want to change, and they are merged with the base configuration.

### Global Patches

Apply patches to all nodes of a type:

```hcl
data "talos_machine_configuration" "controlplane" {
  cluster_name       = var.cluster_name
  machine_type       = "controlplane"
  cluster_endpoint   = "https://${var.cluster_vip}:6443"
  machine_secrets    = talos_machine_secrets.this.machine_secrets
  kubernetes_version = var.kubernetes_version

  config_patches = [
    # Custom installer image
    yamlencode({
      machine = {
        install = {
          image = var.installer_image
          disk  = "/dev/sda"
        }
      }
    }),

    # Network configuration
    yamlencode({
      machine = {
        network = {
          nameservers = ["8.8.8.8", "8.8.4.4"]
        }
        time = {
          servers = ["time.cloudflare.com"]
        }
      }
    }),

    # Kubelet configuration
    yamlencode({
      machine = {
        kubelet = {
          extraArgs = {
            rotate-server-certificates = "true"
          }
        }
      }
    }),

    # Cluster-level settings
    yamlencode({
      cluster = {
        proxy = {
          disabled = true  # Using Cilium instead of kube-proxy
        }
        network = {
          cni = {
            name = "none"  # Will install Cilium manually
          }
        }
      }
    })
  ]
}
```

### Per-Node Patches

Apply node-specific patches when applying the configuration:

```hcl
resource "talos_machine_configuration_apply" "controlplane" {
  count = length(var.controlplane_nodes)

  client_configuration        = talos_machine_secrets.this.client_configuration
  machine_configuration_input = data.talos_machine_configuration.controlplane.machine_configuration
  node                        = var.controlplane_nodes[count.index].ip

  config_patches = [
    # Per-node hostname
    yamlencode({
      machine = {
        network = {
          hostname = var.controlplane_nodes[count.index].hostname
        }
      }
    }),

    # Per-node static IP (if not using DHCP)
    yamlencode({
      machine = {
        network = {
          interfaces = [
            {
              interface = "eth0"
              addresses = ["${var.controlplane_nodes[count.index].ip}/24"]
              routes = [
                {
                  network = "0.0.0.0/0"
                  gateway = var.gateway_ip
                }
              ]
            }
          ]
        }
      }
    })
  ]
}
```

## Managing Node Definitions with Variables

Define your nodes in a structured variable:

```hcl
# variables.tf
variable "controlplane_nodes" {
  description = "Control plane node definitions"
  type = list(object({
    ip       = string
    hostname = string
    disk     = optional(string, "/dev/sda")
  }))
  default = [
    { ip = "10.0.0.10", hostname = "cp-01" },
    { ip = "10.0.0.11", hostname = "cp-02" },
    { ip = "10.0.0.12", hostname = "cp-03" }
  ]
}

variable "worker_nodes" {
  description = "Worker node definitions"
  type = list(object({
    ip       = string
    hostname = string
    disk     = optional(string, "/dev/sda")
    labels   = optional(map(string), {})
    taints   = optional(list(string), [])
  }))
  default = [
    {
      ip       = "10.0.0.20"
      hostname = "worker-01"
      labels   = { "node-role" = "general" }
    },
    {
      ip       = "10.0.0.21"
      hostname = "worker-02"
      labels   = { "node-role" = "general" }
    },
    {
      ip       = "10.0.0.22"
      hostname = "worker-gpu"
      labels   = { "node-role" = "gpu", "nvidia.com/gpu" = "true" }
    }
  ]
}
```

Use these definitions in your configurations:

```hcl
resource "talos_machine_configuration_apply" "worker" {
  count = length(var.worker_nodes)

  depends_on = [talos_machine_bootstrap.this]

  client_configuration        = talos_machine_secrets.this.client_configuration
  machine_configuration_input = data.talos_machine_configuration.worker.machine_configuration
  node                        = var.worker_nodes[count.index].ip

  config_patches = [
    yamlencode({
      machine = {
        network = {
          hostname = var.worker_nodes[count.index].hostname
        }
        install = {
          disk = var.worker_nodes[count.index].disk
        }
        nodeLabels = var.worker_nodes[count.index].labels
      }
    })
  ]
}
```

## Loading Patches from Files

For complex patches, store them as separate YAML files:

```
patches/
  common/
    network.yaml
    time.yaml
    kubelet.yaml
  controlplane/
    etcd.yaml
    api-server.yaml
  worker/
    gpu.yaml
    storage.yaml
```

```hcl
# Load patches from files
locals {
  common_patches = [
    for f in fileset("${path.module}/patches/common", "*.yaml") :
    file("${path.module}/patches/common/${f}")
  ]

  controlplane_patches = [
    for f in fileset("${path.module}/patches/controlplane", "*.yaml") :
    file("${path.module}/patches/controlplane/${f}")
  ]

  worker_patches = [
    for f in fileset("${path.module}/patches/worker", "*.yaml") :
    file("${path.module}/patches/worker/${f}")
  ]
}

data "talos_machine_configuration" "controlplane" {
  cluster_name     = var.cluster_name
  machine_type     = "controlplane"
  cluster_endpoint = "https://${var.cluster_vip}:6443"
  machine_secrets  = talos_machine_secrets.this.machine_secrets

  config_patches = concat(local.common_patches, local.controlplane_patches)
}

data "talos_machine_configuration" "worker" {
  cluster_name     = var.cluster_name
  machine_type     = "worker"
  cluster_endpoint = "https://${var.cluster_vip}:6443"
  machine_secrets  = talos_machine_secrets.this.machine_secrets

  config_patches = concat(local.common_patches, local.worker_patches)
}
```

## Updating Configurations

When you need to change the machine configuration of running nodes, Terraform handles the update:

```bash
# Change a variable or patch, then apply
terraform plan   # Review what will change
terraform apply  # Apply the changes
```

The Talos provider applies configuration changes in a rolling fashion. The node receives the new configuration and may restart services as needed.

### Handling Breaking Changes

Some configuration changes require a reboot or even a reinstall. The Talos provider handles this through the apply resource:

```hcl
resource "talos_machine_configuration_apply" "controlplane" {
  count = length(var.controlplane_nodes)

  client_configuration        = talos_machine_secrets.this.client_configuration
  machine_configuration_input = data.talos_machine_configuration.controlplane.machine_configuration
  node                        = var.controlplane_nodes[count.index].ip

  # Automatically reboot if the config change requires it
  apply_mode = "auto"
}
```

## Validating Configurations

Before applying, validate your configurations:

```bash
# Terraform plan shows what will change
terraform plan

# You can also output the generated config for manual review
terraform output -raw controlplane_config | yq .
```

Add a validation step to your CI pipeline:

```hcl
# Output raw configs for review
output "controlplane_machine_config" {
  value     = data.talos_machine_configuration.controlplane.machine_configuration
  sensitive = true
}
```

## Best Practices

1. **Use patch files for complex changes**: Keep Terraform code clean by storing large patches in separate YAML files.
2. **Version control everything**: The entire configuration including patches should be in git.
3. **Use remote state**: Store Terraform state in a secure, remote backend.
4. **Plan before apply**: Always review the plan output before applying changes.
5. **Test in staging first**: Apply configuration changes to a staging cluster before production.
6. **Keep patches minimal**: Only override what you need to change from the defaults.

## Wrapping Up

Managing Talos machine configurations with Terraform provides a structured, repeatable approach to cluster configuration. The combination of base configurations, global patches, and per-node customization gives you the flexibility to handle diverse node types while maintaining consistency. By storing patches as files and defining nodes as structured variables, you keep your Terraform code clean and your configurations auditable. This approach scales from small development clusters to large production deployments with dozens of nodes across multiple roles.
