# How to Configure ArgoCD Image Updater with ECR

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, AWS ECR, Image Updater

Description: Learn how to configure ArgoCD Image Updater with Amazon ECR for automatic container image updates, including IAM authentication with IRSA, cross-account access, and update strategies.

---

Amazon Elastic Container Registry (ECR) is the default container registry for teams running on AWS. Configuring ArgoCD Image Updater with ECR requires special attention to authentication because ECR tokens expire every 12 hours. This guide covers the setup process, including the recommended IRSA-based authentication that eliminates manual token rotation.

## Understanding ECR Authentication

ECR does not use static credentials like Docker Hub. Instead, it provides temporary authentication tokens that expire after 12 hours. You generate these tokens using the AWS CLI:

```bash
# This token expires in 12 hours
aws ecr get-login-password --region us-east-1
```

For Image Updater, you need an authentication method that handles token refresh automatically. The best approach on EKS is IAM Roles for Service Accounts (IRSA).

## Setting Up IRSA Authentication

### Step 1: Create an IAM Policy

Create an IAM policy that grants read-only access to ECR:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetAuthorizationToken",
        "ecr:DescribeRepositories",
        "ecr:ListImages",
        "ecr:DescribeImages",
        "ecr:GetRepositoryPolicy"
      ],
      "Resource": "*"
    }
  ]
}
```

```bash
# Create the policy
aws iam create-policy \
  --policy-name ArgocdImageUpdaterECRReadOnly \
  --policy-document file://ecr-policy.json
```

### Step 2: Create the IAM Role with IRSA

```bash
# Get your OIDC provider
OIDC_PROVIDER=$(aws eks describe-cluster --name my-cluster --query "cluster.identity.oidc.issuer" --output text | sed 's|https://||')

# Create the trust policy
cat > trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789012:oidc-provider/$OIDC_PROVIDER"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "$OIDC_PROVIDER:sub": "system:serviceaccount:argocd:argocd-image-updater"
        }
      }
    }
  ]
}
EOF

# Create the IAM role
aws iam create-role \
  --role-name argocd-image-updater-ecr \
  --assume-role-policy-document file://trust-policy.json

# Attach the policy
aws iam attach-role-policy \
  --role-name argocd-image-updater-ecr \
  --policy-arn arn:aws:iam::123456789012:policy/ArgocdImageUpdaterECRReadOnly
```

### Step 3: Annotate the Service Account

```yaml
# argocd-image-updater-sa.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: argocd-image-updater
  namespace: argocd
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/argocd-image-updater-ecr
```

Apply the service account:

```bash
kubectl apply -f argocd-image-updater-sa.yaml
# Restart Image Updater to pick up the new role
kubectl rollout restart deployment argocd-image-updater -n argocd
```

## Configuring the ECR Registry

Add ECR to the Image Updater registry configuration:

```yaml
# argocd-image-updater-config ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-image-updater-config
  namespace: argocd
data:
  registries.conf: |
    registries:
      - name: ECR
        api_url: https://123456789012.dkr.ecr.us-east-1.amazonaws.com
        prefix: 123456789012.dkr.ecr.us-east-1.amazonaws.com
        credentials: ext:/scripts/ecr-login.sh
        credsexpire: 10h
```

### ECR Login Script

Create a script that generates ECR credentials using the IRSA token:

```bash
#!/bin/bash
# ecr-login.sh - Generate ECR credentials for Image Updater
aws ecr get-login-password --region us-east-1 | \
  awk '{print "AWS:" $0}'
```

Mount this script in the Image Updater deployment:

```yaml
# Patch the Image Updater deployment
spec:
  template:
    spec:
      containers:
        - name: argocd-image-updater
          volumeMounts:
            - name: ecr-scripts
              mountPath: /scripts
      volumes:
        - name: ecr-scripts
          configMap:
            name: ecr-login-script
            defaultMode: 0755
```

### Alternative: Using ECR Credential Helper

A simpler approach uses the ECR credential helper:

```yaml
# argocd-image-updater-config ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-image-updater-config
  namespace: argocd
