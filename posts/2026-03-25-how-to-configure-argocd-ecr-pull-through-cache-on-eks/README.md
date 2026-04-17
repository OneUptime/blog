# How to Configure ArgoCD ECR Pull-Through Cache on EKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, Kubernetes, GitOps, AWS, EKS, ECR, Pull-Through Cache, Container Registry, GHCR

Description: Learn how to configure Amazon ECR pull-through cache with ArgoCD on EKS, including private GHCR access with a GitHub PAT and ECR repository auto-creation.

---

Amazon ECR pull-through cache rules let your EKS cluster pull container images from external registries through ECR, caching them in your AWS account. This reduces external dependencies, improves pull latency, and avoids rate limits from upstream registries like Docker Hub and GitHub Container Registry. This guide covers setting up ECR pull-through cache with ArgoCD on EKS, including configuring access to private GitHub Container Registry (GHCR) images and enabling ECR repository auto-creation.

## Prerequisites

- An existing EKS cluster (version 1.25 or later)
- ArgoCD installed on your cluster
- AWS CLI configured with appropriate permissions
- kubectl configured to access your EKS cluster
- A GitHub account (for private GHCR access)

## Why Use ECR Pull-Through Cache

Pull-through cache provides several benefits:

- **Reduced latency**: Images are pulled from ECR within your AWS region instead of the public internet
- **Rate limit avoidance**: Docker Hub rate limits (100-200 pulls per 6 hours) do not apply to cached images
- **Increased availability**: Cached images remain available even if the upstream registry has an outage
- **Cost reduction**: Data transfer within the same region is free
- **Security scanning**: ECR can automatically scan cached images for vulnerabilities

## Step 1: Create ECR Pull-Through Cache Rules

Set up cache rules for the registries your cluster uses.

```bash
# Cache Docker Hub (docker.io)
aws ecr create-pull-through-cache-rule \
  --ecr-repository-prefix docker-hub \
  --upstream-registry-url registry-1.docker.io \
  --region us-west-2

# Cache GitHub Container Registry (ghcr.io)
aws ecr create-pull-through-cache-rule \
  --ecr-repository-prefix ghcr \
  --upstream-registry-url ghcr.io \
  --region us-west-2

# Cache Kubernetes registry (registry.k8s.io)
aws ecr create-pull-through-cache-rule \
  --ecr-repository-prefix k8s \
  --upstream-registry-url registry.k8s.io \
  --region us-west-2

# Cache Quay.io
aws ecr create-pull-through-cache-rule \
  --ecr-repository-prefix quay \
  --upstream-registry-url quay.io \
  --region us-west-2

# Cache public ECR (public.ecr.aws)
aws ecr create-pull-through-cache-rule \
  --ecr-repository-prefix ecr-public \
  --upstream-registry-url public.ecr.aws \
  --region us-west-2
```

Verify the rules:

```bash
aws ecr describe-pull-through-cache-rules --region us-west-2
```

## Step 2: Configure Access to Private GHCR Images

Pulling images from private GitHub Container Registry repositories through ECR requires a GitHub Personal Access Token (PAT). ECR uses this token to authenticate against GHCR on your behalf.

### Create a GitHub PAT

1. Go to **GitHub > Settings > Developer settings > Personal access tokens > Tokens (classic)**
2. Click **Generate new token (classic)**
3. Give it a descriptive name like `ecr-pull-through-ghcr`
4. Select the `read:packages` scope (this grants read access to private container images)
5. Set an appropriate expiration
6. Click **Generate token** and copy the value

### Store the PAT in AWS Secrets Manager

ECR pull-through cache rules reference credentials stored in AWS Secrets Manager:

```bash
aws secretsmanager create-secret \
  --name ecr-pullthroughcache/ghcr \
  --description "GitHub PAT for ECR pull-through cache to GHCR" \
  --secret-string '{"username":"YOUR_GITHUB_USERNAME","accessToken":"YOUR_GITHUB_PAT"}' \
  --region us-west-2
```

