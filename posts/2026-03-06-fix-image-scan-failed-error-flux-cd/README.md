# How to Fix "image scan failed" Error in Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Image Automation, ImageRepository, ImagePolicy, Troubleshooting, Kubernetes, GitOps

Description: A hands-on guide to diagnosing and resolving image scan failures in Flux CD, covering registry connectivity, authentication for scanning, and rate limit issues.

---

## Introduction

Flux CD's image automation controllers scan container registries to detect new image versions and automatically update your Git repository. When image scanning fails, your automated update pipeline breaks, and new versions of your applications are not deployed. This guide covers the common causes of image scan failures and how to fix them.

## Understanding Image Automation Components

Flux CD uses two custom resources for image automation:

- **ImageRepository**: Scans a container registry for available tags
- **ImagePolicy**: Selects the latest image based on a policy (semver, alphabetical, numerical)

Both must be healthy for automated image updates to work.

## Identifying the Error

Check the ImageRepository and ImagePolicy status:

```bash
# Check all ImageRepositories
kubectl get imagerepositories -A

# Get detailed error for a specific ImageRepository
kubectl describe imagerepository <name> -n flux-system
```

Common error messages:

```
Status:
  Conditions:
    - Type: Ready
      Status: "False"
      Reason: ImageFetchFailed
      Message: "failed to scan image 'registry.example.com/my-app': unexpected status code 401:
        unauthorized: authentication required"
```

Or for rate-limited registries:

```
Message: "failed to scan image 'docker.io/library/nginx': unexpected status code 429:
  Too Many Requests: You have reached your pull rate limit"
```

Check the image-reflector-controller logs:

```bash
kubectl logs -n flux-system deploy/image-reflector-controller --tail=50
```

## Cause 1: Missing Registry Authentication

Private registries require credentials for the image-reflector-controller to scan tags.

### Fix: Create Registry Scan Credentials

```bash
# Create a docker-registry secret for scanning
kubectl create secret docker-registry registry-scan-creds \
  --docker-server=registry.example.com \
  --docker-username=scanner \
  --docker-password=scanner-token \
  -n flux-system
```

Reference the secret in your ImageRepository:

```yaml
# imagerepository-with-auth.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  # The image to scan (without tag)
  image: registry.example.com/my-app
  # How often to scan for new tags
  interval: 5m
  # Registry credentials for authentication
  secretRef:
    name: registry-scan-creds
```

### Fix: Cloud Provider Registry Authentication

#### AWS ECR

```yaml
# imagerepository-ecr.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app
  interval: 5m
  # Use AWS provider for automatic ECR authentication
  provider: aws
```

Ensure the image-reflector-controller has the correct IAM permissions:

```yaml
# IAM policy for ECR scanning
# {
#   "Version": "2012-10-17",
#   "Statement": [
#     {
#       "Effect": "Allow",
#       "Action": [
#         "ecr:GetDownloadUrlForLayer",
#         "ecr:BatchGetImage",
#         "ecr:BatchCheckLayerAvailability",
#         "ecr:ListImages",
#         "ecr:DescribeImages",
#         "ecr:GetAuthorizationToken"
#       ],
#       "Resource": "*"
#     }
#   ]
# }
```

#### Google Artifact Registry

```yaml
# imagerepository-gar.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: us-docker.pkg.dev/my-project/my-repo/my-app
  interval: 5m
  # Use GCP provider for automatic authentication
  provider: gcp
```

#### Azure Container Registry

```yaml
# imagerepository-acr.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: myregistry.azurecr.io/my-app
  interval: 5m
  # Use Azure provider for automatic authentication
  provider: azure
```

## Cause 2: Docker Hub Rate Limiting

Docker Hub enforces rate limits for anonymous and free-tier users. Image scanning can quickly exhaust these limits.

### Diagnosing Rate Limits

