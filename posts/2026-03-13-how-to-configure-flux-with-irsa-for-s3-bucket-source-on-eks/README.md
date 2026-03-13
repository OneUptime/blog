# How to Configure Flux with IRSA for S3 Bucket Source on EKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, AWS, EKS, IRSA, S3, Bucket Source

Description: Learn how to configure Flux to use an S3 bucket as a source for Kubernetes manifests with IRSA authentication on EKS, enabling secure artifact-based deployments.

---

## Why S3 Bucket Sources

While Git repositories are the most common source for Flux, S3 buckets provide an alternative for scenarios where you want to store pre-built Kubernetes manifests, Helm chart archives, or Kustomize overlays as artifacts. This is useful for CI/CD pipelines that produce deployment artifacts, air-gapped environments, or when you need to decouple build artifacts from source code.

## Prerequisites

- An EKS cluster with the OIDC provider enabled
- Flux installed on the EKS cluster
- An S3 bucket for storing manifests
- AWS CLI and eksctl installed

## Step 1: Create the S3 Bucket

Create an S3 bucket to store your deployment artifacts:

```bash
aws s3 mb s3://my-flux-artifacts --region us-east-1

# Enable versioning for audit trail
aws s3api put-bucket-versioning \
  --bucket my-flux-artifacts \
  --versioning-configuration Status=Enabled

# Enable encryption at rest
aws s3api put-bucket-encryption \
  --bucket my-flux-artifacts \
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "aws:kms"
        }
      }
    ]
  }'
```

## Step 2: Create the IAM Policy

Create an IAM policy that grants Flux read access to the S3 bucket:

```bash
cat > s3-policy.json << 'EOF'
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
        "arn:aws:s3:::my-flux-artifacts",
        "arn:aws:s3:::my-flux-artifacts/*"
      ]
    }
  ]
}
EOF

aws iam create-policy \
  --policy-name FluxS3ReadOnly \
  --policy-document file://s3-policy.json
```

## Step 3: Create the IAM Role with IRSA

Create an IAM role for the Flux source-controller:

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
OIDC_PROVIDER=$(aws eks describe-cluster --name my-cluster \
  --query "cluster.identity.oidc.issuer" --output text | sed 's|https://||')

cat > trust-policy.json << EOF
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

aws iam create-role \
  --role-name flux-s3-role \
  --assume-role-policy-document file://trust-policy.json

aws iam attach-role-policy \
  --role-name flux-s3-role \
  --policy-arn "arn:aws:iam::${ACCOUNT_ID}:policy/FluxS3ReadOnly"
```

## Step 4: Annotate the Source Controller Service Account

Patch the Flux source-controller service account:

```yaml
# clusters/production/flux-sa-patch.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: source-controller
  namespace: flux-system
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/flux-s3-role
```

Apply this patch through your Flux kustomization:

```yaml
# clusters/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - path: flux-sa-patch.yaml
    target:
      kind: ServiceAccount
      name: source-controller
```

## Step 5: Define the Bucket Source

Create a Flux Bucket source that points to your S3 bucket:

```yaml
# clusters/production/s3-source.yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: Bucket
metadata:
  name: app-artifacts
  namespace: flux-system
spec:
  interval: 5m
  provider: aws
  bucketName: my-flux-artifacts
  endpoint: s3.amazonaws.com
  region: us-east-1
  prefix: production/
```

The `provider: aws` field tells Flux to use IRSA for authentication. No static credentials are needed.

## Step 6: Create a Kustomization from the Bucket

Deploy resources from the S3 bucket source:

```yaml
# clusters/production/apps-from-s3.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps-from-s3
  namespace: flux-system
spec:
  interval: 10m
  retryInterval: 1m
  timeout: 5m
  sourceRef:
    kind: Bucket
    name: app-artifacts
  path: ./manifests
  prune: true
  wait: true
```

## Step 7: Upload Manifests to S3

Upload your Kubernetes manifests to the S3 bucket from your CI pipeline:

```bash
# Build manifests
kustomize build apps/production > /tmp/manifests.tar.gz

# Upload to S3
aws s3 sync ./apps/production/ \
  s3://my-flux-artifacts/production/manifests/ \
  --delete

# Or upload a tar archive
tar czf /tmp/manifests.tar.gz -C apps/production .
aws s3 cp /tmp/manifests.tar.gz \
  s3://my-flux-artifacts/production/manifests.tar.gz
```

## CI Pipeline Integration

Automate artifact uploads from your CI pipeline:

```yaml
# .github/workflows/deploy-artifacts.yaml
name: Deploy Artifacts to S3
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/ci-deploy-role
          aws-region: us-east-1

      - name: Build and upload manifests
        run: |
          kustomize build apps/production > /tmp/output.yaml
          aws s3 cp /tmp/output.yaml s3://my-flux-artifacts/production/manifests/
```

## Using Bucket Source with Helm Charts

You can also store Helm chart archives in S3:

```yaml
# clusters/production/helm-from-s3.yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: Bucket
metadata:
  name: helm-charts
  namespace: flux-system
spec:
  interval: 10m
  provider: aws
  bucketName: my-flux-artifacts
  endpoint: s3.amazonaws.com
  region: us-east-1
  prefix: charts/
```

## Verifying the Setup

```bash
# Check the bucket source status
flux get sources bucket app-artifacts

# Check kustomization status
flux get kustomizations apps-from-s3

# View source-controller logs for S3 access
kubectl logs -n flux-system deployment/source-controller | grep -i bucket

# Verify the service account has the IRSA annotation
kubectl get sa source-controller -n flux-system -o yaml | grep eks.amazonaws.com
```

## Conclusion

Using Flux with IRSA for S3 bucket sources provides a secure, credential-free way to deploy Kubernetes manifests stored as artifacts. This approach is particularly useful for CI/CD pipelines that produce build artifacts, enabling a clean separation between the build and deploy phases. The IRSA integration eliminates the need for static AWS credentials, leveraging the EKS OIDC provider for automatic authentication.
