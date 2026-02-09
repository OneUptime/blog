# How to Build Terraform Workspaces for Blue-Green Kubernetes Cluster Upgrades

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Infrastructure as Code, DevOps, Cluster Management

Description: Learn how to implement blue-green Kubernetes cluster upgrades using Terraform workspaces to achieve zero-downtime version updates with rollback capabilities.

---

Upgrading Kubernetes clusters carries risk. In-place upgrades can cause downtime and are difficult to roll back if issues arise. Blue-green deployments solve this by creating a new cluster alongside the existing one, allowing safe migration and instant rollback. This guide demonstrates how to implement this pattern using Terraform workspaces.

## Understanding Blue-Green Cluster Strategy

Blue-green deployment maintains two identical production environments. The blue environment serves live traffic while you deploy changes to green. After validating green, you switch traffic from blue to green. If problems occur, switching back takes seconds rather than hours of troubleshooting.

For Kubernetes clusters, this means running two complete clusters. You create a new cluster with the updated version, migrate workloads gradually, validate functionality, then switch traffic. The old cluster remains available for immediate rollback until you're confident in the new version.

## Setting Up Terraform Workspaces Structure

Terraform workspaces provide isolated state management for the same configuration. This enables managing multiple clusters from a single codebase while maintaining separate state files.

```hcl
# main.tf - Base cluster configuration
terraform {
  required_version = ">= 1.5"

  backend "s3" {
    bucket         = "company-terraform-state"
    key            = "kubernetes-cluster/terraform.tfstate"
    region         = "us-west-2"
    dynamodb_table = "terraform-state-lock"
    # Workspace name is automatically appended to the key
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Get current workspace name
locals {
  workspace = terraform.workspace
  environment = terraform.workspace == "default" ? "blue" : terraform.workspace

  # Define cluster version per workspace
  cluster_versions = {
    blue  = "1.28"
    green = "1.29"
  }

  cluster_version = local.cluster_versions[local.environment]

  # Generate unique names based on workspace
  cluster_name = "production-${local.environment}"

  common_tags = {
    Environment = local.environment
    ManagedBy   = "terraform"
    Workspace   = terraform.workspace
  }
}
```

This structure allows the same configuration to create different clusters based on the active workspace, with workspace-specific versions and naming.

## Building the Cluster Module

Create a reusable module that accepts workspace-specific parameters while sharing common configuration logic.

```hcl
# modules/eks-cluster/main.tf
resource "aws_eks_cluster" "cluster" {
  name     = var.cluster_name
  version  = var.cluster_version
  role_arn = aws_iam_role.cluster.arn

  vpc_config {
    subnet_ids              = var.subnet_ids
    endpoint_private_access = true
    endpoint_public_access  = var.environment == "blue" ? true : false
    security_group_ids      = [aws_security_group.cluster.id]
  }

  enabled_cluster_log_types = ["api", "audit", "authenticator"]

  tags = merge(
    var.tags,
    {
      Name        = var.cluster_name
      Environment = var.environment
    }
  )

  depends_on = [
    aws_iam_role_policy_attachment.cluster_policy,
    aws_cloudwatch_log_group.cluster
  ]
}

resource "aws_eks_node_group" "workers" {
  cluster_name    = aws_eks_cluster.cluster.name
  node_group_name = "${var.cluster_name}-workers"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = var.subnet_ids

  scaling_config {
    desired_size = var.node_count
    max_size     = var.node_count + 2
    min_size     = var.node_count - 1
  }

  instance_types = var.instance_types

  # Enable IMDSv2 for security
  launch_template {
    name    = aws_launch_template.nodes.name
    version = aws_launch_template.nodes.latest_version
  }

  tags = var.tags

  lifecycle {
    create_before_destroy = true
    ignore_changes        = [scaling_config[0].desired_size]
  }
}

# CloudWatch Log Group for cluster logs
resource "aws_cloudwatch_log_group" "cluster" {
  name              = "/aws/eks/${var.cluster_name}/cluster"
  retention_in_days = 7

  tags = var.tags
}
```

The module encapsulates cluster creation logic while accepting parameters that differ between blue and green environments.

## Implementing Workspace-Specific Configurations

Define variables that change between workspaces while keeping infrastructure code identical.

```hcl
# variables.tf
variable "workspace_config" {
  description = "Configuration per workspace"
  type = map(object({
    cluster_version  = string
    node_count       = number
    instance_types   = list(string)
    public_endpoint  = bool
  }))

  default = {
    blue = {
      cluster_version = "1.28"
      node_count      = 3
      instance_types  = ["t3.large"]
      public_endpoint = true
    }
    green = {
      cluster_version = "1.29"
      node_count      = 3
      instance_types  = ["t3.large"]
      public_endpoint = false
    }
  }
}

# Load workspace-specific configuration
locals {
  config = var.workspace_config[local.environment]
}

# Use the module with workspace config
module "eks_cluster" {
  source = "./modules/eks-cluster"

  cluster_name    = local.cluster_name
  cluster_version = local.config.cluster_version
  node_count      = local.config.node_count
  instance_types  = local.config.instance_types

  subnet_ids  = data.aws_subnets.private.ids
  environment = local.environment
  tags        = local.common_tags
}
```

This approach provides flexibility to adjust configurations between environments while maintaining a single source of truth.

## Managing Load Balancer and DNS

Implement traffic switching using weighted DNS records or load balancer target groups that can be updated without downtime.

