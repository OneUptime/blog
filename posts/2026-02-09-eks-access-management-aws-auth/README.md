# How to Set Up EKS Cluster Access Management with aws-auth ConfigMap Migration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, AWS, EKS, IAM, Security

Description: Learn how to migrate from the legacy aws-auth ConfigMap to EKS access entries for better IAM integration and simplified cluster access management in Amazon EKS.

---

Amazon EKS cluster access management has evolved significantly. The traditional aws-auth ConfigMap method is being replaced by EKS access entries, which provide native AWS API integration for managing cluster authentication and authorization. This guide walks you through migrating from the legacy aws-auth ConfigMap to the modern access entry approach.

## Understanding the Legacy aws-auth ConfigMap

The aws-auth ConfigMap maps AWS IAM identities to Kubernetes RBAC permissions. When you authenticate to an EKS cluster using AWS credentials, the cluster checks this ConfigMap to determine your Kubernetes username and groups.

Here's what a typical aws-auth ConfigMap looks like:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: aws-auth
  namespace: kube-system
data:
  mapRoles: |
    - rolearn: arn:aws:iam::123456789012:role/eks-node-role
      username: system:node:{{EC2PrivateDNSName}}
      groups:
        - system:bootstrappers
        - system:nodes
    - rolearn: arn:aws:iam::123456789012:role/developer-role
      username: developer
      groups:
        - developers
  mapUsers: |
    - userarn: arn:aws:iam::123456789012:user/admin
      username: admin
      groups:
        - system:masters
```

While this approach works, it has limitations. The ConfigMap must be manually edited, there's no audit trail for changes, and updates require kubectl access to the cluster.

## Why Migrate to EKS Access Entries

EKS access entries offer several advantages over the aws-auth ConfigMap:

**AWS API Integration**: Manage access through AWS APIs using CloudFormation, Terraform, or AWS CLI instead of kubectl.

**Audit Trail**: All changes are logged in AWS CloudTrail, providing complete visibility into who modified cluster access.

**Simplified Management**: No need to maintain YAML syntax or worry about ConfigMap formatting errors.

**Consistent IAM Experience**: Access management follows familiar AWS IAM patterns rather than Kubernetes-specific configurations.

## Checking Current Access Configuration

Before migrating, review your current aws-auth ConfigMap to understand existing access patterns:

```bash
# Export current aws-auth ConfigMap
kubectl get configmap aws-auth -n kube-system -o yaml > aws-auth-backup.yaml

# View the ConfigMap in readable format
kubectl describe configmap aws-auth -n kube-system
```

Parse the mapRoles and mapUsers sections to identify all IAM identities that need migration. Pay special attention to node roles, which require specific access entry types.

## Creating Access Entries for Node Roles

Node IAM roles require special handling. They need the EC2_LINUX access entry type to properly authenticate worker nodes:

```bash
# Create access entry for node role
aws eks create-access-entry \
  --cluster-name production-cluster \
  --principal-arn arn:aws:iam::123456789012:role/eks-node-role \
  --type EC2_LINUX \
  --region us-east-1
```

The EC2_LINUX type automatically configures the correct Kubernetes groups (system:nodes, system:bootstrappers) and username format (system:node:{{EC2PrivateDNSName}}) without manual specification.

For self-managed node groups or custom node configurations, verify that the node role has the necessary permissions:

```bash
# Verify node access entry was created
aws eks list-access-entries \
  --cluster-name production-cluster \
  --region us-east-1

# Describe specific access entry
aws eks describe-access-entry \
  --cluster-name production-cluster \
  --principal-arn arn:aws:iam::123456789012:role/eks-node-role \
  --region us-east-1
```

## Migrating User and Role Access

For developer and admin access, create STANDARD type access entries and associate them with access policies:

```bash
# Create access entry for developer role
aws eks create-access-entry \
  --cluster-name production-cluster \
  --principal-arn arn:aws:iam::123456789012:role/developer-role \
  --type STANDARD \
  --region us-east-1

# Associate with cluster admin policy
aws eks associate-access-policy \
  --cluster-name production-cluster \
  --principal-arn arn:aws:iam::123456789012:role/developer-role \
  --policy-arn arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy \
  --access-scope type=cluster \
  --region us-east-1
