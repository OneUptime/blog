# How to Debug Kustomization with flux events in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Kustomize, Debugging, Events, Troubleshooting, CLI

Description: Learn how to use the flux events command to debug Kustomization reconciliation issues, track changes, and diagnose failures in your Flux CD deployments.

---

When a Flux Kustomization is not behaving as expected -- failing to reconcile, stuck in a pending state, or applying unexpected changes -- the `flux events` command is your primary debugging tool. It provides a focused view of Kubernetes events related to specific Flux resources, filtering out the noise from unrelated cluster events. This guide walks through how to use `flux events` effectively to diagnose and resolve Kustomization issues.

## Basic Usage of flux events

The `flux events` command retrieves Kubernetes events for a specific Flux resource. For Kustomizations, the basic syntax is as follows.

```bash
# View events for a specific Kustomization
flux events --for Kustomization/my-app --namespace flux-system
```

This returns all events related to the `my-app` Kustomization in the `flux-system` namespace, including successful reconciliations, failures, health check results, and pruning actions.

## Understanding Event Output

A typical `flux events` output looks like this.

```bash
# Example output from flux events
flux events --for Kustomization/app-backend --namespace flux-system

# LAST SEEN   TYPE      REASON              OBJECT                                MESSAGE
# 2m          Normal    ReconciliationSucceeded   Kustomization/app-backend   Reconciliation finished in 12s
# 5m          Normal    Progressing               Kustomization/app-backend   Applying revision main@sha1:abc123
# 12m         Warning   ReconciliationFailed      Kustomization/app-backend   Apply failed: deployment.apps "api" is invalid
# 15m         Normal    ReconciliationSucceeded   Kustomization/app-backend   Reconciliation finished in 8s
```

Each event includes:
- **LAST SEEN**: When the event occurred
- **TYPE**: Normal (success) or Warning (problem)
- **REASON**: The event category (ReconciliationSucceeded, ReconciliationFailed, Progressing, etc.)
- **OBJECT**: The Flux resource the event relates to
- **MESSAGE**: Detailed description of what happened

## Watching Events in Real Time

For active debugging, use the `--watch` flag to stream events as they occur.

```bash
# Stream events in real time for a Kustomization
flux events --for Kustomization/app-backend --namespace flux-system --watch
```

This is particularly useful when you have just pushed a change to Git and want to watch the reconciliation happen step by step. Keep this running in a terminal while you make changes.

## Debugging Common Failure Scenarios

### Source Not Ready

If the GitRepository or OCIRepository that a Kustomization references is not ready, the Kustomization will be stuck waiting.

```bash
# Check events for the Kustomization
flux events --for Kustomization/app-backend --namespace flux-system

# If events mention source not ready, check the source events
flux events --for GitRepository/flux-system --namespace flux-system

# Verify the source status directly
flux get sources git --namespace flux-system
```

### Apply Failures

When manifests contain errors (invalid YAML, missing required fields, API version mismatches), the apply will fail.

```bash
# Events will show the specific apply error
flux events --for Kustomization/app-backend --namespace flux-system

# Example error event:
# Warning  ReconciliationFailed  Kustomization/app-backend
#   Apply failed: error validating data: ValidationError(Deployment.spec):
#   missing required field "selector" in io.k8s.api.apps.v1.DeploymentSpec
```

The error message from `flux events` includes the exact Kubernetes validation error, telling you which resource and field is problematic.

### Health Check Failures

When `wait: true` is set and resources do not become healthy within the timeout period, you will see health check failure events.

```bash
# Health check timeout events
flux events --for Kustomization/app-backend --namespace flux-system

# Example output:
# Warning  ReconciliationFailed  Kustomization/app-backend
#   Health check failed after 5m: Deployment/production/api-server:
#   condition Ready=False: MinimumReplicasUnavailable

# Investigate the failing Deployment directly
kubectl describe deployment api-server -n production
kubectl get events -n production --field-selector involvedObject.name=api-server
```

### Dependency Not Ready

When a Kustomization's `dependsOn` targets are not ready, reconciliation is blocked.

```bash
# Events for the blocked Kustomization
flux events --for Kustomization/apps --namespace flux-system

# Example output:
# Normal  Progressing  Kustomization/apps
#   dependency Kustomization/flux-system/infrastructure is not ready

# Check the dependency status
flux events --for Kustomization/infrastructure --namespace flux-system
flux get ks infrastructure --namespace flux-system
```

