# How to Configure EKS Logging with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, EKS, Logging, CloudWatch, Fluent Bit, Kubernetes, Infrastructure as Code

Description: Learn how to configure EKS control plane logging and deploy Fluent Bit for pod log aggregation to CloudWatch Logs using OpenTofu.

## Introduction

EKS logging has two components: control plane logs (API server, audit, scheduler) sent to CloudWatch, and application/pod logs collected by a log agent like Fluent Bit. This guide covers both, giving you comprehensive visibility into your Kubernetes cluster.

## Prerequisites

- OpenTofu v1.6+
- An existing EKS cluster with node groups that is already managed by OpenTofu, or imported into OpenTofu state
- An IAM OIDC provider associated with the cluster for IAM Roles for Service Accounts (IRSA)

## Step 1: Enable Control Plane Logging

```hcl
# Enable all control plane log types for full audit visibility

resource "aws_eks_cluster" "main" {
  name     = var.cluster_name
  role_arn = var.cluster_role_arn
  version  = var.kubernetes_version

  vpc_config {
    subnet_ids = var.subnet_ids
  }

  # Send all control plane logs to CloudWatch
  enabled_cluster_log_types = [
    "api",              # API server requests and responses
    "audit",            # All requests to the API server
    "authenticator",    # Authentication decisions
    "controllerManager", # Controller actions (scaling, garbage collection)
    "scheduler"         # Pod scheduling decisions
  ]

  depends_on = [aws_cloudwatch_log_group.eks_control_plane]
}

# Set log retention period for cost management
resource "aws_cloudwatch_log_group" "eks_control_plane" {
  name              = "/aws/eks/${var.cluster_name}/cluster"
  retention_in_days = 30
  kms_key_id        = var.kms_key_arn

  tags = { Name = "${var.cluster_name}-control-plane-logs" }
}
```

## Step 2: Create IAM Role for Fluent Bit

```hcl
# Fluent Bit needs permission to write to CloudWatch Logs
resource "aws_iam_role" "fluent_bit" {
  name = "${var.cluster_name}-fluent-bit"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = "sts:AssumeRoleWithWebIdentity"
      Principal = {
        Federated = aws_iam_openid_connect_provider.cluster.arn
      }
      Condition = {
        StringEquals = {
          "${replace(aws_iam_openid_connect_provider.cluster.url, "https://", "")}:aud" = "sts.amazonaws.com"
          "${replace(aws_iam_openid_connect_provider.cluster.url, "https://", "")}:sub" = "system:serviceaccount:amazon-cloudwatch:aws-for-fluent-bit"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "fluent_bit_cloudwatch" {
  role       = aws_iam_role.fluent_bit.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}
```

## Step 3: Deploy Fluent Bit via Helm

```hcl
# Create the cloudwatch namespace
resource "kubernetes_namespace" "cloudwatch" {
  metadata {
    name = "amazon-cloudwatch"
  }
}

# Deploy AWS for Fluent Bit using the official Helm chart
resource "helm_release" "fluent_bit" {
  name       = "aws-for-fluent-bit"
  repository = "https://aws.github.io/eks-charts"
  chart      = "aws-for-fluent-bit"
  namespace  = kubernetes_namespace.cloudwatch.metadata[0].name
  version    = "0.1.32"

  values = [<<-EOF
    serviceAccount:
      name: aws-for-fluent-bit
      annotations:
        eks.amazonaws.com/role-arn: ${aws_iam_role.fluent_bit.arn}

    cloudWatchLogs:
      enabled: true
      region: ${var.region}
      logGroupName: /aws/eks/${var.cluster_name}/pods
      logGroupTemplate: /aws/eks/${var.cluster_name}/workloads/$kubernetes['namespace_name']
      logStreamTemplate: $kubernetes['pod_name']

    firehose:
      enabled: false

    kinesis:
      enabled: false

    elasticsearch:
      enabled: false
  EOF
  ]

  depends_on = [kubernetes_namespace.cloudwatch, aws_cloudwatch_log_group.pod_logs]
}
```

## Step 4: Create Log Groups for Pod Logs

```hcl
# Pre-create log groups for important namespaces
resource "aws_cloudwatch_log_group" "pod_logs" {
  for_each = toset(["default", "kube-system", "apps", "monitoring"])

  name              = "/aws/eks/${var.cluster_name}/workloads/${each.key}"
  retention_in_days = 14

  tags = {
    Cluster   = var.cluster_name
    Namespace = each.key
  }
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# Verify Fluent Bit is running
kubectl -n amazon-cloudwatch get pods
kubectl -n amazon-cloudwatch logs -l app.kubernetes.io/name=aws-for-fluent-bit --tail=20
```

## Conclusion

Comprehensive EKS logging requires both control plane logs for infrastructure-level visibility and Fluent Bit for application log aggregation. Store logs in separate CloudWatch log groups per namespace for easy filtering and cost-attributed retention policies. For high-volume environments, consider streaming logs to OpenSearch via Kinesis Firehose for more powerful search and analysis capabilities.
