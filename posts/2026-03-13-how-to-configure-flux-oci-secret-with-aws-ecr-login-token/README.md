# How to Configure Flux OCI Secret with AWS ECR Login Token

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Source Controller, Authentication, Secrets, OCI, AWS, ECR, Container Registry, OCIRepository

Description: How to configure Flux CD to authenticate with AWS Elastic Container Registry (ECR) for pulling OCI artifacts.

---

## Introduction

AWS Elastic Container Registry (ECR) is a fully managed container registry service. When using Flux CD to deploy OCI artifacts stored in ECR, you need to handle ECR's unique authentication model: ECR tokens expire every 12 hours, so static credentials will not work long-term.

This guide covers two approaches: using short-lived ECR tokens with manual or automated rotation, and using Flux's built-in AWS ECR provider for automatic token management.

## Prerequisites

- A Kubernetes cluster (v1.20 or later)
- Flux CD installed on your cluster (v2.x)
- `kubectl` configured to communicate with your cluster
- AWS CLI configured with appropriate IAM permissions
- An ECR repository containing your OCI artifacts
- IAM credentials with `ecr:GetAuthorizationToken`, `ecr:BatchGetImage`, and `ecr:GetDownloadUrlForLayer` permissions

## Approach 1: Flux Built-in AWS ECR Provider (Recommended)

Flux's Source Controller has built-in support for AWS ECR authentication. This is the recommended approach as it handles token refresh automatically.

### Step 1: Set Up IAM Authentication

You need to provide AWS credentials to the Source Controller. The recommended methods are:

#### Option A: IAM Roles for Service Accounts (IRSA) on EKS

Create an IAM policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchGetImage",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchCheckLayerAvailability"
      ],
      "Resource": "*"
    }
  ]
}
```

Create the IAM role and associate it with the Source Controller service account:

```bash
eksctl create iamserviceaccount \
  --name source-controller \
  --namespace flux-system \
  --cluster your-cluster-name \
  --attach-policy-arn arn:aws:iam::123456789012:policy/FluxECRReadOnly \
  --override-existing-serviceaccounts \
  --approve
```

Restart the Source Controller to pick up the new service account:

```bash
kubectl rollout restart deployment/source-controller -n flux-system
```

#### Option B: Static AWS Credentials (Simpler but Less Secure)

Create a Secret with AWS credentials:

```bash
kubectl create secret generic aws-credentials \
  --namespace=flux-system \
  --from-literal=aws_access_key_id=AKIAIOSFODNN7EXAMPLE \
  --from-literal=aws_secret_access_key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

Patch the Source Controller deployment to use these credentials:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
      - name: manager
        env:
        - name: AWS_ACCESS_KEY_ID
          valueFrom:
            secretKeyRef:
              name: aws-credentials
              key: aws_access_key_id
        - name: AWS_SECRET_ACCESS_KEY
          valueFrom:
            secretKeyRef:
              name: aws-credentials
              key: aws_secret_access_key
        - name: AWS_REGION
          value: us-east-1
```

### Step 2: Configure the OCIRepository with AWS Provider

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: my-ecr-app
  namespace: flux-system
spec:
  interval: 5m
  url: oci://123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app
  ref:
    tag: latest
  provider: aws
```

The `provider: aws` field tells Flux to use its built-in AWS authentication to obtain and refresh ECR tokens automatically.

### Step 3: For Helm Charts in ECR

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: ecr-charts
  namespace: flux-system
spec:
  interval: 10m
  url: oci://123456789012.dkr.ecr.us-east-1.amazonaws.com
  type: oci
  provider: aws
```

## Approach 2: Manual ECR Token with Docker Config JSON

If you cannot use the built-in provider, you can use ECR login tokens directly.

### Step 1: Get an ECR Login Token

```bash
ECR_TOKEN=$(aws ecr get-login-password --region us-east-1)
```

### Step 2: Create the Docker Config Secret

```bash
kubectl create secret docker-registry ecr-credentials \
  --namespace=flux-system \
  --docker-server=123456789012.dkr.ecr.us-east-1.amazonaws.com \
  --docker-username=AWS \
  --docker-password=$ECR_TOKEN
