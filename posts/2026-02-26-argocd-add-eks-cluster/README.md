# How to Add an EKS Cluster to ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, AWS EKS, Multi-Cluster

Description: Learn how to register an Amazon EKS cluster with ArgoCD for multi-cluster GitOps deployments, covering IAM authentication, IRSA configuration, and secure cluster registration methods.

---

Adding an Amazon EKS cluster to ArgoCD is more involved than adding a generic Kubernetes cluster because EKS uses AWS IAM for authentication rather than static tokens. You need to configure ArgoCD to authenticate with AWS, which means setting up IAM roles and ensuring ArgoCD can obtain valid AWS credentials.

In this guide, I will cover three approaches: the quick CLI method, the IRSA-based production setup, and cross-account access.

## Understanding EKS Authentication

EKS uses the AWS IAM authenticator to map IAM identities to Kubernetes RBAC. When ArgoCD connects to an EKS cluster, the flow looks like this:

```mermaid
graph TD
    A[ArgoCD Controller] --> B[Requests AWS STS Token]
    B --> C[AWS IAM validates credentials]
    C --> D[Returns pre-signed URL token]
    D --> E[ArgoCD sends token to EKS API]
    E --> F[EKS validates with aws-iam-authenticator]
    F --> G[Maps IAM role to K8s RBAC]
    G --> H[ArgoCD accesses cluster]
```

## Method 1: Quick CLI Setup

The fastest way to add an EKS cluster, good for development and testing:

```bash
# Make sure you have the EKS cluster in your kubeconfig

aws eks update-kubeconfig --name my-eks-cluster --region us-east-1

# Verify the context
kubectl config get-contexts

# Add the cluster to ArgoCD
argocd cluster add arn:aws:eks:us-east-1:123456789012:cluster/my-eks-cluster

# This creates a service account with a long-lived token
# in the EKS cluster, bypassing IAM auth
```

This approach creates a ServiceAccount with a static token. It works but is not ideal for production because:
- The token does not expire
- It bypasses AWS IAM auditing
- Token rotation requires manual intervention

## Method 2: IRSA-Based Authentication (Recommended)

IAM Roles for Service Accounts (IRSA) is the production-grade approach. ArgoCD's service accounts assume a management IAM role, which then assumes a target cluster role that EKS authorizes.

### Step 1: Create the IAM Policy

```bash
# Create a policy that allows ArgoCD to assume the target cluster role
cat > argocd-eks-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sts:AssumeRole"
      ],
      "Resource": "arn:aws:iam::123456789012:role/ArgoCD-Production-Cluster"
    }
  ]
}
EOF

aws iam create-policy \
  --policy-name ArgoCD-EKS-Management \
  --policy-document file://argocd-eks-policy.json
```

### Step 2: Create an IAM Role with IRSA Trust

```bash
# Get the OIDC provider for the ArgoCD cluster
OIDC_PROVIDER=$(aws eks describe-cluster \
  --name argocd-cluster \
  --region us-east-1 \
  --query "cluster.identity.oidc.issuer" \
  --output text | sed 's|https://||')

# Create the trust policy
cat > trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789012:oidc-provider/${OIDC_PROVIDER}"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "${OIDC_PROVIDER}:sub": [
            "system:serviceaccount:argocd:argocd-application-controller",
            "system:serviceaccount:argocd:argocd-applicationset-controller",
            "system:serviceaccount:argocd:argocd-server"
          ],
          "${OIDC_PROVIDER}:aud": "sts.amazonaws.com"
        }
      }
    }
  ]
}
EOF

# Create the IAM management role
aws iam create-role \
  --role-name ArgoCD-EKS-Controller \
  --assume-role-policy-document file://trust-policy.json

# Attach the policy
aws iam attach-role-policy \
  --role-name ArgoCD-EKS-Controller \
  --policy-arn arn:aws:iam::123456789012:policy/ArgoCD-EKS-Management
```

### Step 3: Create and Authorize the Target Cluster Role

Create a role for the remote EKS cluster that the ArgoCD management role can assume:

```bash
cat > cluster-role-trust.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:role/ArgoCD-EKS-Controller"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

aws iam create-role \
  --role-name ArgoCD-Production-Cluster \
  --assume-role-policy-document file://cluster-role-trust.json
```

Authorize the target cluster role with an EKS access entry:

```bash
aws eks create-access-entry \
  --cluster-name production-cluster \
  --region us-east-1 \
  --principal-arn arn:aws:iam::123456789012:role/ArgoCD-Production-Cluster \
  --type STANDARD

aws eks associate-access-policy \
  --cluster-name production-cluster \
  --region us-east-1 \
  --principal-arn arn:aws:iam::123456789012:role/ArgoCD-Production-Cluster \
  --policy-arn arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy \
  --access-scope type=cluster
```

If your cluster still uses the deprecated `aws-auth` ConfigMap, map the target cluster role to a Kubernetes group instead:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: aws-auth
  namespace: kube-system
data:
  mapRoles: |
    - rolearn: arn:aws:iam::123456789012:role/ArgoCD-Production-Cluster
      username: arn:aws:iam::123456789012:role/ArgoCD-Production-Cluster
      groups:
        - system:masters  # Or use a custom ClusterRole for least privilege
