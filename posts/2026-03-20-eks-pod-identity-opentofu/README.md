# How to Configure EKS Pod Identity with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, EKS, Pod Identity, IAM, Kubernetes, Security, Infrastructure as Code

Description: Learn how to configure EKS Pod Identity using OpenTofu as the modern replacement for IRSA, providing simplified IAM role assignment to Kubernetes service accounts.

## Introduction

EKS Pod Identity is the newer, simplified alternative to IRSA for granting IAM permissions to Kubernetes pods. Unlike IRSA, it doesn't require creating OIDC providers or complex trust policies-you simply associate an IAM role with a service account using the EKS API.

## Prerequisites

- OpenTofu v1.6+
- EKS cluster version 1.24 or later
- Linux Amazon EC2 worker nodes (Pod Identity doesn't support Fargate or Windows pods)
- Pod Identity Agent add-on installed
- Workload uses a supported AWS SDK version or AWS CLI via the default credential chain
- AWS credentials with EKS and IAM permissions

## Step 1: Install the Pod Identity Agent Add-On

```hcl
# The Pod Identity Agent must be installed on each eligible worker node

# It handles credential injection for pods
resource "aws_eks_addon" "pod_identity" {
  cluster_name             = var.cluster_name
  addon_name               = "eks-pod-identity-agent"
  addon_version            = data.aws_eks_addon_version.pod_identity.version
  resolve_conflicts_on_update = "OVERWRITE"

  tags = { Name = "pod-identity-agent" }
}

data "aws_eks_addon_version" "pod_identity" {
  addon_name         = "eks-pod-identity-agent"
  kubernetes_version = var.kubernetes_version
  most_recent        = true
}
```

## Step 2: Create an IAM Role for Pod Identity

```hcl
# IAM role with the EKS Pod Identity trust policy
# Much simpler than IRSA - no OIDC provider needed
resource "aws_iam_role" "pod_identity" {
  name = "${var.cluster_name}-pod-identity-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "sts:AssumeRole",
        "sts:TagSession"  # Required for Pod Identity
      ]
      Principal = {
        Service = "pods.eks.amazonaws.com"
      }
    }]
  })
}

# Attach the required permissions policy
resource "aws_iam_role_policy" "pod_permissions" {
  name = "pod-application-permissions"
  role = aws_iam_role.pod_identity.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::${var.app_bucket}"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = [
          "arn:aws:s3:::${var.app_bucket}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = var.app_secret_arns
      }
    ]
  })
}
```

## Step 3: Create the Pod Identity Association

```hcl
# Associate the IAM role with a Kubernetes service account
# This replaces the service account annotation needed by IRSA
resource "aws_eks_pod_identity_association" "app" {
  cluster_name    = var.cluster_name
  namespace       = var.kubernetes_namespace
  service_account = var.service_account_name
  role_arn        = aws_iam_role.pod_identity.arn

  # Ensure the service account exists before creating the association
  depends_on = [kubernetes_service_account.app]

  tags = {
    Name        = "${var.cluster_name}-pod-identity"
    Application = var.app_name
  }
}
```

## Step 4: Create the Kubernetes Service Account

```hcl
# The service account no longer needs IAM role annotations
# The association is managed entirely in AWS
resource "kubernetes_service_account" "app" {
  metadata {
    name      = var.service_account_name
    namespace = var.kubernetes_namespace

    labels = {
      "app.kubernetes.io/managed-by" = "opentofu"
    }
    # No eks.amazonaws.com/role-arn annotation needed!
  }
}
```

## Step 5: Deploy a Pod Using the Service Account

```hcl
resource "kubernetes_deployment" "app" {
  # Create pods only after the Pod Identity association exists
  depends_on = [aws_eks_pod_identity_association.app]

  metadata {
    name      = var.app_name
    namespace = var.kubernetes_namespace
  }

  spec {
    replicas = 3

    selector {
      match_labels = { app = var.app_name }
    }

    template {
      metadata {
        labels = { app = var.app_name }
      }

      spec {
        service_account_name = kubernetes_service_account.app.metadata[0].name

        container {
          name  = "app"
          image = "${var.ecr_repo_url}:${var.image_tag}"
        }
      }
    }
  }
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

EKS Pod Identity simplifies AWS credential management for Kubernetes pods by removing the need for OIDC provider management and complex trust policy conditions. The association between IAM roles and service accounts is a first-class AWS resource, making it easier to audit and manage permissions. For new EKS clusters, prefer Pod Identity over IRSA for reduced operational complexity.
