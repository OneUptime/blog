# How to Deploy External Secrets Operator on Kubernetes with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, External Secrets, Secrets Management, OpenTofu, Helm, AWS Secrets Manager, HashiCorp Vault

Description: Learn how to deploy External Secrets Operator (ESO) on Kubernetes using OpenTofu and Helm to sync secrets from AWS Secrets Manager, Azure Key Vault, and HashiCorp Vault into Kubernetes Secrets.

## Overview

External Secrets Operator synchronizes secrets from external secret stores into Kubernetes Secrets. It supports AWS Secrets Manager, Azure Key Vault, GCP Secret Manager, HashiCorp Vault, and more. OpenTofu deploys ESO via Helm and configures SecretStores declaratively.

## Step 1: Deploy External Secrets Operator with Helm

```hcl
# main.tf - Deploy ESO via Helm

resource "helm_release" "external_secrets" {
  name             = "external-secrets"
  repository       = "https://charts.external-secrets.io"
  chart            = "external-secrets"
  version          = "2.4.1"
  namespace        = "external-secrets"
  create_namespace = true

  values = [yamlencode({
    installCRDs = true

    replicaCount = 2
    leaderElect  = true

    resources = {
      requests = { cpu = "50m", memory = "64Mi" }
      limits   = { cpu = "200m", memory = "256Mi" }
    }

    serviceAccount = {
      name = "external-secrets"
      annotations = {
        "eks.amazonaws.com/role-arn" = aws_iam_role.eso.arn
      }
    }

    # Enable webhook for validation
    webhook = {
      replicaCount = 2
    }
  })]
}
```

## Step 2: IAM Role for AWS Secrets Manager Access

```hcl
# IAM role allowing ESO to read from Secrets Manager
resource "aws_iam_role" "eso" {
  name = "external-secrets-operator"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.eks.arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "${local.oidc_provider}:sub" = "system:serviceaccount:external-secrets:external-secrets"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "eso" {
  name = "eso-secrets-policy"
  role = aws_iam_role.eso.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret",
          "secretsmanager:ListSecretVersionIds"
        ]
        Resource = ["arn:aws:secretsmanager:*:*:secret:prod/*"]
      },
      {
        Effect   = "Allow"
        Action   = ["ssm:GetParameter", "ssm:GetParameters"]
        Resource = ["arn:aws:ssm:*:*:parameter/prod/*"]
      }
    ]
  })
}
```

## Step 3: Configure a ClusterSecretStore

```hcl
# ClusterSecretStore for AWS Secrets Manager
resource "kubernetes_manifest" "cluster_secret_store" {
  depends_on = [helm_release.external_secrets]

  manifest = {
    apiVersion = "external-secrets.io/v1"
    kind       = "ClusterSecretStore"
    metadata = {
      name = "aws-secrets-manager"
    }
    spec = {
      provider = {
        aws = {
          service = "SecretsManager"
          region  = "us-east-1"
          auth = {
            jwt = {
              serviceAccountRef = {
                name      = "external-secrets"
                namespace = "external-secrets"
              }
            }
          }
        }
      }
    }
  }
}
```

## Step 4: Create an ExternalSecret

```hcl
# ExternalSecret syncs AWS secret to Kubernetes Secret
resource "kubernetes_manifest" "app_external_secret" {
  depends_on = [kubernetes_manifest.cluster_secret_store]

  manifest = {
    apiVersion = "external-secrets.io/v1"
    kind       = "ExternalSecret"
    metadata = {
      name      = "app-secrets"
      namespace = "default"
    }
    spec = {
      refreshInterval = "1h"

      secretStoreRef = {
        name = "aws-secrets-manager"
        kind = "ClusterSecretStore"
      }

      target = {
        name           = "app-secrets"
        creationPolicy = "Owner"
      }

      data = [
        {
          secretKey = "database-password"
          remoteRef = {
            key      = "prod/myapp/database"
            property = "password"
          }
        },
        {
          secretKey = "api-key"
          remoteRef = {
            key = "prod/myapp/api-key"
          }
        }
      ]
    }
  }
}
```

## Step 5: Azure Key Vault SecretStore

```hcl
# SecretStore for Azure Key Vault using Workload Identity
resource "kubernetes_manifest" "azure_secret_store" {
  manifest = {
    apiVersion = "external-secrets.io/v1"
    kind       = "SecretStore"
    metadata = {
      name      = "azure-keyvault"
      namespace = "default"
    }
    spec = {
      provider = {
        azurekv = {
          authType = "WorkloadIdentity"
          vaultUrl = "https://${azurerm_key_vault.kv.name}.vault.azure.net"
          # app-workload-identity-sa must already be configured for Azure Workload Identity
          serviceAccountRef = {
            name = "app-workload-identity-sa"
          }
        }
      }
    }
  }
}
```

## Summary

External Secrets Operator deployed with OpenTofu provides a Kubernetes-native way to consume secrets from cloud-native secret stores. The operator refreshes synced Kubernetes Secrets based on the `refreshInterval`, keeping the in-cluster Secret current with the external store. Pods that consume Secrets through mounted volumes can receive updated values automatically, while workloads that read Secret values from environment variables typically need a restart or rollout to pick up changes. Combining ClusterSecretStore for cluster-wide access with namespace-scoped SecretStore for tenant isolation covers most enterprise patterns.
