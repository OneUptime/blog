# How to Deploy External DNS on Kubernetes with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, ExternalDNS, DNS, OpenTofu, Helm, Route53, Azure DNS

Description: Learn how to deploy ExternalDNS on Kubernetes using OpenTofu and Helm to automatically manage DNS records for Kubernetes Services and Ingresses.

## Overview

ExternalDNS synchronizes Kubernetes Services and Ingresses with DNS providers like AWS Route53, Azure DNS, Google Cloud DNS, and Cloudflare. OpenTofu deploys ExternalDNS via Helm with the appropriate IAM credentials for your DNS provider.

## Step 1: Deploy ExternalDNS with Helm

```hcl
# main.tf - Deploy ExternalDNS via Helm

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 3.1"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 3.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

resource "kubernetes_namespace_v1" "external_dns" {
  metadata {
    name = "external-dns"
  }
}

resource "helm_release" "external_dns" {
  name             = "external-dns"
  repository       = "https://kubernetes-sigs.github.io/external-dns/"
  chart            = "external-dns"
  version          = "1.21.1"
  namespace        = kubernetes_namespace_v1.external_dns.metadata[0].name

  values = [yamlencode({
    provider = {
      name = "aws"
    }

    env = [{
      name  = "AWS_DEFAULT_REGION"
      value = "us-east-1"
    }]

    # Sync policy - sync = create, update, and delete; upsert-only = only create/update
    policy = "sync"

    # Watch Ingresses and Services for DNS endpoints
    sources = ["ingress", "service"]

    # Domain filters - only manage records in these zones
    domainFilters = ["example.com"]

    # TXT registry to track ownership
    registry   = "txt"
    txtOwnerId = "my-cluster"

    # Only process resources with this annotation
    annotationFilter = "external-dns.alpha.kubernetes.io/managed=true"

    extraArgs = {
      "aws-zone-type" = "public"
    }

    serviceAccount = {
      create = true
      name   = "external-dns"
      annotations = {
        "eks.amazonaws.com/role-arn" = aws_iam_role.external_dns.arn
      }
    }

    resources = {
      requests = { cpu = "50m", memory = "64Mi" }
      limits   = { cpu = "100m", memory = "128Mi" }
    }
  })]
}
```

## Step 2: IAM Role for Route53 Access (AWS)

```hcl
# IRSA role for ExternalDNS on an existing EKS cluster
variable "eks_cluster_name" {
  type = string
}

data "aws_eks_cluster" "this" {
  name = var.eks_cluster_name
}

data "aws_iam_openid_connect_provider" "eks" {
  url = data.aws_eks_cluster.this.identity[0].oidc[0].issuer
}

locals {
  oidc_provider = replace(data.aws_eks_cluster.this.identity[0].oidc[0].issuer, "https://", "")
}

resource "aws_iam_role" "external_dns" {
  name = "external-dns-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = data.aws_iam_openid_connect_provider.eks.arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "${local.oidc_provider}:sub" = "system:serviceaccount:external-dns:external-dns"
          "${local.oidc_provider}:aud" = "sts.amazonaws.com"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "external_dns" {
  name = "external-dns-policy"
  role = aws_iam_role.external_dns.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action = [
          "route53:ChangeResourceRecordSets",
          "route53:ListResourceRecordSets"
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
```

## Step 3: Azure DNS Provider Configuration

```hcl
# ExternalDNS with Azure DNS and Workload Identity
data "azurerm_client_config" "current" {}

resource "kubernetes_secret_v1" "external_dns_azure" {
  metadata {
    name      = "external-dns-azure"
    namespace = kubernetes_namespace_v1.external_dns.metadata[0].name
  }

  data = {
    "azure.json" = jsonencode({
      tenantId                     = data.azurerm_client_config.current.tenant_id
      subscriptionId               = data.azurerm_client_config.current.subscription_id
      resourceGroup                = azurerm_resource_group.rg.name
      useWorkloadIdentityExtension = true
    })
  }

  type = "Opaque"
}

resource "helm_release" "external_dns_azure" {
  name             = "external-dns"
  repository       = "https://kubernetes-sigs.github.io/external-dns/"
  chart            = "external-dns"
  version          = "1.21.1"
  namespace        = kubernetes_namespace_v1.external_dns.metadata[0].name

  depends_on = [kubernetes_secret_v1.external_dns_azure]

  values = [yamlencode({
    provider = {
      name = "azure"
    }

    domainFilters   = ["example.com"]
    policy          = "sync"
    registry        = "txt"
    txtOwnerId      = "my-cluster"

    podLabels = {
      "azure.workload.identity/use" = "true"
    }

    serviceAccount = {
      create = true
      name   = "external-dns"
      annotations = {
        "azure.workload.identity/client-id" = azurerm_user_assigned_identity.external_dns.client_id
      }
    }

    extraVolumes = [{
      name = "azure-config-file"
      secret = {
        secretName = kubernetes_secret_v1.external_dns_azure.metadata[0].name
      }
    }]

    extraVolumeMounts = [{
      name      = "azure-config-file"
      mountPath = "/etc/kubernetes"
      readOnly  = true
    }]
  })]
}
```

## Step 4: Annotate Services and Ingresses

```hcl
# Service with ExternalDNS annotation
resource "kubernetes_service_v1" "app" {
  metadata {
    name      = "my-app"
    namespace = "default"
    annotations = {
      "external-dns.alpha.kubernetes.io/managed"  = "true"
      "external-dns.alpha.kubernetes.io/hostname" = "app.example.com"
      "external-dns.alpha.kubernetes.io/ttl"      = "60"
    }
  }

  spec {
    type = "LoadBalancer"
    selector = { app = "my-app" }

    port {
      port        = 80
      target_port = 8080
    }
  }
}
```

## Summary

ExternalDNS deployed with OpenTofu automates DNS record management for Kubernetes workloads. Using IRSA on AWS or Workload Identity on Azure provides secure, credential-free access to DNS APIs. With domain filters and TXT ownership records in place, `sync` lets ExternalDNS create, update, and delete the records it owns without taking over unrelated manual records.
