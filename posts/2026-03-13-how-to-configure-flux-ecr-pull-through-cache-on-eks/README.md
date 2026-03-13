# How to Configure Flux ECR Pull-Through Cache on EKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, AWS, EKS, ECR, Pull-Through Cache, Container Registry

Description: Learn how to configure Amazon ECR pull-through cache with Flux on EKS to reduce external registry dependencies and improve image pull performance.

---

Amazon ECR pull-through cache rules allow your EKS cluster to pull container images from public registries through ECR, caching them locally in your AWS account. This reduces external dependencies, improves pull latency, and avoids rate limits from upstream registries like Docker Hub and GitHub Container Registry. This guide covers setting up ECR pull-through cache and configuring Flux on EKS to use cached images.

## Prerequisites

- An existing EKS cluster (version 1.25 or later)
- Flux CLI installed and bootstrapped on your cluster
- AWS CLI configured with appropriate permissions
- kubectl configured to access your EKS cluster

## Why Use ECR Pull-Through Cache

Pull-through cache provides several benefits:

- **Reduced latency**: Images are pulled from ECR within your AWS region instead of public internet
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

## Step 2: Configure IAM Permissions for ECR Access

Ensure your EKS node role has permissions to pull from ECR. Add the following policy:

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

## Step 3: Configure Flux to Use Cached Helm Chart Sources

Update your Flux HelmRepository sources to pull through ECR cache. For OCI-based Helm repositories, point them to the ECR cache URL.

```yaml
# clusters/my-cluster/sources/helmrepository-cached.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: prometheus-community-cached
  namespace: flux-system
spec:
  type: oci
  interval: 24h
  url: oci://<account-id>.dkr.ecr.us-west-2.amazonaws.com/docker-hub/prometheuscommunity
  provider: aws
```

The `provider: aws` field tells Flux to use the AWS ECR credential helper for authentication.

## Step 4: Configure ECR Authentication for Flux

Flux needs ECR credentials to pull from the cache. Set up an ECR credential provider using the AWS provider.

For OCI sources, Flux can use the built-in AWS provider. For standard container images, create a CronJob to refresh ECR credentials:

```yaml
# clusters/my-cluster/ecr-auth/serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ecr-credentials-sync
  namespace: flux-system
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::<account-id>:role/FluxECRAccess
```

```yaml
# clusters/my-cluster/ecr-auth/cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: ecr-credentials-sync
  namespace: flux-system
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
                    --namespace=flux-system \
                    --dry-run=client -o yaml | kubectl apply -f -
```

## Step 5: Update Flux Image References

Update your Flux-managed workloads to use the ECR pull-through cache URLs. The pattern is:

```yaml
Original: docker.io/library/nginx:1.25
Cached:   <account-id>.dkr.ecr.us-west-2.amazonaws.com/docker-hub/library/nginx:1.25

Original: ghcr.io/fluxcd/flux2:latest
Cached:   <account-id>.dkr.ecr.us-west-2.amazonaws.com/ghcr/fluxcd/flux2:latest
```

Example deployment using cached images:

```yaml
# clusters/my-cluster/apps/nginx.yaml
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

## Step 6: Configure Flux Image Automation with ECR Cache

If you use Flux Image Automation, configure it to scan the cached ECR repository:

```yaml
# clusters/my-cluster/image-automation/image-repository.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: nginx-cached
  namespace: flux-system
spec:
  image: <account-id>.dkr.ecr.us-west-2.amazonaws.com/docker-hub/library/nginx
  interval: 10m
  provider: aws
```

```yaml
# clusters/my-cluster/image-automation/image-policy.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: nginx-cached
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: nginx-cached
  policy:
    semver:
      range: "1.25.x"
```

## Step 7: Set Up ECR Lifecycle Policies

Manage the size and cost of your cache by creating lifecycle policies for cached repositories:

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

## Step 8: Commit and Push

Push all configurations to Git:

```bash
git add -A
git commit -m "Configure Flux ECR pull-through cache"
git push origin main
```

## Step 9: Verify the Cache Is Working

Test that images are being pulled through the cache:

```bash
# Pull an image to trigger caching
docker pull <account-id>.dkr.ecr.us-west-2.amazonaws.com/docker-hub/library/nginx:1.25

# Verify the repository was created in ECR
aws ecr describe-repositories --query "repositories[?starts_with(repositoryName, 'docker-hub')].repositoryName" --output table

# Check image details
aws ecr describe-images \
  --repository-name docker-hub/library/nginx \
  --query "imageDetails[].{Tags:imageTags,Pushed:imagePushedAt,Size:imageSizeInBytes}" \
  --output table
```

## Troubleshooting

If images are not pulling through the cache:

```bash
# Check pull-through cache rules
aws ecr describe-pull-through-cache-rules

# Verify IAM permissions
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-west-2.amazonaws.com

# Check Flux source reconciliation
flux get sources helm -A
flux get sources oci -A

# View Flux controller logs
kubectl logs -n flux-system deployment/source-controller --tail=50
```

Common issues include missing IAM permissions for `ecr:BatchImportUpstreamImage` and `ecr:CreateRepository`, incorrect cache rule prefixes, or expired ECR authentication tokens.

## Conclusion

Configuring ECR pull-through cache with Flux on EKS provides a reliable, performant, and cost-effective image delivery pipeline. Public registry images are automatically cached in your private ECR registry, eliminating rate limit concerns and external dependencies. Flux's native AWS provider support makes authentication seamless, and the entire configuration is managed declaratively through Git. This setup is particularly valuable for production clusters where registry availability and pull latency directly impact deployment reliability.
