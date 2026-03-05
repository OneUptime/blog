# How to Configure ImageRepository Scan Interval in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Image Automation, ImageRepository, Scan Interval, Performance

Description: Learn how to configure and optimize the scan interval for Flux ImageRepository resources to balance freshness and performance.

---

The scan interval of a Flux ImageRepository determines how frequently the image reflector controller queries the container registry for new image tags. Choosing the right interval is important for balancing between rapid detection of new images and avoiding unnecessary load on your registry. This guide covers how to configure scan intervals and best practices for optimization.

## Prerequisites

- A Kubernetes cluster with Flux and image automation controllers installed
- At least one ImageRepository resource configured
- kubectl access to your cluster

## Understanding the Scan Interval

The `interval` field in the ImageRepository spec defines how often the image reflector controller scans the container registry. The value uses Go duration format:

- `1m0s` -- every 1 minute
- `5m0s` -- every 5 minutes
- `30m0s` -- every 30 minutes
- `1h0m0s` -- every 1 hour

The default interval if not specified is `5m0s`.

## Step 1: Set a Basic Scan Interval

Here is an ImageRepository with a 10-minute scan interval.

```yaml
# imagerepository-interval.yaml
# Scan the image every 10 minutes
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: docker.io/myorg/my-app
  interval: 10m0s
```

Apply the manifest.

```bash
# Apply the ImageRepository with a custom interval
kubectl apply -f imagerepository-interval.yaml
```

## Step 2: Choose the Right Interval for Your Use Case

Different environments and images warrant different intervals.

**Production images with frequent releases (CI/CD pipeline):**

```yaml
# Fast scan for production images with frequent releases
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app-prod
  namespace: flux-system
spec:
  image: ghcr.io/my-org/my-app
  interval: 1m0s
```

**Stable third-party images that change infrequently:**

```yaml
# Slow scan for stable third-party images
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: nginx
  namespace: flux-system
spec:
  image: docker.io/library/nginx
  interval: 1h0m0s
```

**Development images:**

```yaml
# Moderate scan for development images
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app-dev
  namespace: flux-system
spec:
  image: ghcr.io/my-org/my-app
  interval: 2m0s
```

## Step 3: Understand the Impact of Short Intervals

Setting a very short interval has consequences:

1. **Registry rate limits** -- Many registries enforce API rate limits. Docker Hub limits unauthenticated users to 100 pulls per 6 hours. A 1-minute interval could exhaust this quickly if you have many ImageRepository resources.
2. **Controller resource usage** -- The image reflector controller uses more CPU and memory when scanning frequently.
3. **Network bandwidth** -- Each scan requires network calls to the registry API.

## Step 4: Estimate API Call Volume

Calculate the number of API calls per hour based on your scan intervals.

```bash
# Formula: API calls per hour = (60 / interval_in_minutes) * number_of_repositories
# Example: 10 repositories at 5-minute intervals = (60/5) * 10 = 120 calls/hour
echo "With 10 repos at 5m interval: $((60 / 5 * 10)) calls/hour"
echo "With 10 repos at 1m interval: $((60 / 1 * 10)) calls/hour"
echo "With 10 repos at 30m interval: $((60 / 30 * 10)) calls/hour"
```

## Step 5: Optimize Scan Intervals with Exclusion Lists

Combine longer intervals with exclusion lists to reduce the processing time for each scan.

```yaml
# imagerepository-optimized.yaml
# Optimized scan with exclusion list and moderate interval
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: ghcr.io/my-org/my-app
  interval: 5m0s
  exclusionList:
    # Exclude non-release tags to reduce processing
    - "^sha-"
    - "^dev-"
    - "^test-"
    - "^latest$"
```

## Step 6: Use Suspend to Pause Scanning

If you need to temporarily stop scanning an image, use the `suspend` field instead of setting an extremely long interval.

```yaml
# imagerepository-suspended.yaml
# Temporarily suspend scanning
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: ghcr.io/my-org/my-app
  interval: 5m0s
  suspend: true
```

You can also suspend and resume using the Flux CLI.

```bash
# Suspend scanning for an ImageRepository
flux suspend image repository my-app -n flux-system

# Resume scanning
flux resume image repository my-app -n flux-system
```

## Step 7: Trigger a Manual Scan

If you need an immediate scan without waiting for the next interval, reconcile the resource manually.

```bash
# Trigger an immediate scan of the ImageRepository
flux reconcile image repository my-app -n flux-system
```

## Step 8: Monitor Scan Performance

Check when the last scan occurred and how long it took.

```bash
# Check the last scan time for all ImageRepositories
flux get image repository -n flux-system

# Get detailed timing information
kubectl get imagerepository -n flux-system -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.lastScanResult.scanTime}{"\n"}{end}'
```

## Recommended Intervals by Scenario

| Scenario | Recommended Interval |
|---|---|
| CI/CD pipeline images (own apps) | 1m - 5m |
| Staging environment images | 5m - 10m |
| Third-party base images | 30m - 1h |
| Rarely updated images | 1h - 6h |
| Development/testing | 1m - 2m |

## Troubleshooting

- **Scans not happening on schedule**: Check if the image reflector controller is running and healthy.
- **Rate limit errors after interval change**: Increase the interval or add authentication to get higher rate limits.

```bash
# Check image reflector controller health
kubectl get pods -n flux-system -l app=image-reflector-controller

# Check logs for scan timing issues
kubectl logs -n flux-system deployment/image-reflector-controller | grep -i "scan\|interval\|reconcil"
```

## Summary

You have learned how to configure and optimize the scan interval for Flux ImageRepository resources. The right interval depends on how frequently your images change, your registry rate limits, and your tolerance for delay in detecting new tags. By combining appropriate intervals with exclusion lists and manual reconciliation, you can build an efficient image scanning setup.
