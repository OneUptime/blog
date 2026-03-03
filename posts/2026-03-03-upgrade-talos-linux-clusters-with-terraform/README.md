# How to Upgrade Talos Linux Clusters with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Terraform, Kubernetes, Cluster Upgrades, Infrastructure as Code

Description: A practical guide to upgrading Talos Linux clusters using Terraform with rolling updates and minimal downtime strategies.

---

Keeping your Talos Linux cluster up to date is essential for security patches, bug fixes, and access to new Kubernetes features. Terraform can orchestrate much of the upgrade process, but Talos upgrades have some unique characteristics that you need to understand before you start. This guide covers the full workflow for upgrading Talos Linux clusters with Terraform.

## How Talos Upgrades Work

Talos Linux upgrades differ from traditional Linux upgrades in a fundamental way. Since the OS is immutable, you do not patch individual packages. Instead, you replace the entire OS image with a new version. The upgrade process downloads the new Talos image, writes it to the inactive partition, and reboots the node into the new version.

There are two things you can upgrade independently:

1. **Talos OS version** - the operating system itself
2. **Kubernetes version** - the Kubernetes components running on Talos

Both can be managed through Terraform, but they follow different paths.

## Updating the Talos Version in Terraform

The first step is to update the Talos version in your Terraform variables:

```hcl
# variables.tf - Update the version to trigger an upgrade

variable "talos_version" {
  description = "Talos Linux version"
  type        = string
  default     = "v1.8.0"  # Updated from v1.7.0
}
```

If you are using the Talos Terraform provider, update the machine secrets and configuration resources:

```hcl
# Update the machine secrets with the new version
resource "talos_machine_secrets" "cluster" {
  talos_version = var.talos_version
}

# Regenerate control plane config with new version
data "talos_machine_configuration" "controlplane" {
  cluster_name     = var.cluster_name
  machine_type     = "controlplane"
  cluster_endpoint = "https://${var.cluster_endpoint}:6443"
  machine_secrets  = talos_machine_secrets.cluster.machine_secrets
  talos_version    = var.talos_version

  config_patches = [
    yamlencode({
      machine = {
        install = {
          image = "ghcr.io/siderolabs/installer:${var.talos_version}"
        }
      }
    })
  ]
}
```

## Rolling Upgrade Strategy

Never upgrade all nodes at once. A rolling upgrade ensures your cluster stays available throughout the process. The Talos Terraform provider supports applying configurations to specific nodes:

```hcl
# Apply configuration to control plane nodes
resource "talos_machine_configuration_apply" "controlplane" {
  count = var.control_plane_count

  client_configuration        = talos_machine_secrets.cluster.client_configuration
  machine_configuration_input = data.talos_machine_configuration.controlplane.machine_configuration
  node                        = var.control_plane_ips[count.index]

  # Process nodes one at a time
  depends_on = [
    talos_machine_configuration_apply.controlplane[count.index - 1]
  ]
}

# Apply configuration to worker nodes after control plane is done
resource "talos_machine_configuration_apply" "worker" {
  count = var.worker_count

  client_configuration        = talos_machine_secrets.cluster.client_configuration
  machine_configuration_input = data.talos_machine_configuration.worker.machine_configuration
  node                        = var.worker_ips[count.index]

  depends_on = [
    talos_machine_configuration_apply.controlplane
  ]
}
```

## Using talosctl for the OS Upgrade

While Terraform handles the configuration, the actual OS upgrade is best performed using `talosctl`. You can wrap this in a null_resource or a local-exec provisioner:

