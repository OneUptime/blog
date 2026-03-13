# How to Configure Image Automation Interval for Registry Scanning in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Image Automation, Kubernetes, GitOps, Container Registry, ImageRepository, Scanning

Description: Learn how to configure the scanning interval for container image registries in Flux image automation to control how frequently new tags are detected.

---

## Introduction

Flux image automation continuously monitors container image registries for new tags and can automatically update your deployment manifests when new images are detected. A key setting in this process is the scanning interval, which determines how frequently Flux queries the registry for new image tags.

Setting the right interval requires balancing between responsiveness and resource usage. A very short interval means faster detection of new images but increases load on both the Flux controllers and the container registry. A longer interval reduces resource usage but introduces delay between when an image is pushed and when Flux detects it.

This guide explains how to configure the scanning interval on ImageRepository resources and related considerations for production environments.

## Prerequisites

Before you begin, ensure you have:

- A Kubernetes cluster with Flux CD installed (v2.0 or later)
- The Flux image-reflector-controller and image-automation-controller installed
- A container registry accessible from the cluster
- kubectl access to the cluster
- Basic understanding of Flux image automation components

## Understanding the ImageRepository Resource

The ImageRepository resource tells Flux which container image to monitor. The `spec.interval` field controls how often Flux scans the registry for new tags:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: ghcr.io/myorg/my-app
  interval: 5m
```

In this example, Flux queries the registry every 5 minutes to check for new tags matching the configured policies.

## Setting a Custom Scan Interval

To change how frequently Flux scans for new images, modify the `interval` field. A 1-minute interval provides near real-time detection of new images and is suitable for development environments where you want fast feedback on new builds:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: ghcr.io/myorg/my-app
  interval: 1m
```

For production environments where image updates are less frequent and controlled, a longer interval is appropriate:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: ghcr.io/myorg/my-app
  interval: 30m
```

## Configuring Scan Interval with Authentication

When scanning private registries, combine the interval setting with registry credentials:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: 123456789.dkr.ecr.us-east-1.amazonaws.com/my-app
  interval: 10m
  secretRef:
    name: ecr-credentials
```

The referenced secret contains the registry authentication credentials:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: ecr-credentials
  namespace: flux-system
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: <base64-encoded-docker-config>
```

For registries with rate limits like Docker Hub, use a longer interval to avoid hitting those limits.

## Limiting Tag Scanning with Exclusion List

To reduce the amount of data fetched on each scan, you can exclude tags that are not relevant:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: ghcr.io/myorg/my-app
  interval: 5m
  exclusionList:
    - "^.*\\.sig$"
    - "^sha-"
```

The `exclusionList` uses regular expressions to skip tags that match the patterns. This reduces processing time and memory usage during each scan cycle, which is especially important with shorter intervals.

## Multiple ImageRepositories with Different Intervals

In a typical setup, you may monitor multiple images with different scan frequencies based on their importance:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: frontend
  namespace: flux-system
spec:
  image: ghcr.io/myorg/frontend
  interval: 2m
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: backend-api
  namespace: flux-system
spec:
  image: ghcr.io/myorg/backend-api
  interval: 5m
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: batch-processor
  namespace: flux-system
spec:
  image: ghcr.io/myorg/batch-processor
  interval: 30m
```

Critical services like the frontend can use a shorter interval for faster updates, while batch processing applications that change infrequently use a longer interval.

## Pairing with ImagePolicy

The ImageRepository scan interval works together with the ImagePolicy resource, which defines the rules for selecting which tag to use:

```yaml
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
      range: ">=1.0.0"
```

Each time the ImageRepository scans at its configured interval, the ImagePolicy evaluates the discovered tags against its policy rules and selects the latest matching tag.

## Monitoring Scan Activity

Check the status of your ImageRepository to verify the scan interval is working:

```bash
flux get image repository my-app -n flux-system
```

This shows the last scan time, the number of tags discovered, and any errors. For more detail:

```bash
kubectl describe imagerepository my-app -n flux-system
```

Look at the `Status.LastScanResult` field to see the timestamp and tag count from the most recent scan.

## Performance Considerations

Each scan involves an API call to the container registry to list tags. Consider these factors when choosing your interval:

Registry rate limits vary by provider. Docker Hub has pull rate limits, while cloud provider registries like ECR, GCR, and ACR typically have higher or no rate limits for authenticated requests. If you run many ImageRepositories, the combined scan frequency can add up.

The image-reflector-controller processes scans sequentially within each reconciliation loop. A very large number of ImageRepositories with short intervals can cause a backlog. Monitor the controller's CPU and memory usage and adjust intervals accordingly:

```bash
kubectl top pod -n flux-system -l app=image-reflector-controller
```

## Conclusion

The scan interval on ImageRepository resources is a straightforward but important configuration in Flux image automation. Shorter intervals provide faster detection of new images at the cost of higher registry API usage, while longer intervals are more efficient but introduce delay. Choose intervals based on your deployment cadence, registry rate limits, and the number of images you monitor. Use exclusion lists to reduce scan overhead, and monitor the image-reflector-controller to ensure it keeps up with the configured scan frequencies.
