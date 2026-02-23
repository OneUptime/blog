# How to Create IAM Roles for EKS Service Accounts in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, IAM, EKS, Kubernetes, IRSA, Infrastructure as Code

Description: Learn how to create IAM Roles for Service Accounts (IRSA) in Amazon EKS using Terraform to grant fine-grained AWS permissions to Kubernetes pods.

---

In Amazon EKS, the recommended way to grant AWS permissions to pods is through IAM Roles for Service Accounts (IRSA). This mechanism maps a Kubernetes service account to an IAM role, allowing pods that use that service account to assume the role and get temporary AWS credentials. IRSA provides pod-level access control instead of granting the same permissions to every pod on a node through the node instance role.

Terraform is an excellent tool for managing IRSA because it can create both the IAM resources and the Kubernetes service account annotations in a single workflow. This guide walks through the complete setup.

## How IRSA Works

IRSA uses OpenID Connect (OIDC) to establish trust between the EKS cluster and IAM. Here is the flow:

1. The EKS cluster has an OIDC provider endpoint.
2. You register this OIDC provider with IAM.
3. You create an IAM role with a trust policy that trusts the OIDC provider.
4. You annotate a Kubernetes service account with the IAM role ARN.
5. When a pod using that service account starts, the EKS pod identity webhook injects AWS credentials.
6. The pod can assume the IAM role and make AWS API calls.

## Prerequisites

You need:

- Terraform 1.0 or later
- An existing EKS cluster
- `kubectl` configured to access the cluster
- AWS CLI configured with valid credentials

## Step 1: Create the OIDC Provider

First, you need to register the EKS cluster's OIDC provider with IAM. Most EKS setups do this once per cluster.

```hcl
# Get the EKS cluster data
data "aws_eks_cluster" "cluster" {
  name = "my-eks-cluster"
}

# Get the OIDC issuer URL
locals {
  oidc_issuer = replace(data.aws_eks_cluster.cluster.identity[0].oidc[0].issuer, "https://", "")
}

# Fetch the OIDC thumbprint
data "tls_certificate" "cluster" {
  url = data.aws_eks_cluster.cluster.identity[0].oidc[0].issuer
}

# Create the OIDC provider in IAM
resource "aws_iam_openid_connect_provider" "cluster" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.cluster.certificates[0].sha1_fingerprint]
  url             = data.aws_eks_cluster.cluster.identity[0].oidc[0].issuer

  tags = {
    Cluster   = "my-eks-cluster"
    ManagedBy = "terraform"
  }
}
```

## Step 2: Create the IAM Role with OIDC Trust Policy

The trust policy allows the OIDC provider to assume the role, scoped to a specific service account.

```hcl
# Trust policy for the IRSA role
data "aws_iam_policy_document" "irsa_trust" {
  statement {
    effect = "Allow"

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.cluster.arn]
    }

    actions = ["sts:AssumeRoleWithWebIdentity"]

    # Restrict to a specific service account
    condition {
      test     = "StringEquals"
      variable = "${local.oidc_issuer}:sub"
      values   = ["system:serviceaccount:default:my-app-sa"]
    }

    # Verify the audience
    condition {
      test     = "StringEquals"
      variable = "${local.oidc_issuer}:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}

# Create the IAM role
resource "aws_iam_role" "irsa_role" {
  name               = "eks-my-app-irsa-role"
  assume_role_policy = data.aws_iam_policy_document.irsa_trust.json

  tags = {
    ServiceAccount = "my-app-sa"
    Namespace      = "default"
    Cluster        = "my-eks-cluster"
  }
}

# Attach permissions to the role
resource "aws_iam_policy" "app_policy" {
  name = "eks-my-app-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3Access"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket",
        ]
        Resource = [
          "arn:aws:s3:::my-app-data",
          "arn:aws:s3:::my-app-data/*",
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "irsa_policy" {
  role       = aws_iam_role.irsa_role.name
  policy_arn = aws_iam_policy.app_policy.arn
}
```

## Step 3: Create the Kubernetes Service Account

Annotate the Kubernetes service account with the IAM role ARN.

```hcl
# Create the Kubernetes service account with the IAM role annotation
resource "kubernetes_service_account" "app" {
  metadata {
    name      = "my-app-sa"
    namespace = "default"

    annotations = {
      # This annotation links the service account to the IAM role
      "eks.amazonaws.com/role-arn" = aws_iam_role.irsa_role.arn
    }
  }
}
```

## Creating IRSA Roles for Common EKS Components

### AWS Load Balancer Controller

