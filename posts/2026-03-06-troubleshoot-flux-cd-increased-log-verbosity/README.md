# How to Troubleshoot Flux CD with Increased Log Verbosity

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Troubleshooting, Logging, Kubernetes, GitOps, Debugging

Description: Learn how to increase log verbosity in Flux CD controllers to diagnose and resolve issues faster with detailed debug output.

---

When Flux CD reconciliation fails or behaves unexpectedly, the default log output often lacks the detail needed to pinpoint the root cause. Increasing log verbosity across Flux controllers gives you deeper insight into what is happening under the hood. This guide walks you through every method for enabling debug-level logging in Flux CD.

## Understanding Flux CD Log Levels

Flux CD controllers use structured logging with string log levels. The supported controller log levels are:

- **error** - Error messages only.
- **info** - Default. Key reconciliation and status messages.
- **debug** - More detailed troubleshooting output.
- **trace** - The most verbose controller output for deep debugging.

## Method 1: Using the --log-level Flag at Bootstrap

The simplest way to enable verbose logging is during the initial Flux bootstrap:

```bash
# Bootstrap with debug logging enabled globally

flux bootstrap github \
  --owner=my-org \
  --repository=fleet-infra \
  --path=clusters/production \
  --log-level=debug
```

This sets the `--log-level` argument on all Flux controllers deployed during bootstrap.

## Method 2: Patching Individual Controller Deployments

To increase verbosity on a specific controller without affecting others, patch the deployment directly:

```bash
# Increase verbosity on the source-controller only
kubectl patch deployment source-controller \
  -n flux-system \
  --type=json \
  -p='[{"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--log-level=debug"}]'
```

```bash
# Increase verbosity on the kustomize-controller
kubectl patch deployment kustomize-controller \
  -n flux-system \
  --type=json \
  -p='[{"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--log-level=debug"}]'
```

```bash
# Increase verbosity on the helm-controller
kubectl patch deployment helm-controller \
  -n flux-system \
  --type=json \
  -p='[{"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--log-level=debug"}]'
```

## Method 3: Editing the Kustomization Overlay

For a GitOps-native approach, add a patch to your Flux system kustomization:

```yaml
# clusters/production/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  # Enable debug logging on source-controller
  - target:
      kind: Deployment
      name: source-controller
    patch: |
      - op: add
        path: /spec/template/spec/containers/0/args/-
        value: --log-level=debug
  # Enable debug logging on kustomize-controller
  - target:
      kind: Deployment
      name: kustomize-controller
    patch: |
      - op: add
        path: /spec/template/spec/containers/0/args/-
        value: --log-level=debug
  # Enable debug logging on helm-controller
  - target:
      kind: Deployment
      name: helm-controller
    patch: |
      - op: add
        path: /spec/template/spec/containers/0/args/-
        value: --log-level=debug
  # Enable debug logging on notification-controller
  - target:
      kind: Deployment
      name: notification-controller
    patch: |
      - op: add
        path: /spec/template/spec/containers/0/args/-
        value: --log-level=debug
```

Commit and push this file. Flux will apply the patch to itself on the next reconciliation cycle.

## Method 4: Using the flux CLI to Query Logs

The Flux CLI does not change controller log levels at runtime, but it can query and filter Flux logs from the cluster:

```bash
# Stream error logs for Flux resources across all namespaces
flux logs --follow --level=error --all-namespaces

# Show logs for a specific Kustomization
flux logs --kind=Kustomization --name=my-app --namespace=default

# Show logs from the last 5 minutes
flux logs --all-namespaces --since=5m
```

## Viewing Debug Logs

Once verbosity is increased, use these commands to view the output:

```bash
# Stream logs from the source-controller with debug output
kubectl logs -n flux-system deployment/source-controller -f

# Stream logs from the kustomize-controller
kubectl logs -n flux-system deployment/kustomize-controller -f

# Stream logs from the helm-controller
kubectl logs -n flux-system deployment/helm-controller -f

# View logs from the last 5 minutes only
kubectl logs -n flux-system deployment/source-controller --since=5m

# View logs from a specific container if the pod has sidecars
kubectl logs -n flux-system deployment/source-controller -c manager
```

