# How to Fix Flux CD Not Detecting New Container Images

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Image Automation, ImageRepository, ImagePolicy, Kubernetes, Troubleshooting, GitOps, Container Registry

Description: A practical guide to fixing Flux CD image automation when it fails to detect new container images, covering ImageRepository configuration, scan intervals, tag patterns, and ImagePolicy debugging.

---

## Introduction

Flux CD's image automation feature allows you to automatically update container image tags in your Git repository when new images are pushed to a container registry. This is powered by three components: ImageRepository (scans the registry), ImagePolicy (selects the right tag), and ImageUpdateAutomation (commits the change). When this pipeline breaks, Flux silently stops detecting new images.

This guide walks through each component and shows how to diagnose and fix detection failures.

## Understanding the Image Automation Pipeline

The image automation pipeline works in three stages:

1. **ImageRepository** scans a container registry for available tags
2. **ImagePolicy** selects the latest tag based on a policy (semver, alphabetical, numerical)
3. **ImageUpdateAutomation** updates the Git repository with the new tag

```bash
# Check the status of all image automation components
kubectl get imagerepository -A
kubectl get imagepolicy -A
kubectl get imageupdateautomation -A
```

## Common Cause 1: ImageRepository Not Scanning

The ImageRepository resource tells Flux which container registry and image to scan. If it is misconfigured, no tags will be discovered.

### Diagnosing the Issue

```bash
# Check the ImageRepository status
kubectl get imagerepository -n flux-system my-app -o yaml

# Look for error conditions
kubectl describe imagerepository -n flux-system my-app
```

```yaml
# Example error status
status:
  conditions:
    - type: Ready
      status: "False"
      reason: ImageFetchFailed
      message: 'failed to get tags: GET https://ghcr.io/v2/myorg/my-app/tags/list: UNAUTHORIZED'
```

### Fix: Configure Registry Authentication

```yaml
---
# Create a Secret with registry credentials
apiVersion: v1
kind: Secret
metadata:
  name: ghcr-auth
  namespace: flux-system
type: kubernetes.io/dockerconfigjson
data:
  # Base64-encoded Docker config JSON
  .dockerconfigjson: eyJhdXRocyI6eyJnaGNyLmlvIjp7InVzZXJuYW1lIjoiZmx1eCIsInBhc3N3b3JkIjoiZ2hwX3h4eCJ9fX0=
---
# Reference the secret in the ImageRepository
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: ghcr.io/myorg/my-app
  interval: 5m
  secretRef:
    name: ghcr-auth
```

### Creating the Docker Config Secret

```bash
# Create the secret using kubectl
kubectl create secret docker-registry ghcr-auth \
  -n flux-system \
  --docker-server=ghcr.io \
  --docker-username=flux \
  --docker-password=ghp_your_token_here

# For AWS ECR, generate a token first
aws ecr get-login-password --region us-east-1 | \
  kubectl create secret docker-registry ecr-auth \
  -n flux-system \
  --docker-server=123456789.dkr.ecr.us-east-1.amazonaws.com \
  --docker-username=AWS \
  --docker-password-stdin
```

## Common Cause 2: Scan Interval Too Long

If the scan interval is set to a long duration, Flux will not detect new images until the next scan cycle.

### Diagnosing the Issue

```bash
# Check the scan interval
kubectl get imagerepository -n flux-system my-app -o jsonpath='{.spec.interval}'

# Check when the last scan completed
kubectl get imagerepository -n flux-system my-app -o jsonpath='{.status.lastScanResult.scanTime}'
```

### Fix: Reduce Scan Interval

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: ghcr.io/myorg/my-app
  # Scan every 1 minute for development environments
  interval: 1m
  secretRef:
    name: ghcr-auth
```

### Fix: Force Immediate Scan

```bash
# Force the image-reflector-controller to scan immediately
flux reconcile image repository my-app -n flux-system

# Verify the scan results
kubectl get imagerepository -n flux-system my-app -o jsonpath='{.status.lastScanResult}'
```

## Common Cause 3: Tag Pattern Excludes New Tags

The ImageRepository can be configured with exclusion lists that filter out certain tags. If your new tag matches an exclusion pattern, it will not be detected.

### Diagnosing the Issue

```bash
# Check the exclusion list
kubectl get imagerepository -n flux-system my-app -o yaml | grep -A 10 "exclusionList"

# Check how many tags were found
kubectl get imagerepository -n flux-system my-app -o jsonpath='{.status.lastScanResult.tagCount}'
```

### Fix: Adjust Exclusion Patterns

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: ghcr.io/myorg/my-app
  interval: 5m
  secretRef:
    name: ghcr-auth
  # Carefully configure exclusions to not filter out wanted tags
  exclusionList:
    # Exclude only specific patterns you truly want to ignore
    - "^sha-"       # Exclude git SHA-based tags
    - "^dev-"       # Exclude development tags
    - "^test-"      # Exclude test tags
    - "latest"      # Exclude the 'latest' tag
```

## Common Cause 4: ImagePolicy Not Matching Any Tags

The ImagePolicy selects which tag to use based on a policy. If the policy does not match any of the scanned tags, no image will be selected.

### Diagnosing the Issue

```bash
# Check the ImagePolicy status
kubectl get imagepolicy -n flux-system my-app -o yaml

# Check the latest selected image
kubectl get imagepolicy -n flux-system my-app -o jsonpath='{.status.latestImage}'
```

```yaml
# Example error: no tags match the policy
status:
  conditions:
    - type: Ready
      status: "False"
      reason: ReconciliationFailed
      message: 'no tag found that matches the given policy'
```

