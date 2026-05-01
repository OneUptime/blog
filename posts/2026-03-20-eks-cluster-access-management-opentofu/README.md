# How to Set Up EKS Cluster Access Management with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, EKS, Access Management, IAM, RBAC, Kubernetes, Infrastructure as Code

Description: Learn how to configure EKS cluster access management using IAM access entries and Kubernetes RBAC with OpenTofu, replacing the legacy aws-auth ConfigMap approach.

## Introduction

EKS Cluster Access Management, based on EKS access entries, is the modern way to grant AWS IAM principals access to the Kubernetes API. It uses IAM Access Entries instead of the legacy aws-auth ConfigMap, providing better auditability and native integration with IAM.

## Prerequisites

- OpenTofu v1.6+
- EKS cluster version 1.28 or later on a supported platform version, with `API` or `API_AND_CONFIG_MAP` authentication mode

## Step 1: Configure Cluster Authentication Mode

```hcl
resource "aws_eks_cluster" "main" {
  name     = var.cluster_name
  role_arn = var.cluster_role_arn
  version  = "1.30"

  vpc_config {
    subnet_ids = var.private_subnet_ids
  }

  access_config {
    # "API" uses only IAM Access Entries (recommended for new clusters)
    # "API_AND_CONFIG_MAP" supports both methods for migration
    # "CONFIG_MAP" is the legacy method
    authentication_mode = "API"

    # Bootstrap the cluster creator with admin access
    bootstrap_cluster_creator_admin_permissions = true
  }
}
```

## Step 2: Grant Kubernetes Admin Access to IAM Role

```hcl
# Grant an IAM role full cluster admin access

resource "aws_eks_access_entry" "admin" {
  cluster_name  = aws_eks_cluster.main.name
  principal_arn = var.admin_role_arn
  type          = "STANDARD"

  tags = {
    Name = "admin-access-entry"
    Role = "ClusterAdmin"
  }
}

resource "aws_eks_access_policy_association" "admin" {
  cluster_name  = aws_eks_cluster.main.name
  principal_arn = var.admin_role_arn
  policy_arn    = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"

  access_scope {
    type = "cluster"  # Cluster-wide access
  }
}
```

## Step 3: Grant Namespace-Scoped Access

```hcl
# Grant a developer role edit access to selected namespaces only
resource "aws_eks_access_entry" "developer" {
  cluster_name  = aws_eks_cluster.main.name
  principal_arn = var.developer_role_arn
  type          = "STANDARD"

  # Map to a Kubernetes username and group for RBAC
  user_name         = "developer"
  kubernetes_groups = ["developers"]

  tags = { Name = "developer-access-entry" }
}

# Restrict to specific namespaces
resource "aws_eks_access_policy_association" "developer_edit" {
  cluster_name  = aws_eks_cluster.main.name
  principal_arn = var.developer_role_arn
  policy_arn    = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSEditPolicy"

  access_scope {
    type       = "namespace"
    namespaces = ["apps", "staging"]
  }
}
```

## Step 4: Self-Managed Node IAM Role Access Entry

```hcl
# Register a self-managed node IAM role for Kubernetes node bootstrap
resource "aws_eks_access_entry" "nodes" {
  cluster_name  = aws_eks_cluster.main.name
  principal_arn = aws_iam_role.node_group.arn
  type          = "EC2_LINUX"  # Automatically grants required node permissions
}
```

## Step 5: Create Custom RBAC Roles via Kubernetes

```hcl
# Kubernetes ClusterRole for read-only access
resource "kubernetes_cluster_role" "viewer" {
  metadata {
    name = "custom-viewer"
  }

  rule {
    api_groups = [""]
    resources  = ["pods", "services"]
    verbs      = ["get", "list", "watch"]
  }

  rule {
    api_groups = ["apps"]
    resources  = ["deployments", "replicasets"]
    verbs      = ["get", "list", "watch"]
  }
}

# Bind the custom role to the developers group
resource "kubernetes_cluster_role_binding" "developers" {
  metadata {
    name = "developers-viewer"
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "ClusterRole"
    name      = kubernetes_cluster_role.viewer.metadata[0].name
  }

  subject {
    kind      = "Group"
    name      = "developers"
    api_group = "rbac.authorization.k8s.io"
  }
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply

# Verify access entries
aws eks list-access-entries --cluster-name my-cluster
```

## Conclusion

EKS Cluster Access Management via IAM Access Entries provides a native, auditable way to manage Kubernetes access without editing the aws-auth ConfigMap. Changes are managed through the EKS API, visible in the EKS console, and auditable in CloudTrail. Access entry changes are eventually consistent and may take several seconds to take effect. For existing `CONFIG_MAP` clusters, switch to `API_AND_CONFIG_MAP` mode first, migrate users, and then switch to `API` if you want to stop using the ConfigMap method. After you enable access entries, you can't switch back to a mode that removes the EKS API.