```hcl
data "aws_iam_policy_document" "lb_controller_trust" {
  statement {
    effect = "Allow"

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.cluster.arn]
    }

    actions = ["sts:AssumeRoleWithWebIdentity"]

    condition {
      test     = "StringEquals"
      variable = "${local.oidc_issuer}:sub"
      values   = ["system:serviceaccount:kube-system:aws-load-balancer-controller"]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.oidc_issuer}:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lb_controller" {
  name               = "eks-lb-controller-role"
  assume_role_policy = data.aws_iam_policy_document.lb_controller_trust.json
}

# The AWS Load Balancer Controller needs a specific policy
# Download the policy from AWS documentation and create it
resource "aws_iam_policy" "lb_controller" {
  name   = "AWSLoadBalancerControllerIAMPolicy"
  policy = file("${path.module}/policies/lb-controller-policy.json")
}

resource "aws_iam_role_policy_attachment" "lb_controller" {
  role       = aws_iam_role.lb_controller.name
  policy_arn = aws_iam_policy.lb_controller.arn
}
```

### External DNS

```hcl
data "aws_iam_policy_document" "external_dns_trust" {
  statement {
    effect = "Allow"

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.cluster.arn]
    }

    actions = ["sts:AssumeRoleWithWebIdentity"]

    condition {
      test     = "StringEquals"
      variable = "${local.oidc_issuer}:sub"
      values   = ["system:serviceaccount:kube-system:external-dns"]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.oidc_issuer}:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "external_dns" {
  name               = "eks-external-dns-role"
  assume_role_policy = data.aws_iam_policy_document.external_dns_trust.json
}

resource "aws_iam_policy" "external_dns" {
  name = "external-dns-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["route53:ChangeResourceRecordSets"]
        Resource = ["arn:aws:route53:::hostedzone/*"]
      },
      {
        Effect = "Allow"
        Action = [
          "route53:ListHostedZones",
          "route53:ListResourceRecordSets",
        ]
        Resource = ["*"]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "external_dns" {
  role       = aws_iam_role.external_dns.name
  policy_arn = aws_iam_policy.external_dns.arn
}
```

## Reusable IRSA Module

Since the pattern is repetitive, a module makes it much cleaner.

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
  type    = string
  default = "default"
}

variable "service_account_name" {
  type = string
}

variable "role_name" {
  type = string
}

variable "policy_arns" {
  type    = list(string)
  default = []
}

# modules/irsa/main.tf
data "aws_iam_policy_document" "trust" {
  statement {
    effect = "Allow"

    principals {
      type        = "Federated"
      identifiers = [var.oidc_provider_arn]
    }

    actions = ["sts:AssumeRoleWithWebIdentity"]

    condition {
      test     = "StringEquals"
      variable = "${var.oidc_issuer}:sub"
      values   = ["system:serviceaccount:${var.namespace}:${var.service_account_name}"]
    }

    condition {
      test     = "StringEquals"
      variable = "${var.oidc_issuer}:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "this" {
  name               = var.role_name
  assume_role_policy = data.aws_iam_policy_document.trust.json
}

resource "aws_iam_role_policy_attachment" "this" {
  for_each   = toset(var.policy_arns)
  role       = aws_iam_role.this.name
  policy_arn = each.value
}

output "role_arn" {
  value = aws_iam_role.this.arn
}
```

Use the module like this:

```hcl
module "app_irsa" {
  source = "./modules/irsa"

  cluster_name         = "my-eks-cluster"
  oidc_provider_arn    = aws_iam_openid_connect_provider.cluster.arn
  oidc_issuer          = local.oidc_issuer
  namespace            = "production"
  service_account_name = "my-app"
  role_name            = "eks-my-app-role"
  policy_arns          = [aws_iam_policy.app_policy.arn]
}
```

## Allowing Multiple Service Accounts

Sometimes you want one role to be assumable by service accounts in multiple namespaces.

```hcl
data "aws_iam_policy_document" "multi_sa_trust" {
  statement {
    effect = "Allow"

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.cluster.arn]
    }

    actions = ["sts:AssumeRoleWithWebIdentity"]

    # Use StringLike with wildcards for multiple namespaces
    condition {
      test     = "StringLike"
      variable = "${local.oidc_issuer}:sub"
      values = [
        "system:serviceaccount:staging:my-app-sa",
        "system:serviceaccount:production:my-app-sa",
      ]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.oidc_issuer}:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}
```

## Best Practices

1. **Use IRSA instead of node roles.** IRSA provides pod-level granularity, while node roles apply to every pod on the node.
2. **One role per application.** Each application should have its own IRSA role with only the permissions it needs.
3. **Restrict trust to specific service accounts.** Always include the `sub` condition to limit which service accounts can assume the role.
4. **Use modules for consistency.** The IRSA pattern is repetitive; a module ensures every role is created correctly.
5. **Include the `aud` condition.** Always verify the audience to prevent token misuse.

For related topics, see [How to Create OIDC Identity Providers in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-oidc-identity-providers-in-terraform/view) and [How to Create IAM Roles for ECS Tasks in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-iam-roles-for-ecs-tasks-in-terraform/view).

## Conclusion

IAM Roles for Service Accounts provides the gold standard for granting AWS permissions to EKS pods. By combining Terraform's IAM and Kubernetes providers, you can manage the entire IRSA lifecycle in a single workflow. The key is setting up the OIDC provider correctly, building trust policies that are scoped to specific service accounts, and keeping permissions as narrow as possible. With a reusable module, you can rapidly onboard new applications while maintaining strict security controls.
