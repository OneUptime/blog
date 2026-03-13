# How to Configure ArtifactGenerator Reconciliation Interval

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux, fluxcd, artifactgenerator, reconciliation, interval, gitops, kubernetes

Description: Learn how to configure and tune the reconciliation interval for ArtifactGenerator resources in Flux for optimal performance.

---

## Introduction

The reconciliation interval determines how frequently Flux checks whether an ArtifactGenerator needs to produce a new artifact. Setting this interval correctly is a balancing act between responsiveness (how quickly changes are detected) and efficiency (how much load is placed on the cluster). This post covers how to configure the ArtifactGenerator reconciliation interval, including strategies for different scenarios and guidance on choosing appropriate values.

## Prerequisites

- A Kubernetes cluster (v1.28 or later)
- Flux 2.8 installed on your cluster
- One or more ArtifactGenerator resources deployed
- kubectl configured to access your cluster

## Understanding the Reconciliation Interval

The `spec.interval` field on an ArtifactGenerator defines the maximum time between reconciliation checks. During each reconciliation, Flux:

1. Fetches the latest artifact from the referenced source
2. Evaluates which files match the configured path patterns
3. Computes a checksum of the matching files
4. If the checksum differs from the previous artifact, generates a new artifact
5. Updates the ArtifactGenerator status with the new artifact information

The interval acts as a polling period. If your source (GitRepository) has webhook-based notifications configured, reconciliation can happen more frequently when changes are pushed.

## Basic Interval Configuration

The interval is specified as a duration string in the ArtifactGenerator spec:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1alpha1
kind: ArtifactGenerator
metadata:
  name: app-manifests
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: platform-repo
  paths:
    include:
      - "apps/my-service/**"
```

Common duration formats:
- `30s` - 30 seconds
- `1m` - 1 minute
- `5m` - 5 minutes
- `10m` - 10 minutes
- `1h` - 1 hour

## Choosing the Right Interval

The right interval depends on several factors:

### For Development Environments

Development environments benefit from shorter intervals for faster feedback:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1alpha1
kind: ArtifactGenerator
metadata:
  name: dev-app
  namespace: flux-system
spec:
  interval: 1m
  sourceRef:
    kind: GitRepository
    name: dev-repo
  paths:
    include:
      - "apps/my-service/**"
```

A 1-minute interval means changes are picked up within 1 minute of the source detecting a new revision.

### For Staging Environments

Staging environments can use a moderate interval:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1alpha1
kind: ArtifactGenerator
metadata:
  name: staging-app
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: staging-repo
  paths:
    include:
      - "apps/my-service/**"
```

### For Production Environments

Production environments can afford longer intervals, especially if combined with webhook notifications:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1alpha1
kind: ArtifactGenerator
metadata:
  name: prod-app
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: prod-repo
  paths:
    include:
      - "apps/my-service/**"
```

### For Rarely Changing Infrastructure

Infrastructure components like CRD definitions or namespace configurations change infrequently:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1alpha1
kind: ArtifactGenerator
metadata:
  name: crds
  namespace: flux-system
spec:
  interval: 1h
  sourceRef:
    kind: GitRepository
    name: platform-repo
  paths:
    include:
      - "infrastructure/crds/**"
```

## Relationship Between Source and ArtifactGenerator Intervals

The ArtifactGenerator interval and the GitRepository interval work together. The effective detection time is at most the sum of both intervals:

```yaml
# GitRepository checks for new commits every 5 minutes
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: platform-repo
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/my-org/platform
  ref:
    branch: main
---
# ArtifactGenerator checks for path changes every 5 minutes
apiVersion: source.toolkit.fluxcd.io/v1alpha1
kind: ArtifactGenerator
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: platform-repo
  paths:
    include:
      - "apps/my-app/**"
```

In the worst case, a change takes up to 10 minutes to be detected (5 minutes for the GitRepository to detect the new commit, plus 5 minutes for the ArtifactGenerator to process it). In the best case (webhook notification), it can be nearly instant.

## Forcing Immediate Reconciliation

You can trigger an immediate reconciliation using the Flux CLI:

```bash
flux reconcile source git platform-repo
```

This forces the GitRepository to check for new commits immediately. If a new commit is found, all ArtifactGenerators referencing it will also reconcile.

You can also annotate the ArtifactGenerator directly:

```bash
kubectl annotate --overwrite artifactgenerator/my-app \
  reconcile.fluxcd.io/requestedAt="$(date +%s)" \
  -n flux-system
```

## Suspending Reconciliation

To temporarily stop an ArtifactGenerator from reconciling (for example, during maintenance):

```yaml
apiVersion: source.toolkit.fluxcd.io/v1alpha1
kind: ArtifactGenerator
metadata:
  name: my-app
  namespace: flux-system
spec:
  suspend: true
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: platform-repo
  paths:
    include:
      - "apps/my-app/**"
```

Or use the CLI:

```bash
flux suspend source artifactgenerator my-app
```

Resume with:

```bash
flux resume source artifactgenerator my-app
```

## Performance Considerations

When tuning intervals, keep these factors in mind:

- **Number of ArtifactGenerators**: More generators mean more reconciliation work. If you have 50 ArtifactGenerators all at 1-minute intervals, the source controller handles 50 reconciliations per minute.
- **Repository size**: Larger repositories take longer to process. If artifact generation takes 30 seconds, setting a 30-second interval creates constant processing.
- **API server load**: Each reconciliation involves Kubernetes API calls. Very short intervals increase API server load.
- **Network bandwidth**: Each reconciliation may involve fetching the source artifact over the network.

A good rule of thumb is to set the ArtifactGenerator interval equal to or longer than the source interval.

## Conclusion

The ArtifactGenerator reconciliation interval is a key tuning parameter that affects both the responsiveness and efficiency of your GitOps pipeline. Start with the defaults (5 minutes is reasonable for most cases), then adjust based on your specific requirements. Use shorter intervals for development environments where fast feedback matters, and longer intervals for production infrastructure that changes rarely. Combine with webhook notifications for the best balance of responsiveness and efficiency.
