# How to Configure AWS ECR with Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, AWS, ECR, Container Registry

Description: Configure Amazon Elastic Container Registry (ECR) with Rancher clusters to securely pull and manage container images using AWS IAM authentication.

## Introduction

Amazon Elastic Container Registry (ECR) is AWS's managed container registry service. ECR authentication uses temporary tokens that expire every 12 hours, which requires a different approach than static registry credentials. This guide covers multiple methods for integrating ECR with Rancher clusters, from manual configuration to automated token refresh.

## Prerequisites

- Rancher cluster running on AWS (EKS, EC2, or on-premises with AWS access)
- AWS CLI configured with appropriate permissions
- IAM permissions to create ECR repositories and IAM roles
- kubectl access to your cluster

## Step 1: Create an ECR Repository

```bash
# Create an ECR repository

aws ecr create-repository \
  --repository-name my-app \
  --region us-east-1 \
  --image-scanning-configuration scanOnPush=true

# Get the repository URI
aws ecr describe-repositories \
  --repository-names my-app \
  --query 'repositories[0].repositoryUri' \
  --output text
```

## Step 2: Authenticate and Get ECR Token

```bash
# Get ECR login token (valid for 12 hours)
aws ecr get-login-password --region us-east-1 | \
  docker login \
  --username AWS \
  --password-stdin \
  123456789012.dkr.ecr.us-east-1.amazonaws.com

# Create a Kubernetes secret from the ECR token
kubectl create secret docker-registry ecr-credentials \
  --docker-server=123456789012.dkr.ecr.us-east-1.amazonaws.com \
  --docker-username=AWS \
  --docker-password=$(aws ecr get-login-password --region us-east-1) \
  --namespace=production
```

## Step 3: Automate ECR Token Refresh with a CronJob

If you're using `imagePullSecrets`, automate renewal with a CronJob. The job needs AWS credentials (for example, IRSA on EKS, an EC2 instance profile, or mounted AWS credentials):

```yaml
# ecr-token-refresh.yaml - Automated ECR token refresh
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ecr-token-refresher
  namespace: production
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: ecr-token-refresher
  namespace: production
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["create", "get", "patch", "update"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: ecr-token-refresher
  namespace: production
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: ecr-token-refresher
subjects:
  - kind: ServiceAccount
    name: ecr-token-refresher
    namespace: production
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: ecr-token-refresh
  namespace: production
spec:
  # Run every 10 hours (token expires in 12h)
  schedule: "0 */10 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: ecr-token-refresher
          restartPolicy: Never
          containers:
            - name: ecr-token-refresh
              image: public.ecr.aws/amazonlinux/amazonlinux:2023
              env:
                - name: AWS_REGION
                  value: us-east-1
                - name: ECR_REGISTRY
                  value: 123456789012.dkr.ecr.us-east-1.amazonaws.com
                - name: SECRET_NAME
                  value: ecr-credentials
                - name: NAMESPACE
                  value: production
                - name: KUBECTL_VERSION
                  value: v1.33.0
              command:
                - /bin/sh
                - -c
                - |
                  set -euo pipefail

                  dnf install -y awscli-2 >/dev/null

                  ARCH=$(uname -m)
                  case "$ARCH" in
                    x86_64) KUBECTL_ARCH=amd64 ;;
                    aarch64) KUBECTL_ARCH=arm64 ;;
                    *) echo "Unsupported architecture: $ARCH" >&2; exit 1 ;;
                  esac

                  # Install a kubectl version that is within one minor version of your cluster.
                  curl -fsSLo /usr/local/bin/kubectl \
                    "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/${KUBECTL_ARCH}/kubectl"
                  chmod +x /usr/local/bin/kubectl

                  # Get new ECR token
                  TOKEN=$(aws ecr get-login-password --region "$AWS_REGION")

                  # Create or update the secret
                  kubectl create secret docker-registry "$SECRET_NAME" \
                    --docker-server="$ECR_REGISTRY" \
                    --docker-username=AWS \
                    --docker-password="$TOKEN" \
                    --namespace="$NAMESPACE" \
                    --dry-run=client -o yaml | kubectl apply -f -
```

## Step 4: Use IRSA for the Token Refresh CronJob on EKS

On EKS, IRSA is a good fit for the token refresh CronJob because the pod needs AWS credentials to call the ECR API:

```bash
# Associate an IAM OIDC provider with the cluster once
eksctl utils associate-iam-oidc-provider \
  --cluster my-cluster \
  --region us-east-1 \
  --approve

# Create an IAM policy that allows fetching an ECR auth token
cat > ecr-token-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "ecr:GetAuthorizationToken",
      "Resource": "*"
    }
  ]
}
EOF

aws iam create-policy \
  --policy-name ECRTokenRefreshPolicy \
  --policy-document file://ecr-token-policy.json

# Create or update the ServiceAccount from Step 3 with an IAM role
eksctl create iamserviceaccount \
  --name ecr-token-refresher \
  --namespace production \
  --cluster my-cluster \
  --region us-east-1 \
  --attach-policy-arn arn:aws:iam::123456789012:policy/ECRTokenRefreshPolicy \
  --override-existing-serviceaccounts \
  --approve
```

## Step 5: Ensure the EKS Node IAM Role Can Pull from ECR

For normal workload image pulls on EKS, the worker node IAM role needs the ECR pull permissions. Rancher-managed EKS clusters use the same AWS node-role mechanism:

```bash
# Attach the AWS-managed ECR pull policy to the EKS node role
aws iam attach-role-policy \
  --role-name AmazonEKSNodeRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPullOnly

# Verify that the policy is attached
aws iam list-attached-role-policies \
  --role-name AmazonEKSNodeRole \
  --query 'AttachedPolicies[].PolicyArn' \
  --output text
```

## Step 6: Deploy a Workload Using ECR Image

```yaml
# app-deployment.yaml - Application using ECR image
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      # Keep imagePullSecrets when you are using the secret-based method.
      # On EKS with node IAM role ECR access, omit imagePullSecrets.
      imagePullSecrets:
        - name: ecr-credentials
      containers:
        - name: my-app
          # Full ECR image URI
          image: 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app:v1.0.0
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
```

## Step 7: ECR Lifecycle Policies

Manage ECR image lifecycle to control storage costs:

```bash
# Create lifecycle policy to keep only the last 10 version-tagged images
aws ecr put-lifecycle-policy \
  --repository-name my-app \
  --lifecycle-policy-text '{
    "rules": [
      {
        "rulePriority": 1,
        "description": "Keep last 10 version-tagged images",
        "selection": {
          "tagStatus": "tagged",
          "tagPrefixList": ["v"],
          "countType": "imageCountMoreThan",
          "countNumber": 10
        },
        "action": {"type": "expire"}
      }
    ]
  }'
```

## Troubleshooting

```bash
# Check which AWS identity your shell or pod is using
aws sts get-caller-identity

# Verify ECR authentication works
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789012.dkr.ecr.us-east-1.amazonaws.com

# Debug pod image pull failures
kubectl describe pod <pod-name> -n production | grep -A 10 Events
```

## Conclusion

Integrating AWS ECR with Rancher requires handling the short-lived authentication tokens that ECR uses. For EKS worker nodes, let the node IAM role pull from ECR directly and use IRSA only for helper workloads such as the token refresh CronJob. For other cluster types, implement the CronJob-based token refresh pattern to keep `imagePullSecrets` current. This approach provides secure, scalable container image management within your AWS infrastructure.
