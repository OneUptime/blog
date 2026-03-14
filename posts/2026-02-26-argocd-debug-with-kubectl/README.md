# How to Use kubectl to Debug ArgoCD Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Kubectl, Troubleshooting

Description: Learn how to use kubectl commands to debug ArgoCD issues when the CLI and UI are unavailable, including inspecting resources, checking events, and examining pod states.

---

Sometimes the ArgoCD CLI is broken, the UI is down, or you need lower-level access than either tool provides. In these situations, `kubectl` is your best friend. Since ArgoCD stores everything as Kubernetes resources, you can inspect, debug, and even fix most issues directly with `kubectl`. This guide shows you how.

## ArgoCD Resources in Kubernetes

ArgoCD stores its data as Kubernetes Custom Resources and native resources:

```bash
# List all ArgoCD custom resource types
kubectl api-resources | grep argoproj

# Typical output:
# applications          app     argoproj.io/v1alpha1   true   Application
# applicationsets       appset  argoproj.io/v1alpha1   true   ApplicationSet
# appprojects           appproj argoproj.io/v1alpha1   true   AppProject
```

## Inspecting Applications

```bash
# List all applications
kubectl get applications -n argocd

# Get detailed application info
kubectl get application my-app -n argocd -o yaml

# Get sync status
kubectl get application my-app -n argocd \
  -o jsonpath='{.status.sync.status}'

# Get health status
kubectl get application my-app -n argocd \
  -o jsonpath='{.status.health.status}'

# Get the last sync error
kubectl get application my-app -n argocd \
  -o jsonpath='{.status.operationState.message}'
```

A handy one-liner to see all applications with their status:

```bash
# Get all apps with sync and health status
kubectl get applications -n argocd \
  -o custom-columns=NAME:.metadata.name,SYNC:.status.sync.status,HEALTH:.status.health.status,MESSAGE:.status.operationState.message
```

## Checking Application Conditions

ArgoCD applications have conditions that indicate problems:

```bash
# Check application conditions
kubectl get application my-app -n argocd \
  -o jsonpath='{.status.conditions[*]}' | python3 -m json.tool

# Find applications with error conditions
kubectl get applications -n argocd -o json | \
  jq '.items[] | select(.status.conditions != null and (.status.conditions | length > 0)) | {name: .metadata.name, conditions: .status.conditions}'
```

Common conditions include:
- `ComparisonError`: Manifest generation failed
- `InvalidSpecError`: Application spec is invalid
- `OrphanedResourceWarning`: Orphaned resources detected
- `SyncError`: Last sync operation failed

## Inspecting ArgoCD Pods

```bash
# Get all ArgoCD pods with status
kubectl get pods -n argocd -o wide

# Check pod resource usage
kubectl top pods -n argocd

# Describe a specific pod for events and state
kubectl describe pod -n argocd -l app.kubernetes.io/name=argocd-application-controller

# Check restart counts
kubectl get pods -n argocd -o custom-columns=NAME:.metadata.name,RESTARTS:.status.containerStatuses[0].restartCount,REASON:.status.containerStatuses[0].lastState.terminated.reason
```

## Checking Events

Kubernetes events reveal what happened recently:

```bash
# Get all events in the argocd namespace, sorted by time
kubectl get events -n argocd --sort-by='.lastTimestamp'

# Filter for warnings only
kubectl get events -n argocd --field-selector type=Warning --sort-by='.lastTimestamp'

# Get events for a specific pod
kubectl get events -n argocd --field-selector involvedObject.name=argocd-application-controller-xxx

# Watch events in real-time
kubectl get events -n argocd --watch
```

## Inspecting ConfigMaps

ArgoCD configuration lives in ConfigMaps:

```bash
# Main configuration
kubectl get configmap argocd-cm -n argocd -o yaml

# RBAC configuration
kubectl get configmap argocd-rbac-cm -n argocd -o yaml

# Command parameters (log levels, timeouts, etc.)
kubectl get configmap argocd-cmd-params-cm -n argocd -o yaml

# TLS configuration
kubectl get configmap argocd-tls-certs-cm -n argocd -o yaml

# SSH known hosts
kubectl get configmap argocd-ssh-known-hosts-cm -n argocd -o yaml

# GPG keys
kubectl get configmap argocd-gpg-keys-cm -n argocd -o yaml
```

## Inspecting Secrets

ArgoCD stores credentials and tokens in secrets:

```bash
# List all ArgoCD secrets
kubectl get secrets -n argocd

# Get the admin password
kubectl get secret argocd-initial-admin-secret -n argocd \
  -o jsonpath='{.data.password}' | base64 -d

# List repository credentials
kubectl get secrets -n argocd -l argocd.argoproj.io/secret-type=repository

# List cluster credentials
kubectl get secrets -n argocd -l argocd.argoproj.io/secret-type=cluster

# Inspect a specific repo credential (careful with secrets)
kubectl get secret -n argocd -l argocd.argoproj.io/secret-type=repository \
  -o jsonpath='{.items[0].data.url}' | base64 -d
```

## Debugging Sync Operations

When a sync is stuck or failed, use kubectl to inspect the operation:

