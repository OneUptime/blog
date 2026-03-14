# How to Configure Flux with IRSA for ECR Image Pulling on EKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, AWS, EKS, IRSA, ECR, Container Registry

Description: Learn how to configure Flux with IAM Roles for Service Accounts (IRSA) to pull container images from Amazon ECR without managing static credentials.

---

## Why IRSA for ECR

Amazon Elastic Container Registry (ECR) requires authentication to pull images. Instead of creating and rotating static Docker credentials, IRSA allows Flux to assume an IAM role through the EKS OIDC provider, providing secure, automatic, and credential-free access to ECR repositories.

## Prerequisites

- An EKS cluster with the OIDC provider enabled
- Flux installed on the EKS cluster
- An ECR repository with container images
- AWS CLI and eksctl installed

## Step 1: Enable the OIDC Provider

If not already enabled, set up the OIDC provider for your EKS cluster:

```bash
# Check if OIDC provider exists
aws eks describe-cluster --name my-cluster \
  --query "cluster.identity.oidc.issuer" --output text

# Create the OIDC provider if needed
eksctl utils associate-iam-oidc-provider \
  --cluster my-cluster \
  --approve
```

## Step 2: Create the IAM Policy

Create an IAM policy that grants read access to ECR:

```bash
cat > ecr-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:DescribeRepositories",
        "ecr:ListImages"
      ],
      "Resource": "*"
    }
  ]
}
EOF

aws iam create-policy \
  --policy-name FluxECRReadOnly \
  --policy-document file://ecr-policy.json
```

## Step 3: Create the IAM Role with Trust Policy

Create an IAM role that the Flux source-controller service account can assume:

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
  --role-name flux-ecr-role \
  --assume-role-policy-document file://trust-policy.json

aws iam attach-role-policy \
  --role-name flux-ecr-role \
  --policy-arn "arn:aws:iam::${ACCOUNT_ID}:policy/FluxECRReadOnly"
```

## Step 4: Annotate the Flux Service Account

Annotate the Flux source-controller service account to use the IAM role:

```yaml
# clusters/production/flux-patches.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
patches:
  - target:
      kind: ServiceAccount
      name: source-controller
      namespace: flux-system
    patch: |
      apiVersion: v1
      kind: ServiceAccount
      metadata:
        name: source-controller
        namespace: flux-system
        annotations:
          eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/flux-ecr-role
```

Alternatively, use eksctl:

```bash
eksctl create iamserviceaccount \
  --name source-controller \
  --namespace flux-system \
  --cluster my-cluster \
  --attach-policy-arn "arn:aws:iam::${ACCOUNT_ID}:policy/FluxECRReadOnly" \
  --override-existing-serviceaccounts \
  --approve
```

## Step 5: Configure ECR Image Repository in Flux

Now configure Flux to scan your ECR repository for new images:

```yaml
# clusters/production/ecr-image-repo.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app
  interval: 5m
  provider: aws
```

The `provider: aws` field tells Flux to use the IRSA-based authentication for ECR access.

## Step 6: Configure Image Policy and Automation

Set up an image policy to track new image versions:

```yaml
# clusters/production/image-policy.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      range: ">=1.0.0"
```

Set up image update automation:

```yaml
# clusters/production/image-update.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: flux-bot
        email: flux@example.com
      messageTemplate: "chore: update image to {{range .Updated.Images}}{{println .}}{{end}}"
    push:
      branch: main
  update:
    path: ./apps
    strategy: Setters
```

## Step 7: Cross-Account ECR Access

If you need to pull images from an ECR repository in a different AWS account, add the cross-account permission:

```bash
# In the ECR account, add a repository policy
aws ecr set-repository-policy \
  --repository-name my-app \
  --policy-text '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "AllowCrossAccountPull",
        "Effect": "Allow",
        "Principal": {
          "AWS": "arn:aws:iam::CONSUMER_ACCOUNT_ID:role/flux-ecr-role"
        },
        "Action": [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ]
      }
    ]
  }'
```

## Verifying the Setup

```bash
# Check the source-controller service account annotations
kubectl get sa source-controller -n flux-system -o yaml

# Verify image repository scanning works
flux get image repository my-app

# Check for any errors
kubectl logs -n flux-system deployment/source-controller | grep -i ecr

# Verify image policies are resolving
flux get image policy my-app
```

## Conclusion

Configuring Flux with IRSA for ECR image pulling eliminates the need for static Docker registry credentials and provides secure, auditable access to your container images. By leveraging the EKS OIDC provider, the source-controller can automatically authenticate to ECR using short-lived tokens, reducing the operational burden of credential management and improving security posture.
