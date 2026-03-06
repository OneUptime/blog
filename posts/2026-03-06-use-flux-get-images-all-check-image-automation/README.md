# How to Use flux get images all to Check Image Automation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux, cli, image-automation, image-policy, image-repository, gitops, kubernetes, flux-get

Description: A practical guide to using flux get images commands to monitor and troubleshoot Flux image automation including repositories, policies, and update automation.

---

## Introduction

Flux CD's image automation feature automatically updates container image tags in your Git repository when new images are pushed to a registry. This creates a fully automated deployment pipeline: push an image, Flux detects it, updates your manifests, and reconciles the cluster.

The `flux get images` family of commands lets you inspect every component of this automation chain -- image repositories, image policies, and image update automations. This guide covers how to use these commands to monitor and troubleshoot your image automation setup.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- Flux image automation controllers installed
- The Flux CLI installed locally
- At least one ImageRepository, ImagePolicy, and ImageUpdateAutomation configured
- A container registry with images

## Step 1: Install Image Automation Controllers

If not already installed, add the image automation components to your Flux installation.

```yaml
# flux-system/gotk-components.yaml (or bootstrap with these flags)
# flux bootstrap github \
#   --components-extra=image-reflector-controller,image-automation-controller \
#   --owner=myorg \
#   --repository=fleet-infra \
#   --branch=main \
#   --path=clusters/my-cluster
```

Verify the controllers are running:

```bash
# Check that image automation controllers are installed
kubectl get deployments -n flux-system | grep image

# Expected output:
# image-automation-controller    1/1     1            1           5d
# image-reflector-controller     1/1     1            1           5d
```

## Step 2: Check All Image Automation Resources

Get a complete overview of all image automation resources.

```bash
# List all image automation resources across all namespaces
flux get images all -A
```

Sample output:

```
NAME                                          LAST SCAN                 SUSPENDED  READY  MESSAGE
imagerepository/my-app                        2026-03-06T10:30:00Z      False      True   successful scan: found 25 tags
imagerepository/nginx                         2026-03-06T10:29:00Z      False      True   successful scan: found 142 tags
imagerepository/redis                         2026-03-06T10:28:00Z      False      False  failed to scan: unauthorized

NAME                                          LATEST IMAGE              SUSPENDED  READY  MESSAGE
imagepolicy/my-app                            myregistry/my-app:1.5.2   False      True   Latest image tag for 'myregistry/my-app' resolved to 1.5.2
imagepolicy/nginx                             nginx:1.25.3              False      True   Latest image tag for 'nginx' resolved to 1.25.3
imagepolicy/redis                             -                         False      False  no image found for policy

NAME                                          LAST RUN                  SUSPENDED  READY  MESSAGE
imageupdateautomation/flux-system             2026-03-06T10:25:00Z      False      True   committed and pushed to 'main@sha1:abc1234'
```

The output is grouped into three sections:

1. **ImageRepositories**: Track which tags exist in container registries
2. **ImagePolicies**: Determine which tag should be used based on filtering rules
3. **ImageUpdateAutomations**: Commit and push tag updates to Git

## Step 3: Check Image Repositories

Image repositories scan container registries for available tags.

```bash
# List all image repositories
flux get images repository -A

# Check a specific image repository
flux get images repository my-app -n flux-system

# Watch for scan updates
flux get images repository -A -w
```

### Diagnose Image Repository Issues

```bash
# Symptom: READY=False, MESSAGE: failed to scan: unauthorized
# The registry credentials are missing or incorrect

# Check the secret reference
kubectl get imagerepository my-app -n flux-system -o yaml | grep -A 5 secretRef

# Verify the secret exists and has correct data
kubectl get secret registry-credentials -n flux-system -o yaml

# Test registry access manually
kubectl run test-registry --rm -it --image=curlimages/curl -- \
  curl -u user:pass https://myregistry.io/v2/my-app/tags/list
```

```bash
# Symptom: READY=False, MESSAGE: failed to scan: timeout
# Network connectivity issue to the registry

# Check the image repository URL
kubectl get imagerepository my-app -n flux-system -o yaml | grep image

# Verify DNS resolution from the cluster
kubectl run test-dns --rm -it --image=busybox -- nslookup myregistry.io
```

```bash
# Force a rescan of an image repository
flux reconcile image repository my-app -n flux-system
```

## Step 4: Check Image Policies

Image policies filter and select the correct tag from the available tags.

```bash
# List all image policies
flux get images policy -A

# Check a specific image policy
flux get images policy my-app -n flux-system

# Get detailed policy output
flux get images policy my-app -n flux-system -o yaml
```

### Understanding Policy Selection

```yaml
# Example ImagePolicy with semver filtering
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
      # Select the latest tag matching semver range
      range: ">=1.0.0 <2.0.0"
```

```yaml
# Example ImagePolicy with alphabetical ordering
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app-staging
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    # Only consider tags starting with "staging-"
    pattern: '^staging-(?P<ts>[0-9]+)'
    extract: '$ts'
  policy:
    alphabetical:
      order: asc
```

### Diagnose Image Policy Issues

```bash
# Symptom: LATEST IMAGE shows "-" (no image resolved)
# The policy cannot find a matching tag

# Check what tags the repository has found
kubectl get imagerepository my-app -n flux-system -o jsonpath='{.status.lastScanResult}'

# Check the policy filter and range
kubectl get imagepolicy my-app -n flux-system -o yaml | grep -A 10 policy

# Common fixes:
# 1. Widen the semver range
# 2. Fix the filter pattern regex
# 3. Ensure tags exist that match the policy
```