### Update the GHCR Cache Rule with Credentials

Delete and recreate the GHCR pull-through cache rule with the credential reference:

```bash
# Remove the unauthenticated rule if it exists
aws ecr delete-pull-through-cache-rule \
  --ecr-repository-prefix ghcr \
  --region us-west-2

# Recreate with credentials
aws ecr create-pull-through-cache-rule \
  --ecr-repository-prefix ghcr \
  --upstream-registry-url ghcr.io \
  --credential-arn arn:aws:secretsmanager:us-west-2:<account-id>:secret:ecr-pullthroughcache/ghcr-XXXXXX \
  --region us-west-2
```

Replace `<account-id>` with your AWS account ID and the secret ARN suffix with the actual value from Secrets Manager.

## Step 3: Configure ECR Repository Auto-Creation

By default, ECR does not automatically create repositories when a pull-through cache request comes in for a new image. You must enable the repository creation template so that cached repositories are created on demand with the right settings.

### Create a Repository Creation Template

```bash
aws ecr create-repository-creation-template \
  --prefix "docker-hub" \
  --applied-for "PULL_THROUGH_CACHE" \
  --image-tag-mutability IMMUTABLE \
  --encryption-configuration encryptionType=AES256 \
  --resource-tags '[{"Key":"ManagedBy","Value":"ecr-pull-through-cache"}]' \
  --lifecycle-policy "$(cat <<'EOF'
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Remove untagged images older than 7 days",
      "selection": {
        "tagStatus": "untagged",
        "countType": "sinceImagePushed",
        "countUnit": "days",
        "countNumber": 7
      },
      "action": { "type": "expire" }
    },
    {
      "rulePriority": 2,
      "description": "Keep only last 50 tagged images",
      "selection": {
        "tagStatus": "tagged",
        "tagPatternList": ["*"],
        "countType": "imageCountMoreThan",
        "countNumber": 50
      },
      "action": { "type": "expire" }
    }
  ]
}
EOF
)" \
  --region us-west-2
```

Repeat for other prefixes (`ghcr`, `k8s`, `quay`, `ecr-public`) or use the special `ROOT` prefix to apply to all repositories that do not match a more specific template:

```bash
aws ecr create-repository-creation-template \
  --prefix "ROOT" \
  --applied-for "PULL_THROUGH_CACHE" \
  --image-tag-mutability IMMUTABLE \
  --encryption-configuration encryptionType=AES256 \
  --resource-tags '[{"Key":"ManagedBy","Value":"ecr-pull-through-cache"}]' \
  --region us-west-2
```

The `ROOT` prefix applies the template to all pull-through cache repositories in your registry that do not match a more specific prefix template.

## Step 4: Configure IAM Permissions for ECR Access

Ensure your EKS node role has permissions to pull from ECR and trigger pull-through cache operations:

```bash
cat <<EOF > ecr-cache-policy.json
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
        "ecr:CreateRepository",
        "ecr:BatchImportUpstreamImage"
      ],
      "Resource": "*"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name my-eks-node-role \
  --policy-name ECRPullThroughCacheAccess \
  --policy-document file://ecr-cache-policy.json
```

## Step 5: Configure ECR Authentication for ArgoCD

ArgoCD needs ECR credentials to pull Helm charts and images from the cache. Since ECR tokens expire every 12 hours, you need an automated refresh mechanism.

### Create a CronJob to Refresh ECR Credentials

```yaml
# argocd-ecr-auth/serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ecr-credentials-sync
  namespace: argocd
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::<account-id>:role/ArgoCDECRAccess
```

```yaml
# argocd-ecr-auth/cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: ecr-credentials-sync
  namespace: argocd
spec:
  schedule: "0 */6 * * *"
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
              command:
                - /bin/sh
                - -c
                - |
                  TOKEN=$(aws ecr get-login-password --region us-west-2)
                  kubectl create secret docker-registry ecr-credentials \
                    --docker-server=<account-id>.dkr.ecr.us-west-2.amazonaws.com \
                    --docker-username=AWS \
                    --docker-password="${TOKEN}" \
                    --namespace=argocd \
                    --dry-run=client -o yaml | kubectl apply -f -
```

