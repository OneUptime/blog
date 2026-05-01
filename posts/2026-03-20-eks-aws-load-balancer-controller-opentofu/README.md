# How to Deploy AWS Load Balancer Controller on EKS with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, EKS, Load Balancer Controller, ALB, NLB, Kubernetes, Infrastructure as Code

Description: Learn how to install the AWS Load Balancer Controller on EKS using OpenTofu to provision Application Load Balancers and Network Load Balancers from Kubernetes Ingress and Service resources.

## Introduction

The AWS Load Balancer Controller manages ALBs for Kubernetes Ingress resources and NLBs for LoadBalancer-type Services. For load balancing on EKS, it supersedes the legacy in-tree cloud provider behavior that provisions Classic Load Balancers and provides modern features like traffic weighting, authentication, and HTTPS redirection.

## Prerequisites

- OpenTofu v1.6+
- An existing EKS cluster running Kubernetes 1.22+ with an IAM OIDC provider
- Helm provider configured
- VPC subnets tagged for public or private load balancers (`kubernetes.io/role/elb` or `kubernetes.io/role/internal-elb`); cluster tags are optional with AWS Load Balancer Controller v2.1.2+

## Step 1: Create IAM Policy for the Controller

```hcl
# Download and create the IAM policy for the controller release you are deploying

data "http" "lbc_policy" {
  url = "https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v3.2.2/docs/install/iam_policy.json"
}

resource "aws_iam_policy" "lbc" {
  name        = "AWSLoadBalancerControllerIAMPolicy"
  description = "IAM policy for the AWS Load Balancer Controller"
  policy      = data.http.lbc_policy.response_body
}
```

## Step 2: Create IRSA Role for the Controller

```hcl
data "aws_eks_cluster" "cluster" {
  name = var.cluster_name
}

data "aws_iam_openid_connect_provider" "cluster" {
  url = data.aws_eks_cluster.cluster.identity[0].oidc[0].issuer
}

locals {
  oidc_provider = replace(data.aws_eks_cluster.cluster.identity[0].oidc[0].issuer, "https://", "")
}

resource "aws_iam_role" "lbc" {
  name = "${var.cluster_name}-aws-load-balancer-controller"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = "sts:AssumeRoleWithWebIdentity"
      Principal = {
        Federated = data.aws_iam_openid_connect_provider.cluster.arn
      }
      Condition = {
        StringEquals = {
          "${local.oidc_provider}:sub" = "system:serviceaccount:kube-system:aws-load-balancer-controller"
          "${local.oidc_provider}:aud" = "sts.amazonaws.com"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lbc" {
  role       = aws_iam_role.lbc.name
  policy_arn = aws_iam_policy.lbc.arn
}
```

## Step 3: Deploy via Helm

```hcl
# Add the EKS Helm repository and install the controller
resource "helm_release" "lbc" {
  name       = "aws-load-balancer-controller"
  repository = "https://aws.github.io/eks-charts"
  chart      = "aws-load-balancer-controller"
  namespace  = "kube-system"
  version    = "3.2.2"

  set {
    name  = "clusterName"
    value = var.cluster_name
  }

  set {
    name  = "serviceAccount.name"
    value = "aws-load-balancer-controller"
  }

  set {
    name  = "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = aws_iam_role.lbc.arn
  }

  set {
    name  = "region"
    value = var.region
  }

  set {
    name  = "vpcId"
    value = var.vpc_id
  }

  # Use 2 replicas for high availability
  set {
    name  = "replicaCount"
    value = "2"
  }
}
```

## Step 4: Create an Ingress Resource

```hcl
# Kubernetes Ingress that provisions an ALB
resource "kubernetes_ingress_v1" "app" {
  metadata {
    name      = "app-ingress"
    namespace = "apps"

    annotations = {
      "alb.ingress.kubernetes.io/scheme"          = "internet-facing"
      "alb.ingress.kubernetes.io/target-type"     = "ip"
      "alb.ingress.kubernetes.io/certificate-arn" = var.acm_cert_arn
      "alb.ingress.kubernetes.io/listen-ports"    = "[{\"HTTP\":80},{\"HTTPS\":443}]"
      "alb.ingress.kubernetes.io/ssl-redirect"    = "443"
    }
  }

  spec {
    ingress_class_name = "alb"

    rule {
      host = "app.example.com"
      http {
        path {
          path      = "/*"
          path_type = "ImplementationSpecific"
          backend {
            service {
              name = "app-service"
              port { number = 80 }
            }
          }
        }
      }
    }
  }
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# Verify controller is running
kubectl -n kube-system get pods -l app.kubernetes.io/name=aws-load-balancer-controller
```

## Conclusion

The AWS Load Balancer Controller enables powerful Kubernetes-native load balancing on AWS. Use ALBs for HTTP/HTTPS ingress with path-based routing and NLBs for TCP/UDP services requiring static IPs or ultra-low latency. The controller's IngressGroup feature lets multiple Ingress resources share a single ALB to reduce costs.
