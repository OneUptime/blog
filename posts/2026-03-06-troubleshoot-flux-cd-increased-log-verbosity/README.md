# How to Troubleshoot Flux CD with Increased Log Verbosity

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Troubleshooting, Logging, Kubernetes, GitOps, Debugging

Description: Learn how to increase log verbosity in Flux CD controllers to diagnose and resolve issues faster with detailed debug output.

---

When Flux CD reconciliation fails or behaves unexpectedly, the default log output often lacks the detail needed to pinpoint the root cause. Increasing log verbosity across Flux controllers gives you deeper insight into what is happening under the hood. This guide walks you through every method for enabling debug-level logging in Flux CD.

## Understanding Flux CD Log Levels

Flux CD controllers use structured logging with numeric verbosity levels. The higher the number, the more verbose the output:

- **Level 0** - Default. Errors, warnings, and key info messages.
- **Level 1** - Additional info about reconciliation cycles.
- **Level 2** - Detailed debug output including API calls and diffs.
- **Level 3+** - Trace-level output for deep debugging.

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

## Method 4: Using the flux CLI to Set Log Level at Runtime

You can also use the Flux CLI to temporarily set log levels:

```bash
# Check current log level for all controllers
for dep in source-controller kustomize-controller helm-controller notification-controller; do
  echo "=== $dep ==="
  kubectl get deployment "$dep" -n flux-system \
    -o jsonpath='{.spec.template.spec.containers[0].args}' | tr ',' '\n'
  echo ""
done
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

# Filter for errors and warnings only
kubectl logs -n flux-system deployment/kustomize-controller -f \
  | grep -E '"level":"error"|"level":"warn"'

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

# Show reconciliation duration for each resource
kubectl logs -n flux-system deployment/kustomize-controller --since=1h \
  | jq -r 'select(.msg == "Reconciliation finished") | "\(.name): \(.duration)"'

# Find all failed reconciliations
kubectl logs -n flux-system deployment/helm-controller --since=1h \
  | jq -r 'select(.msg | test("error|fail"; "i")) | "\(.ts) \(.name) \(.msg)"'
```

## Setting Verbosity Per Controller with Numeric Levels

For even more granular control, use the `--log-encoding` and numeric verbosity arguments:

```yaml
# clusters/production/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  # Set numeric verbosity level on source-controller
  - target:
      kind: Deployment
      name: source-controller
    patch: |
      - op: add
        path: /spec/template/spec/containers/0/args/-
        value: --log-level=debug
      - op: add
        path: /spec/template/spec/containers/0/args/-
        value: --log-encoding=json
```

## Enabling Event Recording Verbosity

Flux also emits Kubernetes events. Increase event detail with:

```bash
# Watch Flux events in real time
kubectl get events -n flux-system --watch

# Filter events by type
kubectl get events -n flux-system --field-selector type=Warning

# Get events sorted by last timestamp
kubectl get events -n flux-system --sort-by='.lastTimestamp'
```

## Reverting to Default Log Levels

After troubleshooting, always revert log levels to avoid excessive resource usage:

```bash
# Remove the debug log level from source-controller
kubectl patch deployment source-controller \
  -n flux-system \
  --type=json \
  -p='[{"op": "remove", "path": "/spec/template/spec/containers/0/args/3"}]'
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
