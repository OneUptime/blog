# How to Debug Slow Reconciliation in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Debugging, Performance

Description: A practical guide to diagnosing and fixing slow reconciliation in ArgoCD, covering common bottlenecks in the controller, repo server, and cluster API interactions.

---

Slow reconciliation in ArgoCD means delayed change detection, longer sync times, and a frustrating user experience. When your applications take minutes or longer to detect changes, the root cause is usually one of a few common bottlenecks. This guide walks you through a systematic debugging process to identify and fix slow reconciliation.

## Symptoms of Slow Reconciliation

Before diving into debugging, confirm you actually have slow reconciliation:

- Applications stay in "Unknown" state for extended periods
- Changes pushed to Git take much longer than the reconciliation interval to appear
- The ArgoCD UI feels sluggish when loading application details
- Sync operations queue up and take longer to start
- ArgoCD controller logs show warnings about reconciliation duration

## Step 1: Check the Reconciliation Duration Metrics

Start with metrics to identify where time is being spent:

```bash
# Port-forward the controller metrics endpoint
kubectl port-forward svc/argocd-application-controller-metrics -n argocd 8082:8082 &

# Check reconciliation duration (in seconds)
curl -s http://localhost:8082/metrics | grep argocd_app_reconcile_duration_seconds

# Check the repo server metrics
kubectl port-forward svc/argocd-repo-server -n argocd 8084:8084 &
curl -s http://localhost:8084/metrics | grep argocd_git_request_duration_seconds
```

Key metrics and what they mean:

| Metric | Healthy Value | Problem Threshold |
|--------|--------------|-------------------|
| `argocd_app_reconcile_duration_seconds` p99 | < 10s | > 30s |
| `argocd_git_request_duration_seconds` p99 | < 5s | > 15s |
| `argocd_repo_pending_request_total` | < 5 | > 20 |
| `argocd_app_k8s_request_total` rate | varies | sudden increases |

## Step 2: Check Controller Queue Depth

The application controller maintains a work queue. If the queue is growing, reconciliation is falling behind:

```bash
# Check the controller work queue metrics
curl -s http://localhost:8082/metrics | grep workqueue

# Key metrics:
# workqueue_depth - Current queue depth (should be low)
# workqueue_adds_total - Rate of items added
# workqueue_retries_total - Rate of retries (indicates failures)
```

A growing queue depth means the controller cannot keep up with the reconciliation demand.

## Step 3: Identify the Bottleneck Component

Slow reconciliation typically comes from one of three places:

### Bottleneck A: Git Operations (Repo Server)

```bash
# Check repo server logs for slow Git operations
kubectl logs -n argocd deployment/argocd-repo-server --tail=200 | \
  grep -E "time=|duration=|slow|error|timeout"

# Check Git fetch times
curl -s http://localhost:8084/metrics | grep argocd_git_request_duration_seconds_bucket

# Check for pending Git requests (queue buildup)
curl -s http://localhost:8084/metrics | grep argocd_repo_pending_request_total
```

Symptoms of Git bottleneck:
- High `argocd_git_request_duration_seconds` values
- Growing `argocd_repo_pending_request_total`
- Repo server logs showing slow clone/fetch operations
- Repo server high CPU or memory usage

Fixes:

```yaml
# Enable shallow clones
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  reposerver.git.shallow.clone: "true"
  reposerver.parallelism.limit: "5"
```

```yaml
# Scale up repo server
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: argocd-repo-server
          resources:
            requests:
              cpu: "2"
              memory: "4Gi"
```

### Bottleneck B: Manifest Generation

```bash
# Check how long manifest generation takes
kubectl logs -n argocd deployment/argocd-repo-server --tail=200 | \
  grep -E "manifest|render|helm|kustomize" | grep -E "duration|time"

# For Helm-based apps, check template rendering time
# For Kustomize, check build time
```

Symptoms:
- Helm template rendering takes > 5 seconds
- Kustomize build with remote bases is slow
- Config management plugins have high latency

Fixes:

```yaml
# For Helm: Pin chart versions to avoid index refreshes
apiVersion: argoproj.io/v1alpha1
kind: Application
spec:
  source:
    chart: my-chart
    targetRevision: "1.2.3"  # Pin specific version

# For Kustomize: Use local bases instead of remote
# Avoid: resources: [https://github.com/org/base//manifests]
# Use: resources: [../../base/manifests]
```

### Bottleneck C: Kubernetes API (Diff Computation)

```bash
# Check controller logs for slow API calls
kubectl logs -n argocd deployment/argocd-application-controller --tail=200 | \
  grep -E "slow|timeout|api-server|rate"

# Check the Kubernetes API server request latency
kubectl get --raw /metrics | grep apiserver_request_duration_seconds_bucket | head -20
```

