# How to Use the Talos Terraform Provider

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Terraform, Infrastructure as Code, Kubernetes, Automation

Description: A practical guide to using the Talos Terraform provider to manage Talos Linux clusters as code, including setup, resources, and data sources.

---

Terraform has become the standard tool for managing infrastructure as code. The Talos Terraform provider brings Talos Linux cluster management into this ecosystem, letting you define your cluster configuration, generate secrets, create machine configurations, and apply them to nodes - all through Terraform's declarative syntax. If you are already using Terraform for your cloud resources, adding Talos cluster management to the same workflow is a natural fit.

This guide covers installing and configuring the Talos Terraform provider, its available resources and data sources, and practical patterns for managing Talos clusters.

## Installing the Provider

The Talos Terraform provider is published in the Terraform Registry. Add it to your Terraform configuration:

```hcl
# versions.tf
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

Run `terraform init` to download and install the provider:

```bash
# Initialize Terraform and download the provider
terraform init
```

## Provider Configuration

The Talos provider does not require any authentication configuration in most cases:

```hcl
# provider.tf
provider "talos" {}
```

The provider operates locally, generating configurations and applying them to nodes over the network. Authentication is handled through Talos client certificates that are generated as part of the cluster secret creation.

## Core Resources and Data Sources

The Talos provider offers several key resources:

### talos_machine_secrets

Generates the secrets (certificates, keys, tokens) needed for a Talos cluster:

```hcl
# Generate cluster secrets
resource "talos_machine_secrets" "cluster" {
  talos_version = "v1.7.0"
}
```

This resource generates a complete set of PKI material including:
- Cluster CA certificate and key
- etcd CA certificate and key
- Kubernetes API server certificates
- Bootstrap tokens

### talos_client_configuration

Creates the talosctl client configuration for connecting to the cluster:

```hcl
# Generate client configuration
data "talos_client_configuration" "this" {
  cluster_name         = "my-cluster"
  client_configuration = talos_machine_secrets.cluster.client_configuration
  nodes                = ["10.0.0.10"]
  endpoints            = ["10.0.0.10"]
}
```

### talos_machine_configuration

Generates machine configurations for control plane and worker nodes:

```hcl
# Control plane machine configuration
data "talos_machine_configuration" "controlplane" {
  cluster_name     = "my-cluster"
  machine_type     = "controlplane"
  cluster_endpoint = "https://10.0.0.1:6443"
  machine_secrets  = talos_machine_secrets.cluster.machine_secrets
}

# Worker machine configuration
data "talos_machine_configuration" "worker" {
  cluster_name     = "my-cluster"
  machine_type     = "worker"
  cluster_endpoint = "https://10.0.0.1:6443"
  machine_secrets  = talos_machine_secrets.cluster.machine_secrets
}
```

### talos_machine_configuration_apply

Applies a machine configuration to a Talos node:

```hcl
# Apply control plane config
resource "talos_machine_configuration_apply" "controlplane" {
  client_configuration        = talos_machine_secrets.cluster.client_configuration
  machine_configuration_input = data.talos_machine_configuration.controlplane.machine_configuration
  node                        = "10.0.0.10"
}
```

### talos_machine_bootstrap

Bootstraps the Talos cluster (runs on the first control plane node):

```hcl
# Bootstrap the cluster
resource "talos_machine_bootstrap" "this" {
  depends_on = [
    talos_machine_configuration_apply.controlplane
  ]

  client_configuration = talos_machine_secrets.cluster.client_configuration
  node                 = "10.0.0.10"
}
```

### talos_cluster_kubeconfig

Retrieves the kubeconfig for the cluster:

```hcl
# Get the kubeconfig
data "talos_cluster_kubeconfig" "this" {
  depends_on = [
    talos_machine_bootstrap.this
  ]

  client_configuration = talos_machine_secrets.cluster.client_configuration
  node                 = "10.0.0.10"
}
```

## Complete Example: Single Control Plane Cluster

Here is a complete Terraform configuration for a simple cluster:

```hcl
# main.tf - Complete Talos cluster via Terraform

terraform {
  required_providers {
    talos = {
      source  = "siderolabs/talos"
      version = "~> 0.5.0"
    }
  }
}

provider "talos" {}

