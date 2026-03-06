# How to Fix Flux CD Image Automation Not Committing Changes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, image automation, gitops, kubernetes, troubleshooting, image update automation

Description: A practical guide to diagnosing and fixing Flux CD ImageUpdateAutomation issues where image updates are detected but never committed back to your Git repository.

---

Flux CD's image automation controllers can automatically update your manifests when new container images are pushed. However, a common frustration is when the system detects new images but fails to commit the changes back to Git. This guide walks through every common cause and fix.

## Understanding the Image Automation Pipeline

Flux CD image automation involves three custom resources working together:

1. **ImageRepository** - scans a container registry for tags
2. **ImagePolicy** - selects the desired tag based on a policy (semver, alphabetical, numerical)
3. **ImageUpdateAutomation** - commits manifest changes to Git

If any link in this chain breaks, updates will not be committed. Let us diagnose each step.

## Step 1: Verify Image Scanning Is Working

First, confirm that the ImageRepository is scanning successfully.

```bash
# Check the status of all ImageRepository resources
kubectl get imagerepositories -A

# Get detailed status for a specific repository
kubectl describe imagerepository my-app -n flux-system
```

A healthy ImageRepository should show a "LastScanResult" with a scan time and tag count:

```yaml
# Example healthy ImageRepository
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  # The container registry to scan
  image: docker.io/myorg/my-app
  # How often to scan for new tags
  interval: 5m
  # Optional: credentials for private registries
  secretRef:
    name: docker-hub-creds
```

If the scan is failing, check the logs:

```bash
# Check image-reflector-controller logs for scan errors
kubectl logs -n flux-system deployment/image-reflector-controller
```

## Step 2: Verify Image Policy Is Selecting a Tag

The ImagePolicy must successfully resolve to a tag.

```bash
# Check all image policies
kubectl get imagepolicies -A

# Check the latest image selected by a policy
kubectl get imagepolicy my-app -n flux-system -o yaml
```

Look for the `status.latestImage` field. If it is empty, the policy cannot resolve a tag.

```yaml
# Example ImagePolicy using semver
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      # Select the latest stable version in the 1.x range
      range: "1.x"
```

Common issues with ImagePolicy:

```bash
# Verify the policy resolves correctly
kubectl get imagepolicy my-app -n flux-system \
  -o jsonpath='{.status.latestImage}'

# If empty, check events for errors
kubectl events -n flux-system --for imagepolicy/my-app
```

## Step 3: Check ImageUpdateAutomation Configuration

This is where most problems occur. The ImageUpdateAutomation resource controls how and where commits are made.

```yaml
# A properly configured ImageUpdateAutomation
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  git:
    checkout:
      ref:
        # Branch to check out for reading current manifests
        branch: main
    commit:
      # Author information is REQUIRED
      author:
        email: fluxcdbot@example.com
        name: fluxcdbot
      # Commit message template
      messageTemplate: |
        Automated image update

        Automation name: {{ .AutomationObject }}

        Files:
        {{ range $filename, $_ := .Changed.FileChanges -}}
        - {{ $filename }}
        {{ end -}}

        Objects:
        {{ range $resource, $changes := .Changed.Objects -}}
        - {{ $resource }}
          {{- range $_, $change := $changes }}
            - {{ $change.OldValue }} -> {{ $change.NewValue }}
          {{- end }}
        {{ end -}}
    push:
      # Branch to push commits to
      branch: main
  update:
    path: ./clusters/production
    strategy: Setters
```

### Common Mistake 1: Missing Git Author

The `git.commit.author` field is required. Without it, the controller cannot create commits.

```bash
# Check if author is configured
kubectl get imageupdateautomation flux-system -n flux-system \
  -o jsonpath='{.spec.git.commit.author}'
```

### Common Mistake 2: Missing or Wrong Push Branch

If `git.push.branch` is not specified, the controller pushes to the checkout branch. If you want changes on a different branch:

```yaml
spec:
  git:
    checkout:
      ref:
        branch: main
    push:
      # Push to a separate branch for PR-based workflows
      branch: image-updates
```

### Common Mistake 3: Wrong Update Path

The `update.path` must point to the directory containing your manifests with image policy markers.

```bash
# Verify the path exists in your repository
# The path is relative to the repository root
kubectl get imageupdateautomation flux-system -n flux-system \
  -o jsonpath='{.spec.update.path}'
```

## Step 4: Verify Image Policy Markers in Manifests