data:
  registries.conf: |
    registries:
      - name: ECR
        api_url: https://123456789012.dkr.ecr.us-east-1.amazonaws.com
        prefix: 123456789012.dkr.ecr.us-east-1.amazonaws.com
        credentials: env:AWS_ECR_TOKEN
        credsexpire: 10h
```

## Configuring ArgoCD Applications for ECR

### Basic ECR Image Tracking

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
  namespace: argocd
  annotations:
    # Track an ECR image
    argocd-image-updater.argoproj.io/image-list: myapp=123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp
    argocd-image-updater.argoproj.io/myapp.update-strategy: semver
    argocd-image-updater.argoproj.io/myapp.semver-constraint: ">=1.0.0"
    # Write back to Git
    argocd-image-updater.argoproj.io/write-back-method: git
    argocd-image-updater.argoproj.io/git-branch: main
spec:
  project: default
  source:
    repoURL: https://github.com/my-org/k8s-manifests.git
    targetRevision: main
    path: apps/myapp
  destination:
    server: https://kubernetes.default.svc
    namespace: production
```

### With Helm Values

```yaml
annotations:
  argocd-image-updater.argoproj.io/image-list: myapp=123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp
  argocd-image-updater.argoproj.io/myapp.update-strategy: latest
  argocd-image-updater.argoproj.io/myapp.allow-tags: "regexp:^main-[a-f0-9]{7}$"
  argocd-image-updater.argoproj.io/write-back-method: git
  argocd-image-updater.argoproj.io/write-back-target: "helmvalues:values.yaml"
  argocd-image-updater.argoproj.io/myapp.helm.image-name: image.repository
  argocd-image-updater.argoproj.io/myapp.helm.image-tag: image.tag
```

## Cross-Account ECR Access

If your images are in a different AWS account, you need to configure cross-account access.

### On the Source Account (where images live)

Add a repository policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCrossAccountPull",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::TARGET_ACCOUNT_ID:role/argocd-image-updater-ecr"
      },
      "Action": [
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:BatchCheckLayerAvailability",
        "ecr:DescribeImages",
        "ecr:ListImages"
      ]
    }
  ]
}
```

```bash
aws ecr set-repository-policy \
  --repository-name myapp \
  --policy-text file://cross-account-policy.json
```

## Multi-Region ECR Setup

If you push images to multiple ECR regions, configure each region as a separate registry:

```yaml
data:
  registries.conf: |
    registries:
      - name: ECR US East
        api_url: https://123456789012.dkr.ecr.us-east-1.amazonaws.com
        prefix: 123456789012.dkr.ecr.us-east-1.amazonaws.com
        credentials: ext:/scripts/ecr-login-us-east-1.sh
        credsexpire: 10h
      - name: ECR EU West
        api_url: https://123456789012.dkr.ecr.eu-west-1.amazonaws.com
        prefix: 123456789012.dkr.ecr.eu-west-1.amazonaws.com
        credentials: ext:/scripts/ecr-login-eu-west-1.sh
        credsexpire: 10h
```

## Troubleshooting ECR Issues

**Authentication failures** - Check that the IRSA role is correctly configured:

```bash
# Verify the service account has the role annotation
kubectl get sa argocd-image-updater -n argocd -o yaml | grep eks.amazonaws.com

# Check Image Updater logs for auth errors
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-image-updater --tail=50
```

**Token expiration errors** - ECR tokens expire after 12 hours. Ensure `credsexpire` is set to less than 12 hours (10h recommended) so tokens are refreshed before expiry.

**Permission denied on cross-account** - Verify the repository policy on the source account includes the target account's IAM role ARN.

**No images found** - Check that the ECR repository name in the annotation matches the actual repository path. ECR uses `account-id.dkr.ecr.region.amazonaws.com/repo-name` format.

For monitoring your Image Updater operations, configure [ArgoCD notifications](https://oneuptime.com/blog/post/2026-01-25-notifications-argocd/view) to alert when image updates succeed or fail.

ECR with ArgoCD Image Updater provides a fully automated image deployment pipeline on AWS. The key is getting IRSA authentication right so token refresh happens automatically.
