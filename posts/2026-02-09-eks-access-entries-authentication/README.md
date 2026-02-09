# How to Configure EKS Access Entries for Kubernetes Authentication Without aws-auth

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, AWS, EKS, Security

Description: Configure EKS access entries for Kubernetes authentication as a modern replacement for the aws-auth ConfigMap with better security and easier management.

---

For years, EKS clusters used the aws-auth ConfigMap to map IAM principals to Kubernetes RBAC roles. EKS Access Entries provide a modern API-based approach that eliminates ConfigMap management, supports fine-grained access control, and integrates better with automation tools.

This guide shows you how to migrate from aws-auth to access entries and manage authentication using the new system.

## Understanding EKS Access Entries

Access entries replace the aws-auth ConfigMap with an API that manages IAM to Kubernetes mappings. Benefits include:

**API-based management** instead of editing ConfigMaps.

**Version control friendly** through Terraform or CloudFormation.

**Cluster access management API** for programmatic control.

**Access policies** for predefined permission sets.

**No more ConfigMap conflicts** from concurrent edits.

Access entries work with EKS clusters version 1.23 and later.

## Creating Access Entries

Create an access entry for an IAM user:

```bash
aws eks create-access-entry \
  --cluster-name my-cluster \
  --principal-arn arn:aws:iam::ACCOUNT_ID:user/developer \
  --type STANDARD \
  --username developer
```

For an IAM role:

```bash
aws eks create-access-entry \
  --cluster-name my-cluster \
  --principal-arn arn:aws:iam::ACCOUNT_ID:role/DevRole \
  --type STANDARD \
  --username dev-role \
  --kubernetes-groups system:masters
```

The `--kubernetes-groups` parameter maps the IAM principal to Kubernetes groups.

## Using Access Policies

EKS provides predefined access policies:

```bash
# Grant admin access
aws eks associate-access-policy \
  --cluster-name my-cluster \
  --principal-arn arn:aws:iam::ACCOUNT_ID:role/AdminRole \
  --policy-arn arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy \
  --access-scope type=cluster

# Grant read-only access to specific namespace
aws eks associate-access-policy \
  --cluster-name my-cluster \
  --principal-arn arn:aws:iam::ACCOUNT_ID:role/ViewerRole \
  --policy-arn arn:aws:eks::aws:cluster-access-policy/AmazonEKSViewPolicy \
  --access-scope type=namespace,namespaces=production
```

Available policies:
- `AmazonEKSClusterAdminPolicy` - Full cluster admin
- `AmazonEKSAdminPolicy` - Namespace admin
- `AmazonEKSEditPolicy` - Edit resources
- `AmazonEKSViewPolicy` - Read-only access

## Configuring with Terraform

Define access entries in Terraform:

```hcl
# eks-access-entries.tf
resource "aws_eks_access_entry" "developer" {
  cluster_name      = aws_eks_cluster.main.name
  principal_arn     = aws_iam_role.developer.arn
  kubernetes_groups = ["developers"]
  type             = "STANDARD"
}

resource "aws_eks_access_policy_association" "developer_policy" {
  cluster_name  = aws_eks_cluster.main.name
  principal_arn = aws_iam_role.developer.arn
  policy_arn    = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSEditPolicy"

  access_scope {
    type       = "namespace"
    namespaces = ["development", "staging"]
  }

  depends_on = [aws_eks_access_entry.developer]
}
```

Multiple access entries:

```hcl
locals {
  access_entries = {
    admin = {
      principal_arn = aws_iam_role.admin.arn
      policy        = "AmazonEKSClusterAdminPolicy"
      scope_type    = "cluster"
    }
    developer = {
      principal_arn = aws_iam_role.developer.arn
      policy        = "AmazonEKSEditPolicy"
      scope_type    = "namespace"
      namespaces    = ["dev", "staging"]
    }
  }
}

resource "aws_eks_access_entry" "entries" {
  for_each = local.access_entries

  cluster_name  = aws_eks_cluster.main.name
  principal_arn = each.value.principal_arn
  type         = "STANDARD"
}

resource "aws_eks_access_policy_association" "policies" {
  for_each = local.access_entries

  cluster_name  = aws_eks_cluster.main.name
  principal_arn = each.value.principal_arn
  policy_arn    = "arn:aws:eks::aws:cluster-access-policy/${each.value.policy}"

  access_scope {
    type       = each.value.scope_type
    namespaces = lookup(each.value, "namespaces", null)
  }

  depends_on = [aws_eks_access_entry.entries]
}
```

## Migrating from aws-auth ConfigMap

List existing aws-auth mappings:

```bash
kubectl get configmap -n kube-system aws-auth -o yaml
```

Convert to access entries. For example, if aws-auth contains:

```yaml
mapRoles: |
  - rolearn: arn:aws:iam::ACCOUNT_ID:role/DevRole
    username: dev-role
    groups:
    - developers
```