Symptoms:
- Controller logs show "context deadline exceeded" or "rate limit" warnings
- High `argocd_app_k8s_request_total` rate
- Kubernetes API server under high load

Fixes:

```yaml
# Reduce the number of resources ArgoCD watches
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Exclude resources ArgoCD does not need to track
  resource.exclusions: |
    - apiGroups:
        - "events.k8s.io"
      kinds:
        - Event
      clusters:
        - "*"
    - apiGroups:
        - ""
      kinds:
        - Event
      clusters:
        - "*"
```

## Step 4: Check Resource Consumption

```bash
# Check controller resource usage
kubectl top pod -n argocd -l app.kubernetes.io/name=argocd-application-controller

# Check repo server resource usage
kubectl top pod -n argocd -l app.kubernetes.io/name=argocd-repo-server

# Check API server resource usage
kubectl top pod -n argocd -l app.kubernetes.io/name=argocd-server

# Check Redis resource usage
kubectl top pod -n argocd -l app.kubernetes.io/name=argocd-redis
```

If any component is hitting its resource limits:

```yaml
# Increase controller resources
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-application-controller
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: argocd-application-controller
          resources:
            requests:
              cpu: "2"
              memory: "2Gi"
            limits:
              cpu: "4"
              memory: "4Gi"
          env:
            # Increase Go garbage collection threshold
            - name: GOGC
              value: "100"
```

## Step 5: Enable Debug Logging

For deeper investigation, enable debug logging on the affected component:

```bash
# Enable debug logging on the controller
kubectl patch deployment argocd-application-controller -n argocd --type json \
  -p '[{"op": "add", "path": "/spec/template/spec/containers/0/command/-", "value": "--loglevel=debug"}]'

# Enable debug logging on the repo server
kubectl patch deployment argocd-repo-server -n argocd --type json \
  -p '[{"op": "add", "path": "/spec/template/spec/containers/0/command/-", "value": "--loglevel=debug"}]'
```

Watch for specific timing information:

```bash
# Filter for reconciliation timing
kubectl logs -n argocd deployment/argocd-application-controller -f | \
  grep -E "Reconciliation completed|Reconciliation.*duration"
```

Remember to set logging back to `info` level after debugging:

```bash
# Revert to info logging
kubectl patch deployment argocd-application-controller -n argocd --type json \
  -p '[{"op": "replace", "path": "/spec/template/spec/containers/0/command/-1", "value": "--loglevel=info"}]'
```

## Step 6: Check for Specific Slow Applications

Sometimes one or two applications with large manifests slow down the entire system:

```bash
# Find applications with the most resources
argocd app list -o json | jq 'sort_by(.status.resources | length) | reverse | .[:10] | .[] | {name: .metadata.name, resources: (.status.resources | length)}'

# Find applications with recent reconciliation errors
argocd app list -o json | jq '.[] | select(.status.conditions != null) | {name: .metadata.name, conditions: [.status.conditions[].type]}'
```

Applications with hundreds of resources take proportionally longer to reconcile. Consider splitting large applications into smaller ones.

## Debugging Checklist

Run through this checklist systematically:

```bash
#!/bin/bash
echo "=== ArgoCD Slow Reconciliation Debugger ==="

echo "--- Controller Status ---"
kubectl get pods -n argocd -l app.kubernetes.io/name=argocd-application-controller -o wide
kubectl top pod -n argocd -l app.kubernetes.io/name=argocd-application-controller

echo "--- Repo Server Status ---"
kubectl get pods -n argocd -l app.kubernetes.io/name=argocd-repo-server -o wide
kubectl top pod -n argocd -l app.kubernetes.io/name=argocd-repo-server

echo "--- Application Count ---"
argocd app list -o json | jq 'length'

echo "--- OutOfSync Applications ---"
argocd app list -o json | jq '[.[] | select(.status.sync.status=="OutOfSync")] | length'

echo "--- Applications with Errors ---"
argocd app list -o json | jq '[.[] | select(.status.conditions != null)] | length'

echo "--- Redis Status ---"
kubectl exec -n argocd deployment/argocd-redis -- redis-cli info memory | head -10
```

For continuous monitoring of your ArgoCD reconciliation performance and automatic alerting on slowdowns, [OneUptime](https://oneuptime.com) provides observability dashboards purpose-built for GitOps workflows.

## Key Takeaways

- Start debugging with metrics to identify which component is slow
- The most common bottleneck is Git operations on the repo server
- Scale the repo server and enable shallow clones for quick wins
- Exclude unnecessary resources from ArgoCD tracking
- Increase resource limits on components that are hitting their caps
- Split large applications into smaller ones to reduce per-app reconciliation time
- Use debug logging temporarily for deep investigation
- Monitor queue depth as the primary indicator of reconciliation health
