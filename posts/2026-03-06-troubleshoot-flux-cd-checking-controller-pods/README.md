# How to Troubleshoot Flux CD by Checking Controller Pods

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Troubleshooting, Kubernetes, Controller pods, Debugging, GitOps

Description: Learn how to inspect Flux CD controller pods, analyze logs, check restart counts, and monitor resource usage to diagnose controller-level issues.

---

Flux CD runs as a set of controller pods in the `flux-system` namespace. When things go wrong, the controllers themselves may be crashing, running out of memory, or stuck in error loops. This guide shows you how to inspect every aspect of Flux controller pods to find and fix problems at the infrastructure level.

## Understanding Flux CD Controllers

Flux CD deploys several controllers, each responsible for a different function:

| Controller | Purpose |
|-----------|---------|
| `source-controller` | Fetches artifacts from Git, Helm, OCI, and Bucket sources |
| `kustomize-controller` | Applies Kustomize overlays to the cluster |
| `helm-controller` | Manages Helm chart installations and upgrades |
| `notification-controller` | Sends alerts and receives webhooks |
| `image-reflector-controller` | Scans container registries for new tags |
| `image-automation-controller` | Updates Git repositories with new image tags |

## Step 1: List All Flux Controller Pods

Start by getting an overview of all Flux controller pods:

```bash
# List all pods in the flux-system namespace
kubectl get pods -n flux-system

# Get detailed output with node placement and IP
kubectl get pods -n flux-system -o wide

# Check pod status with restart counts
kubectl get pods -n flux-system -o custom-columns=\
NAME:.metadata.name,\
STATUS:.status.phase,\
RESTARTS:.status.containerStatuses[0].restartCount,\
AGE:.metadata.creationTimestamp,\
NODE:.spec.nodeName
```

Expected healthy output:

```text
NAME                                           READY   STATUS    RESTARTS   AGE
helm-controller-6f4d8b5c97-xk2jm              1/1     Running   0          2d
kustomize-controller-7b8c9d5f6-lm4np           1/1     Running   0          2d
notification-controller-5c4d7e8f9-qr6st        1/1     Running   0          2d
source-controller-8d6e9f7a1-wv8xy              1/1     Running   0          2d
```

### Red flags to watch for:

- **RESTARTS > 0** - The controller has crashed and been restarted.
- **STATUS: CrashLoopBackOff** - The controller is repeatedly crashing.
- **STATUS: OOMKilled** - The controller ran out of memory.
- **READY: 0/1** - The controller is not ready to serve traffic.

## Step 2: Check Pod Logs for Errors

```bash
# View recent logs from source-controller
kubectl logs -n flux-system deployment/source-controller --tail=100

# View logs from kustomize-controller
kubectl logs -n flux-system deployment/kustomize-controller --tail=100

# View logs from helm-controller
kubectl logs -n flux-system deployment/helm-controller --tail=100

# View logs from notification-controller
kubectl logs -n flux-system deployment/notification-controller --tail=100

# Stream logs in real time
kubectl logs -n flux-system deployment/source-controller -f

# View logs from a crashed (previous) container instance
kubectl logs -n flux-system deployment/source-controller --previous
```

The `--previous` flag is critical when a pod has restarted. It shows the logs from the container instance that crashed, which usually contains the error that caused the crash.

## Step 3: Check for OOMKilled and CrashLoopBackOff

```bash
# Get detailed pod status including last termination reason
kubectl get pods -n flux-system -o json | jq -r '
  .items[] |
  "\(.metadata.name):
    State: \(.status.containerStatuses[0].state | keys[0])
    Restarts: \(.status.containerStatuses[0].restartCount)
    Last Termination: \(.status.containerStatuses[0].lastState.terminated // "none")"'
```

If you see `OOMKilled` as the termination reason, increase the memory limits:

```yaml
# patches/increase-memory.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          resources:
            limits:
              # Increase from default 1Gi to 2Gi
              memory: 2Gi
            requests:
              memory: 256Mi
```

Apply this via a Kustomize patch in your flux-system kustomization:

```yaml
# clusters/production/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - target:
      kind: Deployment
      name: source-controller
    patch: |
      - op: replace
        path: /spec/template/spec/containers/0/resources/limits/memory
        value: 2Gi
```

## Step 4: Check Resource Usage

```bash
# Check CPU and memory usage of Flux pods (requires metrics-server)
kubectl top pods -n flux-system

# Check resource requests and limits
kubectl get pods -n flux-system -o json | jq -r '
  .items[] |
  "\(.metadata.name):
    CPU Request: \(.spec.containers[0].resources.requests.cpu // "none")
    CPU Limit: \(.spec.containers[0].resources.limits.cpu // "none")
    Memory Request: \(.spec.containers[0].resources.requests.memory // "none")
    Memory Limit: \(.spec.containers[0].resources.limits.memory // "none")"'
```