```

For least-privilege access, create a custom ClusterRole instead of using `system:masters`:

```yaml
# Apply to the remote EKS cluster
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: argocd-manager
rules:
  - apiGroups: ["*"]
    resources: ["*"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps", "extensions", ""]
    resources: ["deployments", "services", "configmaps", "secrets", "pods", "namespaces", "replicasets", "statefulsets", "daemonsets"]
    verbs: ["*"]
  - apiGroups: ["networking.k8s.io"]
    resources: ["ingresses"]
    verbs: ["*"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: argocd-manager-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: argocd-manager
subjects:
  - kind: User
    name: arn:aws:iam::123456789012:role/ArgoCD-Production-Cluster
    apiGroup: rbac.authorization.k8s.io
```

### Step 4: Annotate the ArgoCD Service Accounts

```bash
# Annotate the ArgoCD service accounts with the management IAM role
kubectl annotate serviceaccount argocd-application-controller \
  -n argocd \
  eks.amazonaws.com/role-arn=arn:aws:iam::123456789012:role/ArgoCD-EKS-Controller

kubectl annotate serviceaccount argocd-applicationset-controller \
  -n argocd \
  eks.amazonaws.com/role-arn=arn:aws:iam::123456789012:role/ArgoCD-EKS-Controller

kubectl annotate serviceaccount argocd-server \
  -n argocd \
  eks.amazonaws.com/role-arn=arn:aws:iam::123456789012:role/ArgoCD-EKS-Controller
```

### Step 5: Register the Cluster with AWS IAM Auth

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: eks-production-cluster
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: cluster
    environment: production
    provider: aws
    region: us-east-1
type: Opaque
stringData:
  name: eks-production
  server: https://ABCDEF1234567890.gr7.us-east-1.eks.amazonaws.com
  config: |
    {
      "awsAuthConfig": {
        "clusterName": "production-cluster",
        "roleARN": "arn:aws:iam::123456789012:role/ArgoCD-Production-Cluster"
      },
      "tlsClientConfig": {
        "insecure": false,
        "caData": "<base64-encoded-eks-ca-cert>"
      }
    }
```

The `awsAuthConfig` tells ArgoCD to use the AWS IAM authenticator. ArgoCD will:
1. Use IRSA to obtain credentials for the ArgoCD management role
2. Assume the target cluster role specified in `roleARN`
3. Generate a pre-signed STS token
4. Use this token to authenticate with the EKS API server

## Getting the EKS Cluster Details

```bash
# Get the cluster endpoint
aws eks describe-cluster \
  --name production-cluster \
  --region us-east-1 \
  --query "cluster.endpoint" \
  --output text

# Get the CA certificate (already base64-encoded)
aws eks describe-cluster \
  --name production-cluster \
  --region us-east-1 \
  --query "cluster.certificateAuthority.data" \
  --output text
```

## Method 3: Cross-Account EKS Access

When ArgoCD and the EKS cluster are in different AWS accounts:

```bash
# In the target account (where EKS runs), create a role
# that trusts the ArgoCD account
cat > cross-account-trust.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::111111111111:role/ArgoCD-EKS-Controller"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

aws iam create-role \
  --role-name ArgoCD-Remote-Access \
  --assume-role-policy-document file://cross-account-trust.json \
  --profile target-account
```

The ArgoCD management role also needs an IAM permission policy allowing `sts:AssumeRole` on `arn:aws:iam::222222222222:role/ArgoCD-Remote-Access`, and the target EKS cluster must authorize that remote role with an access entry or `aws-auth` mapping.

Register with role chaining:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: cross-account-eks
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: cluster
type: Opaque
stringData:
  name: cross-account-production
  server: https://ABCDEF.gr7.us-east-1.eks.amazonaws.com
  config: |
    {
      "awsAuthConfig": {
        "clusterName": "production-cluster",
        "roleARN": "arn:aws:iam::222222222222:role/ArgoCD-Remote-Access"
      },
      "tlsClientConfig": {
        "insecure": false,
        "caData": "<ca-data>"
      }
    }
```

## Verifying the Connection

```bash
# Check cluster status
argocd cluster list

# Deploy a test application
argocd app create test-app \
  --repo https://github.com/argoproj/argocd-example-apps.git \
  --path guestbook \
  --dest-server https://ABCDEF.gr7.us-east-1.eks.amazonaws.com \
  --dest-namespace default

# Sync and verify
argocd app sync test-app
argocd app get test-app

# Clean up
argocd app delete test-app
```

## Troubleshooting EKS Connection Issues

```bash
# Check if ArgoCD has AWS credentials
kubectl exec -n argocd deploy/argocd-application-controller -- env | grep AWS

# Test STS assume role
kubectl exec -n argocd deploy/argocd-application-controller -- \
  aws sts get-caller-identity

# Check cluster connection state
argocd cluster get https://ABCDEF.gr7.us-east-1.eks.amazonaws.com -o json | \
  jq '.connectionState'

# Common issues:
# - IRSA not configured: no AWS_WEB_IDENTITY_TOKEN_FILE env var
# - Role ARN wrong: "AccessDenied" in connection state
# - EKS access entry or aws-auth mapping missing: "Unauthorized"
# - Cluster CA cert wrong: "x509: certificate signed by unknown authority"
```

## Summary

Adding an EKS cluster to ArgoCD requires bridging AWS IAM authentication with Kubernetes RBAC. For production, use IRSA to avoid static credentials and maintain AWS CloudTrail auditing. The key steps are creating an IAM management role with IRSA trust, creating a target cluster role that it can assume, authorizing that target role in EKS, and registering the cluster with `awsAuthConfig`. For managing EKS-specific authentication patterns, see our guide on [ArgoCD EKS IRSA auth](https://oneuptime.com/blog/post/2026-02-26-argocd-eks-irsa-auth/view).
