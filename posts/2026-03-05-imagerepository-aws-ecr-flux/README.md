# How to Configure ImageRepository for AWS ECR in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Image Automation, ImageRepository, AWS ECR, Amazon

Description: Learn how to configure a Flux ImageRepository to scan AWS Elastic Container Registry for container image tags.

---

AWS Elastic Container Registry (ECR) is a fully managed container registry service from Amazon. Configuring Flux to scan ECR requires special handling because ECR authentication tokens expire every 12 hours. This guide walks you through configuring an ImageRepository for AWS ECR with automatic token refresh.

## Prerequisites

- A Kubernetes cluster with Flux and image automation controllers installed
- An AWS account with ECR repositories
- AWS CLI configured locally
- kubectl access to your cluster

## Understanding AWS ECR Authentication

AWS ECR uses temporary authentication tokens that expire every 12 hours. Unlike other registries where you can set a static password, ECR requires a mechanism to refresh tokens periodically. Flux supports ECR authentication natively through the image reflector controller's cloud provider integration.

## Step 1: Create an ECR ImageRepository with Provider Authentication

Flux supports native ECR authentication using the `provider` field. This is the recommended approach.

```yaml
# imagerepository-ecr.yaml
# Scan an AWS ECR image using native provider authentication
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app
  interval: 5m0s
  provider: aws
```

Apply the manifest.

```bash
# Apply the ECR ImageRepository
kubectl apply -f imagerepository-ecr.yaml
```

The `provider: aws` setting tells the image reflector controller to use the AWS SDK to obtain ECR credentials automatically.

## Step 2: Configure IAM Permissions

The image reflector controller needs permission to pull from ECR. Create an IAM policy with the necessary permissions.

```yaml
# iam-policy.yaml (reference -- apply via AWS CLI or Terraform)
# IAM policy granting ECR read access for image scanning
# {
#   "Version": "2012-10-17",
#   "Statement": [
#     {
#       "Effect": "Allow",
#       "Action": [
#         "ecr:GetAuthorizationToken",
#         "ecr:BatchGetImage",
#         "ecr:GetDownloadUrlForLayer",
#         "ecr:ListImages",
#         "ecr:DescribeImages",
#         "ecr:BatchCheckLayerAvailability"
#       ],
#       "Resource": "*"
#     }
#   ]
# }
```

## Step 3: Use IAM Roles for Service Accounts (IRSA)

On EKS, the recommended approach is to use IAM Roles for Service Accounts (IRSA). Annotate the image reflector controller's ServiceAccount with the IAM role ARN.

```bash
# Create an IAM OIDC provider for your EKS cluster (if not already done)
eksctl utils associate-iam-oidc-provider \
  --cluster=my-cluster \
  --approve
```

Create an IAM role and associate it with the image reflector controller ServiceAccount.

```bash
# Create an IAM role for the image reflector controller
eksctl create iamserviceaccount \
  --name=image-reflector-controller \
  --namespace=flux-system \
  --cluster=my-cluster \
  --attach-policy-arn=arn:aws:iam::123456789012:policy/ECRReadOnlyPolicy \
  --override-existing-serviceaccounts \
  --approve
```

Alternatively, patch the ServiceAccount manually.

```yaml
# Patch the image-reflector-controller ServiceAccount with the IAM role
apiVersion: v1
kind: ServiceAccount
metadata:
  name: image-reflector-controller
  namespace: flux-system
  annotations:
    # Associate the IAM role for ECR access
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/FluxImageReflectorRole
```

## Step 4: Use Static Credentials (Alternative)

If you cannot use IRSA, you can generate an ECR login token and store it as a Secret. Note that this token expires after 12 hours and must be refreshed.

```bash
# Get an ECR login token and create a Kubernetes secret
TOKEN=$(aws ecr get-login-password --region us-east-1)
kubectl create secret docker-registry ecr-credentials \
  --docker-server=123456789012.dkr.ecr.us-east-1.amazonaws.com \
  --docker-username=AWS \
  --docker-password="$TOKEN" \
  -n flux-system
```

Reference the Secret in the ImageRepository.

```yaml
# imagerepository-ecr-static.yaml
# Scan an ECR image using a static credentials secret (token expires in 12h)
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app
  interval: 5m0s
  secretRef:
    name: ecr-credentials
```

## Step 5: Automate ECR Token Refresh with a CronJob

To keep static credentials fresh, create a CronJob that refreshes the ECR token.

```yaml
# ecr-token-refresh.yaml
# CronJob to refresh ECR token every 6 hours
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
          serviceAccountName: ecr-token-refresh
          containers:
            - name: ecr-login
              image: amazon/aws-cli:latest
              command:
                - /bin/sh
                - -c
                - |
                  # Get a new ECR token and update the Kubernetes secret
                  TOKEN=$(aws ecr get-login-password --region us-east-1)
                  kubectl delete secret ecr-credentials -n flux-system --ignore-not-found
                  kubectl create secret docker-registry ecr-credentials \
                    --docker-server=123456789012.dkr.ecr.us-east-1.amazonaws.com \
                    --docker-username=AWS \
                    --docker-password="$TOKEN" \
                    -n flux-system
          restartPolicy: OnFailure
```

## Step 6: Scan ECR Public Gallery Images

For images in the ECR Public Gallery, use the public endpoint.

```yaml
# imagerepository-ecr-public.yaml
# Scan a public ECR image
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: public-image
  namespace: flux-system
spec:
  image: public.ecr.aws/nginx/nginx
  interval: 10m0s
```

## Step 7: Verify the ECR ImageRepository

Check that the scan is working.

```bash
# Verify the ECR ImageRepository status
flux get image repository my-app -n flux-system

# Check for detailed errors
kubectl describe imagerepository my-app -n flux-system
```

## Troubleshooting

- **Token expired**: If using static credentials, ensure the CronJob is refreshing tokens. Prefer the `provider: aws` approach.
- **Access denied**: Verify the IAM policy grants the necessary ECR permissions and the IRSA annotation is correct.
- **Region mismatch**: Ensure the ECR endpoint region matches your configuration.

```bash
# Check image reflector controller logs for ECR errors
kubectl logs -n flux-system deployment/image-reflector-controller | grep -i "ecr\|aws\|unauthorized"
```

## Summary

You have configured Flux to scan AWS ECR for container image tags. Using the native `provider: aws` setting with IRSA is the most reliable approach, as it handles token refresh automatically. With the ImageRepository configured, you can now create ImagePolicy resources to select the appropriate image tag for your deployments.