### Example: Semver Policy Does Not Match Tag Format

```yaml
# Wrong: tags in the registry are like "v1.2.3" but policy expects "1.2.3"
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
      # This expects tags like "1.2.3" without a "v" prefix
      range: ">=1.0.0"
```

### Fix: Handle "v" Prefix in Tags

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  # Use filterTags to strip the "v" prefix before applying semver
  filterTags:
    pattern: '^v(?P<version>[0-9]+\.[0-9]+\.[0-9]+)$'
    extract: '$version'
  policy:
    semver:
      range: ">=1.0.0"
```

### Different Policy Types

```yaml
---
# Semver policy: selects the highest semantic version
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app-semver
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      # Select highest version in the 1.x range
      range: "^1.0.0"
---
# Alphabetical policy: selects the last tag alphabetically
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app-alpha
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    # Only consider tags matching this pattern
    pattern: '^main-[a-f0-9]{7}-(?P<ts>[0-9]+)'
    extract: '$ts'
  policy:
    alphabetical:
      order: asc
---
# Numerical policy: selects the highest numerical tag
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app-numerical
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^(?P<build>[0-9]+)$'
    extract: '$build'
  policy:
    numerical:
      order: asc
```

## Common Cause 5: ImageUpdateAutomation Not Configured

Even if ImageRepository and ImagePolicy are working, you need an ImageUpdateAutomation resource to commit the changes to Git.

### Diagnosing the Issue

```bash
# Check if ImageUpdateAutomation exists
kubectl get imageupdateautomation -A

# Check its status
kubectl describe imageupdateautomation -n flux-system my-app-automation
```

### Fix: Create ImageUpdateAutomation

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: my-app-automation
  namespace: flux-system
spec:
  interval: 5m
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
      messageTemplate: |
        Automated image update

        Automation name: {{ .AutomationObject }}

        Files:
        {{ range $filename, $_ := .Changed.FileChanges -}}
        - {{ $filename }}
        {{ end -}}

        Objects:
        {{ range $resource, $changes := .Changed.Objects -}}
        - {{ $resource.Kind }} {{ $resource.Name }}
          Changes:
        {{ range $_, $change := $changes -}}
            - {{ $change.OldValue }} -> {{ $change.NewValue }}
        {{ end -}}
        {{ end -}}
    push:
      branch: main
  update:
    path: ./apps
    strategy: Setters
```

## Common Cause 6: Missing Image Policy Marker in YAML

The ImageUpdateAutomation uses markers (comments) in your YAML files to know which image tags to update. Without the correct marker, it cannot find the field to update.

### Example: Missing Marker

```yaml
# Wrong: no marker comment, so Flux does not know to update this tag
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      containers:
        - name: my-app
          image: ghcr.io/myorg/my-app:v1.0.0
```

### Fix: Add the Image Policy Marker

```yaml
# Fixed: marker tells Flux which ImagePolicy controls this tag
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      containers:
        - name: my-app
          image: ghcr.io/myorg/my-app:v1.0.0 # {"$imagepolicy": "flux-system:my-app"}
```

The marker format is `# {"$imagepolicy": "<namespace>:<imagepolicy-name>"}` and can be set to update just the tag:

```yaml
# Update only the tag portion
image: ghcr.io/myorg/my-app:v1.0.0 # {"$imagepolicy": "flux-system:my-app:tag"}

# Update the full image reference (repository + tag)
image: ghcr.io/myorg/my-app:v1.0.0 # {"$imagepolicy": "flux-system:my-app"}
```

## Common Cause 7: Image Reflector Controller Not Installed

The image automation components are not installed by default with Flux. You need to explicitly install them.

### Diagnosing the Issue

```bash
# Check if the image automation controllers are running
kubectl get deployment -n flux-system | grep image

# If no results, the controllers are not installed
```

### Fix: Install Image Automation Controllers

```bash
# Install with Flux CLI during bootstrap
flux bootstrap github \
  --owner=myorg \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/my-cluster \
  --components-extra=image-reflector-controller,image-automation-controller

# Or install after bootstrap
flux install --components-extra=image-reflector-controller,image-automation-controller
```

## Complete Debugging Workflow

```bash
# Step 1: Verify image automation controllers are running
kubectl get deployment -n flux-system | grep image

# Step 2: Check ImageRepository scan status
kubectl get imagerepository -n flux-system my-app
flux reconcile image repository my-app -n flux-system

# Step 3: Check how many tags were found
kubectl get imagerepository -n flux-system my-app -o jsonpath='{.status.lastScanResult}'
echo ""

# Step 4: Check ImagePolicy selected image
kubectl get imagepolicy -n flux-system my-app -o jsonpath='{.status.latestImage}'
echo ""

# Step 5: Check ImageUpdateAutomation status
kubectl get imageupdateautomation -n flux-system -o yaml | grep -A 10 "conditions:"

# Step 6: Check image-reflector-controller logs
kubectl logs -n flux-system deploy/image-reflector-controller --tail=50

# Step 7: Check image-automation-controller logs
kubectl logs -n flux-system deploy/image-automation-controller --tail=50

# Step 8: Verify markers exist in your YAML files
grep -r "imagepolicy" ./apps/
```

## Conclusion

When Flux CD does not detect new container images, the issue lies in one of the three image automation components. Start by verifying the ImageRepository can authenticate and scan the registry. Then check that the ImagePolicy has a filter and policy that match your tag format. Finally, ensure the ImageUpdateAutomation is configured with the correct Git settings and that your YAML files have the proper image policy markers. Remember that image automation controllers must be explicitly installed as they are not part of the default Flux installation.
