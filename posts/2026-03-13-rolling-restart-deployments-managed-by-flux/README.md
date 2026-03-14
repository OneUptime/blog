# How to Perform Rolling Restart of Deployments Managed by Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Day 2 Operations, Rolling Restart, Troubleshooting

Description: Trigger rolling restarts of Flux-managed deployments without committing to Git, using the correct techniques that preserve GitOps integrity.

---

## Introduction

Rolling restarts are a common day-two operation: you need all pods in a deployment to restart to pick up a new environment variable from a mounted secret, to recover from a degraded state, or to force a new image pull after a mutable tag was updated. In a GitOps world managed by Flux, the naive approach — running `kubectl rollout restart` — creates a challenge. Flux may reconcile the Deployment back to its declared state and restart the pods again or undo your restart.

The good news is that `kubectl rollout restart` adds a `kubectl.kubernetes.io/restartedAt` annotation to the pod template, and Flux's field management actually preserves this annotation because it is not declared in Git. The restart proceeds safely. However, there are nuances worth understanding to avoid surprises, and there are Flux-native approaches that work even better.

In this guide you will learn the correct ways to perform rolling restarts of Flux-managed deployments, understand when each approach is appropriate, and configure your workflow to avoid reconciliation race conditions.

## Prerequisites

- Flux CD v2 managing one or more Deployments
- kubectl access to the cluster
- Flux CLI installed

## Step 1: Understand How Flux Manages Deployments

Before performing a rolling restart, understand how Flux applies manifests. Flux uses server-side apply with a specific field manager (`gotk-sync-manager` or `manager`). Only fields declared in Git manifests are owned by Flux. The `restartedAt` annotation is not in your Git manifests, so Flux will not overwrite it.

Check which fields Flux owns:

```bash
# View field managers for a deployment
kubectl get deployment my-service -n team-alpha \
  -o jsonpath='{.metadata.managedFields}' | jq '.[] | {manager: .manager, fields: .fieldsV1}'
```

## Step 2: Perform a Rolling Restart with kubectl

The standard approach works correctly for most Flux-managed Deployments:

```bash
# Restart a specific deployment
kubectl rollout restart deployment/my-service -n team-alpha

# Watch the rollout progress
kubectl rollout status deployment/my-service -n team-alpha --watch

# Verify pods have been replaced
kubectl get pods -n team-alpha -l app=my-service --sort-by='.metadata.creationTimestamp'
```

Verify the annotation was added:

```bash
kubectl get deployment my-service -n team-alpha \
  -o jsonpath='{.spec.template.metadata.annotations.kubectl\.kubernetes\.io/restartedAt}'
# Output: 2026-03-13T10:00:00Z
```

## Step 3: Use Flux Reconciliation to Trigger Restart via Git

If you want the restart recorded in Git history, add a timestamp annotation to the pod template in your manifest:

```yaml
# deploy/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        # Bump this timestamp to trigger a rolling restart via GitOps
        platform.io/restartedAt: "2026-03-13T10:00:00Z"
    spec:
      containers:
        - name: my-service
          image: ghcr.io/acme/my-service:v1.5.0
```

Committing a change to this annotation triggers a rolling restart through Flux without changing the actual application configuration.

## Step 4: Force Flux Reconciliation Before Restart

If you need Flux to pick up a change from Git before the restart, force reconciliation first:

```bash
# Force immediate reconciliation of the GitRepository source
flux reconcile source git flux-system

# Force immediate reconciliation of the specific Kustomization
flux reconcile kustomization my-service -n team-alpha

# Wait for reconciliation to complete
flux get kustomization my-service -n team-alpha --watch
```

Then perform the restart:

```bash
kubectl rollout restart deployment/my-service -n team-alpha
```

## Step 5: Restart All Deployments in a Namespace

When you need to restart all Flux-managed deployments in a namespace (for example, after rotating secrets):

```bash
# Restart all deployments in the namespace
kubectl rollout restart deployment -n team-alpha

# Monitor all rollouts
kubectl get deployments -n team-alpha -w
```

## Step 6: Automate Restart After Secret Rotation

Use the reloader pattern to automatically restart deployments when secrets or ConfigMaps change.

```yaml
# Install Stakater Reloader via Flux HelmRelease
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: reloader
  namespace: reloader-system
spec:
  interval: 10m
  chart:
    spec:
      chart: reloader
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: stakater
        namespace: flux-system
```

Annotate your Deployment to use Reloader:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
  annotations:
    # Automatically restart when any secret or configmap mounted by this deployment changes
    reloader.stakater.com/auto: "true"
    # Or specify exactly which secrets/configmaps to watch:
    # secret.reloader.stakater.com/reload: "my-service-credentials"
    # configmap.reloader.stakater.com/reload: "my-service-config"
```

## Best Practices

- Prefer `kubectl rollout restart` over editing the running Deployment directly; it adds an annotation that Flux respects
- Use the Stakater Reloader for deployments that mount secrets or ConfigMaps that rotate frequently
- Record manual restarts in your incident log — even though they don't go through Git, they should be documented
- Use `flux reconcile kustomization --with-source` to ensure the latest Git state is applied before a restart
- Test rolling restarts during off-peak hours the first time to verify no traffic disruption with your ingress setup
- Use `kubectl rollout undo deployment/my-service` to roll back if the restart exposes a previously masked issue

## Conclusion

Rolling restarts in Flux-managed clusters are straightforward when you understand the field ownership model. The `kubectl rollout restart` command adds an annotation that Flux does not own and therefore does not revert, making it the correct tool for ad-hoc restarts. For restarts that should be tracked in Git history, the pod template annotation pattern provides a clean GitOps-native approach. For automated restarts after secret rotation, Stakater Reloader provides the best developer experience.
