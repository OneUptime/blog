# How to Use argocd app logs to Stream Pod Logs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, CLI, Logging

Description: Learn how to use argocd app logs to stream and inspect pod logs from ArgoCD-managed applications without direct cluster access or kubectl.

---

One of the most useful but underutilized ArgoCD CLI features is the ability to stream pod logs directly through ArgoCD. The `argocd app logs` command lets you view container logs for pods in your applications without needing direct kubectl access to the cluster. This is particularly valuable in multi-cluster setups where developers may not have kubectl configured for every cluster.

## Basic Usage

```bash
# Stream logs from all pods in an application
argocd app logs my-app
```

This streams logs from all containers in all pods managed by the application. The output includes the pod name as a prefix so you can distinguish which pod each log line comes from.

## Filtering by Container

When pods have multiple containers (sidecars, init containers), filter to a specific one:

```bash
# Stream logs from a specific container
argocd app logs my-app --container app

# Stream logs from a sidecar
argocd app logs my-app --container istio-proxy

# Stream logs from an init container
argocd app logs my-app --container init-db
```

## Filtering by Resource

Target logs from specific resources within the application:

```bash
# Logs from pods belonging to a specific Deployment
argocd app logs my-app --kind Deployment --resource-name my-app

# Logs from pods belonging to a specific StatefulSet
argocd app logs my-app --kind StatefulSet --resource-name my-database

# Logs from a specific pod
argocd app logs my-app --kind Pod --resource-name my-app-7f8b9c-abc12
```

## Filtering by Group

For resources in specific API groups:

```bash
# Logs from an Argo Rollout's pods
argocd app logs my-app --group argoproj.io --kind Rollout --resource-name my-rollout
```

## Namespace Filter

```bash
# Logs from pods in a specific namespace
argocd app logs my-app --namespace production
```

## Follow (Streaming) Mode

Stream logs in real time as they are produced:

```bash
# Follow logs (like tail -f)
argocd app logs my-app --follow

# Follow logs for a specific container
argocd app logs my-app --follow --container app
```

This is the mode you want for live debugging - watching logs as requests come in.

## Tail Lines

Start with the last N lines instead of the entire log:

```bash
# Show the last 100 lines
argocd app logs my-app --tail 100

# Show the last 50 lines and follow
argocd app logs my-app --tail 50 --follow

# Show the last 10 lines for a specific container
argocd app logs my-app --tail 10 --container app
```

## Since Timestamp

View logs starting from a specific time:

```bash
# Logs from the last hour
argocd app logs my-app --since-time "2026-02-26T10:00:00Z"

# Logs from the last 30 minutes (using duration)
argocd app logs my-app --since-seconds 1800
```

## Practical Debugging Workflows

### Quick Error Check

When you get an alert that an application is unhealthy, quickly check for errors:

```bash
#!/bin/bash
# quick-check.sh - Quick error check for an application

APP_NAME="${1:?Usage: quick-check.sh <app-name>}"

echo "=== Quick Check: $APP_NAME ==="
echo ""

# Check application health
HEALTH=$(argocd app get "$APP_NAME" -o json | jq -r '.status.health.status')
echo "Health: $HEALTH"

if [ "$HEALTH" != "Healthy" ]; then
  echo ""
  echo "--- Unhealthy Resources ---"
  argocd app get "$APP_NAME" -o json | jq -r '
    .status.resources[] |
    select(.health.status != "Healthy" and .health != null) |
    "\(.kind)/\(.name): \(.health.status)"
  '

  echo ""
  echo "--- Recent Logs (last 50 lines) ---"
  argocd app logs "$APP_NAME" --tail 50
fi
```

### Multi-Container Debug

When debugging an application with sidecars:

```bash
#!/bin/bash
# debug-containers.sh - Check logs for all containers

APP_NAME="${1:?Usage: debug-containers.sh <app-name>}"
DEPLOY_NAME="${2:?Usage: debug-containers.sh <app-name> <deployment-name>}"

echo "=== Container Logs for $DEPLOY_NAME in $APP_NAME ==="

# App container
echo ""
echo "--- App Container ---"
argocd app logs "$APP_NAME" \
  --kind Deployment \
  --resource-name "$DEPLOY_NAME" \
  --container app \
  --tail 20

# Sidecar
echo ""
echo "--- Sidecar Container ---"
argocd app logs "$APP_NAME" \
  --kind Deployment \
  --resource-name "$DEPLOY_NAME" \
  --container sidecar \
  --tail 20 2>/dev/null || echo "No sidecar container found"
```

