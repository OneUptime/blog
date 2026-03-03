# How to Automate Cluster Lifecycle with Terraform and Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Terraform, Cluster Lifecycle, Automation, DevOps

Description: Learn how to automate the complete Talos Linux cluster lifecycle using Terraform, from creation and scaling to upgrades and destruction.

---

Managing a Kubernetes cluster is not a one-time event. Clusters need to be created, scaled up and down, upgraded to new versions, and eventually decommissioned. Each of these lifecycle stages involves a coordinated set of operations that can be error-prone when performed manually. By combining Terraform with the Talos Linux provider, you can automate every stage of the cluster lifecycle through a single, consistent workflow.

This guide covers the complete cluster lifecycle management with Terraform and Talos, including creation, day-two operations, upgrades, scaling, and teardown.

## The Cluster Lifecycle

A Talos Linux cluster goes through several stages:

1. **Creation**: Provision infrastructure, generate configs, bootstrap
2. **Day-two operations**: Add nodes, change configurations, install add-ons
3. **Scaling**: Add or remove worker nodes based on demand
4. **Upgrades**: Update Talos and Kubernetes versions
5. **Decommission**: Tear down the cluster cleanly

Terraform can manage all of these stages.

## Stage 1: Cluster Creation

The creation stage is covered in detail in our cluster creation guide. Here is the condensed version:

```hcl
# Create secrets, generate configs, apply to nodes, bootstrap
resource "talos_machine_secrets" "this" {
  talos_version = var.talos_version
}

data "talos_machine_configuration" "controlplane" {
  cluster_name       = var.cluster_name
  machine_type       = "controlplane"
  cluster_endpoint   = var.cluster_endpoint
  machine_secrets    = talos_machine_secrets.this.machine_secrets
  kubernetes_version = var.kubernetes_version

  config_patches = var.controlplane_patches
}

data "talos_machine_configuration" "worker" {
  cluster_name       = var.cluster_name
  machine_type       = "worker"
  cluster_endpoint   = var.cluster_endpoint
  machine_secrets    = talos_machine_secrets.this.machine_secrets
  kubernetes_version = var.kubernetes_version

  config_patches = var.worker_patches
}

resource "talos_machine_configuration_apply" "controlplane" {
  for_each = { for idx, node in var.controlplane_nodes : node.hostname => node }

  client_configuration        = talos_machine_secrets.this.client_configuration
  machine_configuration_input = data.talos_machine_configuration.controlplane.machine_configuration
  node                        = each.value.ip

  config_patches = [
    yamlencode({
      machine = {
        network = { hostname = each.key }
      }
    })
  ]
}

resource "talos_machine_configuration_apply" "worker" {
  for_each = { for idx, node in var.worker_nodes : node.hostname => node }

  depends_on = [talos_machine_bootstrap.this]

  client_configuration        = talos_machine_secrets.this.client_configuration
  machine_configuration_input = data.talos_machine_configuration.worker.machine_configuration
  node                        = each.value.ip

  config_patches = [
    yamlencode({
      machine = {
        network = { hostname = each.key }
        nodeLabels = each.value.labels
      }
    })
  ]
}

resource "talos_machine_bootstrap" "this" {
  depends_on = [talos_machine_configuration_apply.controlplane]

  client_configuration = talos_machine_secrets.this.client_configuration
  node                 = var.controlplane_nodes[0].ip
}
```

## Stage 2: Scaling the Cluster

### Adding Worker Nodes

To add worker nodes, simply update the variable:

```hcl
# terraform.tfvars - before
worker_nodes = [
  { ip = "10.0.0.20", hostname = "worker-01", labels = {} },
  { ip = "10.0.0.21", hostname = "worker-02", labels = {} },
]

# terraform.tfvars - after (added a new worker)
worker_nodes = [
  { ip = "10.0.0.20", hostname = "worker-01", labels = {} },
  { ip = "10.0.0.21", hostname = "worker-02", labels = {} },
  { ip = "10.0.0.22", hostname = "worker-03", labels = {} },
]
```

```bash
# Plan and apply to add the new node
terraform plan   # Shows 1 new resource to create
terraform apply  # Applies config to the new node
```

### Removing Worker Nodes

To remove a worker, remove it from the variable and apply:

```bash
# Update terraform.tfvars to remove the node
# Then plan and apply
terraform plan   # Shows 1 resource to destroy
terraform apply  # Resets the removed node
```

The Talos provider handles the graceful removal of the node during the destroy operation.

### Auto-Scaling Integration

For dynamic scaling, integrate with cloud provider auto-scaling:

```hcl
# AWS Auto Scaling Group for workers
resource "aws_autoscaling_group" "workers" {
  name                = "${var.cluster_name}-workers"
  min_size            = var.min_workers
  max_size            = var.max_workers
  desired_capacity    = var.desired_workers
  vpc_zone_identifier = var.subnet_ids

  launch_template {
    id      = aws_launch_template.worker.id
    version = "$Latest"
  }

  tag {
    key                 = "cluster"
    value               = var.cluster_name
    propagate_at_launch = true
  }
}

# Launch template with Talos AMI and user-data config
resource "aws_launch_template" "worker" {
  name_prefix   = "${var.cluster_name}-worker-"
  image_id      = var.talos_ami_id
  instance_type = var.worker_instance_type

  user_data = base64encode(
    data.talos_machine_configuration.worker.machine_configuration
  )
}
```

