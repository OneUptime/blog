# How to Deploy Karpenter with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Karpenter, EKS, Autoscaling, AWS, DevOps

Description: Learn how to deploy Karpenter on EKS with Terraform, including IAM roles, NodePools, EC2NodeClasses, and consolidation policies for cost-effective node provisioning.

---

Karpenter is a node provisioner for Kubernetes that replaces the traditional Cluster Autoscaler on AWS. While the Cluster Autoscaler works with pre-defined Auto Scaling Groups and node groups, Karpenter provisions individual EC2 instances directly based on pod requirements. It is faster (seconds instead of minutes), more flexible (it can mix instance types on the fly), and better at bin-packing workloads to reduce costs.

This guide covers deploying Karpenter on EKS using Terraform, from IAM setup to NodePool configuration.

## Prerequisites

Karpenter requires:
- An EKS cluster (1.25 or later recommended)
- An existing node group to run Karpenter itself (it cannot provision the nodes it runs on)
- IAM roles for both Karpenter and the nodes it creates
- The Karpenter Helm chart

## Setting Up IAM for Karpenter

Karpenter needs two IAM roles: one for the Karpenter controller pod, and one for the EC2 instances it creates.

```hcl
# Data sources for the EKS cluster
data "aws_eks_cluster" "cluster" {
  name = var.cluster_name
}

data "aws_partition" "current" {}
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id
  partition  = data.aws_partition.current.partition
  region     = data.aws_region.current.name
}

# IAM role for Karpenter controller (IRSA)
module "karpenter_irsa" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "5.33.0"

  role_name = "karpenter-controller-${var.cluster_name}"

  attach_karpenter_controller_policy = true

  karpenter_controller_cluster_name       = var.cluster_name
  karpenter_controller_node_iam_role_arns = [aws_iam_role.karpenter_node.arn]

  oidc_providers = {
    main = {
      provider_arn               = var.oidc_provider_arn
      namespace_service_accounts = ["kube-system:karpenter"]
    }
  }
}

# IAM role for nodes that Karpenter creates
resource "aws_iam_role" "karpenter_node" {
  name = "KarpenterNode-${var.cluster_name}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

# Attach required policies to the node role
resource "aws_iam_role_policy_attachment" "karpenter_node_policies" {
  for_each = toset([
    "arn:${local.partition}:iam::aws:policy/AmazonEKSWorkerNodePolicy",
    "arn:${local.partition}:iam::aws:policy/AmazonEKS_CNI_Policy",
    "arn:${local.partition}:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
    "arn:${local.partition}:iam::aws:policy/AmazonSSMManagedInstanceCore",
  ])

  role       = aws_iam_role.karpenter_node.name
  policy_arn = each.value
}

# Instance profile for EC2 instances
resource "aws_iam_instance_profile" "karpenter" {
  name = "KarpenterNodeInstanceProfile-${var.cluster_name}"
  role = aws_iam_role.karpenter_node.name
}
```

## Tagging Subnets and Security Groups

Karpenter discovers subnets and security groups through tags.

```hcl
# Tag subnets for Karpenter discovery
resource "aws_ec2_tag" "private_subnets" {
  for_each = toset(var.private_subnet_ids)

  resource_id = each.value
  key         = "karpenter.sh/discovery"
  value       = var.cluster_name
}

# Tag the node security group
resource "aws_ec2_tag" "node_security_group" {
  resource_id = var.node_security_group_id
  key         = "karpenter.sh/discovery"
  value       = var.cluster_name
}
```

## Mapping the Node Role in aws-auth

The nodes Karpenter creates need to be authorized to join the cluster.

```hcl
# Add the Karpenter node role to aws-auth ConfigMap
resource "kubectl_manifest" "karpenter_node_auth" {
  yaml_body = <<YAML
apiVersion: v1
kind: ConfigMap
metadata:
  name: aws-auth
  namespace: kube-system
data:
  mapRoles: |
    - rolearn: ${aws_iam_role.karpenter_node.arn}
      username: system:node:{{EC2PrivateDNSName}}
      groups:
        - system:bootstrappers
        - system:nodes
YAML

  # Be careful - this overwrites the existing aws-auth ConfigMap
  # In practice, use the EKS module's managed auth or merge manually
  lifecycle {
    ignore_changes = all
  }
}
```

