# How to Configure EKS IRSA (IAM Roles for Service Accounts) in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, EKS, Kubernetes, IAM, Security

Description: Complete guide to configuring IAM Roles for Service Accounts (IRSA) on Amazon EKS with Terraform, enabling fine-grained IAM permissions at the pod level.

---

Before IRSA existed, giving pods access to AWS resources meant one of two bad options: attach broad IAM policies to the node role (every pod on that node gets the same permissions) or embed AWS credentials in environment variables (secrets management nightmare). IRSA fixes this by letting you assign IAM roles directly to Kubernetes service accounts. Each pod gets exactly the permissions it needs, nothing more.

IRSA works through OpenID Connect (OIDC). EKS exposes an OIDC provider, and IAM trusts that provider. When a pod uses a service account annotated with an IAM role ARN, the Kubernetes API server issues a signed token. AWS STS validates that token against the OIDC provider and returns temporary credentials scoped to the role.

This guide walks through setting up IRSA from scratch in Terraform.

## Prerequisites

You need an existing EKS cluster. If you do not have one yet, check out our guide on [creating EKS clusters with managed node groups](https://oneuptime.com/blog/post/2026-02-23-create-eks-cluster-managed-node-groups-terraform/view).

```hcl
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

## Setting Up the OIDC Provider

The first step is to create an IAM OIDC identity provider for your EKS cluster. This is what allows IAM to trust tokens issued by your cluster's API server.

```hcl
# Reference your existing EKS cluster
data "aws_eks_cluster" "main" {
  name = "my-cluster"
}

# Get the TLS certificate for the OIDC issuer
data "tls_certificate" "eks" {
  url = data.aws_eks_cluster.main.identity[0].oidc[0].issuer
}

# Create the IAM OIDC provider
resource "aws_iam_openid_connect_provider" "eks" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.eks.certificates[0].sha1_fingerprint]
  url             = data.aws_eks_cluster.main.identity[0].oidc[0].issuer

  tags = {
    Cluster = "my-cluster"
  }
}

# Extract the OIDC issuer URL without the https:// prefix - we need this for trust policies
locals {
  oidc_issuer = replace(data.aws_eks_cluster.main.identity[0].oidc[0].issuer, "https://", "")
}
```

## Creating an IAM Role for a Service Account

Now create an IAM role that trusts the OIDC provider. The trust policy is scoped to a specific namespace and service account name, so only pods using that exact service account can assume the role.

```hcl
# IAM role for an application that needs S3 access
resource "aws_iam_role" "s3_reader" {
  name = "eks-s3-reader"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.eks.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            # Only the specific service account in the specific namespace can assume this role
            "${local.oidc_issuer}:sub" = "system:serviceaccount:app:s3-reader-sa"
            "${local.oidc_issuer}:aud" = "sts.amazonaws.com"
          }
        }
      }
    ]
  })
}

# Attach a policy granting S3 read access
resource "aws_iam_role_policy" "s3_reader" {
  name = "s3-read-access"
  role = aws_iam_role.s3_reader.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::my-data-bucket",
          "arn:aws:s3:::my-data-bucket/*"
        ]
      }
    ]
  })
}
```

## Creating the Kubernetes Service Account

The service account needs an annotation that points to the IAM role ARN. When a pod uses this service account, the EKS pod identity webhook injects the necessary environment variables and token volume.

```hcl
# Configure the Kubernetes provider
data "aws_eks_cluster_auth" "main" {
  name = data.aws_eks_cluster.main.name
}

provider "kubernetes" {
  host                   = data.aws_eks_cluster.main.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.main.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.main.token
}

# Create the namespace
resource "kubernetes_namespace" "app" {
  metadata {
    name = "app"
  }
}

