# How to Set Up Flux CD on Amazon EKS with IRSA

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, AWS, EKS, IRSA, IAM, Kubernetes, GitOps, ECR

Description: Learn how to set up Flux CD on Amazon EKS with IAM Roles for Service Accounts (IRSA) to securely access AWS services like ECR, S3, and CodeCommit.

---

IAM Roles for Service Accounts (IRSA) is the recommended way to grant AWS permissions to pods running on Amazon EKS. Instead of using static AWS credentials stored in Kubernetes secrets, IRSA lets Flux CD controllers assume IAM roles through federated identity. This guide walks you through setting up Flux CD on EKS with IRSA from scratch.

## Prerequisites

Before you begin, ensure you have:

- An Amazon EKS cluster running a Kubernetes version supported by your Flux release
- AWS CLI configured with appropriate permissions
- `eksctl` installed
- `flux` CLI installed
- An OIDC provider associated with your EKS cluster, or permission to associate one

## Step 1: Enable the OIDC Provider for Your EKS Cluster

IRSA requires an OpenID Connect (OIDC) provider associated with your EKS cluster:

```bash
# Check if OIDC provider is already configured

aws eks describe-cluster \
  --name my-cluster \
  --query "cluster.identity.oidc.issuer" \
  --output text

# Create the OIDC provider if it does not exist
eksctl utils associate-iam-oidc-provider \
  --cluster my-cluster \
  --region us-east-1 \
  --approve
```

Verify the OIDC provider was created:

```bash
# Get the OIDC provider URL
OIDC_URL=$(aws eks describe-cluster \
  --name my-cluster \
  --query "cluster.identity.oidc.issuer" \
  --output text)

# Verify it exists in IAM
aws iam list-open-id-connect-providers | grep $(echo $OIDC_URL | cut -d'/' -f5)
```

## Step 2: Create IAM Policies for Flux Controllers

### ECR Read-Only Policy (for source-controller)

```bash
# Create the ECR read-only policy
cat > /tmp/flux-ecr-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "FluxECRReadOnly",
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:GetRepositoryPolicy",
        "ecr:DescribeRepositories",
        "ecr:ListImages",
        "ecr:DescribeImages",
        "ecr:GetLifecyclePolicy",
        "ecr:GetLifecyclePolicyPreview",
        "ecr:ListTagsForResource",
        "ecr:DescribeImageScanFindings"
      ],
      "Resource": "*"
    }
  ]
}
EOF

aws iam create-policy \
  --policy-name FluxECRReadOnly \
  --policy-document file:///tmp/flux-ecr-policy.json
```

### S3 Read-Only Policy (for source-controller, if using Bucket sources)

```bash
# Create the S3 read-only policy if using S3 Bucket sources
cat > /tmp/flux-s3-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "FluxS3ReadOnly",
      "Effect": "Allow",
      "Action": [
        "s3:Get*",
        "s3:List*",
        "s3:Describe*",
        "s3-object-lambda:Get*",
        "s3-object-lambda:List*"
      ],
      "Resource": "*"
    }
  ]
}
EOF

aws iam create-policy \
  --policy-name FluxS3ReadOnly \
  --policy-document file:///tmp/flux-s3-policy.json
```

### KMS Policy (for kustomize-controller, if using SOPS)

```bash
# Create the KMS policy for SOPS decryption
cat > /tmp/flux-kms-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "FluxKMSDecrypt",
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt",
        "kms:DescribeKey"
      ],
      "Resource": "arn:aws:kms:us-east-1:123456789012:key/YOUR-KMS-KEY-ID"
    }
  ]
}
EOF

aws iam create-policy \
  --policy-name FluxKMSDecrypt \
  --policy-document file:///tmp/flux-kms-policy.json
```

## Step 3: Create IAM Roles with Trust Policies

### Source Controller Role

```bash
# Get the OIDC provider ID
OIDC_ID=$(aws eks describe-cluster \
  --name my-cluster \
  --query "cluster.identity.oidc.issuer" \
  --output text | cut -d'/' -f5)

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Create trust policy for source-controller
cat > /tmp/source-controller-trust.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/${OIDC_ID}"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "oidc.eks.us-east-1.amazonaws.com/id/${OIDC_ID}:sub": "system:serviceaccount:flux-system:source-controller",
          "oidc.eks.us-east-1.amazonaws.com/id/${OIDC_ID}:aud": "sts.amazonaws.com"
        }
      }
    }
  ]
}
EOF

# Create the IAM role
aws iam create-role \
  --role-name flux-source-controller \
  --assume-role-policy-document file:///tmp/source-controller-trust.json

# Attach the ECR policy
aws iam attach-role-policy \
  --role-name flux-source-controller \
  --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/FluxECRReadOnly

# Attach the S3 policy if using S3 Bucket sources
aws iam attach-role-policy \
  --role-name flux-source-controller \
  --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/FluxS3ReadOnly
```

### Kustomize Controller Role (for SOPS)

