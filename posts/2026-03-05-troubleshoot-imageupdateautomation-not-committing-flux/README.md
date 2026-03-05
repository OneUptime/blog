# How to Troubleshoot ImageUpdateAutomation Not Committing Changes in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Image Automation, Troubleshooting, ImageUpdateAutomation

Description: A practical guide to diagnosing why ImageUpdateAutomation in Flux is not committing image tag updates to your Git repository.

---

## Introduction

The ImageUpdateAutomation resource in Flux is responsible for scanning your manifests for image policy markers, updating the tag values, and committing the changes to Git. When it stops committing, deployments remain pinned to old images even though new ones are available. This guide walks through every common cause and its resolution.

## Prerequisites

- A Kubernetes cluster with Flux installed
- The image-automation-controller deployed
- An ImageUpdateAutomation resource that is not producing commits

## Step 1: Verify the Upstream Resources

ImageUpdateAutomation depends on both ImageRepository and ImagePolicy. If either is failing, there is nothing to commit.

```bash
# Check all image resources in one view
flux get image all -n flux-system
```

Confirm that:
- ImageRepository shows `Ready: True` with scanned tags
- ImagePolicy shows `Ready: True` with a resolved image
- ImageUpdateAutomation shows `Ready: True`

If the ImagePolicy has not resolved a new image that differs from what is already in your manifests, there is nothing for the automation to update.

## Step 2: Check ImageUpdateAutomation Status

Examine the ImageUpdateAutomation resource for errors.

```bash
# Get detailed status of the ImageUpdateAutomation
kubectl describe imageupdateautomation flux-system -n flux-system
```

Look at the `status.conditions` for the `Ready` condition and its message. Also check `status.lastAutomationRunTime` and `status.lastPushCommit`.

## Step 3: Examine Controller Logs

The image-automation-controller logs provide the most detailed information about what happened during the last run.

```bash
# View logs from the image-automation-controller
kubectl logs -n flux-system deployment/image-automation-controller --tail=200
```

Look for lines containing the ImageUpdateAutomation name. Key phrases include "no updates made," "push," "commit," and any error messages.

## Common Failure Scenarios

### No Markers Found in Manifests

The automation uses the setter strategy to find inline comments in your YAML files. If no markers are present or they are malformed, no updates happen.

```yaml
# Correct marker format - comment must be on the same line as the value
image: ghcr.io/my-org/my-app:1.2.3 # {"$imagepolicy": "flux-system:my-app"}
```

Common marker mistakes:
- Marker on a separate line from the value
- Wrong namespace or policy name in the marker
- Missing quotes around the JSON keys

### Update Path Does Not Cover Your Files

The `spec.update.path` field restricts which directory is scanned for markers. If your HelmRelease or Deployment file is outside this path, it will not be found.

```yaml
# image-update-automation.yaml
# Make sure the path covers the directory with your manifests
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: flux-system
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
        email: flux@example.com
        name: Flux
      messageTemplate: "Update images"
    push:
      branch: main
  update:
    path: ./clusters/production  # Only scans this directory tree
    strategy: Setters
```

If your manifests are in `./apps/` but the path is set to `./clusters/`, the markers will not be discovered. Use `./` to scan the entire repository, or adjust to the correct path.

### Git Authentication Failures

The automation needs write access to the Git repository. If the Git credentials are read-only or expired, commits cannot be pushed.

```bash
# Check the GitRepository resource for authentication errors
kubectl describe gitrepository flux-system -n flux-system
```

Ensure the referenced secret has credentials with push permissions.

```bash
# Verify the secret exists and contains the expected keys
kubectl get secret flux-system -n flux-system -o jsonpath='{.data}' | jq 'keys'
```

For SSH authentication, the secret should contain `identity` and `known_hosts`. For HTTPS, it should contain `username` and `password` (or a personal access token).

### Branch Protection Rules

If the target branch has protection rules (required reviews, status checks), the push will be rejected. The controller logs will show a push rejection error.

Options to resolve this:
1. Push to a different branch and create pull requests manually or via automation
2. Exempt the Flux bot account from branch protection rules

To push to a separate branch, configure `spec.git.push.branch` to a different branch than the checkout branch.

```yaml
# Push updates to a staging branch instead of main
spec:
  git:
    checkout:
      ref:
        branch: main
    push:
      branch: flux-image-updates
```

### The Resource Is Suspended

Check if the ImageUpdateAutomation has been suspended.

```bash
# Check if the resource is suspended
kubectl get imageupdateautomation flux-system -n flux-system \
  -o jsonpath='{.spec.suspend}'
```

If it returns `true`, resume it.

```bash
# Resume the ImageUpdateAutomation
flux resume image update flux-system -n flux-system
```

### Source GitRepository Not Ready

The ImageUpdateAutomation references a GitRepository source. If that source is not ready, the automation cannot clone the repository.

```bash
# Check the referenced GitRepository
flux get source git flux-system -n flux-system
```

### No Actual Change Detected

If the image tag in your manifest already matches the tag resolved by the ImagePolicy, there is nothing to commit. This is expected behavior, not a bug. Verify the current tag in your manifest matches the policy output.

```bash
# Compare the policy's resolved tag with what is in your manifests
flux get image policy my-app -n flux-system
```

## Step 4: Force a Reconciliation

After fixing the issue, trigger an immediate reconciliation.

```bash
# Force reconciliation of the ImageUpdateAutomation
flux reconcile image update flux-system -n flux-system
```

## Step 5: Verify the Commit

Check that a new commit was pushed to the repository.

```bash
# Check the last automation run details
kubectl get imageupdateautomation flux-system -n flux-system \
  -o jsonpath='{.status.lastPushCommit}'

# Pull the latest changes and verify in your local clone
git pull origin main
git log --oneline -5
```

## Conclusion

When ImageUpdateAutomation stops committing, work through the chain systematically: verify ImageRepository scans, confirm ImagePolicy resolves a new tag, check for correct markers in the right path, and ensure Git credentials have write access. The controller logs are your best tool for pinpointing the exact failure.
