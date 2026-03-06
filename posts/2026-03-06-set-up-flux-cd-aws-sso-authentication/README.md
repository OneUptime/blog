# How to Set Up Flux CD with AWS SSO Authentication

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, aws sso, IAM Identity Center, RBAC, Authentication, Kubernetes, GitOps

Description: Configure Flux CD on Amazon EKS with AWS SSO (IAM Identity Center) for centralized authentication and role-based access control.

---

## Introduction

AWS IAM Identity Center (formerly AWS SSO) provides centralized identity management for accessing AWS accounts and applications. When running Flux CD on Amazon EKS, integrating with AWS SSO ensures that your team members authenticate through a single identity provider while Flux CD controllers maintain their own service-level access.

This guide covers configuring AWS SSO for EKS access, mapping SSO roles to Kubernetes RBAC, and ensuring Flux CD operates correctly alongside SSO-authenticated users.

## Prerequisites

Before starting, ensure you have:

- An Amazon EKS cluster running Kubernetes 1.25 or later
- AWS IAM Identity Center enabled in your AWS organization
- Flux CD installed and bootstrapped
- AWS CLI v2 configured with SSO profile
- kubectl access to the cluster

## Step 1: Enable AWS IAM Identity Center

If not already enabled, set up IAM Identity Center in your AWS organization.

```bash
# Verify IAM Identity Center is enabled
aws sso-admin list-instances \
  --query 'Instances[0].InstanceArn' \
  --output text
```

## Step 2: Create Permission Sets for Kubernetes Access

Create permission sets that will be mapped to Kubernetes RBAC roles.

```bash
# Get the SSO instance ARN
SSO_INSTANCE_ARN=$(aws sso-admin list-instances \
  --query 'Instances[0].InstanceArn' --output text)

# Create a permission set for cluster administrators
aws sso-admin create-permission-set \
  --instance-arn "$SSO_INSTANCE_ARN" \
  --name "EKS-ClusterAdmin" \
  --description "Full access to EKS clusters" \
  --session-duration "PT8H"

# Create a permission set for developers (read-only EKS access)
aws sso-admin create-permission-set \
  --instance-arn "$SSO_INSTANCE_ARN" \
  --name "EKS-Developer" \
  --description "Developer access to EKS clusters" \
  --session-duration "PT8H"
```

## Step 3: Create IAM Policies for Permission Sets

Attach IAM policies that allow users to interact with EKS.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EKSClusterAccess",
      "Effect": "Allow",
      "Action": [
        "eks:DescribeCluster",
        "eks:ListClusters",
        "eks:AccessKubernetesApi"
      ],
      "Resource": "*"
    },
    {
      "Sid": "STSAccess",
      "Effect": "Allow",
      "Action": [
        "sts:GetCallerIdentity"
      ],
      "Resource": "*"
    }
  ]
}
```

```bash
# Attach the inline policy to the ClusterAdmin permission set
PERMISSION_SET_ARN=$(aws sso-admin list-permission-sets \
  --instance-arn "$SSO_INSTANCE_ARN" \
  --query 'PermissionSets[0]' --output text)

aws sso-admin put-inline-policy-to-permission-set \
  --instance-arn "$SSO_INSTANCE_ARN" \
  --permission-set-arn "$PERMISSION_SET_ARN" \
  --inline-policy file://eks-access-policy.json
```

## Step 4: Configure AWS CLI SSO Profile

Set up the AWS CLI to use SSO for authentication.

```bash
# Configure an SSO profile
# This creates entries in ~/.aws/config
aws configure sso
# Follow the prompts:
#   SSO session name: my-sso
#   SSO start URL: https://my-org.awsapps.com/start
#   SSO Region: us-east-1
#   SSO registration scopes: sso:account:access
```

The resulting AWS config file looks like this:

```ini
# ~/.aws/config
[profile eks-admin]
sso_session = my-sso
sso_account_id = 123456789012
sso_role_name = EKS-ClusterAdmin
region = us-east-1
output = json

[profile eks-developer]
sso_session = my-sso
sso_account_id = 123456789012
sso_role_name = EKS-Developer
region = us-east-1
output = json

