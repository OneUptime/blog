# How to Set Up EKS IRSA (IAM Roles for Service Accounts) with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, EKS, IRSA, IAM, Kubernetes, Security, Infrastructure as Code

Description: Learn how to configure IAM Roles for Service Accounts (IRSA) on EKS using OpenTofu to grant Kubernetes pods fine-grained AWS permissions without node-level credentials.

## Introduction

IRSA enables Kubernetes pods to assume IAM roles using service account tokens projected via the OIDC provider. This is more secure than attaching policies to node IAM roles, because permissions can be scoped to individual service accounts rather than all pods on a node. To preserve that isolation, restrict pod access to the node IAM role through IMDS.

## Prerequisites

- OpenTofu v1.6+
- An existing EKS cluster
- AWS credentials with IAM and EKS permissions

## Step 1: Create the OIDC Provider

```hcl
# Look up the existing EKS cluster
data "aws_eks_cluster" "main" {
  name = var.cluster_name
}

# Get the OIDC thumbprint for the cluster's issuer URL
data "tls_certificate" "cluster" {
  url = data.aws_eks_cluster.main.identity[0].oidc[0].issuer
}

# Create the OIDC provider for the EKS cluster
resource "aws_iam_openid_connect_provider" "cluster" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.cluster.certificates[0].sha1_fingerprint]
  url             = data.aws_eks_cluster.main.identity[0].oidc[0].issuer

  tags = {
    Name    = "${var.cluster_name}-oidc-provider"
    Cluster = var.cluster_name
  }
}
```

## Step 2: Create an IAM Role with OIDC Trust Policy

```hcl
# Extract the OIDC provider URL without https://
locals {
  oidc_provider = replace(aws_iam_openid_connect_provider.cluster.url, "https://", "")
}

# IAM role for the S3 reader service account
resource "aws_iam_role" "s3_reader" {
  name = "${var.cluster_name}-s3-reader"

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
          # Restrict to a specific namespace and service account
          "${local.oidc_provider}:sub" = "system:serviceaccount:${var.namespace}:s3-reader"
          "${local.oidc_provider}:aud" = "sts.amazonaws.com"
        }
      }
    }]
  })
}

resource "aws_iam_policy" "s3_reader" {
  name        = "${var.cluster_name}-s3-reader-policy"
  description = "Allow reading from specific S3 buckets"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["s3:GetObject", "s3:ListBucket"]
      Resource = [
        "arn:aws:s3:::${var.data_bucket}",
        "arn:aws:s3:::${var.data_bucket}/*"
      ]
    }]
  })
}

resource "aws_iam_role_policy_attachment" "s3_reader" {
  role       = aws_iam_role.s3_reader.name
  policy_arn = aws_iam_policy.s3_reader.arn
}
```

## Step 3: Create the Kubernetes Service Account

```hcl
# Annotate the service account with the IAM role ARN
resource "kubernetes_service_account" "s3_reader" {
  metadata {
    name      = "s3-reader"
    namespace = var.namespace

    annotations = {
      "eks.amazonaws.com/role-arn" = aws_iam_role.s3_reader.arn
    }
  }
}
```

## Step 4: Use the Service Account in a Job

```hcl
# Job using the annotated service account to access S3
resource "kubernetes_job_v1" "s3_reader_app" {
  metadata {
    name      = "s3-reader-app"
    namespace = var.namespace
  }

  spec {
    template {
      metadata {
        labels = { app = "s3-reader" }
      }

      spec {
        # Use the IRSA-enabled service account
        service_account_name = kubernetes_service_account.s3_reader.metadata[0].name
        restart_policy       = "Never"

        container {
          name    = "app"
          image   = "amazon/aws-cli:latest"
          command = ["aws"]
          args    = ["s3", "ls", "s3://${var.data_bucket}/"]
        }
      }
    }

    backoff_limit = 1
  }
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

IRSA provides least-privilege IAM access for Kubernetes workloads by binding IAM roles to specific service accounts. This eliminates the need to manage AWS credentials as secrets and reduces the blast radius between workloads with different permission requirements, especially when access to the node IAM role is restricted. Always scope the OIDC condition to a specific namespace and service account name for maximum security.
