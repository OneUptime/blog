# How to Use AWS ECR as OCI Registry for ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, AWS ECR, OCI

Description: Learn how to configure AWS ECR as an OCI registry for ArgoCD Helm chart deployments, including authentication, token refresh, IRSA setup, and cross-account access patterns.

---

AWS Elastic Container Registry (ECR) is a natural choice for storing Helm charts as OCI artifacts when your Kubernetes clusters run on AWS. However, ECR has a unique challenge: its authentication tokens expire after 12 hours. This means you cannot simply set credentials once and forget them. This guide covers every approach to making ECR work reliably with ArgoCD, from manual token refresh to fully automated solutions.

## ECR Setup for Helm Charts

First, create an ECR repository for your Helm charts. ECR stores each chart as a separate repository:

```bash
# Create a repository for your Helm chart
aws ecr create-repository \
  --repository-name charts/my-web-app \
  --region us-east-1 \
  --image-scanning-configuration scanOnPush=true

# Create repositories for each chart you plan to store
aws ecr create-repository --repository-name charts/nginx-config --region us-east-1
aws ecr create-repository --repository-name charts/monitoring-stack --region us-east-1
```

## Pushing Charts to ECR

```bash
# Get ECR login token and authenticate Helm
aws ecr get-login-password --region us-east-1 | \
  helm registry login --username AWS --password-stdin \
  123456789012.dkr.ecr.us-east-1.amazonaws.com

# Package your chart
helm package ./my-web-app
# Creates my-web-app-1.0.0.tgz

# Push to ECR
helm push my-web-app-1.0.0.tgz \
  oci://123456789012.dkr.ecr.us-east-1.amazonaws.com/charts

# Verify the push
helm show chart \
  oci://123456789012.dkr.ecr.us-east-1.amazonaws.com/charts/my-web-app \
  --version 1.0.0
```

## Method 1: Manual Token Refresh (Simple but Not Production-Ready)

For testing or development, you can manually register ECR credentials:

```bash
# Get a fresh ECR token
ECR_TOKEN=$(aws ecr get-login-password --region us-east-1)

# Register with ArgoCD
argocd repo add 123456789012.dkr.ecr.us-east-1.amazonaws.com/charts \
  --type helm \
  --enable-oci \
  --username AWS \
  --password "$ECR_TOKEN"
```

This works immediately but stops working after 12 hours when the token expires.

## Method 2: CronJob Token Refresher (Reliable)

Deploy a CronJob that periodically refreshes the ECR token in ArgoCD's secret store:

```yaml
# ecr-token-refresher.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ecr-token-refresher
  namespace: argocd
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: ecr-token-refresher
  namespace: argocd
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get", "create", "update", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: ecr-token-refresher
  namespace: argocd
subjects:
  - kind: ServiceAccount
    name: ecr-token-refresher
    namespace: argocd
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: ecr-token-refresher
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: ecr-token-refresher
  namespace: argocd
spec:
  # Run every 8 hours (well before 12-hour expiry)
  schedule: "0 */8 * * *"
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: ecr-token-refresher
          containers:
            - name: refresher
              image: amazon/aws-cli:2.15.0
              command:
                - /bin/bash
                - -c
                - |
                  set -euo pipefail

                  ACCOUNT_ID="123456789012"
                  REGION="us-east-1"
                  REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
                  SECRET_NAME="argocd-ecr-oci-creds"

                  echo "Getting ECR token..."
                  TOKEN=$(aws ecr get-login-password --region ${REGION})

                  echo "Updating ArgoCD secret..."
                  cat <<EOSECRET | kubectl apply -f -
                  apiVersion: v1
                  kind: Secret
                  metadata:
                    name: ${SECRET_NAME}
                    namespace: argocd
                    labels:
                      argocd.argoproj.io/secret-type: repository
                  type: Opaque
                  stringData:
                    type: helm
                    name: ecr-charts
                    url: "${REGISTRY}/charts"
                    enableOCI: "true"
                    username: AWS
                    password: "${TOKEN}"
                  EOSECRET

                  echo "ECR token refreshed successfully"
              env:
                - name: AWS_REGION
                  value: us-east-1
              resources:
                requests:
                  cpu: 50m
                  memory: 64Mi
                limits:
                  cpu: 100m
                  memory: 128Mi
          restartPolicy: OnFailure
```

If running on EKS, add IRSA annotations to the ServiceAccount:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ecr-token-refresher
  namespace: argocd
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/ecr-token-refresher-role
```

IAM policy for the role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage"
      ],
      "Resource": "arn:aws:ecr:us-east-1:123456789012:repository/charts/*"
    }
  ]
}
```

Deploy the CronJob:

```bash
kubectl apply -f ecr-token-refresher.yaml

# Run the job immediately to populate the initial token
kubectl create job --from=cronjob/ecr-token-refresher ecr-initial-token -n argocd

# Verify the secret was created
kubectl get secret argocd-ecr-oci-creds -n argocd
```