[sso-session my-sso]
sso_start_url = https://my-org.awsapps.com/start
sso_region = us-east-1
sso_registration_scopes = sso:account:access
```

## Step 5: Update kubeconfig for SSO Access

Configure kubectl to authenticate via AWS SSO.

```bash
# Log in with SSO
aws sso login --profile eks-admin

# Update kubeconfig to use the SSO profile
aws eks update-kubeconfig \
  --name my-cluster \
  --region us-east-1 \
  --profile eks-admin \
  --alias my-cluster-admin
```

The generated kubeconfig uses the `aws eks get-token` command with your SSO profile:

```yaml
# Resulting kubeconfig entry (~/.kube/config)
apiVersion: v1
kind: Config
clusters:
  - cluster:
      server: https://ABCDEF1234567890.gr7.us-east-1.eks.amazonaws.com
      certificate-authority-data: LS0tLS1...
    name: my-cluster-admin
contexts:
  - context:
      cluster: my-cluster-admin
      user: my-cluster-admin
    name: my-cluster-admin
users:
  - name: my-cluster-admin
    user:
      exec:
        apiVersion: client.authentication.k8s.io/v1beta1
        command: aws
        args:
          - --region
          - us-east-1
          - --profile
          - eks-admin
          - eks
          - get-token
          - --cluster-name
          - my-cluster
          - --output
          - json
```

## Step 6: Map SSO Roles to Kubernetes RBAC

Configure the `aws-auth` ConfigMap to map SSO IAM roles to Kubernetes groups.

```yaml
# aws-auth-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: aws-auth
  namespace: kube-system
data:
  mapRoles: |
    # Node role - required for worker nodes
    - rolearn: arn:aws:iam::123456789012:role/eksctl-my-cluster-nodegroup-NodeInstanceRole
      username: system:node:{{EC2PrivateDNSName}}
      groups:
        - system:bootstrappers
        - system:nodes
    # SSO ClusterAdmin role - maps to cluster-admin group
    - rolearn: arn:aws:iam::123456789012:role/aws-reserved/sso.amazonaws.com/AWSReservedSSO_EKS-ClusterAdmin_abc123
      username: cluster-admin:{{SessionName}}
      groups:
        - system:masters
    # SSO Developer role - maps to a custom developer group
    - rolearn: arn:aws:iam::123456789012:role/aws-reserved/sso.amazonaws.com/AWSReservedSSO_EKS-Developer_def456
      username: developer:{{SessionName}}
      groups:
        - developers
    # Flux CD controller role (if using IRSA)
    - rolearn: arn:aws:iam::123456789012:role/flux-controller-role
      username: flux-controller
      groups:
        - system:masters
```

## Step 7: Create Kubernetes RBAC for Developer Group

Define RBAC resources for the developer group.

```yaml
# rbac/developer-role.yaml
# ClusterRole for developers - read-only access to most resources
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: developer-role
rules:
  # Allow reading all workload resources
  - apiGroups: ["", "apps", "batch"]
    resources:
      - pods
      - deployments
      - services
      - configmaps
      - replicasets
      - statefulsets
      - daemonsets
      - jobs
      - cronjobs
    verbs: ["get", "list", "watch"]
  # Allow reading Flux resources
  - apiGroups:
      - source.toolkit.fluxcd.io
      - kustomize.toolkit.fluxcd.io
      - helm.toolkit.fluxcd.io
      - notification.toolkit.fluxcd.io
    resources: ["*"]
    verbs: ["get", "list", "watch"]
  # Allow reading pod logs
  - apiGroups: [""]
    resources: ["pods/log"]
    verbs: ["get", "list"]
  # Allow exec into pods in non-production namespaces
  - apiGroups: [""]
    resources: ["pods/exec"]
    verbs: ["create"]
---
# Bind the developer role to the developers group
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: developer-role-binding
subjects:
  - kind: Group
    name: developers
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: developer-role
  apiGroup: rbac.authorization.k8s.io
```

## Step 8: Restrict Developer Access to Specific Namespaces

For more granular control, use namespace-scoped RoleBindings.

```yaml
# rbac/developer-namespace-role.yaml
# Full access in the staging namespace only
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: developer-full-access
  namespace: staging