## Step 5: Check Image Update Automations

Image update automations commit tag changes back to Git.

```bash
# List all image update automations
flux get images update -A

# Check a specific automation
flux get images update flux-system -n flux-system

# Get detailed status
flux get images update flux-system -n flux-system -o yaml
```

### Understanding the Update Process

The image update automation:

1. Scans your Git repository for marker comments
2. Updates the image tag where markers are found
3. Commits and pushes the change to Git
4. Flux then reconciles the updated manifests

Marker comments in your manifests look like this:

```yaml
# apps/my-app/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
spec:
  template:
    spec:
      containers:
        - name: my-app
          # {"$imagepolicy": "flux-system:my-app"}
          image: myregistry/my-app:1.5.2
```

### Diagnose Update Automation Issues

```bash
# Symptom: READY=False, MESSAGE: failed to push: authentication required
# Git push credentials are missing or incorrect

# Check the git source reference
kubectl get imageupdateautomation flux-system -n flux-system -o yaml | grep -A 10 sourceRef

# Check the git credentials secret
kubectl get gitrepository flux-system -n flux-system -o yaml | grep -A 5 secretRef
kubectl get secret flux-system -n flux-system -o yaml
```

```bash
# Symptom: READY=True but no commits happening
# Markers may be missing or incorrectly formatted

# Check the update path configuration
kubectl get imageupdateautomation flux-system -n flux-system \
  -o jsonpath='{.spec.update}'

# Verify markers exist in manifests
grep -r 'imagepolicy' ./path/to/manifests/
```

## Step 6: Trace the Full Image Automation Chain

Follow an image from registry to deployment.

```bash
#!/bin/bash
# trace-image-automation.sh
# Trace the full chain for a specific image

IMAGE_NAME=${1:-my-app}
NAMESPACE=${2:-flux-system}

echo "Image Automation Chain for: $IMAGE_NAME"
echo "========================================="

# Step 1: Image Repository
echo ""
echo "1. Image Repository (registry scanning):"
flux get images repository $IMAGE_NAME -n $NAMESPACE

# Step 2: Image Policy
echo ""
echo "2. Image Policy (tag selection):"
flux get images policy $IMAGE_NAME -n $NAMESPACE

# Step 3: Latest selected image
LATEST=$(kubectl get imagepolicy $IMAGE_NAME -n $NAMESPACE \
  -o jsonpath='{.status.latestImage}' 2>/dev/null)
echo ""
echo "3. Selected image: ${LATEST:-none}"

# Step 4: Image Update Automation
echo ""
echo "4. Image Update Automation (git commits):"
flux get images update -n $NAMESPACE

# Step 5: Last commit
LAST_COMMIT=$(kubectl get imageupdateautomation -n $NAMESPACE -o \
  jsonpath='{.items[0].status.lastPushCommit}' 2>/dev/null)
echo ""
echo "5. Last push commit: ${LAST_COMMIT:-none}"
```

## Step 7: Monitor Image Automation in Real Time

```bash
# Watch all image automation resources
watch -n 10 'flux get images all -A'

# Watch only policies to see when new images are selected
flux get images policy -A -w

# Monitor the image reflector controller logs
kubectl logs -n flux-system deployment/image-reflector-controller -f

# Monitor the image automation controller logs
kubectl logs -n flux-system deployment/image-automation-controller -f
```

## Step 8: Force Reconciliation

Trigger immediate updates when you cannot wait for the next interval.

```bash
# Force rescan of an image repository
flux reconcile image repository my-app -n flux-system

# Force re-evaluation of an image policy
flux reconcile image policy my-app -n flux-system

# Force the update automation to run
flux reconcile image update flux-system -n flux-system

# Force the full chain
flux reconcile image repository my-app -n flux-system && \
flux reconcile image policy my-app -n flux-system && \
flux reconcile image update flux-system -n flux-system
```

## Step 9: Automated Health Check Script

```bash
#!/bin/bash
# check-image-automation.sh

echo "Image Automation Health Check - $(date)"
echo "========================================="
echo ""

# Check each component
for component in repository policy update; do
    echo "--- Image ${component}s ---"
    flux get images $component -A 2>/dev/null
    failures=$(flux get images $component -A --no-header 2>/dev/null | grep -c "False")
    if [ "$failures" -gt 0 ]; then
        echo "WARNING: $failures ${component}(s) not ready!"
    fi
    echo ""
done

# Overall health
total_failures=$(flux get images all -A --no-header 2>/dev/null | grep -c "False")
if [ "$total_failures" -gt 0 ]; then
    echo "RESULT: $total_failures image automation resource(s) need attention."
    exit 1
else
    echo "RESULT: All image automation resources are healthy."
    exit 0
fi
```

## Quick Reference

| Command | Description |
|---------|-------------|
| `flux get images all -A` | All image automation resources |
| `flux get images repository -A` | All image repositories |
| `flux get images policy -A` | All image policies |
| `flux get images update -A` | All image update automations |
| `flux reconcile image repository <name>` | Force registry rescan |
| `flux reconcile image policy <name>` | Force policy re-evaluation |
| `flux reconcile image update <name>` | Force update automation run |

## Summary

The `flux get images` commands give you complete visibility into Flux's image automation pipeline. Image repositories scan registries for tags, image policies select the right tag based on your rules, and image update automations commit changes back to Git. By checking each component in the chain, you can quickly identify where a break occurs -- whether it is a registry authentication issue, a policy that cannot find matching tags, or a Git push failure. Regular monitoring with these commands ensures your automated image deployment pipeline stays healthy.