# Variables
variable "cluster_name" {
  default = "my-cluster"
}

variable "cluster_endpoint" {
  default = "https://10.0.0.10:6443"
}

variable "controlplane_nodes" {
  default = ["10.0.0.10"]
}

variable "worker_nodes" {
  default = ["10.0.0.20", "10.0.0.21"]
}

# Generate secrets
resource "talos_machine_secrets" "this" {
  talos_version = "v1.7.0"
}

# Control plane configuration
data "talos_machine_configuration" "controlplane" {
  cluster_name     = var.cluster_name
  machine_type     = "controlplane"
  cluster_endpoint = var.cluster_endpoint
  machine_secrets  = talos_machine_secrets.this.machine_secrets
}

# Worker configuration
data "talos_machine_configuration" "worker" {
  cluster_name     = var.cluster_name
  machine_type     = "worker"
  cluster_endpoint = var.cluster_endpoint
  machine_secrets  = talos_machine_secrets.this.machine_secrets
}

# Apply control plane configs
resource "talos_machine_configuration_apply" "controlplane" {
  for_each = toset(var.controlplane_nodes)

  client_configuration        = talos_machine_secrets.this.client_configuration
  machine_configuration_input = data.talos_machine_configuration.controlplane.machine_configuration
  node                        = each.value
}

# Apply worker configs
resource "talos_machine_configuration_apply" "worker" {
  for_each = toset(var.worker_nodes)

  depends_on = [talos_machine_bootstrap.this]

  client_configuration        = talos_machine_secrets.this.client_configuration
  machine_configuration_input = data.talos_machine_configuration.worker.machine_configuration
  node                        = each.value
}

# Bootstrap the cluster
resource "talos_machine_bootstrap" "this" {
  depends_on = [
    talos_machine_configuration_apply.controlplane
  ]

  client_configuration = talos_machine_secrets.this.client_configuration
  node                 = var.controlplane_nodes[0]
}

# Get kubeconfig
data "talos_cluster_kubeconfig" "this" {
  depends_on = [talos_machine_bootstrap.this]

  client_configuration = talos_machine_secrets.this.client_configuration
  node                 = var.controlplane_nodes[0]
}

# Outputs
output "talosconfig" {
  value     = data.talos_client_configuration.this.talos_config
  sensitive = true
}

output "kubeconfig" {
  value     = data.talos_cluster_kubeconfig.this.kubeconfig_raw
  sensitive = true
}

# Client configuration
data "talos_client_configuration" "this" {
  cluster_name         = var.cluster_name
  client_configuration = talos_machine_secrets.this.client_configuration
  nodes                = var.controlplane_nodes
  endpoints            = var.controlplane_nodes
}
```

## Using the Configuration

```bash
# Initialize and apply
terraform init
terraform plan
terraform apply

# Save the kubeconfig
terraform output -raw kubeconfig > ~/.kube/config

# Save the talosconfig
terraform output -raw talosconfig > ~/.talos/config

# Verify the cluster
kubectl get nodes
talosctl health --nodes 10.0.0.10
```

## Storing Secrets Safely

The `talos_machine_secrets` resource contains sensitive data. Store the Terraform state securely:

```hcl
# Use a remote backend with encryption
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "talos/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

Never commit the Terraform state file to version control, as it contains the cluster's PKI material.

## Applying Configuration Patches

You can customize machine configurations with patches:

```hcl
# Control plane with custom patches
data "talos_machine_configuration" "controlplane" {
  cluster_name     = var.cluster_name
  machine_type     = "controlplane"
  cluster_endpoint = var.cluster_endpoint
  machine_secrets  = talos_machine_secrets.this.machine_secrets

  config_patches = [
    yamlencode({
      machine = {
        install = {
          image = "factory.talos.dev/installer/SCHEMATIC_ID:v1.7.0"
        }
        network = {
          hostname = "cp-01"
        }
      }
    })
  ]
}
```

## Wrapping Up

The Talos Terraform provider brings Talos Linux cluster management into the Terraform ecosystem. By defining your cluster as code, you get version control, plan/apply workflows, and integration with your existing infrastructure pipelines. The provider covers the complete lifecycle from secret generation through machine configuration to cluster bootstrap, making it a solid foundation for reproducible Talos deployments.
