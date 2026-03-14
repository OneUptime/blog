# How to Troubleshoot Image Reflector Controller Pod Crashes in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Image Reflector Controller, Pod Crashes, Container Registry, Image Automation

Description: Learn how to diagnose and fix Image Reflector Controller pod crashes in Flux, including registry authentication failures, excessive image scanning, and memory issues.

---

The Image Reflector Controller scans container registries to discover new image tags and digests. It works in tandem with the Image Automation Controller to automatically update container image references in your Git repositories. When this controller crashes, image update automation stops working. This guide covers how to diagnose and fix Image Reflector Controller pod crashes.

## Prerequisites

Before you begin, ensure you have the following:

- A Kubernetes cluster with Flux installed, including the image automation components
- kubectl configured to access your cluster
- Permissions to view pods, logs, and events in the flux-system namespace

## Step 1: Check Pod Status

Check the Image Reflector Controller pod:

```bash
kubectl get pods -n flux-system -l app=image-reflector-controller
```

Get detailed information:

```bash
kubectl describe pod -n flux-system -l app=image-reflector-controller
```

## Step 2: Review Logs

Check the logs from the crashed container:

```bash
kubectl logs -n flux-system deploy/image-reflector-controller --previous
```

Review current logs:

```bash
kubectl logs -n flux-system deploy/image-reflector-controller --tail=200
```

## Step 3: Identify Common Crash Causes

### OOMKilled from Scanning Large Registries

The Image Reflector Controller loads image tag lists into memory. Registries with thousands of tags for a single image can cause the controller to run out of memory:

```bash
kubectl get pod -n flux-system -l app=image-reflector-controller -o jsonpath='{.items[0].status.containerStatuses[0].lastState.terminated.reason}'
```

If `OOMKilled`, increase memory limits:

```bash
kubectl patch deployment image-reflector-controller -n flux-system --type='json' -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/resources/limits/memory", "value": "1Gi"}]'
```

Also consider reducing the scope of image scanning by using tag filters in your ImagePolicy:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^main-[a-f0-9]+-(?P<ts>[0-9]+)'
    extract: '$ts'
  policy:
    numerical:
      order: asc
```

### Registry Authentication Failures

If registry credentials are missing, expired, or misconfigured, the controller may crash during scanning:

```bash
kubectl logs -n flux-system deploy/image-reflector-controller | grep -i "auth\|unauthorized\|forbidden\|401\|403"
```

Verify the image repository configuration and associated secrets:

```bash
kubectl get imagerepositories -n flux-system
kubectl describe imagerepository <repo-name> -n flux-system
```

Check if the registry secret exists and is valid:

```bash
kubectl get secret <registry-secret> -n flux-system
```

### Too Many ImageRepository Resources

Scanning many registries simultaneously can overwhelm the controller. Check how many ImageRepository resources exist:

```bash
kubectl get imagerepositories --all-namespaces | wc -l
```

If you have a large number, consider reducing scan intervals for non-critical images:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: non-critical-app
  namespace: flux-system
spec:
  image: registry.example.com/non-critical-app
  interval: 30m
```

### Database Corruption

The Image Reflector Controller uses an internal database to cache scan results. If this database becomes corrupted, the controller may crash on startup:

```bash
kubectl logs -n flux-system deploy/image-reflector-controller | grep -i "database\|badger\|corrupt"
```

To recover from database corruption, delete the controller pod and its persistent storage so a fresh database is created:

```bash
kubectl delete pod -n flux-system -l app=image-reflector-controller
```

### Rate Limiting by Container Registries

Container registries like Docker Hub impose rate limits. If the controller hits these limits, it may crash or enter a crash loop:

```bash
kubectl logs -n flux-system deploy/image-reflector-controller | grep -i "rate limit\|429\|too many requests"
```

Increase scan intervals and authenticate with the registry to get higher rate limits:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: docker.io/myorg/my-app
  interval: 10m
  secretRef:
    name: dockerhub-credentials
```

## Step 4: Check Resource Usage

Monitor the controller resource consumption:

```bash
kubectl top pod -n flux-system -l app=image-reflector-controller
```

## Step 5: Restart and Verify

Restart the controller:

```bash
kubectl rollout restart deployment/image-reflector-controller -n flux-system
kubectl rollout status deployment/image-reflector-controller -n flux-system
```

Verify image repositories are being scanned:

```bash
flux get image repository --all-namespaces
```

## Prevention Tips

- Use tag filters in ImagePolicy resources to reduce the number of tags scanned
- Set appropriate scan intervals based on how frequently images are published
- Authenticate with container registries to avoid rate limiting
- Monitor the controller memory usage and set alerts for approaching limits
- Keep the number of ImageRepository resources manageable
- Use private registries with higher rate limits for production workloads
- Run `flux check` regularly to verify all controllers are healthy

## Summary

Image Reflector Controller pod crashes are commonly caused by memory exhaustion from large tag lists, registry authentication failures, rate limiting, or database corruption. Using tag filters to narrow scan scope, authenticating with registries, and properly sizing memory limits will resolve most crash scenarios. Regular monitoring and appropriate scan intervals are the best preventive measures.