```bash
# Check the current operation state
kubectl get application my-app -n argocd \
  -o jsonpath='{.status.operationState}' | python3 -m json.tool

# Check which resources failed to sync
kubectl get application my-app -n argocd -o json | \
  jq '.status.operationState.syncResult.resources[] | select(.status != "Synced")'

# Check if a sync operation is currently running
kubectl get application my-app -n argocd \
  -o jsonpath='{.operation}'
```

To terminate a stuck sync operation:

```bash
# Remove the operation field to terminate a stuck sync
kubectl patch application my-app -n argocd --type json \
  -p '[{"op": "remove", "path": "/operation"}]'
```

## Debugging Resource Differences

See what ArgoCD thinks is different:

```bash
# Get the resource status for all managed resources
kubectl get application my-app -n argocd -o json | \
  jq '.status.resources[] | {kind: .kind, name: .name, status: .status, health: .health.status}'

# Find resources that are out of sync
kubectl get application my-app -n argocd -o json | \
  jq '.status.resources[] | select(.status != "Synced") | {kind: .kind, name: .name, status: .status}'

# Find unhealthy resources
kubectl get application my-app -n argocd -o json | \
  jq '.status.resources[] | select(.health.status != "Healthy" and .health.status != null) | {kind: .kind, name: .name, health: .health}'
```

## Checking the Target Cluster Resources

When ArgoCD reports issues with specific resources, check them directly:

```bash
# Check if the deployed resource matches what ArgoCD expects
kubectl get deployment my-deployment -n my-namespace -o yaml

# Check events for a specific resource that ArgoCD is managing
kubectl get events -n my-namespace --field-selector involvedObject.name=my-deployment

# Check pod status in the target namespace
kubectl get pods -n my-namespace
kubectl describe pod -n my-namespace <pod-name>
```

## Exec into ArgoCD Pods

Sometimes you need to run commands inside ArgoCD pods:

```bash
# Check network connectivity from the repo server
kubectl exec -n argocd deploy/argocd-repo-server -- \
  git ls-remote https://github.com/your-org/your-repo.git HEAD

# Check DNS resolution from ArgoCD pods
kubectl exec -n argocd deploy/argocd-server -- \
  nslookup github.com

# Check disk space in repo server (manifest cache)
kubectl exec -n argocd deploy/argocd-repo-server -- df -h

# Check memory usage inside the controller
kubectl exec -n argocd deploy/argocd-application-controller -- \
  cat /proc/meminfo | head -5
```

## Full Debug Script Using Only kubectl

```bash
#!/bin/bash
# kubectl-argocd-debug.sh - Debug ArgoCD using only kubectl
# Useful when the ArgoCD CLI is not available

NAMESPACE="argocd"

echo "============================================"
echo "ArgoCD Debug Report (kubectl only)"
echo "============================================"

# Pod health
echo -e "\n=== Pod Status ==="
kubectl get pods -n $NAMESPACE -o wide

# Pod resource usage
echo -e "\n=== Resource Usage ==="
kubectl top pods -n $NAMESPACE 2>/dev/null || echo "Metrics server not available"

# Recent events
echo -e "\n=== Recent Warning Events ==="
kubectl get events -n $NAMESPACE --field-selector type=Warning \
  --sort-by='.lastTimestamp' 2>/dev/null | tail -20

# Application status summary
echo -e "\n=== Application Status ==="
kubectl get applications -n $NAMESPACE \
  -o custom-columns=NAME:.metadata.name,SYNC:.status.sync.status,HEALTH:.status.health.status 2>/dev/null

# Failed applications
echo -e "\n=== Applications with Conditions ==="
kubectl get applications -n $NAMESPACE -o json 2>/dev/null | \
  jq -r '.items[] | select(.status.conditions != null and (.status.conditions | length > 0)) | "\(.metadata.name): \(.status.conditions[0].message)"' 2>/dev/null

# ArgoCD version
echo -e "\n=== ArgoCD Server Version ==="
kubectl get pods -n $NAMESPACE -l app.kubernetes.io/name=argocd-server \
  -o jsonpath='{.items[0].spec.containers[0].image}' 2>/dev/null
echo ""

# ConfigMap summary
echo -e "\n=== ArgoCD URL ==="
kubectl get configmap argocd-cm -n $NAMESPACE \
  -o jsonpath='{.data.url}' 2>/dev/null
echo ""

# Restart counts
echo -e "\n=== Pod Restart Counts ==="
kubectl get pods -n $NAMESPACE -o json | \
  jq -r '.items[] | "\(.metadata.name): \(.status.containerStatuses[0].restartCount // 0) restarts"'

echo -e "\n============================================"
echo "Debug report complete"
echo "============================================"
```

## Summary

When the ArgoCD CLI and UI are unavailable, `kubectl` gives you full access to everything ArgoCD manages. Applications, projects, repositories, and clusters are all Kubernetes resources that you can inspect with `kubectl get`, `describe`, and JSON path queries. Pod logs, events, exec, and resource usage commands round out the toolkit. This approach is especially valuable during incidents where ArgoCD itself is partially broken and its own tools cannot provide the information you need.