### Post-Deployment Log Check

After a sync, check logs for startup errors:

```bash
#!/bin/bash
# post-deploy-check.sh - Check logs after deployment

APP_NAME="${1:?Usage: post-deploy-check.sh <app-name>}"

echo "Waiting for sync to complete..."
argocd app wait "$APP_NAME" --sync --timeout 300

echo "Checking for errors in recent logs..."
ERRORS=$(argocd app logs "$APP_NAME" --tail 200 2>&1 | grep -i "error\|exception\|fatal\|panic" || true)

if [ -n "$ERRORS" ]; then
  echo "WARNINGS: Potential errors found in logs:"
  echo "$ERRORS"
  echo ""
  echo "Full recent logs:"
  argocd app logs "$APP_NAME" --tail 50
else
  echo "No obvious errors found in recent logs."
fi
```

## Log Streaming in Multi-Cluster Setups

The real power of `argocd app logs` shows in multi-cluster environments. Without it, you would need kubectl access configured for each remote cluster:

```bash
# Without ArgoCD: need kubeconfig for each cluster
KUBECONFIG=~/.kube/prod-cluster kubectl logs -n my-app deployment/my-app

# With ArgoCD: one command regardless of which cluster
argocd app logs my-app --tail 100
```

This is especially valuable when:
- Developers do not have direct cluster access
- Clusters are behind VPNs or firewalls
- You manage dozens of clusters from a single ArgoCD instance

## Combining with Other CLI Commands

Build diagnostic workflows that combine logs with other ArgoCD data:

```bash
#!/bin/bash
# full-diagnostic.sh - Complete application diagnostic

APP_NAME="${1:?Usage: full-diagnostic.sh <app-name>}"

echo "=== Full Diagnostic: $APP_NAME ==="

# Application overview
echo ""
echo "--- Application Status ---"
argocd app get "$APP_NAME"

# Resource list
echo ""
echo "--- Resources ---"
argocd app resources "$APP_NAME"

# Recent deployment history
echo ""
echo "--- Recent History ---"
argocd app history "$APP_NAME"

# Current diff
echo ""
echo "--- Current Diff ---"
argocd app diff "$APP_NAME" 2>&1 || echo "(In sync)"

# Pod logs
echo ""
echo "--- Recent Logs (last 100 lines) ---"
argocd app logs "$APP_NAME" --tail 100
```

## Enabling Logs in ArgoCD

The log streaming feature needs to be enabled on the ArgoCD server. Check your configuration:

```yaml
# argocd-cmd-params-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Enable log streaming (usually enabled by default)
  server.enable.proxy.extension: "true"
```

Also ensure the RBAC policy allows log access:

```csv
# argocd-rbac-cm - Allow log access
p, role:developer, logs, get, */*, allow
```

## RBAC for Log Access

Control who can access logs:

```csv
# Full log access for SRE team
p, role:sre, logs, get, */*, allow

# Log access only for specific projects
p, role:developer, logs, get, development/*, allow
p, role:developer, logs, get, staging/*, allow

# No production log access for developers
p, role:developer, logs, get, production/*, deny
```

## Limitations

1. **Log retention**: `argocd app logs` only shows logs from currently running pods. Once a pod is terminated, its logs are gone (use a centralized logging system for historical logs).

2. **Large log volumes**: Streaming logs from applications with many pods can be overwhelming. Use filters to narrow down.

3. **Binary logs**: The command expects text-based logs. Binary log formats will not display correctly.

4. **Previous containers**: There is no direct equivalent of `kubectl logs --previous` for crashed containers, though some versions support it through flags.

## Summary

The `argocd app logs` command brings log access into the ArgoCD ecosystem, eliminating the need for direct kubectl access to view container logs. It is particularly valuable in multi-cluster setups and environments where direct cluster access is restricted. Use it with `--follow` for real-time debugging, `--tail` for quick checks, and combine it with resource filters to focus on specific components. For production use, pair it with a centralized logging solution for log retention and historical analysis.
