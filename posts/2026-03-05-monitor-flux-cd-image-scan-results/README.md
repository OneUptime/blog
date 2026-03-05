# How to Monitor Flux CD Image Scan Results

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Image Scanning, Monitoring, Image Reflector

Description: Learn how to monitor image scan results from Flux CD's image-reflector-controller to track discovered tags and troubleshoot image automation issues.

---

Flux CD's image-reflector-controller scans container registries to discover available image tags. Monitoring these scan results is essential for verifying that your image automation pipeline is working correctly and for troubleshooting issues when new images are not being detected or deployed.

## Understanding Image Scanning in Flux

The image-reflector-controller performs two main functions:

1. **ImageRepository**: Scans a container registry at regular intervals and stores the discovered tags.
2. **ImagePolicy**: Evaluates the discovered tags against a policy (semver, alphabetical, or numerical) and selects the latest matching tag.

Monitoring both of these resources gives you visibility into the entire image detection pipeline.

## Checking ImageRepository Status

The simplest way to monitor scan results is through the Flux CLI:

```bash
# List all image repositories and their status
flux get image repository --all-namespaces

# Get detailed information about a specific repository
flux get image repository myapp -n flux-system
```

The output shows the last scan time, the number of tags discovered, and the latest tag:

```
NAME    LAST SCAN                 SUSPENDED   READY   MESSAGE
myapp   2026-03-05T14:30:00Z      False       True    successful scan: found 47 tags
```

For more detail, use kubectl:

```bash
kubectl describe imagerepository myapp -n flux-system
```

This shows the full status including the `Last Scan Result` with tag count and scan time.

## Checking ImagePolicy Status

Monitor which tag each policy has selected:

```bash
# List all image policies
flux get image policy --all-namespaces

# Get a specific policy
flux get image policy myapp -n flux-system
```

Output:

```
NAME    LATEST IMAGE                           READY   MESSAGE
myapp   docker.io/myorg/myapp:v1.5.2          True    Latest image tag for 'docker.io/myorg/myapp' resolved to v1.5.2
```

## Prometheus Metrics for Image Scanning

The image-reflector-controller exposes Prometheus metrics that provide quantitative monitoring data.

### Key Metrics

```promql
# Number of tags discovered per image repository
gotk_image_repository_last_scan_tag_count{name="myapp", namespace="flux-system"}

# Scan duration
gotk_reconcile_duration_seconds{kind="ImageRepository", name="myapp"}

# Scan success/failure
gotk_reconcile_condition{kind="ImageRepository", type="Ready", status="True"}
gotk_reconcile_condition{kind="ImageRepository", type="Ready", status="False"}

# Image policy latest selected tag
gotk_reconcile_condition{kind="ImagePolicy", type="Ready"}
```

### Alerting Rules

Set up Prometheus alerts for scan failures:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-image-scan-alerts
  namespace: monitoring
spec:
  groups:
    - name: flux.image.scanning
      rules:
        - alert: FluxImageScanFailing
          expr: gotk_reconcile_condition{kind="ImageRepository", type="Ready", status="False"} == 1
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "Image scan failing for {{ $labels.name }}"
            description: "ImageRepository {{ $labels.namespace }}/{{ $labels.name }} has been failing for 15 minutes."

        - alert: FluxImagePolicyStale
          expr: |
            time() - gotk_reconcile_condition{kind="ImagePolicy", type="Ready", status="True"} > 3600
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Image policy {{ $labels.name }} has not been updated in over an hour"
```

## Flux Notification Alerts

Use Flux's notification-controller to send alerts about image scan events:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack
  namespace: flux-system
spec:
  type: slack
  channel: flux-images
  secretRef:
    name: slack-webhook
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: image-scan-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: info
  eventSources:
    - kind: ImageRepository
      name: '*'
      namespace: flux-system
    - kind: ImagePolicy
      name: '*'
      namespace: flux-system
```

This sends a notification whenever an ImageRepository scan completes or an ImagePolicy selects a new tag.

## Building a Grafana Dashboard

Create a Grafana dashboard to visualize image scan data. Here are useful panels:

### Tag Count Over Time

```promql
gotk_image_repository_last_scan_tag_count
```

This shows the number of discovered tags for each repository, which can indicate whether old images are being cleaned up or accumulating.

### Scan Success Rate

```promql
sum(gotk_reconcile_condition{kind="ImageRepository", type="Ready", status="True"}) /
sum(gotk_reconcile_condition{kind="ImageRepository", type="Ready"})
```

### Policy Selection History

Track when policies select new tags by monitoring changes in the ImagePolicy status:

```bash
# Watch for policy changes in real time
flux get image policy --all-namespaces --watch
```

## Monitoring Scan Intervals

Ensure scans are running at the expected frequency. If a scan interval is set to 5 minutes but scans are only running every 30 minutes, there may be rate limiting or resource constraints:

```bash
# Check the configured interval
kubectl get imagerepository myapp -n flux-system -o jsonpath='{.spec.interval}'

# Check the last scan time
kubectl get imagerepository myapp -n flux-system -o jsonpath='{.status.lastScanResult.scanTime}'
```

## Monitoring Registry Authentication

Scan failures often stem from expired registry credentials. Monitor for authentication errors:

```bash
# Check for scan errors
kubectl get imagerepository myapp -n flux-system -o jsonpath='{.status.conditions[*].message}'
```

Common error messages include:

- `unauthorized: authentication required` - credentials are missing or expired
- `denied: requested access to the resource is denied` - insufficient permissions
- `timeout` - network connectivity issues to the registry

## Troubleshooting Scan Issues

**No tags found**: Verify the image path is correct. Check that the registry credentials have read access:

```bash
kubectl get imagerepository myapp -n flux-system -o yaml
```

**Scan interval not respected**: The controller processes reconciliations in order. If many ImageRepositories are configured, some may be delayed. Consider increasing controller resources or staggering scan intervals.

**Policy not selecting expected tag**: Check that the filter pattern matches the actual tags:

```bash
# List discovered tags
kubectl get imagerepository myapp -n flux-system -o jsonpath='{.status.lastScanResult.latestTags}'
```

**Rate limiting from registry**: Docker Hub and other registries have rate limits. If you scan many repositories frequently, you may hit limits. Increase the scan interval or use authenticated pulls for higher rate limits.

## Best Practices

1. **Set appropriate scan intervals**: High-priority applications can scan every 1-5 minutes. Less critical services can scan every 30-60 minutes.

2. **Monitor scan failures actively**: A failing scan means new images will not be detected. Alert on scan failures promptly.

3. **Track tag counts**: A steadily increasing tag count may indicate that your registry cleanup policies are not working.

4. **Use exclusion lists**: If your registry contains many irrelevant tags, use the `exclusionList` field on ImageRepository to reduce scan noise.

Monitoring image scan results ensures your automated deployment pipeline is healthy and responsive. By combining CLI checks, Prometheus metrics, and Flux notifications, you get comprehensive visibility into the image discovery process.