```

### Step 3: Configure the OCIRepository

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: my-ecr-app
  namespace: flux-system
spec:
  interval: 5m
  url: oci://123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app
  ref:
    tag: latest
  secretRef:
    name: ecr-credentials
```

### Step 4: Automate Token Rotation

Since ECR tokens expire every 12 hours, set up a CronJob to rotate the token:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ecr-token-rotator
  namespace: flux-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: ecr-token-rotator
  namespace: flux-system
rules:
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["create", "patch", "get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: ecr-token-rotator
  namespace: flux-system
subjects:
- kind: ServiceAccount
  name: ecr-token-rotator
  namespace: flux-system
roleRef:
  kind: Role
  name: ecr-token-rotator
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: ecr-token-refresh
  namespace: flux-system
spec:
  schedule: "0 */6 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: ecr-token-rotator
          containers:
          - name: refresh
            image: amazon/aws-cli:latest
            command:
            - /bin/sh
            - -c
            - |
              TOKEN=$(aws ecr get-login-password --region us-east-1)
              kubectl create secret docker-registry ecr-credentials \
                --namespace=flux-system \
                --docker-server=123456789012.dkr.ecr.us-east-1.amazonaws.com \
                --docker-username=AWS \
                --docker-password=$TOKEN \
                --dry-run=client -o yaml | kubectl apply -f -
            env:
            - name: AWS_ACCESS_KEY_ID
              valueFrom:
                secretKeyRef:
                  name: aws-credentials
                  key: aws_access_key_id
            - name: AWS_SECRET_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: aws-credentials
                  key: aws_secret_access_key
          restartPolicy: OnFailure
```

## Verification

Check the `OCIRepository` status:

```bash
flux get sources oci my-ecr-app
```

Detailed status:

```bash
kubectl describe ocirepository my-ecr-app -n flux-system
```

Verify ECR connectivity:

```bash
aws ecr describe-repositories --region us-east-1
```

## Troubleshooting

### Token Expired

If using Approach 2 and you see authentication errors:

1. Check when the Secret was last updated:

```bash
kubectl get secret ecr-credentials -n flux-system -o jsonpath='{.metadata.creationTimestamp}'
```

2. Refresh the token manually:

```bash
ECR_TOKEN=$(aws ecr get-login-password --region us-east-1)
kubectl create secret docker-registry ecr-credentials \
  --namespace=flux-system \
  --docker-server=123456789012.dkr.ecr.us-east-1.amazonaws.com \
  --docker-username=AWS \
  --docker-password=$ECR_TOKEN \
  --dry-run=client -o yaml | kubectl apply -f -
```

### IRSA Not Working

If using IRSA and authentication fails:

1. Verify the service account annotation:

```bash
kubectl get sa source-controller -n flux-system -o jsonpath='{.metadata.annotations}'
```

2. Check the Source Controller pod has the expected environment variables:

```bash
kubectl exec -n flux-system deployment/source-controller -- env | grep AWS
```

3. Verify the IAM role trust policy includes your OIDC provider.

### Cross-Account ECR Access

For pulling from ECR in a different AWS account, you need to configure the ECR repository policy in the source account:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::TARGET_ACCOUNT_ID:root"
      },
      "Action": [
        "ecr:BatchGetImage",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchCheckLayerAvailability"
      ]
    }
  ]
}
```

## Summary

For AWS ECR, the recommended approach is using Flux's built-in `provider: aws` option, which handles token refresh automatically. If using IRSA on EKS, no additional secrets are needed. For non-EKS clusters or when the built-in provider is not suitable, you can use Docker config JSON secrets with automated CronJob-based token rotation to work around ECR's 12-hour token expiration.