rules:
  - apiGroups: ["", "apps", "batch", "networking.k8s.io"]
    resources: ["*"]
    verbs: ["*"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: developer-staging-binding
  namespace: staging
subjects:
  - kind: Group
    name: developers
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: developer-full-access
  apiGroup: rbac.authorization.k8s.io
```

## Step 9: Manage RBAC Through Flux CD

Store all RBAC configurations in Git and deploy through Flux.

```yaml
# infrastructure/rbac/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - developer-role.yaml
  - developer-namespace-role.yaml
```

```yaml
# clusters/my-cluster/rbac.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: rbac
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  path: ./infrastructure/rbac
  prune: true
  # Do not prune system:masters bindings for safety
  patches:
    - patch: |
        - op: add
          path: /metadata/labels/kustomize.toolkit.fluxcd.io~1prune
          value: disabled
      target:
        kind: ClusterRoleBinding
        name: developer-role-binding
```

## Step 10: Use EKS Access Entries (Recommended)

EKS Access Entries (available in EKS 1.28+) provide a more scalable alternative to the aws-auth ConfigMap.

```bash
# Create an access entry for the SSO ClusterAdmin role
aws eks create-access-entry \
  --cluster-name my-cluster \
  --principal-arn arn:aws:iam::123456789012:role/aws-reserved/sso.amazonaws.com/AWSReservedSSO_EKS-ClusterAdmin_abc123 \
  --type STANDARD

# Associate the cluster-admin policy
aws eks associate-access-policy \
  --cluster-name my-cluster \
  --principal-arn arn:aws:iam::123456789012:role/aws-reserved/sso.amazonaws.com/AWSReservedSSO_EKS-ClusterAdmin_abc123 \
  --policy-arn arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy \
  --access-scope type=cluster

# Create an access entry for the SSO Developer role
aws eks create-access-entry \
  --cluster-name my-cluster \
  --principal-arn arn:aws:iam::123456789012:role/aws-reserved/sso.amazonaws.com/AWSReservedSSO_EKS-Developer_def456 \
  --type STANDARD \
  --kubernetes-groups developers

# Associate namespace-scoped access
aws eks associate-access-policy \
  --cluster-name my-cluster \
  --principal-arn arn:aws:iam::123456789012:role/aws-reserved/sso.amazonaws.com/AWSReservedSSO_EKS-Developer_def456 \
  --policy-arn arn:aws:eks::aws:cluster-access-policy/AmazonEKSViewPolicy \
  --access-scope type=cluster
```

## Verify the Setup

```bash
# Log in with SSO as admin
aws sso login --profile eks-admin

# Verify admin access
kubectl --context my-cluster-admin auth can-i '*' '*' --all-namespaces
# Expected: yes

# Log in with SSO as developer
aws sso login --profile eks-developer

# Verify developer access is limited
kubectl --context my-cluster-developer auth can-i get pods --all-namespaces
# Expected: yes

kubectl --context my-cluster-developer auth can-i delete pods -n production
# Expected: no

# Verify Flux is still operating correctly
flux get kustomizations
flux get sources git
```

## Troubleshooting

```bash
# Issue: "error: You must be logged in to the server"
# Solution: Refresh SSO session
aws sso login --profile eks-admin

# Issue: "access denied" after SSO role mapping
# Solution: Check the SSO role ARN matches exactly
aws iam list-roles --query 'Roles[?contains(RoleName, `AWSReservedSSO`)].Arn'

# Issue: Flux controllers losing access after aws-auth changes
# Solution: Ensure node role and Flux roles are preserved
kubectl get configmap aws-auth -n kube-system -o yaml

# Issue: SessionName not resolving in username
# Solution: Use {{SessionName}} placeholder correctly in mapRoles
```

## Conclusion

Integrating AWS SSO with Flux CD on EKS provides centralized authentication for your team while maintaining GitOps automation. SSO users authenticate through IAM Identity Center and are mapped to Kubernetes RBAC groups, giving you fine-grained access control. Flux CD controllers continue to use IRSA for their service-level access, keeping the GitOps pipeline independent of user authentication flows. For new clusters, prefer EKS Access Entries over the aws-auth ConfigMap for more scalable role management.