```hcl
# Route53 weighted routing for gradual migration
resource "aws_route53_record" "api" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "api.example.com"
  type    = "A"

  set_identifier = local.environment

  # Adjust weights to control traffic distribution
  weighted_routing_policy {
    weight = local.environment == "blue" ? 100 : 0
  }

  alias {
    name                   = module.eks_cluster.cluster_endpoint
    zone_id                = module.eks_cluster.cluster_zone_id
    evaluate_target_health = true
  }
}

# Create ALB for ingress traffic
resource "aws_lb" "ingress" {
  name               = "${local.cluster_name}-ingress"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = data.aws_subnets.public.ids

  enable_deletion_protection = local.environment == "blue"

  tags = merge(
    local.common_tags,
    {
      Name = "${local.cluster_name}-ingress"
    }
  )
}

# Output load balancer DNS for verification
output "load_balancer_dns" {
  value = aws_lb.ingress.dns_name
}
```

Weight-based routing enables gradual traffic migration from blue to green, reducing risk during the cutover.

## Automating Workload Migration

Create helper scripts that migrate workloads between clusters after green is ready.

```bash
#!/bin/bash
# migrate-workloads.sh

BLUE_CONTEXT="blue-cluster"
GREEN_CONTEXT="green-cluster"

# Export resources from blue cluster
echo "Exporting workloads from blue cluster..."
kubectl --context=$BLUE_CONTEXT get deployments,services,configmaps,secrets \
  --all-namespaces -o yaml > blue-resources.yaml

# Apply to green cluster
echo "Applying workloads to green cluster..."
kubectl --context=$GREEN_CONTEXT apply -f blue-resources.yaml

# Verify pods are running
echo "Verifying green cluster workloads..."
kubectl --context=$GREEN_CONTEXT get pods --all-namespaces

# Check rollout status
namespaces=$(kubectl --context=$GREEN_CONTEXT get ns -o jsonpath='{.items[*].metadata.name}')
for ns in $namespaces; do
  deployments=$(kubectl --context=$GREEN_CONTEXT get deployments -n $ns -o jsonpath='{.items[*].metadata.name}')
  for deploy in $deployments; do
    kubectl --context=$GREEN_CONTEXT rollout status deployment/$deploy -n $ns --timeout=5m
  done
done

echo "Migration complete!"
```

This script automates the migration process, reducing manual errors and ensuring consistency.

## Implementing Health Checks

Add comprehensive health checks before switching traffic to the green cluster.

```hcl
# health-check.tf
resource "null_resource" "health_check" {
  count = local.environment == "green" ? 1 : 0

  provisioner "local-exec" {
    command = <<-EOT
      #!/bin/bash
      set -e

      # Wait for cluster to be available
      aws eks wait cluster-active --name ${local.cluster_name}

      # Update kubeconfig
      aws eks update-kubeconfig --name ${local.cluster_name} --alias ${local.environment}

      # Verify critical system pods
      kubectl wait --for=condition=Ready pods --all -n kube-system --timeout=300s

      # Run smoke tests
      kubectl run smoke-test --image=busybox --restart=Never --rm -i \
        --command -- sh -c "echo 'Cluster is healthy'"

      # Check metrics server
      kubectl top nodes

      echo "Health checks passed!"
    EOT
  }

  depends_on = [
    module.eks_cluster
  ]
}
```

These automated checks verify cluster health before allowing traffic switchover, preventing bad deployments.

## Creating the Cutover Process

Document and automate the traffic switching process with clear rollback procedures.

```hcl
# cutover.tf - Manages traffic switching
resource "aws_route53_record" "weighted_cutover" {
  for_each = toset(["blue", "green"])

  zone_id = data.aws_route53_zone.main.zone_id
  name    = "api.example.com"
  type    = "A"

  set_identifier = each.key

  # Control traffic with this variable
  weighted_routing_policy {
    weight = var.traffic_weights[each.key]
  }

  alias {
    name                   = data.aws_lb.cluster[each.key].dns_name
    zone_id                = data.aws_lb.cluster[each.key].zone_id
    evaluate_target_health = true
  }
}

variable "traffic_weights" {
  description = "Traffic distribution between clusters"
  type        = map(number)

  default = {
    blue  = 100
    green = 0
  }
}
```

Adjust the `traffic_weights` variable to gradually shift traffic from blue to green.

## Building Rollback Capability

Prepare rollback procedures before starting the upgrade process.

```bash
#!/bin/bash
# rollback.sh

echo "Rolling back to blue cluster..."

# Update traffic weights immediately
terraform workspace select green
terraform apply -var='traffic_weights={"blue"=100,"green"=0}' -auto-approve

# Verify traffic is back on blue
for i in {1..10}; do
  response=$(curl -s -o /dev/null -w "%{http_code}" https://api.example.com/health)
  echo "Health check $i: $response"
  sleep 2
done

echo "Rollback complete. Green cluster remains available for investigation."
```

Fast rollback capability provides confidence to attempt upgrades, knowing you can revert quickly if needed.

## Managing State and Cleanup

After successfully running green for a period, clean up the blue cluster to avoid duplicate costs.

```bash
#!/bin/bash
# cleanup-blue.sh

read -p "Are you sure you want to destroy the blue cluster? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Cleanup cancelled"
  exit 0
fi

# Switch to blue workspace
terraform workspace select blue

# Destroy blue cluster
terraform destroy -auto-approve

echo "Blue cluster destroyed. Green is now the primary cluster."
echo "Consider renaming green to blue for the next upgrade cycle."
```

Proper cleanup prevents confusion about which cluster is active and eliminates unnecessary costs.

Blue-green Kubernetes cluster upgrades using Terraform workspaces provide a robust pattern for zero-downtime version updates. By maintaining separate clusters and controlling traffic switching, you gain the ability to validate upgrades thoroughly before fully committing to them. The workspace-based approach keeps infrastructure code DRY while enabling environment-specific configurations. This pattern reduces upgrade risk significantly and provides instant rollback capabilities, making Kubernetes version updates a routine operation rather than a high-stress event.