## Filtering Debug Logs

Debug mode produces a lot of output. Use these techniques to filter what you need:

```bash
# Filter for reconciliation events only
kubectl logs -n flux-system deployment/source-controller -f \
  | grep -i "reconcil"

# Filter for a specific GitRepository resource
kubectl logs -n flux-system deployment/source-controller -f \
  | grep "fleet-infra"

# Filter for errors only
kubectl logs -n flux-system deployment/kustomize-controller -f \
  | grep '"level":"error"'

# Filter for a specific Kustomization by name
kubectl logs -n flux-system deployment/kustomize-controller -f \
  | grep '"name":"my-app"'
```

## Using JSON Log Parsing with jq

Flux controllers output structured JSON logs, which you can parse with `jq`:

```bash
# Pretty-print all log entries
kubectl logs -n flux-system deployment/source-controller --since=5m \
  | jq '.'

# Extract only error messages with timestamps
kubectl logs -n flux-system deployment/source-controller --since=1h \
  | jq -r 'select(.level == "error") | "\(.ts) \(.msg)"'

# Show finished reconciliation messages for each resource
kubectl logs -n flux-system deployment/kustomize-controller --since=1h \
  | jq -r 'select(.msg | startswith("Reconciliation finished")) | "\(.name): \(.msg)"'

# Find all failed reconciliations
kubectl logs -n flux-system deployment/helm-controller --since=1h \
  | jq -r 'select(.msg | test("error|fail"; "i")) | "\(.ts) \(.name) \(.msg)"'
```

## Setting Verbosity Per Controller with Trace Logging

For even more granular control, use the `trace` log level and set the log encoding explicitly:

```yaml
# clusters/production/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  # Set trace logging on source-controller
  - target:
      kind: Deployment
      name: source-controller
    patch: |
      - op: add
        path: /spec/template/spec/containers/0/args/-
        value: --log-level=trace
      - op: add
        path: /spec/template/spec/containers/0/args/-
        value: --log-encoding=json
```

## Enabling Event Recording Verbosity

Flux also emits Kubernetes events. You can inspect those events with:

```bash
# Watch Flux events in real time with the Flux CLI
flux events --watch --all-namespaces

# Show events for a specific Kustomization
flux events --for Kustomization/my-app -n default

# Filter warning events
flux events --types Warning --all-namespaces

# Get Kubernetes events sorted by last timestamp
kubectl get events -n flux-system --sort-by='.lastTimestamp'
```

## Reverting to Default Log Levels

After troubleshooting, always revert log levels to avoid excessive resource usage:

```bash
# Revert a direct kubectl patch by rolling back the Deployment
kubectl rollout undo deployment/source-controller -n flux-system
```

Or if using the kustomization overlay, remove the patches and commit:

```yaml
# clusters/production/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
# Patches removed - controllers revert to default log level
```

## Troubleshooting Common Issues with Debug Logs

### Issue: GitRepository not updating

With debug logging enabled, look for authentication or network errors:

```bash
kubectl logs -n flux-system deployment/source-controller -f \
  | jq 'select(.name == "my-repo") | {ts, msg, error}'
```

### Issue: Kustomization stuck in "Not Ready"

Check the kustomize-controller for build or apply errors:

```bash
kubectl logs -n flux-system deployment/kustomize-controller -f \
  | jq 'select(.name == "my-app" and .level == "error")'
```

### Issue: HelmRelease failing to install

Check helm-controller logs for chart fetch or rendering problems:

```bash
kubectl logs -n flux-system deployment/helm-controller -f \
  | jq 'select(.name == "my-release") | {ts, msg, error}'
```

## Summary

Increasing log verbosity in Flux CD is one of the most effective first steps in troubleshooting. Use the kustomization overlay method for persistent debug logging through GitOps, or patch deployments directly for quick temporary debugging. Always remember to revert to default log levels once the issue is resolved to keep resource usage in check.
