# How to Configure Image Automation with AWS ECR Token Refresh in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Image Automation, AWS ECR, Authentication

Description: Learn how to configure Flux image automation with AWS ECR, including automatic token refresh using CronJobs or IAM Roles for Service Accounts (IRSA).

---

## Introduction

AWS Elastic Container Registry (ECR) uses temporary authentication tokens that expire after 12 hours. This creates a challenge for Flux image automation, which needs persistent access to scan registries for new tags. This guide covers two approaches to keep ECR credentials fresh: a CronJob-based token refresh and IAM Roles for Service Accounts (IRSA).

## Prerequisites

- A Kubernetes cluster (EKS recommended for IRSA) with Flux installed
- The image-reflector-controller and image-automation-controller deployed
- An AWS ECR repository with container images
- AWS CLI configured with appropriate permissions

## The Problem

When you create a Docker registry secret for ECR, the token expires after 12 hours. After expiration, the ImageRepository resource fails to scan with authentication errors. You need a mechanism to refresh the token automatically.

## Approach 1: CronJob-Based Token Refresh

This approach uses a Kubernetes CronJob that runs every few hours, fetches a new ECR token, and updates the Kubernetes secret.

### Step 1: Create an IAM Policy

Create an IAM policy that grants ECR read access.

```bash
# Create an IAM policy for ECR read access
aws iam create-policy \
  --policy-name FluxECRReadOnly \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "ecr:GetAuthorizationToken",
          "ecr:BatchGetImage",
          "ecr:GetDownloadUrlForLayer",
          "ecr:ListImages",
          "ecr:DescribeImages",
          "ecr:BatchCheckLayerAvailability"
        ],
        "Resource": "*"
      }
    ]
  }'
```

### Step 2: Create the CronJob

Deploy a CronJob that refreshes the ECR credentials every 6 hours.

```yaml
# ecr-credentials-cronjob.yaml
# CronJob that refreshes ECR token and updates the Kubernetes secret
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ecr-credentials-sync
  namespace: flux-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: ecr-credentials-sync
  namespace: flux-system
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get", "create", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: ecr-credentials-sync
  namespace: flux-system
subjects:
  - kind: ServiceAccount
    name: ecr-credentials-sync
    namespace: flux-system
roleRef:
  kind: Role
  name: ecr-credentials-sync
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: ecr-credentials-sync
  namespace: flux-system
spec:
  schedule: "0 */6 * * *"  # Every 6 hours
  successfulJobsHistoryLimit: 1
  failedJobsHistoryLimit: 1
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: ecr-credentials-sync
          restartPolicy: Never
          containers:
            - name: ecr-login
              image: amazon/aws-cli:2.15.0
              envFrom:
                - secretRef:
                    name: ecr-credentials-sync-aws
              command:
                - /bin/sh
                - -c
                - |
                  # Get ECR authorization token
                  TOKEN=$(aws ecr get-login-password --region ${AWS_REGION})
                  # Create or update the Docker registry secret
                  kubectl create secret docker-registry ecr-credentials \
                    --namespace flux-system \
                    --docker-server=${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com \
                    --docker-username=AWS \
                    --docker-password="${TOKEN}" \
                    --dry-run=client -o yaml | kubectl apply -f -
                  echo "ECR credentials updated successfully"
```

### Step 3: Create the AWS Credentials Secret

Store the AWS credentials used by the CronJob.

```bash
# Create a secret with AWS credentials for the CronJob
kubectl create secret generic ecr-credentials-sync-aws \
  --namespace flux-system \
  --from-literal=AWS_ACCESS_KEY_ID=AKIA... \
  --from-literal=AWS_SECRET_ACCESS_KEY=... \
  --from-literal=AWS_REGION=us-east-1 \
  --from-literal=AWS_ACCOUNT_ID=123456789012
```

### Step 4: Run the Job Initially

Create the initial credentials by running the CronJob manually.

```bash
# Trigger the CronJob immediately to create the initial secret
kubectl create job --from=cronjob/ecr-credentials-sync initial-sync \
  -n flux-system
```

## Approach 2: IAM Roles for Service Accounts (IRSA)

On EKS, IRSA is the preferred approach. It eliminates the need for static AWS credentials entirely by associating an IAM role with a Kubernetes service account.

### Step 1: Create an IAM Role with IRSA

```bash
# Create an IAM role for the image-reflector-controller service account
eksctl create iamserviceaccount \
  --name image-reflector-controller \
  --namespace flux-system \
  --cluster my-cluster \
  --attach-policy-arn arn:aws:iam::123456789012:policy/FluxECRReadOnly \
  --override-existing-serviceaccounts \
  --approve
```

### Step 2: Patch the Controller Deployment

After creating the IRSA association, restart the image-reflector-controller to pick up the new service account annotations.

```bash
# Restart the image-reflector-controller to use IRSA credentials
kubectl rollout restart deployment/image-reflector-controller -n flux-system
```

### Step 3: Configure ImageRepository for IRSA

When using IRSA, you do not need a `secretRef` on the ImageRepository. Instead, set the `provider` field to `aws`.

```yaml
# image-repository-ecr-irsa.yaml
# ImageRepository configured to use IRSA for ECR authentication
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app
  interval: 5m
  provider: aws
```

The `provider: aws` field tells the image-reflector-controller to use the AWS SDK credential chain, which includes IRSA tokens.

## Configuring the ImageRepository (CronJob Approach)

If you are using the CronJob approach, reference the Docker registry secret in the ImageRepository.

```yaml
# image-repository-ecr-cronjob.yaml
# ImageRepository using the CronJob-refreshed ECR credentials
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app
  interval: 5m
  secretRef:
    name: ecr-credentials
```

## Complete Example with ImagePolicy and Automation

Once ECR authentication is configured, the rest of the image automation pipeline is standard.

```yaml
# image-policy.yaml
# Select the latest semver tag from ECR
apiVersion: image.toolkit.fluxcd.io/v1beta2
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

## Verifying the Setup

Confirm that ECR scanning is working after configuring authentication.

```bash
# Verify the ImageRepository can scan ECR
flux get image repository my-app -n flux-system

# Check for authentication errors in the controller logs
kubectl logs -n flux-system deployment/image-reflector-controller --tail=50
```

## Choosing Between Approaches

| Criteria | CronJob | IRSA |
|---|---|---|
| EKS required | No | Yes |
| Static credentials | Yes | No |
| Maintenance | CronJob management | Minimal |
| Security | Credentials stored in secrets | No stored credentials |
| Works on non-AWS K8s | Yes | No |

IRSA is the recommended approach for EKS clusters. The CronJob approach works on any Kubernetes cluster with AWS access.

## Conclusion

AWS ECR token expiration is a common pain point for Flux image automation. The CronJob approach provides a universal solution by periodically refreshing the Docker registry secret. For EKS clusters, IRSA eliminates credential management entirely by leveraging AWS native identity federation. Both approaches ensure your ImageRepository resources can continuously scan ECR for new image tags.