```bash
# Check remaining Docker Hub rate limit from inside the cluster
kubectl run -it --rm rate-check \
  --image=alpine/curl \
  --namespace=flux-system \
  --restart=Never \
  -- sh -c 'curl -s -o /dev/null -w "%{http_code}" https://registry-1.docker.io/v2/ && echo ""'

# Check rate limit headers
kubectl run -it --rm rate-check \
  --image=alpine/curl \
  --namespace=flux-system \
  --restart=Never \
  -- sh -c 'TOKEN=$(curl -s "https://auth.docker.io/token?service=registry.docker.io&scope=repository:library/nginx:pull" | grep -o "\"token\":\"[^\"]*\"" | cut -d\" -f4) && curl -sI -H "Authorization: Bearer $TOKEN" https://registry-1.docker.io/v2/library/nginx/manifests/latest 2>&1 | grep -i ratelimit'
```

### Fix: Authenticate to Docker Hub

Create a Docker Hub secret with your credentials to increase rate limits:

```bash
# Create Docker Hub credentials
kubectl create secret docker-registry dockerhub-creds \
  --docker-server=https://index.docker.io/v1/ \
  --docker-username=yourusername \
  --docker-password=your-access-token \
  -n flux-system
```

```yaml
# imagerepository-dockerhub.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: nginx
  namespace: flux-system
spec:
  image: docker.io/library/nginx
  interval: 30m
  # Use Docker Hub credentials to get higher rate limits
  secretRef:
    name: dockerhub-creds
```

### Fix: Reduce Scan Frequency

Increase the interval to reduce the number of API calls:

```yaml
# imagerepository-reduced-frequency.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: nginx
  namespace: flux-system
spec:
  image: docker.io/library/nginx
  # Scan every 30 minutes instead of every 5 minutes
  interval: 30m
  secretRef:
    name: dockerhub-creds
```

### Fix: Use a Registry Mirror

Set up a pull-through cache to avoid hitting Docker Hub directly:

```yaml
# imagerepository-mirror.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: nginx
  namespace: flux-system
spec:
  # Point to your registry mirror instead of Docker Hub
  image: mirror.internal.example.com/library/nginx
  interval: 10m
  secretRef:
    name: mirror-creds
```

## Cause 3: Network Connectivity Issues

The image-reflector-controller cannot reach the registry due to firewalls, DNS issues, or proxy requirements.

### Diagnosing Connectivity

```bash
# Test connectivity to the registry
kubectl run -it --rm debug-registry \
  --image=curlimages/curl \
  --namespace=flux-system \
  --restart=Never \
  -- curl -v https://registry.example.com/v2/

# Check DNS resolution
kubectl run -it --rm debug-dns \
  --image=busybox \
  --namespace=flux-system \
  --restart=Never \
  -- nslookup registry.example.com
```

### Fix: Configure Proxy for Image Scanning

```yaml
# Patch image-reflector-controller with proxy settings
apiVersion: apps/v1
kind: Deployment
metadata:
  name: image-reflector-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          env:
            - name: HTTPS_PROXY
              value: "http://proxy.example.com:3128"
            - name: NO_PROXY
              value: ".cluster.local,.svc,10.0.0.0/8"
```

Apply the patch:

```bash
kubectl patch deployment image-reflector-controller \
  -n flux-system \
  --type strategic \
  --patch-file proxy-patch.yaml
```

## Cause 4: TLS Certificate Issues

Self-signed certificates on private registries cause scan failures.

### Fix: Add Custom CA Certificates

```bash
# Create a TLS secret with your custom CA
kubectl create secret generic registry-tls \
  --from-file=ca.crt=/path/to/custom-ca.crt \
  -n flux-system
```

```yaml
# imagerepository-custom-tls.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: registry.internal.example.com/my-app
  interval: 5m
  secretRef:
    name: registry-scan-creds
  # Reference TLS certificate
  certSecretRef:
    name: registry-tls
```

