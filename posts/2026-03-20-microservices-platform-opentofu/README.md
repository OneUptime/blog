# How to Build a Microservices Platform with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Microservice, EKS, Service Mesh, AWS, Infrastructure as Code

Description: Learn how to build a microservices platform on AWS with OpenTofu using EKS, service mesh, API gateway, and shared infrastructure components.

## Introduction

A microservices platform provides shared infrastructure that all services can use. This guide provisions core platform components that teams deploy their services onto: an EKS cluster, ingress and load balancing, DNS automation, and namespace isolation.

## EKS Cluster

```hcl
module "eks" {
  source  = "registry.opentofu.org/terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = "myapp-${var.environment}"
  cluster_version = "1.35"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  cluster_endpoint_public_access  = true
  cluster_endpoint_private_access = true

  # Enable IRSA (IAM Roles for Service Accounts)
  enable_irsa = true

  eks_managed_node_groups = {
    system = {
      instance_types = ["m5.large"]
      min_size       = 2
      max_size       = 5
      desired_size   = 2

      labels = { "node-type" = "system" }
      taints = [{ key = "CriticalAddonsOnly", value = "true", effect = "NO_SCHEDULE" }]
    }

    app = {
      instance_types = ["m5.xlarge"]
      min_size       = 3
      max_size       = 20
      desired_size   = 3
      labels         = { "node-type" = "app" }
    }
  }

  cluster_addons = {
    coredns    = { most_recent = true }
    kube-proxy = { most_recent = true }
    vpc-cni    = { most_recent = true }
    aws-ebs-csi-driver = { most_recent = true }
  }
}
```

## AWS Load Balancer Controller

```hcl
resource "aws_iam_role" "alb_controller" {
  name = "alb-controller-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = "sts:AssumeRoleWithWebIdentity"
      Principal = { Federated = module.eks.oidc_provider_arn }
      Condition = {
        StringEquals = {
          "${module.eks.oidc_provider}:aud" = "sts.amazonaws.com"
          "${module.eks.oidc_provider}:sub" = "system:serviceaccount:kube-system:aws-load-balancer-controller"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "alb_controller" {
  role = aws_iam_role.alb_controller.name
  # Create this policy from the controller's upstream iam_policy.json
  policy_arn = var.alb_controller_policy_arn
}

resource "helm_release" "alb_controller" {
  name       = "aws-load-balancer-controller"
  repository = "https://aws.github.io/eks-charts"
  chart      = "aws-load-balancer-controller"
  namespace  = "kube-system"
  version    = "3.2.2"

  set { name = "clusterName"; value = module.eks.cluster_name }
  set { name = "serviceAccount.name"; value = "aws-load-balancer-controller" }
  set { name = "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"; value = aws_iam_role.alb_controller.arn }
}
```

## Cluster Autoscaler

```hcl
resource "aws_iam_role" "cluster_autoscaler" {
  name = "cluster-autoscaler-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = "sts:AssumeRoleWithWebIdentity"
      Principal = { Federated = module.eks.oidc_provider_arn }
      Condition = {
        StringEquals = {
          "${module.eks.oidc_provider}:aud" = "sts.amazonaws.com"
          "${module.eks.oidc_provider}:sub" = "system:serviceaccount:kube-system:cluster-autoscaler"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "cluster_autoscaler" {
  name = "cluster-autoscaler-${var.environment}"
  role = aws_iam_role.cluster_autoscaler.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "autoscaling:SetDesiredCapacity",
          "autoscaling:TerminateInstanceInAutoScalingGroup"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:ResourceTag/k8s.io/cluster-autoscaler/enabled" = "true"
            "aws:ResourceTag/k8s.io/cluster-autoscaler/${module.eks.cluster_name}" = "owned"
          }
        }
      },
      {
        Effect = "Allow"
        Action = [
          "autoscaling:DescribeAutoScalingGroups",
          "autoscaling:DescribeAutoScalingInstances",
          "autoscaling:DescribeLaunchConfigurations",
          "autoscaling:DescribeScalingActivities",
          "autoscaling:DescribeTags",
          "ec2:DescribeImages",
          "ec2:DescribeInstanceTypes",
          "ec2:DescribeLaunchTemplateVersions",
          "ec2:GetInstanceTypesFromInstanceRequirements",
          "eks:DescribeNodegroup"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "helm_release" "cluster_autoscaler" {
  name       = "cluster-autoscaler"
  repository = "https://kubernetes.github.io/autoscaler"
  chart      = "cluster-autoscaler"
  namespace  = "kube-system"
  version    = "9.57.0"

  set { name = "autoDiscovery.clusterName";    value = module.eks.cluster_name }
  set { name = "awsRegion";                     value = var.region }
  set { name = "rbac.serviceAccount.name";      value = "cluster-autoscaler" }
  set { name = "rbac.serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"; value = aws_iam_role.cluster_autoscaler.arn }
}
```

## External DNS

```hcl
resource "aws_iam_role" "external_dns" {
  name = "external-dns-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = "sts:AssumeRoleWithWebIdentity"
      Principal = { Federated = module.eks.oidc_provider_arn }
      Condition = {
        StringEquals = {
          "${module.eks.oidc_provider}:aud" = "sts.amazonaws.com"
          "${module.eks.oidc_provider}:sub" = "system:serviceaccount:kube-system:external-dns"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "external_dns" {
  name = "external-dns-${var.environment}"
  role = aws_iam_role.external_dns.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "route53:ChangeResourceRecordSets",
          "route53:ListResourceRecordSets",
          "route53:ListTagsForResources"
        ]
        Resource = [
          "arn:aws:route53:::hostedzone/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "route53:ListHostedZones"
        ]
        Resource = [
          "*"
        ]
      }
    ]
  })
}

resource "helm_release" "external_dns" {
  name       = "external-dns"
  repository = "https://charts.bitnami.com/bitnami"
  chart      = "external-dns"
  namespace  = "kube-system"

  set { name = "provider";       value = "aws" }
  set { name = "aws.region";     value = var.region }
  set { name = "domainFilters[0]"; value = var.domain_name }
  set { name = "serviceAccount.name"; value = "external-dns" }
  set { name = "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"; value = aws_iam_role.external_dns.arn }
}
```

## Namespace and Resource Quotas Per Team

```hcl
locals {
  teams = {
    api     = { namespace = "api-team",     quota_cpu = "20", quota_memory = "40Gi" }
    frontend = { namespace = "frontend-team", quota_cpu = "10", quota_memory = "20Gi" }
    data    = { namespace = "data-team",    quota_cpu = "40", quota_memory = "80Gi" }
  }
}

resource "kubernetes_namespace" "team" {
  for_each = local.teams

  metadata {
    name = each.value.namespace
    labels = {
      "team"        = each.key
      "environment" = var.environment
    }
  }
}

resource "kubernetes_resource_quota" "team" {
  for_each = local.teams

  metadata {
    name      = "team-quota"
    namespace = kubernetes_namespace.team[each.key].metadata[0].name
  }

  spec {
    hard = {
      "requests.cpu"    = each.value.quota_cpu
      "requests.memory" = each.value.quota_memory
    }
  }
}
```

## Summary

A microservices platform built with OpenTofu provisions EKS with managed node groups, the AWS Load Balancer Controller for HTTP traffic, Cluster Autoscaler for dynamic scaling, ExternalDNS for automatic Route 53 record management, and team namespaces with resource quotas. The platform layer is separate from individual service deployments - platform team owns the cluster, application teams deploy services into their namespaces using IRSA for AWS service access.
