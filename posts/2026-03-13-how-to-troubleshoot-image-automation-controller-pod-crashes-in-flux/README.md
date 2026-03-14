# How to Troubleshoot Image Automation Controller Pod Crashes in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Image Automation Controller, Pod Crashes, Image Updates, Automation

Description: Learn how to diagnose and fix Image Automation Controller pod crashes in Flux, including Git push failures, SSH key issues, and commit signing problems.

---

The Image Automation Controller works together with the Image Reflector Controller to automate container image updates. It writes updated image references back to your Git repository by creating commits and pushing changes. When this controller crashes, automatic image updates stop and your deployments will not receive new container images. This guide walks you through diagnosing and resolving Image Automation Controller pod crashes.

## Prerequisites

Before you begin, ensure you have the following:

- A Kubernetes cluster with Flux installed, including the image automation components
- kubectl configured to access your cluster
- Permissions to view pods, logs, and events in the flux-system namespace

## Step 1: Check Pod Status

Check the Image Automation Controller pod:

```bash
kubectl get pods -n flux-system -l app=image-automation-controller
```

Get detailed information:

```bash
kubectl describe pod -n flux-system -l app=image-automation-controller
```

## Step 2: Review Logs

Check logs from the previous crashed instance:

```bash
kubectl logs -n flux-system deploy/image-automation-controller --previous
```

Review current logs:

```bash
kubectl logs -n flux-system deploy/image-automation-controller --tail=200
```

## Step 3: Identify Common Crash Causes

### Git Authentication Failures

The Image Automation Controller needs write access to your Git repository. If SSH keys or tokens are missing or expired, the controller may crash:

```bash
kubectl logs -n flux-system deploy/image-automation-controller | grep -i "auth\|ssh\|permission denied\|publickey"
```

Verify the Git credentials secret:

```bash
kubectl get secret -n flux-system <git-credentials-secret>
```

Ensure the SSH key or token has write access to the target repository and branch:

```bash
kubectl get imageupdateautomations -n flux-system -o jsonpath='{.items[*].spec.git.push.branch}'
```

### Git Push Conflicts

If multiple ImageUpdateAutomation resources try to update the same branch simultaneously, or if there are upstream changes that conflict with the automated commits, the controller may crash:

```bash
kubectl logs -n flux-system deploy/image-automation-controller | grep -i "conflict\|push\|rejected\|non-fast-forward"
```

Ensure each ImageUpdateAutomation writes to its own branch or uses a dedicated automation branch:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: my-app-automation
  namespace: flux-system
spec:
  git:
    push:
      branch: flux-image-updates
    checkout:
      ref:
        branch: main
```

### Commit Signing Configuration Errors

If the controller is configured to sign commits with GPG and the signing key is missing or misconfigured, the controller may crash:

```bash
kubectl logs -n flux-system deploy/image-automation-controller | grep -i "gpg\|sign\|pgp"
```

Verify the signing key secret exists:

```bash
kubectl get secret -n flux-system <signing-key-secret>
```

### OOMKilled from Large Repositories

If the Git repository being cloned is very large, the controller may run out of memory during checkout:

```bash
kubectl get pod -n flux-system -l app=image-automation-controller -o jsonpath='{.items[0].status.containerStatuses[0].lastState.terminated.reason}'
```

Increase memory limits:

```bash
kubectl patch deployment image-automation-controller -n flux-system --type='json' -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/resources/limits/memory", "value": "1Gi"}]'
```

Consider using shallow clones or keeping your repository size manageable by avoiding large binary files.

### Invalid Marker Patterns

The controller uses markers in your manifest files to know which image references to update. Invalid markers can cause parsing errors:

```bash
kubectl logs -n flux-system deploy/image-automation-controller | grep -i "marker\|pattern\|parse"
```

Verify your image markers follow the correct format:

```yaml
# In your deployment manifest
spec:
  containers:
  - name: app
    image: registry.example.com/app:1.0.0 # {"$imagepolicy": "flux-system:my-app"}
```

## Step 4: Check ImageUpdateAutomation Status

Review the status of all ImageUpdateAutomation resources:

```bash
flux get image update --all-namespaces
```

Look for resources with error conditions:

```bash
kubectl get imageupdateautomations --all-namespaces -o jsonpath='{range .items[*]}{.metadata.namespace}{"\t"}{.metadata.name}{"\t"}{.status.conditions[0].message}{"\n"}{end}'
```

## Step 5: Restart and Verify

Restart the controller:

```bash
kubectl rollout restart deployment/image-automation-controller -n flux-system
kubectl rollout status deployment/image-automation-controller -n flux-system
```

Trigger a reconciliation to verify the fix:

```bash
flux reconcile image update <automation-name> -n flux-system
```

## Prevention Tips

- Use dedicated branches for image automation to avoid push conflicts
- Rotate Git credentials before they expire and set up alerts for credential expiration
- Keep Git repositories lean by avoiding large binary files
- Validate image markers in CI before merging changes
- Monitor the controller for restart counts and set alerts
- Use separate ImageUpdateAutomation resources for different environments to reduce contention
- Test Git write access periodically to catch permission issues early

## Summary

Image Automation Controller pod crashes are typically caused by Git authentication failures, push conflicts, commit signing misconfigurations, or memory exhaustion from large repositories. Ensuring proper Git credentials, using dedicated automation branches, and validating marker patterns will resolve most crash scenarios. Regular credential rotation and access testing are effective preventive measures.
