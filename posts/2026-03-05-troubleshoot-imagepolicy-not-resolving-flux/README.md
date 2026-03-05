# How to Troubleshoot ImagePolicy Not Resolving Latest Tag in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Image Automation, Troubleshooting, ImagePolicy

Description: Diagnose and fix issues where an ImagePolicy in Flux fails to resolve the latest image tag from your container registry.

---

## Introduction

The ImagePolicy resource in Flux selects a single image tag from the list of tags discovered by an ImageRepository. When the ImagePolicy cannot resolve a tag, the entire image automation pipeline stalls. This guide covers the most common reasons an ImagePolicy fails to resolve and how to fix each one.

## Prerequisites

- A Kubernetes cluster with Flux installed
- The image-reflector-controller deployed
- An ImageRepository that is successfully scanning
- An ImagePolicy that is not resolving a tag

## Step 1: Check ImagePolicy Status

Begin by examining the ImagePolicy resource status.

```bash
# Get the status of all ImagePolicy resources
flux get image policy --all-namespaces

# Get detailed information about a specific ImagePolicy
kubectl describe imagepolicy my-app -n flux-system
```

A healthy ImagePolicy shows `Ready: True` and displays the selected image in its status. A failing one shows `Ready: False` with a reason.

## Step 2: Verify the ImageRepository Is Scanning

The ImagePolicy depends on the ImageRepository to provide the list of available tags. Confirm the referenced ImageRepository is working.

```bash
# Check that the ImageRepository is scanning successfully
flux get image repository my-app -n flux-system
```

If the ImageRepository shows errors, resolve those first before troubleshooting the ImagePolicy.

## Common Failure Scenarios

### No Tags Match the Policy Filter

The most frequent cause is that no tags in the registry match the policy criteria. For semver policies, all tags must be valid semantic versions.

```yaml
# image-policy-semver.yaml
# This policy only matches tags that are valid semver in the 1.x.x range
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
      range: "1.x.x"
```

If your registry contains tags like `v1.2.3` (with a `v` prefix), the semver policy may not match them. Some container build pipelines produce tags with prefixes that are not valid semver. Check actual tags in your registry.

```bash
# List tags visible to Flux by checking the ImageRepository status
kubectl get imagerepository my-app -n flux-system -o yaml | grep -A 5 lastScanResult
```

### Incorrect ImageRepository Reference

Verify that the `imageRepositoryRef` points to an existing ImageRepository in the same namespace.

```yaml
# Ensure the name matches exactly
spec:
  imageRepositoryRef:
    name: my-app  # Must match the ImageRepository metadata.name
```

If the ImageRepository is in a different namespace, the ImagePolicy cannot reference it. Both resources must be in the same namespace.

### Filter Pattern Excludes All Tags

When using a `filterTags` pattern, an overly restrictive regex can exclude every tag.

```yaml
# image-policy-filter.yaml
# Uses filterTags to narrow down candidates before applying the policy
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: "^main-[a-f0-9]+-(?P<ts>[0-9]+)"
    extract: "$ts"
  policy:
    numerical:
      order: asc
```

Test your regex pattern against actual tags. A common mistake is anchoring the pattern with `^` and `$` while the actual tags have additional characters.

```bash
# View the full list of tags by examining the ImageRepository object
kubectl get imagerepository my-app -n flux-system \
  -o jsonpath='{.status.lastScanResult.latestTags}'
```

### SemVer Range Mismatch

Semver ranges follow the npm semver syntax. Common mistakes include:

- Using `1.0.0` (exact match only) instead of `1.x.x` (any 1.x.x version)
- Using `>=1.0.0` which matches everything including 2.0.0 and beyond
- Forgetting that pre-release tags like `1.0.0-rc.1` are not matched by `1.x.x`

```yaml
# Examples of semver ranges
spec:
  policy:
    semver:
      range: ">=1.0.0 <2.0.0"  # Matches 1.x.x but not 2.0.0
      # range: "1.x"            # Shorthand for the same
      # range: "~1.2.0"         # Matches 1.2.x only
```

### Numerical Policy with Non-Numeric Tags

If you use a numerical policy, the extracted or raw tag values must be valid numbers.

```yaml
# image-policy-numerical.yaml
# Selects the highest numeric tag
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    numerical:
      order: asc
```

If your tags include non-numeric values like `latest` or `dev`, add a filterTags pattern to exclude them.

```yaml
# Filter to only include purely numeric tags
spec:
  filterTags:
    pattern: "^[0-9]+$"
  policy:
    numerical:
      order: asc
```

### Alphabetical Policy Selecting Unexpected Tag

The alphabetical policy sorts tags lexicographically. This means `9` comes after `10` in alphabetical order. Use numerical or semver policies when tags represent versions or build numbers.

## Step 3: Test Your Policy Locally

You can manually list tags from a registry to verify what is available.

```bash
# List tags from a public registry using skopeo
skopeo list-tags docker://ghcr.io/my-org/my-app

# Or use crane for a lightweight alternative
crane ls ghcr.io/my-org/my-app
```

Compare these tags against your policy filter and range to confirm at least one tag matches.

## Step 4: Apply the Fix and Reconcile

After updating the ImagePolicy, force a reconciliation.

```bash
# Reconcile the ImagePolicy to apply changes immediately
flux reconcile image policy my-app -n flux-system

# Verify the policy now resolves a tag
flux get image policy my-app -n flux-system
```

## Step 5: Confirm End-to-End Automation

Once the ImagePolicy resolves a tag, verify that the ImageUpdateAutomation picks it up.

```bash
# Check if the automation has committed updates
flux get image update --all-namespaces
```

## Monitoring Policies

Set up notifications to alert when policies fail to resolve.

```yaml
# alert-imagepolicy.yaml
# Alert when ImagePolicy resources enter a failing state
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: image-policy-failures
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: error
  eventSources:
    - kind: ImagePolicy
      name: "*"
```

## Conclusion

An ImagePolicy that fails to resolve usually comes down to a mismatch between the policy criteria and the actual tags in the registry. Check the ImageRepository scan results, validate your semver range or filter pattern, and ensure the tags in your registry conform to the expected format. Systematic debugging from ImageRepository to ImagePolicy to ImageUpdateAutomation will help you pinpoint the issue quickly.
