# How to Manage Talos Secrets with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Terraform, Secrets Management, Kubernetes, Security

Description: Learn how to securely manage Talos Linux cluster secrets using Terraform with proper state encryption and secret rotation strategies.

---

Talos Linux clusters rely on a set of cryptographic secrets for secure communication between nodes, the Kubernetes API, and etcd. Managing these secrets properly is critical for both security and operational reliability. When you use Terraform to provision Talos infrastructure, you need a clear strategy for generating, storing, and rotating these secrets. This guide covers the practical aspects of managing Talos secrets with Terraform.

## Understanding Talos Secrets

When you generate a Talos cluster configuration, the system creates several types of secrets:

- **Cluster CA certificates** for the Kubernetes PKI
- **etcd CA certificates** for etcd cluster encryption
- **Talos API certificates** for node-to-node communication
- **Bootstrap tokens** for joining new nodes to the cluster
- **Encryption keys** for Kubernetes secrets at rest

These secrets are bundled into a secrets file (typically `secrets.yaml`) that serves as the root of trust for your entire cluster. Losing these secrets means losing the ability to manage or recover your cluster.

## The Talos Terraform Provider

The official Talos Terraform provider from Sidero Labs makes it straightforward to generate and manage secrets within your Terraform workflow:

```hcl
# Configure the Talos provider
terraform {
  required_providers {
    talos = {
      source  = "siderolabs/talos"
      version = "~> 0.5"
    }
  }
}

provider "talos" {}
```

## Generating Secrets with Terraform

Use the `talos_machine_secrets` resource to generate cluster secrets:

```hcl
# Generate Talos machine secrets
resource "talos_machine_secrets" "cluster" {
  talos_version = "v1.7.0"
}

# Generate the machine configuration for control plane nodes
data "talos_machine_configuration" "controlplane" {
  cluster_name     = var.cluster_name
  machine_type     = "controlplane"
  cluster_endpoint = "https://${var.cluster_endpoint}:6443"
  machine_secrets  = talos_machine_secrets.cluster.machine_secrets
}

# Generate the machine configuration for worker nodes
data "talos_machine_configuration" "worker" {
  cluster_name     = var.cluster_name
  machine_type     = "worker"
  cluster_endpoint = "https://${var.cluster_endpoint}:6443"
  machine_secrets  = talos_machine_secrets.cluster.machine_secrets
}

# Generate the talosconfig for CLI access
data "talos_client_configuration" "this" {
  cluster_name         = var.cluster_name
  client_configuration = talos_machine_secrets.cluster.client_configuration
  endpoints            = var.control_plane_ips
  nodes                = var.control_plane_ips
}
```

## Protecting Secrets in Terraform State

The biggest concern with managing secrets in Terraform is that they end up in the state file. Terraform state is stored as plain JSON by default, which means anyone with access to the state file has access to your cluster secrets. There are several ways to address this.

### Encrypted Remote State Backend

Always use a remote state backend with encryption:

```hcl
# Use S3 with server-side encryption for state storage
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "talos-cluster/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
    kms_key_id     = "alias/terraform-state-key"
  }
}
```

For Azure:

```hcl
# Use Azure Storage with encryption
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfstatestorageacct"
    container_name       = "tfstate"
    key                  = "talos-cluster.tfstate"
  }
}
```

For GCP:

```hcl
# Use GCS with encryption
terraform {
  backend "gcs" {
    bucket  = "my-terraform-state"
    prefix  = "talos-cluster"
    # GCS encrypts data at rest by default
  }
}
```

### Using Sensitive Outputs

Mark any outputs that expose secret material as sensitive:

```hcl
# Output the talosconfig as sensitive
output "talosconfig" {
  value     = data.talos_client_configuration.this.talos_config
  sensitive = true
}

# Output the kubeconfig as sensitive
output "kubeconfig" {
  value     = talos_cluster_kubeconfig.this.kubeconfig_raw
  sensitive = true
}

# Write secrets to local files for CLI usage
resource "local_sensitive_file" "talosconfig" {
  content  = data.talos_client_configuration.this.talos_config
  filename = "${path.module}/talosconfig"
}

resource "local_sensitive_file" "kubeconfig" {
  content  = talos_cluster_kubeconfig.this.kubeconfig_raw
  filename = "${path.module}/kubeconfig"
}
```

## Integrating with External Secret Stores

For additional security, you can store generated secrets in an external secret management system like HashiCorp Vault, AWS Secrets Manager, or Azure Key Vault:

```hcl
# Store the Talos machine secrets in AWS Secrets Manager
resource "aws_secretsmanager_secret" "talos_secrets" {
  name        = "${var.cluster_name}/talos-machine-secrets"
  description = "Talos machine secrets for ${var.cluster_name}"
}

resource "aws_secretsmanager_secret_version" "talos_secrets" {
  secret_id = aws_secretsmanager_secret.talos_secrets.id
  secret_string = jsonencode({
    machine_secrets      = talos_machine_secrets.cluster.machine_secrets
    client_configuration = talos_machine_secrets.cluster.client_configuration
  })
}
```

Or with HashiCorp Vault:

```hcl
# Store secrets in Vault
resource "vault_kv_secret_v2" "talos_secrets" {
  mount = "secret"
  name  = "${var.cluster_name}/talos-machine-secrets"

  data_json = jsonencode({
    machine_secrets      = talos_machine_secrets.cluster.machine_secrets
    client_configuration = talos_machine_secrets.cluster.client_configuration
  })
}
```

## Secret Rotation

Rotating Talos secrets is more involved than rotating application secrets because the certificates are baked into the cluster's identity. Here is a general approach:

```hcl
# Use a lifecycle rule to recreate secrets on demand
resource "talos_machine_secrets" "cluster" {
  talos_version = "v1.7.0"

  lifecycle {
    # Uncomment to force secret regeneration
    # replace_triggered_by = [null_resource.rotate_secrets]
  }
}

# Trigger resource for rotation
resource "null_resource" "rotate_secrets" {
  triggers = {
    # Change this value to trigger secret rotation
    rotation_id = "initial"
  }
}
```

When you rotate secrets, you need to apply updated machine configurations to all nodes in the cluster. Plan for a rolling update to avoid downtime:

```bash
# After rotating secrets in Terraform, apply the new configs
terraform apply

# Apply new config to each control plane node one at a time
for ip in $CP_IPS; do
  talosctl apply-config --nodes $ip --file controlplane.yaml
  # Wait for the node to rejoin before proceeding
  talosctl health --nodes $ip --wait-timeout 5m
done

# Apply new config to worker nodes
for ip in $WORKER_IPS; do
  talosctl apply-config --nodes $ip --file worker.yaml
  talosctl health --nodes $ip --wait-timeout 5m
done
```

## Access Control for State Files

Restrict who can access your Terraform state with IAM policies:

```hcl
# IAM policy for the S3 state bucket
resource "aws_s3_bucket_policy" "state" {
  bucket = "my-terraform-state"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "RestrictStateAccess"
        Effect    = "Allow"
        Principal = { AWS = var.admin_role_arns }
        Action    = ["s3:GetObject", "s3:PutObject"]
        Resource  = "arn:aws:s3:::my-terraform-state/talos-cluster/*"
      }
    ]
  })
}
```

## Best Practices Summary

Keep your Talos secrets safe by following these guidelines. Always use encrypted remote backends for Terraform state. Never commit state files or secret files to version control. Use the `sensitive` flag on all outputs that contain secret material. Integrate with an external secrets manager for an additional layer of protection. Limit access to the Terraform state using IAM policies or equivalent controls on your cloud provider.

Managing secrets well is not glamorous, but it is one of the most important aspects of running a secure Kubernetes cluster. Terraform gives you the tools to do it right when you take the time to set things up properly.
