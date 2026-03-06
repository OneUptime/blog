# How to Fix Flux CD Rate Limiting from Container Registries

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Rate Limiting, Docker Hub, ECR, Container Registry, GitOps, Kubernetes, Troubleshooting

Description: A practical guide to diagnosing and mitigating container registry rate limiting issues in Flux CD, covering Docker Hub limits, ECR throttling, and pull-through cache strategies.

---

Flux CD's image reflector controller continuously scans container registries for new tags. This can quickly exhaust rate limits, especially with Docker Hub's strict anonymous and free-tier limits. When rate limits hit, image automation stops working and deployments stall. This guide covers how to diagnose, fix, and prevent rate limiting issues.

## Understanding Registry Rate Limits

Different registries have different rate limit policies:

- **Docker Hub (anonymous)**: 100 pulls per 6 hours per IP
- **Docker Hub (authenticated free)**: 200 pulls per 6 hours per account
- **Docker Hub (Pro/Team)**: 5000 pulls per day
- **Amazon ECR**: 1000 pulls per second per region (but token refresh limits apply)
- **GitHub Container Registry**: 5000 requests per hour (authenticated)
- **Google Container Registry/Artifact Registry**: No hard limit but quota-based throttling
- **Azure Container Registry**: Varies by tier (Basic: 1000 reads/min, Standard: 10000)

## Step 1: Identify Rate Limiting Errors

```bash
# Check image repository scan status
kubectl get imagerepositories -A

# Look for rate limit errors
kubectl describe imagerepository my-app -n flux-system

# Check image-reflector-controller logs
kubectl logs -n flux-system deployment/image-reflector-controller | grep -i "rate\|limit\|429\|too many"
```

Common rate limit error messages:

```yaml
429 Too Many Requests
toomanyrequests: You have reached your pull rate limit
TOOMANYREQUESTS: Rate exceeded
error getting image metadata: rate limit exceeded
```

## Step 2: Authenticate with Docker Hub

The single biggest improvement is authenticating with Docker Hub, which doubles your rate limit at minimum.

```bash
# Create a Docker Hub authentication secret
kubectl create secret docker-registry dockerhub-creds \
  --namespace=flux-system \
  --docker-server=https://index.docker.io/v1/ \
  --docker-username=your-dockerhub-username \
  --docker-password=your-dockerhub-token
```

Reference the secret in your ImageRepository:

```yaml
# ImageRepository with Docker Hub authentication
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: docker.io/myorg/my-app
  interval: 10m
  # Authenticate to get higher rate limits
  secretRef:
    name: dockerhub-creds
```

## Step 3: Increase Scan Intervals

Reduce the frequency of registry scans to stay within rate limits.

```yaml
# Before: scanning every 1 minute (aggressive)
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: docker.io/myorg/my-app
  # Too frequent - will exhaust rate limits quickly
  interval: 1m
---
# After: scanning every 30 minutes (conservative)
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: docker.io/myorg/my-app
  # More reasonable interval
  interval: 30m
  secretRef:
    name: dockerhub-creds
```

### Calculate Your Rate Budget

```bash
# Docker Hub free tier: 200 pulls per 6 hours = ~33 per hour
# If you scan 10 image repositories:
# 33 / 10 = ~3 scans per hour per repo = 20-minute intervals minimum

# Formula: interval >= (number_of_repos * 6 hours) / rate_limit
# Example: 10 repos with 200 limit
# interval >= (10 * 360 min) / 200 = 18 minutes
```

## Step 4: Use Exclusion Lists to Reduce Tag Scanning

Limit which tags are scanned to reduce API calls.

```yaml
# ImageRepository with tag filtering
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: docker.io/myorg/my-app
  interval: 15m
  secretRef:
    name: dockerhub-creds
  # Only scan tags matching this regex pattern
  exclusionList:
    # Exclude development and test tags
    - "^dev-"
    - "^test-"
    - "^pr-"
    # Exclude very old versions
    - "^0\\."
    # Exclude latest tag
    - "^latest$"
```

## Step 5: Set Up a Pull-Through Cache

A pull-through cache proxy sits between Flux and the registry, caching images locally and dramatically reducing upstream requests.

### Option A: Docker Registry Pull-Through Cache

```yaml
# Deploy a pull-through cache in your cluster
apiVersion: apps/v1
kind: Deployment
metadata:
  name: registry-cache
  namespace: registry-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: registry-cache
  template:
    metadata:
      labels:
        app: registry-cache
    spec:
      containers:
        - name: registry
          image: registry:2
          ports:
            - containerPort: 5000
          env:
            # Configure as a pull-through cache for Docker Hub
            - name: REGISTRY_PROXY_REMOTEURL
              value: "https://registry-1.docker.io"
            - name: REGISTRY_PROXY_USERNAME
              value: "your-dockerhub-username"
            - name: REGISTRY_PROXY_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: dockerhub-creds
                  key: password
          volumeMounts:
            - name: cache-storage
              mountPath: /var/lib/registry
      volumes:
        - name: cache-storage
          persistentVolumeClaim:
            claimName: registry-cache-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: registry-cache
  namespace: registry-system
spec:
  selector:
    app: registry-cache
  ports:
    - port: 5000
      targetPort: 5000
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: registry-cache-pvc
  namespace: registry-system
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      # Allocate enough storage for your cached images
      storage: 50Gi
```

### Option B: AWS ECR Pull-Through Cache