Flux uses special comments (markers) in your YAML to know which image references to update. Without these markers, no changes will be made even if everything else is correct.

```yaml
# deployment.yaml - markers tell Flux which field to update
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      containers:
        - name: my-app
          # The marker format: {"$imagepolicy": "NAMESPACE:POLICY_NAME"}
          image: docker.io/myorg/my-app:1.0.0 # {"$imagepolicy": "flux-system:my-app"}
```

You can also use separate markers for the tag only:

```yaml
containers:
  - name: my-app
    # Update the full image reference
    image: docker.io/myorg/my-app:1.0.0 # {"$imagepolicy": "flux-system:my-app"}
    env:
      - name: APP_VERSION
        # Update only the tag portion
        value: 1.0.0 # {"$imagepolicy": "flux-system:my-app:tag"}
```

## Step 5: Check Git Repository Write Access

The source controller needs write access to push commits. Read-only deploy keys are a common blocker.

```bash
# Check the GitRepository source and its secret
kubectl get gitrepository flux-system -n flux-system -o yaml

# Verify the secret exists and has the right keys
kubectl get secret flux-system -n flux-system -o jsonpath='{.data}' | \
  python3 -c "import sys,json; print(list(json.loads(sys.stdin.read()).keys()))"
```

If using SSH deploy keys, ensure the key has **write** access:

```bash
# Regenerate a deploy key with write access
flux create secret git flux-system \
  --url=ssh://git@github.com/myorg/fleet-infra \
  --ssh-key-algorithm=ecdsa \
  --ssh-ecdsa-curve=p521

# Add the public key to your repository with WRITE permissions
```

## Step 6: Check Controller Logs for Errors

The image-automation-controller logs reveal the exact reason for failures.

```bash
# View image automation controller logs
kubectl logs -n flux-system deployment/image-automation-controller

# Filter for errors
kubectl logs -n flux-system deployment/image-automation-controller | grep -i error

# Check events on the ImageUpdateAutomation resource
kubectl events -n flux-system --for imageupdateautomation/flux-system
```

Common error messages and their meanings:

```bash
# "failed to push to remote" - write access issue
# Fix: Ensure deploy key has write permission

# "no changes to commit" - markers missing or policy not updated
# Fix: Verify image policy markers exist in manifests

# "failed to checkout branch" - branch does not exist
# Fix: Ensure the checkout branch exists in the remote
```

## Step 7: Verify the Push Configuration for PR Workflows

If you use a separate branch for image updates (common in production), configure the push branch and set up branch protection accordingly.

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: flux-system
  namespace: flux-system
spec:
  git:
    checkout:
      ref:
        branch: main
    push:
      # Push to a dedicated branch
      branch: flux-image-updates
      # Optional: refspec for advanced push configurations
    commit:
      author:
        email: fluxcdbot@example.com
        name: fluxcdbot
  update:
    path: ./clusters/production
    strategy: Setters
```

## Step 8: Force a Reconciliation

After fixing the configuration, trigger a manual reconciliation:

```bash
# Reconcile the image automation
flux reconcile image update flux-system

# Also reconcile the image repositories and policies
flux reconcile image repository my-app
flux reconcile image policy my-app

# Verify the latest commit in your Git repository matches the update
git log --oneline -5
```

## Step 9: Full Debugging Checklist

Run through this checklist to ensure everything is in order:

```bash
# 1. Image scanning works
kubectl get imagerepositories -A -o wide

# 2. Image policy has resolved a tag
kubectl get imagepolicies -A -o wide

# 3. ImageUpdateAutomation is configured
kubectl get imageupdateautomations -A -o wide

# 4. Check the automation status for last run info
kubectl get imageupdateautomation flux-system -n flux-system \
  -o jsonpath='{.status}'

# 5. Verify the Git secret has write access
flux get sources git

# 6. Check all image automation controller logs
kubectl logs -n flux-system deployment/image-automation-controller \
  --since=30m
```

## Summary

When Flux CD image automation is not committing changes, the issue typically falls into one of these categories:

- **Missing image policy markers** in your YAML manifests
- **Git author not configured** in ImageUpdateAutomation
- **Read-only deploy keys** preventing push operations
- **Wrong update path** not matching where your manifests live
- **Push branch misconfiguration** targeting a non-existent branch

Work through the steps above from scanning to pushing, and you will identify where the pipeline breaks. The controller logs are your best friend for pinpointing the exact failure.