## Cause 5: ImagePolicy Misconfiguration

Even if the ImageRepository is healthy, a misconfigured ImagePolicy will fail to select an image.

### Diagnosing ImagePolicy Issues

```bash
# Check ImagePolicy status
kubectl get imagepolicies -A

# Get detailed status
kubectl describe imagepolicy <name> -n flux-system
```

### Fix: Correct the ImagePolicy

```yaml
# imagepolicy-semver.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    # Must match the ImageRepository name
    name: my-app
  # Select the latest semver-compliant tag
  policy:
    semver:
      range: ">=1.0.0"
```

For non-semver tags, use alphabetical or numerical policies:

```yaml
# imagepolicy-numerical.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  # For tags like build-123, build-124
  policy:
    numerical:
      order: asc
  # Filter tags to only match a specific pattern
  filterTags:
    pattern: '^build-(?P<ts>[0-9]+)$'
    extract: '$ts'
```

```yaml
# imagepolicy-alphabetical.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  # For date-based tags like 20260301, 20260302
  policy:
    alphabetical:
      order: asc
  filterTags:
    pattern: '^[0-9]{8}$'
```

## Cause 6: Exclusion List Not Filtering Correctly

If your registry has tags like `latest`, `dev`, or `test` mixed with version tags, the scan may pick up unwanted tags.

### Fix: Use Tag Filtering

```yaml
# imagerepository-with-exclusions.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: registry.example.com/my-app
  interval: 5m
  secretRef:
    name: registry-scan-creds
  # Exclude specific tags from scanning
  exclusionList:
    - "^latest$"
    - "^dev-.*"
    - "^test-.*"
    - "^sha-.*"
```

## Complete Working Example

Here is a full end-to-end image automation setup:

```yaml
# 1. ImageRepository: Scan the registry for tags
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: registry.example.com/my-app
  interval: 5m
  secretRef:
    name: registry-scan-creds
  exclusionList:
    - "^latest$"

---
# 2. ImagePolicy: Select the latest semver tag
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
      range: ">=1.0.0 <2.0.0"

---
# 3. ImageUpdateAutomation: Update Git with the new image tag
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: fluxcdbot
        email: fluxcdbot@users.noreply.github.com
      messageTemplate: "chore: update {{.AutomationObject}} images"
    push:
      branch: main
  update:
    path: ./apps
    strategy: Setters
```

## Quick Troubleshooting Commands

```bash
# 1. Check ImageRepository scan status
kubectl get imagerepository -A -o wide

# 2. Check the last scan result
kubectl get imagerepository <name> -n flux-system -o jsonpath='{.status.lastScanResult}'

# 3. Check ImagePolicy selected image
kubectl get imagepolicy -A -o wide

# 4. Check image-reflector-controller logs
kubectl logs -n flux-system deploy/image-reflector-controller --tail=50

# 5. Check image-automation-controller logs
kubectl logs -n flux-system deploy/image-automation-controller --tail=50

# 6. Verify credentials are correct
kubectl get secret registry-scan-creds -n flux-system -o jsonpath='{.data.\.dockerconfigjson}' | base64 -d | jq .

# 7. Force a rescan
flux reconcile image repository my-app

# 8. Check which tags were discovered
kubectl get imagerepository <name> -n flux-system -o jsonpath='{.status.lastScanResult.tagCount}'
```

## Summary

Image scan failures in Flux CD are typically caused by missing registry credentials, rate limiting, network connectivity issues, or TLS certificate problems. The fix usually involves creating a docker-registry secret with proper credentials and referencing it in your ImageRepository. For Docker Hub, authenticate to avoid rate limits and increase the scan interval. For cloud provider registries, use the built-in provider authentication. Always verify that your ImagePolicy filter patterns match the tag format in your registry, and use exclusion lists to filter out non-production tags. After applying fixes, use `flux reconcile image repository` to trigger an immediate rescan.