```bash
# Create an ECR pull-through cache rule
aws ecr create-pull-through-cache-rule \
  --ecr-repository-prefix docker-hub \
  --upstream-registry-url registry-1.docker.io \
  --credential-arn arn:aws:secretsmanager:us-east-1:123456789:secret:dockerhub-creds

# Your images are now available at:
# 123456789.dkr.ecr.us-east-1.amazonaws.com/docker-hub/library/nginx
```

Configure Flux to use the ECR cache:

```yaml
# ImageRepository pointing to ECR pull-through cache
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: nginx
  namespace: flux-system
spec:
  # Use ECR pull-through cache URL instead of Docker Hub
  image: 123456789.dkr.ecr.us-east-1.amazonaws.com/docker-hub/library/nginx
  interval: 10m
  provider: aws
```

## Step 6: Configure ECR Token Refresh

ECR tokens expire every 12 hours. Flux needs fresh tokens to avoid authentication failures that look like rate limiting.

```yaml
# ImageRepository with AWS provider for automatic token refresh
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-ecr-app
  namespace: flux-system
spec:
  image: 123456789.dkr.ecr.us-east-1.amazonaws.com/my-app
  interval: 10m
  # Use the AWS provider for automatic ECR token management
  provider: aws
```

Ensure the image-reflector-controller has AWS credentials:

```yaml
# Service account with IRSA (IAM Roles for Service Accounts)
apiVersion: v1
kind: ServiceAccount
metadata:
  name: image-reflector-controller
  namespace: flux-system
  annotations:
    # Annotate with the IAM role ARN
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789:role/flux-image-reflector
```

## Step 7: Configure GCR and Artifact Registry

```yaml
# ImageRepository with GCP provider
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-gcr-app
  namespace: flux-system
spec:
  image: gcr.io/my-project/my-app
  interval: 10m
  # Use the GCP provider for automatic token management
  provider: gcp
```

## Step 8: Monitor Rate Limit Usage

Track your rate limit consumption to prevent hitting limits.

```bash
# Check Docker Hub rate limit headers
TOKEN=$(curl -s "https://auth.docker.io/token?service=registry.docker.io&scope=repository:library/nginx:pull" | python3 -c "import sys,json; print(json.loads(sys.stdin.read())['token'])")

curl -s -I -H "Authorization: Bearer $TOKEN" \
  https://registry-1.docker.io/v2/library/nginx/manifests/latest 2>&1 | \
  grep -i ratelimit

# Output shows:
# ratelimit-limit: 100;w=21600    (limit per 6-hour window)
# ratelimit-remaining: 95;w=21600 (remaining in current window)
```

### Set Up Alerts for Rate Limit Warnings

```yaml
# Alert when image scanning fails (including rate limits)
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: image-scan-failures
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: error
  eventSources:
    - kind: ImageRepository
      name: "*"
      namespace: flux-system
```

## Step 9: Use Multiple Registry Mirrors

Distribute load across multiple registries to avoid single-source rate limits.

```yaml
# Use GitHub Container Registry as an alternative
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app-ghcr
  namespace: flux-system
spec:
  # Mirror your images to GHCR for higher limits
  image: ghcr.io/myorg/my-app
  interval: 5m
  secretRef:
    name: ghcr-creds
```

Set up a CI pipeline to mirror images:

```bash
# In your CI pipeline, push to multiple registries
docker tag myorg/my-app:1.0.0 ghcr.io/myorg/my-app:1.0.0
docker push ghcr.io/myorg/my-app:1.0.0

docker tag myorg/my-app:1.0.0 123456789.dkr.ecr.us-east-1.amazonaws.com/my-app:1.0.0
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/my-app:1.0.0
```

## Step 10: Full Debugging Checklist

```bash
# 1. Check image repository scan status
kubectl get imagerepositories -A -o wide

# 2. Look for rate limit errors in logs
kubectl logs -n flux-system deployment/image-reflector-controller | \
  grep -i "rate\|limit\|429\|too many" | tail -20

# 3. Verify authentication secrets exist
kubectl get secrets -n flux-system | grep -i docker

# 4. Check current Docker Hub rate limit
TOKEN=$(curl -s "https://auth.docker.io/token?service=registry.docker.io&scope=repository:library/nginx:pull" | python3 -c "import sys,json; print(json.loads(sys.stdin.read())['token'])")
curl -s -I -H "Authorization: Bearer $TOKEN" \
  https://registry-1.docker.io/v2/library/nginx/manifests/latest 2>&1 | \
  grep -i ratelimit

# 5. Count total image repositories (each consumes rate limit)
kubectl get imagerepositories -A --no-headers | wc -l

# 6. Check scan intervals
kubectl get imagerepositories -A \
  -o jsonpath='{range .items[*]}{.metadata.name}: {.spec.interval}{"\n"}{end}'

# 7. Force reconciliation after fixes
flux reconcile image repository my-app -n flux-system
```

## Summary

Flux CD rate limiting from container registries can be mitigated through:

- **Authenticating with registries** to get higher rate limits (essential for Docker Hub)
- **Increasing scan intervals** to reduce API call frequency
- **Using tag exclusion lists** to narrow the scan scope
- **Deploying pull-through caches** to cache registry responses locally
- **Mirroring images** to registries with higher limits (ECR, GHCR)
- **Monitoring rate limit headers** to proactively detect approaching limits

The most impactful fix is usually authentication combined with reasonable scan intervals. For large-scale deployments, a pull-through cache is the definitive solution.
