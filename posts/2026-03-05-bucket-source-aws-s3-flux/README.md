# How to Configure Bucket Source with AWS S3 in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, AWS, S3, Bucket

Description: Learn how to configure Flux CD to pull Kubernetes manifests from AWS S3 buckets using static credentials and IAM Roles for Service Accounts (IRSA).

---

## Introduction

AWS S3 is one of the most widely used object storage services, and Flux CD supports it natively as a source for Kubernetes manifests. By configuring a Bucket source with the `aws` provider, Flux can pull manifests from S3 and automatically reconcile your cluster whenever the bucket contents change.

This guide covers both static credential authentication and the recommended IAM Roles for Service Accounts (IRSA) approach for EKS clusters.

## Prerequisites

- Flux CD v2.0 or later installed on your Kubernetes cluster
- An AWS S3 bucket containing Kubernetes manifests
- AWS CLI configured locally
- `kubectl` access to your cluster
- For IRSA: an EKS cluster with OIDC provider enabled

## Preparing the S3 Bucket

Create an S3 bucket and upload your Kubernetes manifests.

```bash
# Create an S3 bucket for Flux manifests
aws s3 mb s3://my-app-flux-manifests --region us-east-1

# Upload manifests to the bucket
aws s3 sync ./manifests/ s3://my-app-flux-manifests/
```

## Option 1: Static Credentials

The simplest approach is to use an IAM user with static access keys. Create an IAM user with read-only access to the bucket.

```bash
# Create an IAM policy for read-only S3 access
cat > flux-s3-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::my-app-flux-manifests",
        "arn:aws:s3:::my-app-flux-manifests/*"
      ]
    }
  ]
}
EOF

# Create the IAM user and attach the policy
aws iam create-user --user-name flux-s3-reader
aws iam put-user-policy --user-name flux-s3-reader \
  --policy-name flux-s3-read \
  --policy-document file://flux-s3-policy.json

# Create access keys
aws iam create-access-key --user-name flux-s3-reader
```

Create a Kubernetes secret with the access keys.

```bash
# Create the secret with AWS credentials
kubectl create secret generic aws-bucket-creds \
  --namespace flux-system \
  --from-literal=accesskey=AKIAIOSFODNN7EXAMPLE \
  --from-literal=secretkey=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

Create the Bucket source with the `aws` provider.

```yaml
# flux-system/s3-bucket-source.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: Bucket
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  # Use the aws provider for native S3 integration
  provider: aws
  bucketName: my-app-flux-manifests
  endpoint: s3.amazonaws.com
  region: us-east-1
  secretRef:
    name: aws-bucket-creds
```

## Option 2: IAM Roles for Service Accounts (IRSA)

IRSA is the recommended approach for EKS clusters. It eliminates the need for static credentials by associating an IAM role with the Flux source-controller service account.

First, create an IAM role with a trust policy for the EKS OIDC provider.

```bash
# Get the OIDC provider URL for your EKS cluster
OIDC_PROVIDER=$(aws eks describe-cluster --name my-cluster \
  --query "cluster.identity.oidc.issuer" --output text | sed 's|https://||')

# Get your AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Create the trust policy
cat > trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/${OIDC_PROVIDER}"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "${OIDC_PROVIDER}:sub": "system:serviceaccount:flux-system:source-controller",
          "${OIDC_PROVIDER}:aud": "sts.amazonaws.com"
        }
      }
    }
  ]
}
EOF

# Create the IAM role
aws iam create-role --role-name flux-source-controller-s3 \
  --assume-role-policy-document file://trust-policy.json

# Attach the S3 read policy
aws iam put-role-policy --role-name flux-source-controller-s3 \
  --policy-name flux-s3-read \
  --policy-document file://flux-s3-policy.json
```

Annotate the Flux source-controller service account with the IAM role.

```bash
# Annotate the source-controller service account
kubectl annotate serviceaccount source-controller \
  --namespace flux-system \
  --overwrite \
  eks.amazonaws.com/role-arn=arn:aws:iam::${ACCOUNT_ID}:role/flux-source-controller-s3

# Restart the source-controller to pick up the new role
kubectl rollout restart deployment/source-controller -n flux-system
```

With IRSA configured, the Bucket source does not need a `secretRef`.

```yaml
# flux-system/s3-bucket-source-irsa.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: Bucket
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  # The aws provider enables IRSA-based authentication
  provider: aws
  bucketName: my-app-flux-manifests
  endpoint: s3.amazonaws.com
  region: us-east-1
  # No secretRef needed -- IRSA handles authentication
```

## Using S3 with a Prefix

If your bucket contains manifests for multiple applications or environments, use the `prefix` field to scope the download.

```yaml
# flux-system/s3-bucket-prefix.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: Bucket
metadata:
  name: my-app-production
  namespace: flux-system
spec:
  interval: 5m
  provider: aws
  bucketName: deployment-artifacts
  endpoint: s3.amazonaws.com
  region: us-east-1
  # Only pull files from the production/my-app/ prefix
  prefix: production/my-app/
  secretRef:
    name: aws-bucket-creds
```

## Connecting a Kustomization

Create a Kustomization that deploys the manifests from the Bucket source.

```yaml
# flux-system/my-app-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: my-app
  sourceRef:
    kind: Bucket
    name: my-app
  path: ./
  prune: true
  wait: true
```

## CI/CD Integration

Upload manifests to S3 from your CI/CD pipeline to trigger Flux reconciliation.

```yaml
# .github/workflows/upload-manifests.yaml
name: Upload Manifests to S3
on:
  push:
    branches: [main]
    paths: ['manifests/**']

jobs:
  upload:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/github-actions-s3
          aws-region: us-east-1

      - name: Sync manifests to S3
        run: |
          # Sync manifests, deleting files removed from the repo
          aws s3 sync ./manifests/ s3://my-app-flux-manifests/ --delete
```

## Verifying the Setup

Confirm the Bucket source is working.

```bash
# Check the Bucket source status
flux get sources bucket -n flux-system

# View detailed status
kubectl describe bucket my-app -n flux-system

# Check if the Kustomization has reconciled
flux get kustomizations -n flux-system
```

## Best Practices

1. **Use IRSA over static credentials.** IRSA eliminates credential rotation overhead and follows the principle of least privilege.

2. **Enable S3 versioning.** Turn on bucket versioning to maintain a history of manifest changes and enable rollback.

3. **Restrict bucket access.** Use bucket policies and IAM policies to ensure only authorized pipelines can write and only Flux can read.

4. **Use S3 server-side encryption.** Enable SSE-S3 or SSE-KMS to encrypt manifests at rest.

5. **Set up S3 event notifications.** While Flux polls on an interval, S3 events can trigger webhooks for faster reconciliation if needed.

## Conclusion

Configuring a Bucket source with AWS S3 in Flux CD provides a reliable way to deliver Kubernetes manifests through object storage. Whether you use static credentials for simplicity or IRSA for production-grade security, the `aws` provider integrates natively with S3. Combined with a CI/CD pipeline that uploads manifests on every merge, you get an automated GitOps workflow powered by S3.