```

EKS provides several built-in access policies that map to common Kubernetes RBAC patterns:

**AmazonEKSClusterAdminPolicy**: Full cluster access (equivalent to cluster-admin).

**AmazonEKSAdminPolicy**: Admin access to specified namespaces.

**AmazonEKSEditPolicy**: Edit access to resources in specified namespaces.

**AmazonEKSViewPolicy**: Read-only access to resources.

For namespace-scoped access, specify the namespaces in the access scope:

```bash
# Grant admin access to specific namespaces
aws eks associate-access-policy \
  --cluster-name production-cluster \
  --principal-arn arn:aws:iam::123456789012:role/developer-role \
  --policy-arn arn:aws:eks::aws:cluster-access-policy/AmazonEKSAdminPolicy \
  --access-scope type=namespace,namespaces=dev,staging \
  --region us-east-1
```

## Handling Custom RBAC Configurations

If your aws-auth ConfigMap includes custom Kubernetes groups that map to custom ClusterRoles or Roles, you need to maintain those RBAC resources while transitioning to access entries.

Access entries support Kubernetes group associations for compatibility with existing RBAC:

```bash
# Create access entry with custom Kubernetes groups
aws eks create-access-entry \
  --cluster-name production-cluster \
  --principal-arn arn:aws:iam::123456789012:role/app-deployer \
  --kubernetes-groups deployers,readers \
  --region us-east-1
```

Keep your existing ClusterRoleBindings that reference these groups:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: deployers-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: deployer-role
subjects:
- kind: Group
  name: deployers
  apiGroup: rbac.authorization.k8s.io
```

This approach allows gradual migration. You can use EKS access entries for authentication while preserving your custom RBAC authorization logic.

## Testing Access Before Removing aws-auth

Before removing the aws-auth ConfigMap, verify that all access entries work correctly. Test with each IAM identity:

```bash
# Assume the role you want to test
aws sts assume-role \
  --role-arn arn:aws:iam::123456789012:role/developer-role \
  --role-session-name test-session

# Update kubeconfig with assumed role credentials
aws eks update-kubeconfig \
  --name production-cluster \
  --region us-east-1

# Test cluster access
kubectl get nodes
kubectl get pods -n dev
```

Verify that permissions match expectations. Check both cluster-level and namespace-level access based on the policies you associated.

## Automating Migration with Terraform

For infrastructure-as-code workflows, use Terraform to manage access entries:

```hcl
# Node role access entry
resource "aws_eks_access_entry" "node_role" {
  cluster_name  = aws_eks_cluster.main.name
  principal_arn = aws_iam_role.node_role.arn
  type          = "EC2_LINUX"
}

# Developer role access entry
resource "aws_eks_access_entry" "developers" {
  cluster_name  = aws_eks_cluster.main.name
  principal_arn = aws_iam_role.developers.arn
  type          = "STANDARD"
}

# Associate admin policy for developers
resource "aws_eks_access_policy_association" "developers_admin" {
  cluster_name  = aws_eks_cluster.main.name
  principal_arn = aws_iam_role.developers.arn
  policy_arn    = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSAdminPolicy"

  access_scope {
    type       = "namespace"
    namespaces = ["dev", "staging"]
  }
}
```

This approach provides version control for access configurations and enables consistent deployments across environments.

## Removing the aws-auth ConfigMap

Once all access entries are created and tested, you can remove the aws-auth ConfigMap. EKS will automatically fall back to access entries when the ConfigMap is absent.

However, keep a backup before deletion:

```bash
# Backup the ConfigMap one final time
kubectl get configmap aws-auth -n kube-system -o yaml > aws-auth-final-backup.yaml

# Delete the ConfigMap
kubectl delete configmap aws-auth -n kube-system
```

After deletion, test all access patterns again to ensure nothing was missed. The beauty of this approach is that you can restore the ConfigMap if issues arise, as EKS checks the ConfigMap first if present.

## Monitoring Access Entry Usage

Use AWS CloudTrail to monitor access entry modifications and authentication events:

```bash
# Query CloudTrail for access entry changes
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=CreateAccessEntry \
  --region us-east-1

# Monitor authentication attempts
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=AssumeRoleWithWebIdentity \
  --region us-east-1
```

Set up CloudWatch alarms for unauthorized access attempts or unexpected access entry modifications to maintain security visibility.

Migrating to EKS access entries modernizes your cluster access management while improving auditability and operational efficiency. The native AWS integration makes access control consistent with other AWS services, reducing the cognitive overhead of managing Kubernetes authentication through kubectl.