Create equivalent access entry:

```bash
aws eks create-access-entry \
  --cluster-name my-cluster \
  --principal-arn arn:aws:iam::ACCOUNT_ID:role/DevRole \
  --type STANDARD \
  --username dev-role \
  --kubernetes-groups developers
```

After migrating all entries, you can delete aws-auth:

```bash
# Verify all access works before deleting
kubectl delete configmap -n kube-system aws-auth
```

## Node Group Access Entries

EKS automatically creates access entries for node groups. View them:

```bash
aws eks list-access-entries --cluster-name my-cluster
```

Node entries use type `EC2_LINUX` or `EC2_WINDOWS`:

```bash
aws eks describe-access-entry \
  --cluster-name my-cluster \
  --principal-arn arn:aws:iam::ACCOUNT_ID:role/NodeInstanceRole
```

## Using eksctl

Create access entries with eksctl:

```yaml
# cluster-config.yaml
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: my-cluster
  region: us-east-1

accessConfig:
  authenticationMode: API_AND_CONFIG_MAP

accessEntries:
- principalARN: arn:aws:iam::ACCOUNT_ID:role/AdminRole
  accessPolicies:
  - policyARN: arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy
    accessScope:
      type: cluster

- principalARN: arn:aws:iam::ACCOUNT_ID:role/DevRole
  kubernetesGroups:
  - developers
  accessPolicies:
  - policyARN: arn:aws:eks::aws:cluster-access-policy/AmazonEKSEditPolicy
    accessScope:
      type: namespace
      namespaces: ["development"]
```

Apply configuration:

```bash
eksctl create cluster -f cluster-config.yaml
```

## Custom RBAC with Access Entries

Access entries work with custom RBAC roles. Create a role:

```yaml
# developer-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: developer
  namespace: production
rules:
- apiGroups: ["", "apps", "batch"]
  resources: ["pods", "deployments", "jobs"]
  verbs: ["get", "list", "watch", "create", "update", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: developer-binding
  namespace: production
subjects:
- kind: Group
  name: developers
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: developer
  apiGroup: rbac.authorization.k8s.io
```

Map IAM role to the group:

```bash
aws eks create-access-entry \
  --cluster-name my-cluster \
  --principal-arn arn:aws:iam::ACCOUNT_ID:role/DevRole \
  --type STANDARD \
  --kubernetes-groups developers
```

## Listing and Managing Access Entries

List all access entries:

```bash
aws eks list-access-entries --cluster-name my-cluster
```

Describe specific entry:

```bash
aws eks describe-access-entry \
  --cluster-name my-cluster \
  --principal-arn arn:aws:iam::ACCOUNT_ID:role/DevRole
```

Update access entry:

```bash
aws eks update-access-entry \
  --cluster-name my-cluster \
  --principal-arn arn:aws:iam::ACCOUNT_ID:role/DevRole \
  --kubernetes-groups developers,viewers
```

Delete access entry:

```bash
aws eks delete-access-entry \
  --cluster-name my-cluster \
  --principal-arn arn:aws:iam::ACCOUNT_ID:role/DevRole
```

## Authentication Modes

EKS supports three authentication modes:

**CONFIG_MAP** - Legacy aws-auth only.

**API** - Access entries only.

**API_AND_CONFIG_MAP** - Both methods (recommended for migration).

Check current mode:

```bash
aws eks describe-cluster \
  --name my-cluster \
  --query 'cluster.accessConfig.authenticationMode'
```

Update mode:

```bash
aws eks update-cluster-config \
  --name my-cluster \
  --access-config authenticationMode=API
```

## Troubleshooting Access Issues

Test access with kubectl:

```bash
# Assume the role
aws sts assume-role \
  --role-arn arn:aws:iam::ACCOUNT_ID:role/DevRole \
  --role-session-name test-session

# Update kubeconfig
aws eks update-kubeconfig \
  --name my-cluster \
  --role-arn arn:aws:iam::ACCOUNT_ID:role/DevRole

# Test access
kubectl auth can-i list pods -n production
```

View access denials:

```bash
# Check EKS control plane logs in CloudWatch
aws logs tail /aws/eks/my-cluster/cluster --follow
```

Verify access entry:

```bash
aws eks describe-access-entry \
  --cluster-name my-cluster \
  --principal-arn arn:aws:iam::ACCOUNT_ID:role/DevRole \
  --output yaml
```

## Conclusion

EKS Access Entries modernize Kubernetes authentication on EKS by replacing the error-prone aws-auth ConfigMap with a robust API. The new system provides better integration with infrastructure as code, predefined access policies for common roles, and fine-grained namespace-level permissions.

Migrating to access entries improves security by eliminating ConfigMap editing, enables better audit trails through CloudTrail, and simplifies access management for teams using automation tools like Terraform.