## Stage 3: Configuration Updates

### Changing Kubelet Settings

```hcl
# Update the worker patches to change kubelet config
variable "worker_patches" {
  default = [
    <<-EOT
    machine:
      kubelet:
        extraArgs:
          max-pods: "150"
          serialize-image-pulls: "false"
        extraConfig:
          imageGCHighThresholdPercent: 85
          imageGCLowThresholdPercent: 80
    EOT
  ]
}
```

```bash
terraform apply  # Applies the new config to all workers
```

### Changing Network Settings

```hcl
# Add a network patch
variable "common_patches" {
  default = [
    <<-EOT
    machine:
      network:
        nameservers:
          - 10.0.0.1
          - 8.8.8.8
      time:
        servers:
          - time.cloudflare.com
          - pool.ntp.org
    EOT
  ]
}
```

## Stage 4: Upgrades

### Upgrading Talos Version

Upgrading Talos is as simple as changing the version variable:

```hcl
# Change the version
variable "talos_version" {
  default = "v1.8.0"  # Was v1.7.0
}
```

```bash
# Plan shows the configuration changes for all nodes
terraform plan

# Apply rolls out the upgrade
terraform apply
```

The Talos provider applies the new configuration to each node, which triggers an upgrade. Nodes are upgraded one at a time, and each waits for the previous to complete before proceeding.

### Upgrading Kubernetes Version

```hcl
# Change the Kubernetes version
variable "kubernetes_version" {
  default = "v1.31.0"  # Was v1.30.0
}
```

```bash
terraform apply
```

### Combined Upgrade Strategy

For production environments, upgrade in stages:

```bash
# Step 1: Upgrade staging first
cd environments/staging
terraform apply -var="talos_version=v1.8.0" -var="kubernetes_version=v1.31.0"

# Step 2: Verify staging is healthy
kubectl --context staging get nodes
talosctl health --nodes 10.1.0.10

# Step 3: Upgrade production
cd ../production
terraform apply -var="talos_version=v1.8.0" -var="kubernetes_version=v1.31.0"
```

## Stage 5: Disaster Recovery

### Recreating from Terraform State

If you lose nodes but have the Terraform state:

```bash
# Taint the destroyed resources to force recreation
terraform taint 'talos_machine_configuration_apply.controlplane["cp-01"]'

# Apply to reconfigure the replacement node
terraform apply
```

### Recreating from Scratch

If you lose everything, including the state:

```bash
# Import existing secrets (if you have a backup)
terraform import talos_machine_secrets.this <secret-id>

# Or generate new secrets and start fresh
terraform apply
```

## Stage 6: Decommission

### Destroying the Cluster

```bash
# Destroy all Terraform-managed resources
terraform destroy

# This triggers:
# 1. Reset of all worker nodes
# 2. Reset of all control plane nodes
# 3. Destruction of infrastructure resources
```

### Partial Teardown

Remove specific components without destroying everything:

```bash
# Remove just the workers
terraform destroy -target='talos_machine_configuration_apply.worker'

# Remove a specific node
terraform destroy -target='talos_machine_configuration_apply.worker["worker-03"]'
```

## CI/CD Pipeline Integration

### GitHub Actions Pipeline

```yaml
# .github/workflows/cluster-lifecycle.yaml
name: Cluster Lifecycle

on:
  push:
    branches: [main]
    paths: ['infrastructure/**']
  pull_request:
    branches: [main]
    paths: ['infrastructure/**']

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init
        working-directory: infrastructure

      - name: Terraform Plan
        run: terraform plan -out=tfplan
        working-directory: infrastructure

      - name: Upload Plan
        uses: actions/upload-artifact@v4
        with:
          name: tfplan
          path: infrastructure/tfplan

  apply:
    needs: plan
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Download Plan
        uses: actions/download-artifact@v4
        with:
          name: tfplan
          path: infrastructure

      - name: Terraform Apply
        run: terraform apply tfplan
        working-directory: infrastructure
```

## State Management Best Practices

```hcl
# Use remote state with locking
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "talos-clusters/production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

Always:
- Use remote state backends with encryption
- Enable state locking to prevent concurrent modifications
- Back up state regularly
- Never commit state files to version control

## Monitoring Lifecycle Operations

Track Terraform operations alongside cluster health:

```bash
# After any lifecycle operation, verify cluster health
terraform apply && \
  talosctl health --nodes $(terraform output -json controlplane_nodes | jq -r '.[0]') \
    --wait-timeout 10m
```

## Wrapping Up

Automating the Talos Linux cluster lifecycle with Terraform transforms cluster management from a series of manual commands into a predictable, version-controlled workflow. From initial creation through scaling, upgrades, and eventual teardown, every stage is handled through the same `terraform plan` and `terraform apply` cycle. This consistency reduces errors, improves auditability, and makes it possible for anyone on the team to manage the cluster confidently. Combined with CI/CD pipelines and proper state management, you get a fully automated cluster lifecycle that scales from a single development environment to a fleet of production clusters.
