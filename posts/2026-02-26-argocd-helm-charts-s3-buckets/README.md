# How to Pull Helm Charts from S3 Buckets with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Helm, AWS

Description: Configure ArgoCD to pull and deploy Helm charts stored in AWS S3 buckets using the helm-s3 plugin with proper authentication and repository setup.

---

Many organizations store their private Helm charts in Amazon S3 buckets instead of running a dedicated chart repository server. S3 is cheap, highly available, and integrates naturally with AWS IAM for access control. Getting ArgoCD to pull charts from S3 requires a bit of setup because ArgoCD does not natively understand S3 URLs. You need the helm-s3 plugin.

Let me walk through the complete configuration.

## Why S3 for Helm Charts

Traditional Helm chart repositories like ChartMuseum or Harbor require running and maintaining an additional service. S3 gives you:

- No additional infrastructure to manage
- Built-in versioning and lifecycle policies
- IAM-based access control
- High availability by default
- Cost-effective storage for chart archives

The tradeoff is slightly more complex ArgoCD configuration, but once set up, it works reliably.

## Step 1: Set Up S3 as a Helm Repository

First, make sure your S3 bucket is configured as a Helm chart repository. If you have not done this yet, use the `helm-s3` plugin.

```bash
# Install the helm-s3 plugin locally
helm plugin install https://github.com/hypnoglow/helm-s3.git

# Initialize the S3 bucket as a Helm repo
helm s3 init s3://my-helm-charts/stable

# Add the repo to your local Helm
helm repo add my-charts s3://my-helm-charts/stable

# Push a chart to the S3 repo
helm s3 push ./my-chart-0.1.0.tgz my-charts
```

## Step 2: Install helm-s3 Plugin in ArgoCD Repo Server

ArgoCD uses the repo-server to fetch and render Helm charts. The repo-server needs the helm-s3 plugin to understand S3 URLs.

### Method A: Custom Repo Server Image

Build a custom repo-server image with the plugin pre-installed.

```dockerfile
FROM quay.io/argoproj/argocd:v2.10.0

# Switch to root to install the plugin
USER root

# Install the helm-s3 plugin
RUN apt-get update && \
    apt-get install -y curl && \
    helm plugin install https://github.com/hypnoglow/helm-s3.git --version 0.16.0 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Switch back to the argocd user
USER argocd
```

Build and push this image, then update the repo-server deployment.

```yaml
# Patch the repo-server to use the custom image
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: argocd-repo-server
          image: myregistry.com/argocd-custom:v2.10.0
```

### Method B: Init Container Approach

If you prefer not to maintain a custom image, use an init container to install the plugin at startup.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      initContainers:
        - name: install-helm-s3
          image: alpine:3.19
          command:
            - /bin/sh
            - -c
            - |
              # Download and install helm-s3 plugin
              wget -qO- https://github.com/hypnoglow/helm-s3/releases/download/v0.16.0/helm-s3_0.16.0_linux_amd64.tar.gz | tar xz -C /custom-tools/
          volumeMounts:
            - name: custom-tools
              mountPath: /custom-tools
      containers:
        - name: argocd-repo-server
          volumeMounts:
            - name: custom-tools
              mountPath: /usr/local/bin/helm-s3
              subPath: helm-s3
          env:
            - name: HELM_PLUGINS
              value: /custom-tools/helm-plugins
      volumes:
        - name: custom-tools
          emptyDir: {}
```

## Step 3: Configure AWS Authentication

The repo-server needs AWS credentials to access the S3 bucket. There are several approaches.

### Option A: IAM Roles for Service Accounts (IRSA) - Recommended

This is the most secure approach on EKS. Create an IAM role and associate it with the ArgoCD repo-server service account.

```bash
# Create the IAM policy
cat > helm-s3-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-helm-charts",
        "arn:aws:s3:::my-helm-charts/*"
      ]
    }
  ]
}
EOF

# Create the IAM role with IRSA trust policy
eksctl create iamserviceaccount \
  --name argocd-repo-server \
  --namespace argocd \
  --cluster my-cluster \
  --attach-policy-arn arn:aws:iam::123456789012:policy/helm-s3-access \
  --override-existing-serviceaccounts \
  --approve
```

### Option B: AWS Credentials Secret

If IRSA is not available, provide credentials directly.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: argocd-repo-server
          env:
            - name: AWS_ACCESS_KEY_ID
              valueFrom:
                secretKeyRef:
                  name: aws-credentials
                  key: access-key-id
            - name: AWS_SECRET_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: aws-credentials
                  key: secret-access-key
            - name: AWS_DEFAULT_REGION
              value: us-east-1
```

Create the secret.

```bash
kubectl -n argocd create secret generic aws-credentials \
  --from-literal=access-key-id=AKIAIOSFODNN7EXAMPLE \
  --from-literal=secret-access-key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

### Option C: EC2 Instance Profile

If your EKS nodes have an instance profile with S3 access, the repo-server will automatically use it. No additional configuration is needed, but this gives all pods on the node the same S3 access, which is less secure.

## Step 4: Register the S3 Helm Repository in ArgoCD

Add the S3 repository to ArgoCD's repository list.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: helm-s3-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: helm
  name: my-charts
  url: s3://my-helm-charts/stable
  enableOCI: "false"
```

Or use the CLI.

```bash
argocd repo add s3://my-helm-charts/stable \
  --type helm \
  --name my-charts
```

## Step 5: Create an ArgoCD Application Using the S3 Chart

Now you can reference charts from S3 in your Application specs.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  source:
    repoURL: s3://my-helm-charts/stable
    chart: my-chart
    targetRevision: 0.1.0
    helm:
      values: |
        replicaCount: 3
        image:
          tag: latest
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Alternative: Use OCI Registry Instead of S3

Amazon ECR supports OCI artifacts, which means you can push Helm charts to ECR as OCI artifacts. This is becoming the preferred approach because ArgoCD supports OCI natively without plugins.

```bash
# Push a chart to ECR as OCI artifact
helm push my-chart-0.1.0.tgz oci://123456789012.dkr.ecr.us-east-1.amazonaws.com/helm-charts

# Use in ArgoCD
apiVersion: argoproj.io/v1alpha1
kind: Application
spec:
  source:
    repoURL: 123456789012.dkr.ecr.us-east-1.amazonaws.com/helm-charts
    chart: my-chart
    targetRevision: 0.1.0
```

This eliminates the need for the helm-s3 plugin entirely.

## Troubleshooting

**Plugin not found**: Check that the helm-s3 plugin is installed in the repo-server pod.

```bash
kubectl -n argocd exec deployment/argocd-repo-server -- helm plugin list
```

**Access denied**: Verify the AWS credentials or IRSA role have the correct S3 permissions.

```bash
# Test S3 access from the repo-server pod
kubectl -n argocd exec deployment/argocd-repo-server -- aws s3 ls s3://my-helm-charts/stable/
```

**Chart not found**: Make sure the chart was properly pushed to S3 and the index is up to date.

```bash
# Check the repo index
aws s3 cp s3://my-helm-charts/stable/index.yaml - | head -50
```

Using S3 for Helm chart storage with ArgoCD is a solid pattern for AWS-native teams. If you are starting fresh, consider the OCI registry approach with ECR instead, as it requires less custom configuration and is the direction the Helm ecosystem is moving.