# Create the service account with the IAM role annotation
resource "kubernetes_service_account" "s3_reader" {
  metadata {
    name      = "s3-reader-sa"
    namespace = "app"

    annotations = {
      # This annotation is what makes IRSA work
      "eks.amazonaws.com/role-arn" = aws_iam_role.s3_reader.arn
    }
  }

  depends_on = [kubernetes_namespace.app]
}
```

## Using the Service Account in a Pod

Any pod that uses this service account will automatically get AWS credentials injected. Here is an example deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: s3-reader
  namespace: app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: s3-reader
  template:
    metadata:
      labels:
        app: s3-reader
    spec:
      serviceAccountName: s3-reader-sa  # Use the IRSA service account
      containers:
        - name: app
          image: amazon/aws-cli:latest
          command: ["sleep", "infinity"]
          # No need for AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY
          # The pod identity webhook automatically injects:
          # - AWS_ROLE_ARN
          # - AWS_WEB_IDENTITY_TOKEN_FILE
```

## Creating a Reusable Module

When you have many services that each need their own IAM role, you end up repeating the same pattern. Here is a module that makes it easy to create new IRSA roles.

```hcl
# modules/irsa/variables.tf
variable "cluster_name" {
  type = string
}

variable "oidc_provider_arn" {
  type = string
}

variable "oidc_issuer" {
  description = "OIDC issuer URL without https:// prefix"
  type        = string
}

variable "namespace" {
  type = string
}

variable "service_account_name" {
  type = string
}

variable "role_name" {
  type = string
}

variable "policy_json" {
  description = "JSON-encoded IAM policy document"
  type        = string
}

# modules/irsa/main.tf
resource "aws_iam_role" "this" {
  name = var.role_name

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = var.oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${var.oidc_issuer}:sub" = "system:serviceaccount:${var.namespace}:${var.service_account_name}"
            "${var.oidc_issuer}:aud" = "sts.amazonaws.com"
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "this" {
  name   = "${var.role_name}-policy"
  role   = aws_iam_role.this.id
  policy = var.policy_json
}

resource "kubernetes_service_account" "this" {
  metadata {
    name      = var.service_account_name
    namespace = var.namespace

    annotations = {
      "eks.amazonaws.com/role-arn" = aws_iam_role.this.arn
    }
  }
}

# modules/irsa/outputs.tf
output "role_arn" {
  value = aws_iam_role.this.arn
}

output "service_account_name" {
  value = kubernetes_service_account.this.metadata[0].name
}
```

Now you can create IRSA roles with a few lines:

```hcl
# DynamoDB access for the orders service
module "orders_irsa" {
  source = "./modules/irsa"

  cluster_name         = "my-cluster"
  oidc_provider_arn    = aws_iam_openid_connect_provider.eks.arn
  oidc_issuer          = local.oidc_issuer
  namespace            = "orders"
  service_account_name = "orders-sa"
  role_name            = "eks-orders-dynamodb"

  policy_json = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:Query",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem"
        ]
        Resource = "arn:aws:dynamodb:us-east-1:*:table/orders*"
      }
    ]
  })
}

# SQS access for the notifications service
module "notifications_irsa" {
  source = "./modules/irsa"

  cluster_name         = "my-cluster"
  oidc_provider_arn    = aws_iam_openid_connect_provider.eks.arn
  oidc_issuer          = local.oidc_issuer
  namespace            = "notifications"
  service_account_name = "notifications-sa"
  role_name            = "eks-notifications-sqs"

  policy_json = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = "arn:aws:sqs:us-east-1:*:notifications-*"
      }
    ]
  })
}
```

## IRSA for AWS Add-ons

Several AWS-managed add-ons use IRSA, including the AWS Load Balancer Controller, the EBS CSI Driver, and the VPC CNI plugin. Here is how to set up IRSA for the AWS Load Balancer Controller:

```hcl
# IRSA role for the AWS Load Balancer Controller
resource "aws_iam_role" "lb_controller" {
  name = "eks-lb-controller"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.eks.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${local.oidc_issuer}:sub" = "system:serviceaccount:kube-system:aws-load-balancer-controller"
            "${local.oidc_issuer}:aud" = "sts.amazonaws.com"
          }
        }
      }
    ]
  })
}

# The LB controller needs a fairly broad set of permissions
# AWS provides a managed policy document for this
resource "aws_iam_role_policy_attachment" "lb_controller" {
  policy_arn = aws_iam_policy.lb_controller.arn
  role       = aws_iam_role.lb_controller.name
}

# You typically download the policy JSON from the AWS docs
# and create it as a managed policy
resource "aws_iam_policy" "lb_controller" {
  name = "AWSLoadBalancerControllerIAMPolicy"

  # In practice, download this from:
  # https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/main/docs/install/iam_policy.json
  policy = file("${path.module}/lb-controller-policy.json")
}

# Service account for the controller
resource "kubernetes_service_account" "lb_controller" {
  metadata {
    name      = "aws-load-balancer-controller"
    namespace = "kube-system"

    annotations = {
      "eks.amazonaws.com/role-arn" = aws_iam_role.lb_controller.arn
    }
  }
}
```

## Allowing Multiple Service Accounts

Sometimes you want a single IAM role shared across multiple service accounts or namespaces. Use `StringLike` with a wildcard instead of `StringEquals`:

```hcl
resource "aws_iam_role" "shared_reader" {
  name = "eks-shared-s3-reader"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.eks.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringLike = {
            # Allow any service account with name ending in "-reader" across all namespaces
            "${local.oidc_issuer}:sub" = "system:serviceaccount:*:*-reader"
          }
          StringEquals = {
            "${local.oidc_issuer}:aud" = "sts.amazonaws.com"
          }
        }
      }
    ]
  })
}
```

Be careful with wildcards in trust policies. The broader the match, the more pods can assume the role. In most cases, you want one role per service account.

## Debugging IRSA

When IRSA is not working, here is how to troubleshoot:

1. Verify the service account annotation is correct by running `kubectl describe sa <name> -n <namespace>`.
2. Check that the pod is using the right service account. Look for `AWS_ROLE_ARN` and `AWS_WEB_IDENTITY_TOKEN_FILE` environment variables inside the pod.
3. Make sure the OIDC provider thumbprint is correct. If it is wrong, STS will reject the tokens.
4. Confirm the trust policy conditions match exactly. The namespace and service account name in the condition must match what is deployed in the cluster.

```bash
# Check if IRSA env vars are injected
kubectl exec -it <pod-name> -n <namespace> -- env | grep AWS

# Verify the token is mounted
kubectl exec -it <pod-name> -n <namespace> -- cat /var/run/secrets/eks.amazonaws.com/serviceaccount/token

# Test AWS access from inside the pod
kubectl exec -it <pod-name> -n <namespace> -- aws sts get-caller-identity
```

## Security Best Practices

**Scope roles narrowly.** Each service account should have the minimum permissions it needs. Do not create one role with broad permissions and share it across services.

**Use resource-level ARNs in policies.** Instead of `Resource: "*"`, specify the exact S3 buckets, DynamoDB tables, or SQS queues the service needs access to.

**Audit regularly.** Use AWS IAM Access Analyzer to identify roles that have permissions they never actually use.

**Do not use wildcards in trust policies unless you have a good reason.** A wildcard in the `sub` condition means any matching service account can assume the role, which widens your attack surface.

**Rotate the OIDC thumbprint when certificates change.** This happens rarely, but if the EKS OIDC certificate rotates and you do not update the thumbprint, IRSA will break for new pods.

## Wrapping Up

IRSA is one of those things that takes a bit of setup but pays off immediately. No more shared node roles with overly broad permissions, no more AWS credentials baked into secrets. Each service gets its own IAM role with least-privilege access, and Terraform makes it easy to manage at scale.

The reusable module pattern works well once you have more than a handful of services. Define the OIDC provider once, then stamp out IRSA roles for each service with a module call.