## Installing Karpenter

```hcl
# Deploy Karpenter using Helm
resource "helm_release" "karpenter" {
  name       = "karpenter"
  repository = "oci://public.ecr.aws/karpenter"
  chart      = "karpenter"
  namespace  = "kube-system"
  version    = "0.33.0"

  values = [
    yamlencode({
      settings = {
        clusterName       = var.cluster_name
        clusterEndpoint   = data.aws_eks_cluster.cluster.endpoint
        interruptionQueue = aws_sqs_queue.karpenter.name
      }

      serviceAccount = {
        annotations = {
          "eks.amazonaws.com/role-arn" = module.karpenter_irsa.iam_role_arn
        }
      }

      replicas = 2

      resources = {
        requests = {
          cpu    = "200m"
          memory = "256Mi"
        }
        limits = {
          memory = "512Mi"
        }
      }

      # Run on the static node group, not on Karpenter-managed nodes
      nodeSelector = {
        "karpenter.sh/nodepool" = ""
      }

      tolerations = [{
        key      = "CriticalAddonsOnly"
        operator = "Exists"
      }]
    })
  ]

  wait    = true
  timeout = 300
}

# SQS queue for spot interruption handling
resource "aws_sqs_queue" "karpenter" {
  name                      = "Karpenter-${var.cluster_name}"
  message_retention_seconds = 300
  sqs_managed_sse_enabled   = true
}

# Event rules for spot interruption notices
resource "aws_cloudwatch_event_rule" "karpenter_interruption" {
  name = "Karpenter-${var.cluster_name}-interruption"

  event_pattern = jsonencode({
    source      = ["aws.health", "aws.ec2"]
    "detail-type" = [
      "EC2 Instance Rebalance Recommendation",
      "EC2 Instance State-change Notification",
      "EC2 Spot Instance Interruption Warning",
      "AWS Health Event"
    ]
  })
}

resource "aws_cloudwatch_event_target" "karpenter" {
  rule      = aws_cloudwatch_event_rule.karpenter_interruption.name
  target_id = "KarpenterInterruptionTarget"
  arn       = aws_sqs_queue.karpenter.arn
}

resource "aws_sqs_queue_policy" "karpenter" {
  queue_url = aws_sqs_queue.karpenter.url

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = ["events.amazonaws.com", "sqs.amazonaws.com"] }
      Action    = "sqs:SendMessage"
      Resource  = aws_sqs_queue.karpenter.arn
    }]
  })
}
```

## Configuring NodePools

NodePools define what kinds of instances Karpenter can provision. They replaced the older Provisioner resource in Karpenter v0.32+.

```hcl
# General purpose NodePool
resource "kubectl_manifest" "nodepool_general" {
  yaml_body = <<YAML
apiVersion: karpenter.sh/v1beta1
kind: NodePool
metadata:
  name: general
spec:
  template:
    metadata:
      labels:
        node-type: general
    spec:
      requirements:
        # Instance categories
        - key: karpenter.k8s.aws/instance-category
          operator: In
          values: ["m", "c", "r"]
        # Instance sizes
        - key: karpenter.k8s.aws/instance-size
          operator: In
          values: ["large", "xlarge", "2xlarge"]
        # Capacity type - prefer spot, fall back to on-demand
        - key: karpenter.sh/capacity-type
          operator: In
          values: ["spot", "on-demand"]
        # Architecture
        - key: kubernetes.io/arch
          operator: In
          values: ["amd64"]
      nodeClassRef:
        name: default
  limits:
    cpu: "200"
    memory: "800Gi"
  disruption:
    consolidationPolicy: WhenUnderutilized
    consolidateAfter: 30s
  weight: 10
YAML

  depends_on = [helm_release.karpenter]
}

# GPU NodePool for ML workloads
resource "kubectl_manifest" "nodepool_gpu" {
  yaml_body = <<YAML
apiVersion: karpenter.sh/v1beta1
kind: NodePool
metadata:
  name: gpu
spec:
  template:
    metadata:
      labels:
        node-type: gpu
    spec:
      requirements:
        - key: karpenter.k8s.aws/instance-category
          operator: In
          values: ["g", "p"]
        - key: karpenter.k8s.aws/instance-size
          operator: In
          values: ["xlarge", "2xlarge", "4xlarge"]
        - key: karpenter.sh/capacity-type
          operator: In
          values: ["on-demand"]
      nodeClassRef:
        name: default
      taints:
        - key: nvidia.com/gpu
          effect: NoSchedule
  limits:
    cpu: "100"
  disruption:
    consolidationPolicy: WhenEmpty
    consolidateAfter: 5m
YAML

  depends_on = [helm_release.karpenter]
}
```