### Register ECR as a Helm Repository in ArgoCD

Add the ECR pull-through cache as a Helm repository in ArgoCD. You can do this declaratively using a Secret:

```yaml
# argocd-ecr-auth/helm-repo-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: ecr-helm-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: helm
  name: ecr-cache
  url: <account-id>.dkr.ecr.us-west-2.amazonaws.com
  enableOCI: "true"
  username: AWS
  password: "" # Updated by the CronJob
```

Alternatively, use the ArgoCD CLI:

```bash
ECR_TOKEN=$(aws ecr get-login-password --region us-west-2)

argocd repo add <account-id>.dkr.ecr.us-west-2.amazonaws.com \
  --type helm \
  --name ecr-cache \
  --enable-oci \
  --username AWS \
  --password "${ECR_TOKEN}"
```

## Step 6: Update ArgoCD Applications to Use Cached Images

Update your ArgoCD Application manifests to reference images through the ECR pull-through cache. The URL pattern is:

```text
Original: docker.io/library/nginx:1.25
Cached:   <account-id>.dkr.ecr.us-west-2.amazonaws.com/docker-hub/library/nginx:1.25

Original: ghcr.io/argoproj/argocd:v2.10.0
Cached:   <account-id>.dkr.ecr.us-west-2.amazonaws.com/ghcr/argoproj/argocd:v2.10.0

Original: ghcr.io/my-org/my-private-app:latest
Cached:   <account-id>.dkr.ecr.us-west-2.amazonaws.com/ghcr/my-org/my-private-app:latest
```

### Example: ArgoCD Application with Cached Helm Chart

```yaml
# apps/prometheus.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: prometheus
  namespace: argocd
spec:
  project: default
  source:
    chart: prometheus
    repoURL: <account-id>.dkr.ecr.us-west-2.amazonaws.com/docker-hub/prometheuscommunity
    targetRevision: 25.11.0
    helm:
      values: |
        server:
          image:
            repository: <account-id>.dkr.ecr.us-west-2.amazonaws.com/quay/prometheus/prometheus
  destination:
    server: https://kubernetes.default.svc
    namespace: monitoring
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

### Example: ArgoCD Application with Cached Container Image

```yaml
# apps/nginx.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: nginx
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/my-org/k8s-manifests.git
    targetRevision: HEAD
    path: apps/nginx
  destination:
    server: https://kubernetes.default.svc
    namespace: default
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

With the corresponding deployment manifest in your Git repo:

```yaml
# k8s-manifests/apps/nginx/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
        - name: nginx
          image: <account-id>.dkr.ecr.us-west-2.amazonaws.com/docker-hub/library/nginx:1.25
          ports:
            - containerPort: 80
```

## Step 7: Use ArgoCD Image Updater with ECR Cache

ArgoCD Image Updater can automatically update container image tags in your deployments. Configure it to scan ECR pull-through cache repositories:

```yaml
# apps/nginx-with-image-updater.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: nginx
  namespace: argocd
  annotations:
    argocd-image-updater.argoproj.io/image-list: nginx=<account-id>.dkr.ecr.us-west-2.amazonaws.com/docker-hub/library/nginx:1.25.x
    argocd-image-updater.argoproj.io/nginx.update-strategy: semver
    argocd-image-updater.argoproj.io/nginx.pull-secret: ext:/scripts/ecr-login.sh
spec:
  project: default
  source:
    repoURL: https://github.com/my-org/k8s-manifests.git
    targetRevision: HEAD
    path: apps/nginx
  destination:
    server: https://kubernetes.default.svc
    namespace: default
```

Create the ECR login script for the Image Updater:

```bash
#!/bin/sh
# /scripts/ecr-login.sh
echo "AWS:$(aws ecr get-login-password --region us-west-2)"
```

## Step 8: Set Up ECR Lifecycle Policies

If you did not configure lifecycle policies in the repository creation template (Step 3), you can apply them manually to manage cache size and cost:

```bash
cat <<EOF > lifecycle-policy.json
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Remove untagged images older than 7 days",
      "selection": {
        "tagStatus": "untagged",
        "countType": "sinceImagePushed",
        "countUnit": "days",
        "countNumber": 7
      },
      "action": {
        "type": "expire"
      }
    },
    {
      "rulePriority": 2,
      "description": "Keep only last 50 tagged images",
      "selection": {
        "tagStatus": "tagged",
        "tagPatternList": ["*"],
        "countType": "imageCountMoreThan",
        "countNumber": 50
      },
      "action": {
        "type": "expire"
      }
    }
  ]
}
EOF

aws ecr put-lifecycle-policy \
  --repository-name "docker-hub/library/nginx" \
  --lifecycle-policy-text file://lifecycle-policy.json \
  --region us-west-2
```

## Step 9: Commit and Sync

Push all configurations to Git and let ArgoCD sync:

```bash
git add -A
git commit -m "Configure ArgoCD ECR pull-through cache"
git push origin main
```

ArgoCD will automatically detect the changes and sync the new configurations to your cluster.

## Step 10: Verify the Cache Is Working

Test that images are being pulled through the cache:

```bash
# Pull an image to trigger caching
docker pull <account-id>.dkr.ecr.us-west-2.amazonaws.com/docker-hub/library/nginx:1.25

# Verify the repository was created in ECR
aws ecr describe-repositories \
  --query "repositories[?starts_with(repositoryName, 'docker-hub')].repositoryName" \
  --output table

# Check image details
aws ecr describe-images \
  --repository-name docker-hub/library/nginx \
  --query "imageDetails[].{Tags:imageTags,Pushed:imagePushedAt,Size:imageSizeInBytes}" \
  --output table

# Verify ArgoCD can see the cached Helm repo
argocd repo list

# Check ArgoCD application sync status
argocd app list
argocd app get prometheus
```

## Troubleshooting

If images are not pulling through the cache:

```bash
# Check pull-through cache rules
aws ecr describe-pull-through-cache-rules

# Verify IAM permissions
aws ecr get-login-password --region us-west-2 | \
  docker login --username AWS --password-stdin \
  <account-id>.dkr.ecr.us-west-2.amazonaws.com

# Check ArgoCD application status
argocd app get <app-name>

# View ArgoCD controller logs
kubectl logs -n argocd deployment/argocd-repo-server --tail=50

# Check if ECR credentials secret is up to date
kubectl get secret ecr-credentials -n argocd -o jsonpath='{.metadata.creationTimestamp}'

# Verify the GHCR PAT is valid (for private images)
echo $GITHUB_PAT | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

Common issues include:

- **Missing IAM permissions**: Ensure the node role has `ecr:BatchImportUpstreamImage` and `ecr:CreateRepository` permissions
- **Expired ECR tokens**: The CronJob must run frequently enough to keep credentials fresh (every 6 hours)
- **Invalid GHCR PAT**: The PAT must have the `read:packages` scope and not be expired
- **Repository creation template missing**: Without a template, ECR will not auto-create repositories for new cached images
- **Incorrect cache rule prefixes**: Double-check that the prefix in your image URLs matches the pull-through cache rule prefix

## Conclusion

Configuring ECR pull-through cache with ArgoCD on EKS gives you a reliable and performant image delivery pipeline. Public and private registry images are cached in your ECR registry, eliminating rate limit concerns and external dependencies. By configuring a GitHub PAT for GHCR access and enabling ECR repository auto-creation templates, you ensure that both public and private images flow seamlessly through the cache. ArgoCD's declarative GitOps model means all of this configuration lives in version control, making it auditable and reproducible across clusters.
