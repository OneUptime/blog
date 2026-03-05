# How to Configure Flux CD Log Levels for Debugging

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Logging, Debugging, Troubleshooting

Description: Learn how to configure and adjust log levels for Flux CD controllers to enable detailed debugging and troubleshoot reconciliation issues.

---

## Understanding Flux CD Logging

Flux CD controllers use structured logging powered by the Go `logr` library with `klog` as the backend. By default, controllers log at a standard verbosity level that includes errors, warnings, and key informational messages. When troubleshooting issues, increasing the log verbosity reveals detailed information about reconciliation cycles, API calls, and internal decision-making.

Flux CD uses numeric log levels where higher numbers mean more verbose output:

| Level | Description |
|-------|-------------|
| 0 | Errors and critical information only (least verbose) |
| 1 | Standard operational messages (default) |
| 2 | Detailed reconciliation information |
| 3+ | Debug-level information including API calls |

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- `flux` CLI installed (v2.0+)
- `kubectl` configured to access your cluster

## Method 1: Change Log Level via Controller Arguments

Each Flux controller accepts a `--log-level` argument. The valid values are `debug`, `info`, `warn`, and `error`.

### Temporary Change (Direct Patch)

For quick debugging, patch the deployment directly:

```bash
# Set source-controller to debug log level
kubectl patch deployment source-controller -n flux-system --type=json \
  -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/args", "value": [
    "--events-addr=http://notification-controller.flux-system.svc.cluster.local./",
    "--watch-all-namespaces=true",
    "--log-level=debug",
    "--storage-path=/data",
    "--storage-adv-addr=source-controller.flux-system.svc.cluster.local."
  ]}]'
```

```bash
# Set helm-controller to debug log level
kubectl patch deployment helm-controller -n flux-system --type=json \
  -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/args", "value": [
    "--events-addr=http://notification-controller.flux-system.svc.cluster.local./",
    "--watch-all-namespaces=true",
    "--log-level=debug"
  ]}]'
```

```bash
# Set kustomize-controller to debug log level
kubectl patch deployment kustomize-controller -n flux-system --type=json \
  -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/args", "value": [
    "--events-addr=http://notification-controller.flux-system.svc.cluster.local./",
    "--watch-all-namespaces=true",
    "--log-level=debug"
  ]}]'
```

### Persistent Change (Kustomize Overlay)

For a GitOps-managed approach, use a Kustomize patch in your Flux bootstrap repository:

```yaml
# kustomization.yaml
# Configure log levels for all Flux controllers
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  # Set source-controller to debug logging
  - target:
      kind: Deployment
      name: source-controller
      namespace: flux-system
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: source-controller
      spec:
        template:
          spec:
            containers:
              - name: manager
                args:
                  - --events-addr=http://notification-controller.flux-system.svc.cluster.local./
                  - --watch-all-namespaces=true
                  - --log-level=debug
                  - --storage-path=/data
                  - --storage-adv-addr=source-controller.flux-system.svc.cluster.local.
  # Set helm-controller to debug logging
  - target:
      kind: Deployment
      name: helm-controller
      namespace: flux-system
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: helm-controller
      spec:
        template:
          spec:
            containers:
              - name: manager
                args:
                  - --events-addr=http://notification-controller.flux-system.svc.cluster.local./
                  - --watch-all-namespaces=true
                  - --log-level=debug
  # Set kustomize-controller to debug logging
  - target:
      kind: Deployment
      name: kustomize-controller
      namespace: flux-system
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: kustomize-controller
      spec:
        template:
          spec:
            containers:
              - name: manager
                args:
                  - --events-addr=http://notification-controller.flux-system.svc.cluster.local./
                  - --watch-all-namespaces=true
                  - --log-level=debug
```

## Method 2: Change Log Encoding Format

Flux controllers support two log encoding formats: `json` (default) and `console`. The console format is more human-readable for interactive debugging:

```bash
# Switch source-controller to console log format
kubectl patch deployment source-controller -n flux-system --type=json \
  -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/args", "value": [
    "--events-addr=http://notification-controller.flux-system.svc.cluster.local./",
    "--watch-all-namespaces=true",
    "--log-level=debug",
    "--log-encoding=console",
    "--storage-path=/data",
    "--storage-adv-addr=source-controller.flux-system.svc.cluster.local."
  ]}]'
```

JSON format (default) is better for log aggregation systems like Elasticsearch or Loki. Console format is better for reading logs directly with `kubectl logs`.