## Configuring EC2NodeClasses

EC2NodeClasses define the AWS-specific configuration for nodes.

```hcl
# Default EC2NodeClass
resource "kubectl_manifest" "nodeclass_default" {
  yaml_body = <<YAML
apiVersion: karpenter.k8s.aws/v1beta1
kind: EC2NodeClass
metadata:
  name: default
spec:
  # AMI family - AL2 is the default EKS AMI
  amiFamily: AL2

  # Instance profile for the nodes
  instanceProfile: ${aws_iam_instance_profile.karpenter.name}

  # Subnet and security group discovery
  subnetSelectorTerms:
    - tags:
        karpenter.sh/discovery: ${var.cluster_name}
  securityGroupSelectorTerms:
    - tags:
        karpenter.sh/discovery: ${var.cluster_name}

  # EBS volume configuration
  blockDeviceMappings:
    - deviceName: /dev/xvda
      ebs:
        volumeSize: 100Gi
        volumeType: gp3
        iops: 3000
        throughput: 125
        encrypted: true
        deleteOnTermination: true

  # Tags applied to all EC2 instances
  tags:
    managed-by: karpenter
    cluster: ${var.cluster_name}
    environment: ${var.environment}

  # User data for additional node configuration
  userData: |
    #!/bin/bash
    echo "Node provisioned by Karpenter"
YAML

  depends_on = [helm_release.karpenter]
}
```

## Consolidation and Cost Optimization

Karpenter's consolidation feature automatically right-sizes your fleet.

```hcl
# NodePool with aggressive consolidation
resource "kubectl_manifest" "nodepool_cost_optimized" {
  yaml_body = <<YAML
apiVersion: karpenter.sh/v1beta1
kind: NodePool
metadata:
  name: cost-optimized
spec:
  template:
    spec:
      requirements:
        - key: karpenter.k8s.aws/instance-category
          operator: In
          values: ["m", "c", "r", "t"]
        - key: karpenter.sh/capacity-type
          operator: In
          values: ["spot"]
      nodeClassRef:
        name: default
  disruption:
    # Replace nodes with cheaper ones when possible
    consolidationPolicy: WhenUnderutilized
    # Check for consolidation opportunities frequently
    consolidateAfter: 30s
    # Expire nodes after 24 hours to pick up new AMIs
    expireAfter: 24h
  limits:
    cpu: "500"
    memory: "2000Gi"
YAML

  depends_on = [helm_release.karpenter]
}
```

## Best Practices

- Run Karpenter on a static node group (managed node group with fixed size) so it can always run
- Use spot instances for non-critical workloads to reduce costs by up to 90%
- Set `limits` on NodePools to prevent runaway scaling
- Enable consolidation to automatically right-size your fleet
- Use the SQS interruption queue for graceful spot instance handling
- Tag subnets and security groups consistently for discovery
- Start with broad instance requirements and narrow down based on actual usage
- Use separate NodePools for different workload types (general, GPU, high-memory)

For more on Kubernetes autoscaling, see our guide on [deploying Cluster Autoscaler with Terraform](https://oneuptime.com/blog/post/2026-02-23-cluster-autoscaler-terraform/view).