### Pruning Events

When garbage collection removes resources, `flux events` shows what was deleted.

```bash
# Events showing pruning activity
flux events --for Kustomization/app-backend --namespace flux-system

# Example output:
# Normal  ReconciliationSucceeded  Kustomization/app-backend
#   Reconciliation finished in 15s: 8 applied, 2 pruned
# Normal  Progressing              Kustomization/app-backend
#   Deleted: Deployment/production/old-service
# Normal  Progressing              Kustomization/app-backend
#   Deleted: Service/production/old-service
```

## Combining flux events with Other Commands

A thorough debugging session typically involves multiple Flux CLI commands. Here is a complete workflow.

```bash
# Step 1: Get an overview of all Kustomization statuses
flux get ks --all-namespaces

# Step 2: Identify the failing Kustomization and check its events
flux events --for Kustomization/app-backend --namespace flux-system

# Step 3: Check the source to ensure it has the latest revision
flux get sources git flux-system --namespace flux-system
flux events --for GitRepository/flux-system --namespace flux-system

# Step 4: View the dependency tree to understand relationships
flux tree ks app-backend --namespace flux-system

# Step 5: If events show a specific resource failing, inspect it
kubectl describe deployment api-server -n production
kubectl logs -n production deployment/api-server --tail=50

# Step 6: Force a reconciliation to trigger a fresh attempt
flux reconcile ks app-backend --namespace flux-system --with-source

# Step 7: Watch events during the reconciliation
flux events --for Kustomization/app-backend --namespace flux-system --watch
```

## Filtering Events by Type

You can combine `flux events` with standard command-line tools to filter for specific event types.

```bash
# Show only warning events (failures)
flux events --for Kustomization/app-backend --namespace flux-system | grep Warning

# Show only recent events (last 5 minutes)
flux events --for Kustomization/app-backend --namespace flux-system | head -20

# Show events across all Kustomizations in flux-system
flux events --namespace flux-system --types=Warning
```

## Using kubectl for Additional Event Context

While `flux events` is focused on Flux resources, sometimes you need broader Kubernetes events for context.

```bash
# View all events in a namespace where resources are deployed
kubectl get events -n production --sort-by='.lastTimestamp'

# View events for a specific resource that a Kustomization manages
kubectl events --for deployment/api-server -n production

# View events from the Flux controllers themselves
kubectl get events -n flux-system --sort-by='.lastTimestamp'
```

## Event-Driven Alerting

Flux can send events to external systems for alerting and audit logging. While not directly related to `flux events` CLI, setting up Flux Alerts ensures you are notified of failures automatically.

```yaml
# Alert provider configuration for Slack notifications
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack
  namespace: flux-system
spec:
  type: slack
  channel: flux-alerts
  secretRef:
    name: slack-webhook-url
---
# Alert that triggers on Kustomization failures
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: kustomization-failures
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: flux-system
```

## Tips for Effective Debugging

**Always check events first**: Before diving into kubectl or logs, run `flux events --for Kustomization/<name>`. The event messages from Flux are highly informative and often contain the exact error.

**Use --watch during deployments**: When pushing changes, have `flux events --watch` running to see the reconciliation in real time. This catches issues immediately.

**Check the source**: Many Kustomization failures are actually source failures. If `flux events` for the Kustomization is not revealing, check the GitRepository or OCIRepository events.

**Look at the full chain**: If a Kustomization depends on others, check events for the entire dependency chain. The root cause is often in a parent Kustomization.

**Force reconciliation for testing**: After fixing an issue, use `flux reconcile ks <name> --with-source` to trigger an immediate reconciliation instead of waiting for the next interval.

## Summary

The `flux events` command is the most important debugging tool in the Flux CLI for Kustomization troubleshooting. Use `flux events --for Kustomization/<name>` to see reconciliation history, apply errors, health check failures, and pruning activity. Combine it with `--watch` for real-time monitoring, and pair it with `flux get ks`, `flux tree ks`, and kubectl for a complete debugging workflow. Setting up Flux Alerts for automated failure notifications ensures you catch issues even when you are not actively watching.