## Step 5: Inspect Pod Events

```bash
# Get events for a specific controller pod
kubectl describe pod -n flux-system -l app=source-controller

# Get events sorted by time
kubectl get events -n flux-system --sort-by='.lastTimestamp' \
  --field-selector involvedObject.kind=Pod
```

Common events to watch for:

- **FailedScheduling** - Not enough resources on any node.
- **Pulled** / **Pulling** - Image pull activity.
- **BackOff** - Container is in crash loop.
- **Unhealthy** - Liveness or readiness probe failed.
- **OOMKilling** - Container exceeded memory limit.

## Step 6: Check Controller Arguments and Configuration

```bash
# View the full container spec for source-controller
kubectl get deployment source-controller -n flux-system \
  -o jsonpath='{.spec.template.spec.containers[0].args}' | jq .

# Check all controller arguments at once
for dep in source-controller kustomize-controller helm-controller notification-controller; do
  echo "=== $dep ==="
  kubectl get deployment "$dep" -n flux-system \
    -o jsonpath='{.spec.template.spec.containers[0].args}' | tr ',' '\n'
  echo ""
done
```

## Step 7: Check Controller Health Endpoints

Flux controllers expose health endpoints. You can check them from inside the cluster:

```bash
# Port-forward to the source-controller health endpoint
kubectl port-forward -n flux-system deployment/source-controller 8080:8080 &

# Check the health endpoint
curl -s http://localhost:8080/healthz
# Expected: {"status":"ok"}

# Check the readiness endpoint
curl -s http://localhost:8080/readyz
# Expected: {"status":"ok"}

# Stop the port-forward
kill %1
```

## Step 8: Check Service Account and RBAC

Controllers need proper RBAC permissions. If a controller cannot create or update resources, check its service account:

```bash
# Check the service account used by each controller
for dep in source-controller kustomize-controller helm-controller notification-controller; do
  SA=$(kubectl get deployment "$dep" -n flux-system \
    -o jsonpath='{.spec.template.spec.serviceAccountName}')
  echo "$dep uses service account: $SA"
done

# Check ClusterRoleBindings for Flux
kubectl get clusterrolebindings | grep flux

# Describe a specific ClusterRoleBinding
kubectl describe clusterrolebinding flux-system-source-controller
```

## Step 9: Check Network Connectivity from Controller Pods

```bash
# Exec into the source-controller pod to test network access
kubectl exec -n flux-system deployment/source-controller -- \
  wget -qO- --timeout=5 https://github.com 2>&1 | head -5

# Test DNS resolution
kubectl exec -n flux-system deployment/source-controller -- \
  nslookup github.com

# Test access to a Helm repository
kubectl exec -n flux-system deployment/source-controller -- \
  wget -qO- --timeout=5 https://charts.bitnami.com/bitnami/index.yaml 2>&1 | head -5
```

## Step 10: Full Diagnostic Script

```bash
#!/bin/bash
# flux-pod-diagnostic.sh - Complete controller pod health check

NAMESPACE="flux-system"

echo "=== Pod Status ==="
kubectl get pods -n "$NAMESPACE" -o wide
echo ""

echo "=== Pod Resource Usage ==="
kubectl top pods -n "$NAMESPACE" 2>/dev/null || echo "metrics-server not available"
echo ""

echo "=== Restart Counts ==="
kubectl get pods -n "$NAMESPACE" -o json | jq -r '
  .items[] |
  "\(.metadata.name) - Restarts: \(.status.containerStatuses[0].restartCount)"'
echo ""

echo "=== Recent Pod Events ==="
kubectl get events -n "$NAMESPACE" --sort-by='.lastTimestamp' \
  --field-selector involvedObject.kind=Pod | tail -20
echo ""

echo "=== Pods with Issues ==="
kubectl get pods -n "$NAMESPACE" -o json | jq -r '
  .items[] |
  select(.status.containerStatuses[0].restartCount > 0 or
         .status.containerStatuses[0].ready == false) |
  "\(.metadata.name) - Ready: \(.status.containerStatuses[0].ready), Restarts: \(.status.containerStatuses[0].restartCount)"'
echo ""

echo "=== Controller Versions ==="
for dep in source-controller kustomize-controller helm-controller notification-controller; do
  IMG=$(kubectl get deployment "$dep" -n "$NAMESPACE" \
    -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null)
  echo "$dep: $IMG"
done
```

## Summary

Checking Flux CD controller pods is essential when the issue lies at the infrastructure level rather than in your resource definitions. Start with `kubectl get pods` to spot restart counts and status issues, then drill into logs with `--previous` for crashed containers. Monitor resource usage to prevent OOMKill events, and use the diagnostic script for a comprehensive health check of your Flux installation.