## Method 3: IRSA on ArgoCD Repo Server (Best for EKS)

The most elegant solution on EKS is to use IRSA directly on the ArgoCD repo server. This eliminates the need for a token refresher entirely because the SDK handles token management automatically.

However, this requires a custom repo server image or a sidecar that handles ECR authentication. The standard ArgoCD repo server does not natively support IRSA-based ECR authentication for Helm OCI - it relies on stored credentials.

A practical approach is to use the CronJob method (Method 2) with IRSA on the CronJob's ServiceAccount.

## Method 4: External Secrets Operator

If you already use External Secrets Operator, you can integrate it with ECR token management:

```yaml
# ECR token as an external secret
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: ecr-oci-creds
  namespace: argocd
spec:
  refreshInterval: 6h  # Refresh every 6 hours
  secretStoreRef:
    name: aws-secrets
    kind: ClusterSecretStore
  target:
    name: argocd-ecr-oci-creds
    template:
      metadata:
        labels:
          argocd.argoproj.io/secret-type: repository
      data:
        type: helm
        name: ecr-charts
        url: 123456789012.dkr.ecr.us-east-1.amazonaws.com/charts
        enableOCI: "true"
        username: AWS
        password: "{{ .ecrToken }}"
  data:
    - secretKey: ecrToken
      remoteRef:
        key: ecr-auth-token  # Stored in AWS Secrets Manager
```

## Creating the ArgoCD Application

Once authentication is configured, create your application:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-web-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: 123456789012.dkr.ecr.us-east-1.amazonaws.com/charts
    chart: my-web-app
    targetRevision: 1.0.0
    helm:
      releaseName: my-web-app
      valuesObject:
        replicaCount: 3
        image:
          repository: 123456789012.dkr.ecr.us-east-1.amazonaws.com/images/my-web-app
          tag: v2.1.0
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 1000m
            memory: 512Mi
  destination:
    server: https://kubernetes.default.svc
    namespace: my-web-app
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

## Cross-Account ECR Access

If your charts are in a different AWS account:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCrossAccountPull",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::987654321098:root"
      },
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage"
      ]
    }
  ]
}
```

Apply this policy to the source account's ECR repository:

```bash
aws ecr set-repository-policy \
  --repository-name charts/my-web-app \
  --region us-east-1 \
  --policy-text file://ecr-policy.json
```

The consuming account's ArgoCD still needs `ecr:GetAuthorizationToken` on its own account.

## Multi-Region ECR

For disaster recovery, replicate charts across regions:

```bash
# Create replication configuration
aws ecr put-replication-configuration \
  --replication-configuration '{
    "rules": [{
      "destinations": [{
        "region": "us-west-2",
        "registryId": "123456789012"
      }]
    }]
  }'
```

Then configure ArgoCD to use the regional endpoint closest to the cluster:

```yaml
# US-East cluster
source:
  repoURL: 123456789012.dkr.ecr.us-east-1.amazonaws.com/charts

# US-West cluster
source:
  repoURL: 123456789012.dkr.ecr.us-west-2.amazonaws.com/charts
```

## CI/CD Pipeline for ECR Chart Publishing

```yaml
# .github/workflows/ecr-chart.yaml
name: Publish Chart to ECR
on:
  push:
    tags: ['v*']
jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-actions-ecr
          aws-region: us-east-1
      - name: Login to ECR
        run: |
          aws ecr get-login-password --region us-east-1 | \
          helm registry login --username AWS --password-stdin \
          123456789012.dkr.ecr.us-east-1.amazonaws.com
      - name: Push chart
        run: |
          VERSION=${GITHUB_REF#refs/tags/v}
          helm package charts/my-web-app --version $VERSION
          helm push my-web-app-${VERSION}.tgz \
            oci://123456789012.dkr.ecr.us-east-1.amazonaws.com/charts
```

## Troubleshooting ECR with ArgoCD

```bash
# Verify ECR credentials are current
aws ecr get-login-password --region us-east-1 | head -c 20
echo "..."

# Check the ArgoCD secret is up to date
kubectl get secret argocd-ecr-oci-creds -n argocd -o jsonpath='{.data.password}' | \
  base64 -d | head -c 20

# Test chart pull manually
helm pull oci://123456789012.dkr.ecr.us-east-1.amazonaws.com/charts/my-web-app \
  --version 1.0.0

# Check repo server logs
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-repo-server \
  --tail=50 | grep -i "ecr\|401\|token"
```

For more on OCI registries with ArgoCD, see [authenticating with OCI registries](https://oneuptime.com/blog/post/2026-02-26-argocd-authenticate-oci-registries/view) and [OCI artifacts as application sources](https://oneuptime.com/blog/post/2026-02-26-argocd-oci-artifacts-application-sources/view).
