# How to Set Up EKS Secrets Encryption with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, EKS, Secrets Encryption, KMS, Kubernetes, Security, Infrastructure as Code

Description: Learn how to enable envelope encryption for Kubernetes Secrets in EKS using AWS KMS keys with OpenTofu to protect sensitive data stored in etcd.

## Introduction

Kubernetes Secrets store their data as base64-encoded values, not as encrypted values by themselves. On Amazon EKS, clusters running Kubernetes 1.28 or later already use default envelope encryption for all Kubernetes API data with an AWS owned key. Using your own AWS KMS key adds a customer-managed layer for Secrets stored in etcd.

## Prerequisites

- OpenTofu v1.6+
- AWS CLI v2 configured for your target region
- kubectl configured for the cluster
- AWS credentials with EKS and KMS permissions
- If you scope down the KMS key policy, allow `kms:DescribeKey` and `kms:CreateGrant` for the IAM principal that creates or updates the cluster
- Note: EKS 1.28+ already uses default envelope encryption. This guide shows how to use your own customer managed KMS key, and once that key is associated it cannot be disabled or changed later

## Step 1: Create a KMS Key for Secrets Encryption

```hcl
# Dedicated KMS key for encrypting Kubernetes Secrets

resource "aws_kms_key" "eks_secrets" {
  description             = "KMS key for EKS secrets encryption - ${var.cluster_name}"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  # If you omit the policy, AWS KMS attaches the default key policy.
  # That lets IAM policies and KMS grants control access to the key.

  tags = {
    Name    = "${var.cluster_name}-secrets-encryption"
    Cluster = var.cluster_name
    Purpose = "SecretsEncryption"
  }
}

resource "aws_kms_alias" "eks_secrets" {
  name          = "alias/${var.cluster_name}-secrets"
  target_key_id = aws_kms_key.eks_secrets.key_id
}
```

## Step 2: Create EKS Cluster with Secrets Encryption

```hcl
resource "aws_eks_cluster" "main" {
  name     = var.cluster_name
  role_arn = aws_iam_role.eks_cluster.arn
  version  = var.kubernetes_version

  vpc_config {
    subnet_ids              = var.private_subnet_ids
    endpoint_private_access = true
    endpoint_public_access  = false
  }

  # Enable envelope encryption for Kubernetes Secrets
  encryption_config {
    # Encrypt the "secrets" resource type
    resources = ["secrets"]

    provider {
      key_arn = aws_kms_key.eks_secrets.arn
    }
  }

  enabled_cluster_log_types = ["api", "audit", "authenticator"]

  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy,
    aws_kms_key.eks_secrets
  ]

  tags = {
    Name               = var.cluster_name
    SecretsEncryption  = "enabled"
    KMSKeyId           = aws_kms_key.eks_secrets.key_id
  }
}
```

## Step 3: Enable Encryption on an Existing Cluster

```hcl
# If the cluster is already managed by OpenTofu, add the encryption_config
# block from Step 2 to the existing aws_eks_cluster resource and apply again.
# The AWS provider will call AssociateEncryptionConfig for the update.

encryption_config {
  resources = ["secrets"]

  provider {
    key_arn = aws_kms_key.eks_secrets.arn
  }
}
```

```bash
# Re-encrypt existing secrets with the new key after the cluster update completes
kubectl get secrets --all-namespaces -o json \
  | kubectl annotate --overwrite -f - kms-encryption-timestamp="$(date -u +%FT%TZ)"
```

## Step 4: Verify Encryption is Working

```bash
# Create a test secret
kubectl create secret generic test-secret \
  --from-literal=password=mysecretpassword

# Confirm the secret is readable through the Kubernetes API
kubectl get secret test-secret

# Check the cluster encryption config
aws eks describe-cluster \
  --name my-cluster \
  --region us-west-2 \
  --query 'cluster.encryptionConfig'
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

EKS envelope encryption with a customer managed KMS key protects Kubernetes Secrets at rest in etcd while giving you control over the key used for that protection. On Kubernetes 1.28 and later, EKS already enables default envelope encryption with an AWS owned key, and associating your own KMS key replaces that with a customer managed key for your cluster. Once enabled, that customer managed key association cannot be disabled or changed later, so plan key rotation, deletion protection, and cross-account access carefully. Monitor CloudTrail and KMS usage when you use your own key.