```hcl
# Upgrade control plane nodes one at a time
resource "null_resource" "upgrade_controlplane" {
  count = var.control_plane_count

  triggers = {
    talos_version = var.talos_version
  }

  provisioner "local-exec" {
    command = <<-EOT
      # Upgrade the node to the new Talos version
      talosctl upgrade \
        --nodes ${var.control_plane_ips[count.index]} \
        --image ghcr.io/siderolabs/installer:${var.talos_version} \
        --talosconfig ${path.module}/talosconfig \
        --preserve

      # Wait for the node to come back online
      talosctl health \
        --nodes ${var.control_plane_ips[count.index]} \
        --talosconfig ${path.module}/talosconfig \
        --wait-timeout 10m
    EOT
  }

  # Upgrade nodes sequentially
  depends_on = [
    null_resource.upgrade_controlplane[count.index - 1]
  ]
}

# Upgrade worker nodes after control plane
resource "null_resource" "upgrade_workers" {
  count = var.worker_count

  triggers = {
    talos_version = var.talos_version
  }

  provisioner "local-exec" {
    command = <<-EOT
      talosctl upgrade \
        --nodes ${var.worker_ips[count.index]} \
        --image ghcr.io/siderolabs/installer:${var.talos_version} \
        --talosconfig ${path.module}/talosconfig \
        --preserve

      talosctl health \
        --nodes ${var.worker_ips[count.index]} \
        --talosconfig ${path.module}/talosconfig \
        --wait-timeout 10m
    EOT
  }

  depends_on = [
    null_resource.upgrade_controlplane,
    null_resource.upgrade_workers[count.index - 1]
  ]
}
```

## Upgrading Kubernetes Version

Upgrading the Kubernetes version is separate from the OS upgrade. Use the `talos_machine_configuration` data source to specify the desired Kubernetes version:

```hcl
variable "kubernetes_version" {
  description = "Kubernetes version to run on the cluster"
  type        = string
  default     = "1.30.0"
}

data "talos_machine_configuration" "controlplane" {
  cluster_name     = var.cluster_name
  machine_type     = "controlplane"
  cluster_endpoint = "https://${var.cluster_endpoint}:6443"
  machine_secrets  = talos_machine_secrets.cluster.machine_secrets
  kubernetes_version = var.kubernetes_version
}
```

Or trigger a Kubernetes upgrade with `talosctl`:

```bash
# Upgrade Kubernetes version across the cluster
talosctl upgrade-k8s \
  --to 1.30.0 \
  --nodes <CONTROL_PLANE_IP> \
  --talosconfig talosconfig
```

## Updating Cloud Machine Images

When upgrading, you may also want to update the machine image (AMI, Azure Image, or GCP Image) used for new nodes:

```hcl
# Update the AMI lookup for the new Talos version
data "aws_ami" "talos" {
  most_recent = true
  owners      = ["540036508848"]

  filter {
    name   = "name"
    values = ["talos-${var.talos_version}-*"]
  }
}

# Existing nodes are upgraded in place
# New nodes will use the updated AMI
resource "aws_instance" "worker" {
  count = var.worker_count
  ami   = data.aws_ami.talos.id
  # ... rest of configuration
}
```

## Pre-Upgrade Checklist

Before starting an upgrade, run through this checklist:

```bash
# Check current cluster health
talosctl health --nodes <CP_IP> --talosconfig talosconfig

# Verify current versions
talosctl version --nodes <CP_IP> --talosconfig talosconfig

# Check for any pending operations
kubectl get nodes -o wide

# Review the Talos release notes for breaking changes
# https://github.com/siderolabs/talos/releases

# Back up etcd
talosctl etcd snapshot db.snapshot \
  --nodes <CP_IP> \
  --talosconfig talosconfig
```

## Handling Upgrade Failures

If a node fails to upgrade, Talos will automatically roll back to the previous version on reboot. You can also manually revert:

```bash
# Check the node status after a failed upgrade
talosctl dmesg --nodes <NODE_IP> --talosconfig talosconfig

# If the node is stuck, reset and rejoin
talosctl reset --nodes <NODE_IP> --talosconfig talosconfig \
  --graceful=false

# Reapply the configuration
talosctl apply-config --nodes <NODE_IP> --file controlplane.yaml
```

## Testing Upgrades

Always test upgrades in a non-production environment first. Create a separate Terraform workspace or state file for your staging cluster:

```bash
# Create a staging workspace
terraform workspace new staging

# Apply with staging variables
terraform apply -var-file="staging.tfvars"

# Test the upgrade in staging before promoting to production
terraform workspace select production
terraform apply -var-file="production.tfvars"
```

## Summary

Upgrading Talos Linux clusters with Terraform requires a combination of Terraform resource updates, `talosctl` commands, and careful sequencing. The key principles are to always upgrade control plane nodes before workers, always do rolling updates one node at a time, always back up etcd before starting, and always test in staging first. Following this approach lets you keep your cluster current without sacrificing availability.
