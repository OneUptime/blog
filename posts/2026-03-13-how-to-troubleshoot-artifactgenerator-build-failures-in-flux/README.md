# How to Troubleshoot ArtifactGenerator Build Failures in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, fluxcd, artifactgenerator, Troubleshooting, Debugging, GitOps, Kubernetes

Description: A practical guide to diagnosing and fixing common ArtifactGenerator build failures in Flux 2.8.

---

## Introduction

ArtifactGenerator in Flux 2.8 adds a layer between your source repositories and downstream resources. While this layer provides valuable path-based filtering, it also introduces potential failure points. When an ArtifactGenerator fails to build an artifact, downstream Kustomizations and HelmReleases stall. This guide covers the most common ArtifactGenerator build failures, how to diagnose them, and how to fix them.

## Prerequisites

- A Kubernetes cluster running Flux 2.8
- kubectl configured to access your cluster
- Familiarity with Flux ArtifactGenerator resources
- Access to the Flux source controller logs

## Step 1: Check ArtifactGenerator Status

Start by examining the ArtifactGenerator status:

```bash
kubectl get artifactgenerators -n flux-system
```

A healthy ArtifactGenerator shows:

```text
NAME              READY   STATUS                AGE
my-app            True    Artifact generated    10m
```

A failing one shows:

```text
NAME              READY   STATUS                        AGE
my-app            False   build failed: <reason>        10m
```

Get detailed status:

```bash
kubectl describe artifactgenerator my-app -n flux-system
```

Look at the `Status.Conditions` section for specific error messages.

## Common Failure: Source Not Ready

The most common failure is the referenced source not being ready.

**Symptoms:**

```yaml
Status:
  Conditions:
    - type: Ready
      status: "False"
      reason: ArtifactFailed
      message: "source 'GitRepository/platform-repo' is not ready"
```

**Diagnosis:**

Check the source status:

```bash
kubectl get gitrepositories -n flux-system
```

**Fix:**

Resolve the underlying source issue first. Common GitRepository problems include authentication failures, network issues, or invalid branch references:

```bash
kubectl describe gitrepository platform-repo -n flux-system
```

Fix the GitRepository, and the ArtifactGenerator will recover on its next reconciliation.

## Common Failure: No Files Match Path Patterns

If no files in the source artifact match the configured include paths, the ArtifactGenerator may report a failure or generate an empty artifact.

**Symptoms:**

```yaml
Status:
  Conditions:
    - type: Ready
      status: "False"
      reason: BuildFailed
      message: "no files matched the configured path patterns"
```

**Diagnosis:**

Verify the directory structure in your repository matches the path patterns:

```bash
# Clone the repo locally and check
git clone https://github.com/my-org/platform-repo
find platform-repo -type f | head -20
```

Compare with your ArtifactGenerator paths:

```bash
kubectl get artifactgenerator my-app -n flux-system -o yaml | grep -A 10 artifacts
```

**Fix:**

Update the path patterns to match the actual directory structure:

```yaml
spec:
  artifacts:
    # Wrong: directory uses dashes not underscores
    # - path: "apps/my_app/**"
    # Correct:
    - path: "apps/my-app/**"
```

## Common Failure: Glob Pattern Syntax Errors

Invalid glob patterns cause build failures.

**Symptoms:**

```yaml
Status:
  Conditions:
    - type: Ready
      status: "False"
      reason: BuildFailed
      message: "invalid glob pattern: apps/[invalid/**"
```

**Fix:**

Ensure your glob patterns are syntactically correct:

```yaml
spec:
  artifacts:
    # Wrong: unclosed bracket
    # - path: "apps/[invalid/**"
    # Correct:
    - path: "apps/[a-z]*/**"
```

## Common Failure: Source Controller Resource Limits

If the source controller pod is resource-constrained, artifact generation may fail due to OOM (out of memory) or timeout.

**Symptoms:**

The pod restarts or the build times out:

```bash
kubectl get pods -n flux-system | grep source-controller
```

Check for OOM kills:

```bash
kubectl describe pod -n flux-system -l app=source-controller | grep -A 5 "Last State"
```

**Fix:**

Increase the source controller resource limits:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          resources:
            limits:
              memory: 1Gi
              cpu: "1"
            requests:
              memory: 256Mi
              cpu: 100m
```

## Common Failure: Artifact Size Limits

Very large repositories may produce artifacts that exceed storage limits.

**Symptoms:**

```yaml
Status:
  Conditions:
    - type: Ready
      status: "False"
      reason: BuildFailed
      message: "artifact size exceeds limit"
```

**Fix:**

Use exclude patterns to remove large files from the artifact:

```yaml
spec:
  artifacts:
    - path: "apps/data-service/**"
      exclude:
        - "apps/data-service/testdata/**"
        - "apps/data-service/**/*.bin"
        - "apps/data-service/**/*.tar.gz"
```

## Debugging with Source Controller Logs

For deeper investigation, check the source controller logs:

```bash
kubectl logs -n flux-system deploy/source-controller | grep artifactgenerator
```

Increase log verbosity for more detail:

```bash
kubectl logs -n flux-system deploy/source-controller --tail=100 | grep -i "error\|fail\|my-app"
```

## Debugging with Events

Kubernetes events provide a timeline of what happened:

```bash
kubectl events --for artifactgenerator/my-app -n flux-system
```

This shows reconciliation attempts, successes, and failures in chronological order.

## Verifying Downstream Impact

When an ArtifactGenerator fails, check which downstream resources are affected:

```bash
# Find Kustomizations referencing this ArtifactGenerator
kubectl get kustomizations -n flux-system -o yaml | grep -B 5 "my-app"

# Check their status
flux get kustomizations
```

Downstream resources will show a stale revision and may report that their source is not ready.

## Recovery Procedure

After fixing the root cause, force reconciliation to verify the fix:

```bash
# Reconcile the source first
flux reconcile source git platform-repo

# Then reconcile the ArtifactGenerator
kubectl annotate --overwrite artifactgenerator/my-app \
  reconcile.fluxcd.io/requestedAt="$(date +%s)" \
  -n flux-system

# Verify recovery
kubectl get artifactgenerators -n flux-system
```

## Conclusion

ArtifactGenerator build failures in Flux are usually caused by source issues, path pattern mismatches, or resource constraints. The debugging workflow follows a consistent pattern: check the ArtifactGenerator status, examine the source status, review the path patterns, and inspect the source controller logs. By systematically working through these steps, you can quickly identify and resolve most ArtifactGenerator build failures and get your GitOps pipeline back on track.