```bash
# Create trust policy for kustomize-controller
cat > /tmp/kustomize-controller-trust.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/${OIDC_ID}"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "oidc.eks.us-east-1.amazonaws.com/id/${OIDC_ID}:sub": "system:serviceaccount:flux-system:kustomize-controller",
          "oidc.eks.us-east-1.amazonaws.com/id/${OIDC_ID}:aud": "sts.amazonaws.com"
        }
      }
    }
  ]
}
EOF

aws iam create-role \
  --role-name flux-kustomize-controller \
  --assume-role-policy-document file:///tmp/kustomize-controller-trust.json

aws iam attach-role-policy \
  --role-name flux-kustomize-controller \
  --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/FluxKMSDecrypt
```

## Step 4: Annotate Flux Service Accounts

You can annotate service accounts either using eksctl or through Flux kustomization patches.

### Using eksctl

```bash
# Annotate the source-controller service account
eksctl create iamserviceaccount \
  --name source-controller \
  --namespace flux-system \
  --cluster my-cluster \
  --region us-east-1 \
  --attach-role-arn arn:aws:iam::${ACCOUNT_ID}:role/flux-source-controller \
  --override-existing-serviceaccounts \
  --approve
```

### Using Flux Kustomization Patches (Recommended)

```yaml
# clusters/production/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  # Annotate source-controller service account with IRSA role
  - target:
      kind: ServiceAccount
      name: source-controller
    patch: |
      apiVersion: v1
      kind: ServiceAccount
      metadata:
        name: source-controller
        annotations:
          eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/flux-source-controller
  # Annotate kustomize-controller service account with IRSA role
  - target:
      kind: ServiceAccount
      name: kustomize-controller
    patch: |
      apiVersion: v1
      kind: ServiceAccount
      metadata:
        name: kustomize-controller
        annotations:
          eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/flux-kustomize-controller
```

## Step 5: Bootstrap Flux on EKS

```bash
# Bootstrap Flux with GitHub
flux bootstrap github \
  --owner=my-org \
  --repository=fleet-infra \
  --path=clusters/production

# After bootstrap, apply the kustomization patches
# by pushing the updated kustomization.yaml to the repo
```

## Step 6: Verify IRSA Is Working

```bash
# Check that the service account has the IRSA annotation
kubectl get serviceaccount source-controller -n flux-system -o yaml | grep -A2 annotations

# Verify the pod has the AWS environment variables injected
kubectl get pod -n flux-system \
  -l app.kubernetes.io/name=source-controller \
  -o jsonpath='{.items[0].spec.containers[0].env[?(@.name=="AWS_ROLE_ARN")].value}{"\n"}{.items[0].spec.containers[0].env[?(@.name=="AWS_WEB_IDENTITY_TOKEN_FILE")].value}{"\n"}'

# Expected output:
# AWS_ROLE_ARN=arn:aws:iam::123456789012:role/flux-source-controller
# AWS_WEB_IDENTITY_TOKEN_FILE=/var/run/secrets/eks.amazonaws.com/serviceaccount/token

# After applying the OCIRepository in Step 7, test ECR access by reconciling it
flux reconcile source oci my-app-manifests -n flux-system
flux get sources oci my-app-manifests -n flux-system
```

## Step 7: Configure Flux Resources to Use IRSA

### ECR as OCI Source

```yaml
# ecr-source.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: my-app-manifests
  namespace: flux-system
spec:
  interval: 5m
  url: oci://123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app-manifests
  ref:
    tag: latest
  provider: aws  # This tells Flux to use IRSA for authentication
```

### ECR as Helm Chart Source

```yaml
# ecr-helm-repo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: my-charts
  namespace: flux-system
spec:
  interval: 10m
  type: oci
  url: oci://123456789012.dkr.ecr.us-east-1.amazonaws.com
  provider: aws  # Use IRSA for ECR authentication
```

## Troubleshooting IRSA Issues

```bash
# Check if the OIDC provider is correctly configured
aws iam list-open-id-connect-providers

# Verify the trust policy allows the correct service account
aws iam get-role --role-name flux-source-controller \
  --query 'Role.AssumeRolePolicyDocument' --output json | jq .

# Check pod logs for IRSA errors
kubectl logs -n flux-system deployment/source-controller --tail=50 \
  | grep -i "aws\|sts\|assume\|credential"

# Restart the controller after making changes
kubectl rollout restart deployment/source-controller -n flux-system
```

## Summary

Setting up Flux CD with IRSA on Amazon EKS eliminates the need for static AWS credentials stored in Kubernetes secrets. Create IAM policies with least-privilege access, create IAM roles with trust policies scoped to specific Flux service accounts, and annotate those service accounts using Flux kustomization patches for a fully GitOps-managed setup. Always verify IRSA is working by checking for the `AWS_ROLE_ARN` and `AWS_WEB_IDENTITY_TOKEN_FILE` environment variables in your controller pods.