## Viewing Debug Logs

After enabling debug logging, view the output:

```bash
# Stream source-controller debug logs
kubectl logs -n flux-system deployment/source-controller -f

# Stream helm-controller debug logs
kubectl logs -n flux-system deployment/helm-controller -f

# Filter for specific reconciliation events
kubectl logs -n flux-system deployment/source-controller | grep "Reconciling"

# Filter for a specific resource
kubectl logs -n flux-system deployment/kustomize-controller | grep "my-app"

# View logs with timestamps for the last 10 minutes
kubectl logs -n flux-system deployment/source-controller --since=10m
```

## What Debug Logs Reveal

At debug level, each controller provides different types of information:

### Source Controller Debug Output

Shows details about Git clone operations, artifact creation, and cache behavior:

```bash
# Example debug log entries from source-controller
kubectl logs -n flux-system deployment/source-controller | head -20
```

Typical debug output includes:
- Git fetch/clone progress and authentication details
- Helm chart download and verification steps
- OCI artifact pull operations
- Cache hit/miss information
- Artifact storage and garbage collection

### Helm Controller Debug Output

Shows Helm template rendering, diff computation, and release lifecycle:

```bash
# Example: trace a specific HelmRelease reconciliation
kubectl logs -n flux-system deployment/helm-controller | grep "my-release"
```

Debug output includes:
- Helm chart values merging
- Template rendering progress
- Diff between current and desired state
- Upgrade/install/rollback decisions
- Post-renderer execution

### Kustomize Controller Debug Output

Shows resource building, health checking, and apply operations:

```bash
# Trace a Kustomization reconciliation
kubectl logs -n flux-system deployment/kustomize-controller | grep "my-kustomization"
```

Debug output includes:
- Kustomize build process
- Resource dependency resolution
- Server-side apply details
- Health check evaluation for each resource
- Garbage collection (prune) decisions

## Debugging Common Issues

### GitRepository Fails to Clone

Enable debug logging on source-controller and look for authentication or network errors:

```bash
# Enable debug and watch for clone errors
kubectl logs -n flux-system deployment/source-controller -f | grep -i "clone\|auth\|error"
```

### HelmRelease Stuck in Progressing State

Enable debug logging on helm-controller and watch for timeout or template errors:

```bash
# Watch helm-controller debug output for stuck releases
kubectl logs -n flux-system deployment/helm-controller -f | grep -i "timeout\|error\|render"
```

### Kustomization Not Applying Changes

Enable debug logging on kustomize-controller and watch for apply errors:

```bash
# Watch for apply failures
kubectl logs -n flux-system deployment/kustomize-controller -f | grep -i "apply\|error\|conflict"
```

## Reverting to Default Log Levels

After debugging, revert log levels to reduce log volume and controller overhead:

```bash
# Revert source-controller to info log level
kubectl patch deployment source-controller -n flux-system --type=json \
  -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/args", "value": [
    "--events-addr=http://notification-controller.flux-system.svc.cluster.local./",
    "--watch-all-namespaces=true",
    "--log-level=info",
    "--storage-path=/data",
    "--storage-adv-addr=source-controller.flux-system.svc.cluster.local."
  ]}]'
```

If you used a Kustomize overlay, update the patch to set `--log-level=info` and commit the change.

## Log Aggregation Integration

For production environments, forward Flux logs to a log aggregation system. Here is an example Fluent Bit configuration to collect Flux logs:

```yaml
# Fluent Bit configuration to collect Flux controller logs
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-flux-config
  namespace: flux-system
data:
  filter.conf: |
    [FILTER]
        Name         kubernetes
        Match        kube.*
        Kube_URL     https://kubernetes.default.svc:443
        Namespace    flux-system
    [FILTER]
        Name         grep
        Match        kube.*
        Regex        kubernetes_namespace_name flux-system
  output.conf: |
    [OUTPUT]
        Name         loki
        Match        kube.*
        Host         loki.monitoring.svc.cluster.local
        Port         3100
        Labels       job=flux,namespace=flux-system
```

## Summary

Flux CD log levels are configured through the `--log-level` argument on each controller deployment. Use `debug` level for detailed troubleshooting, and revert to `info` when done. For quick debugging sessions, patch deployments directly with `kubectl patch`. For persistent configuration, use Kustomize overlays in your Flux bootstrap repository. JSON log encoding works best with log aggregation systems, while console encoding is more readable for interactive debugging. Always remember to lower log levels after debugging to reduce log volume and storage costs.
