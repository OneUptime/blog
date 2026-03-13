# How to Troubleshoot Controller Leader Election Failures in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Leader Election, High Availability, Controller Manager

Description: Learn how to diagnose and fix Flux controller leader election failures that cause reconciliation stalls, split-brain scenarios, and controller startup problems.

---

Flux controllers use Kubernetes leader election to ensure only one instance of each controller is actively reconciling resources at a time. This is essential for preventing duplicate operations and maintaining consistency. When leader election fails, controllers may stall completely, run in a degraded state, or cause split-brain scenarios where multiple instances attempt to reconcile simultaneously. This guide explains how to diagnose and fix leader election failures across Flux controllers.

## Prerequisites

Before you begin, ensure you have the following:

- A Kubernetes cluster with Flux installed
- kubectl configured to access your cluster
- Permissions to view pods, leases, configmaps, and events in the flux-system namespace

## Step 1: Identify Leader Election Failures

Check controller logs for leader election errors:

```bash
kubectl logs -n flux-system deploy/source-controller | grep -i "leader\|election\|lease"
kubectl logs -n flux-system deploy/kustomize-controller | grep -i "leader\|election\|lease"
kubectl logs -n flux-system deploy/helm-controller | grep -i "leader\|election\|lease"
```

Common error messages include:

- `failed to acquire lease`
- `leader election lost`
- `context deadline exceeded` during lease acquisition
- `failed to renew lease`

## Step 2: Check Lease Objects

Flux controllers use Kubernetes Lease objects for leader election. Inspect them:

```bash
kubectl get leases -n flux-system
```

Examine a specific lease:

```bash
kubectl describe lease -n flux-system source-controller
```

Key fields to check:

- `holderIdentity`: The pod currently holding the lease
- `leaseDurationSeconds`: How long the lease is valid
- `renewTime`: When the lease was last renewed
- `acquireTime`: When the lease was acquired

If the `renewTime` is significantly in the past (more than the lease duration), the leader has stopped renewing and a new leader should be elected.

## Step 3: Identify Common Causes

### Stale Lease Held by Terminated Pod

If a pod was terminated without properly releasing the lease, the lease remains held by a non-existent pod:

```bash
# Check who holds the lease
kubectl get lease -n flux-system source-controller -o jsonpath='{.spec.holderIdentity}'

# Verify the pod exists
kubectl get pods -n flux-system
```

If the holder pod no longer exists, the new pod must wait for the lease to expire before acquiring it. The default lease duration is typically 15 seconds, but network or API server issues can delay the process.

### API Server Connectivity Issues

Leader election requires regular communication with the Kubernetes API server. If the controller cannot reach the API server, it cannot renew its lease:

```bash
kubectl logs -n flux-system deploy/source-controller | grep -i "connection refused\|timeout\|api server\|dial tcp"
```

Check API server health:

```bash
kubectl get componentstatuses
kubectl cluster-info
```

### Clock Skew Between Nodes

If the clocks on different nodes are significantly out of sync, lease renewal timestamps may be inconsistent, causing leader election failures:

```bash
# Check time on different nodes
kubectl get nodes -o wide
kubectl debug node/<node-name> -- date
```

### Resource Quota Preventing Pod Creation

If the replacement pod cannot start due to resource quotas, the old lease will expire but no new leader can take over:

```bash
kubectl get resourcequota -n flux-system
kubectl describe resourcequota -n flux-system
```

### RBAC Permissions for Lease Management

Controllers need RBAC permissions to create, get, update, and delete Lease objects:

```bash
kubectl auth can-i create leases --as=system:serviceaccount:flux-system:source-controller -n flux-system
kubectl auth can-i update leases --as=system:serviceaccount:flux-system:source-controller -n flux-system
```

## Step 4: Resolve Leader Election Failures

### Delete Stale Leases

If a lease is stuck with a non-existent holder, delete it to allow re-election:

```bash
kubectl delete lease -n flux-system source-controller
```

The controller will automatically create a new lease and acquire it.

### Restart the Controller

Force a clean restart to re-trigger leader election:

```bash
kubectl rollout restart deployment/source-controller -n flux-system
kubectl rollout status deployment/source-controller -n flux-system
```

### Fix RBAC Permissions

Ensure the controller service account has the required permissions:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: source-controller-leader-election
  namespace: flux-system
rules:
- apiGroups: ["coordination.k8s.io"]
  resources: ["leases"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: [""]
  resources: ["events"]
  verbs: ["create", "patch"]
```

### Adjust Lease Parameters

If leader election is failing due to network latency, you can adjust the lease parameters through controller arguments:

```bash
kubectl patch deployment source-controller -n flux-system --type='json' -p='[
  {"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--leader-elect-lease-duration=30s"},
  {"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--leader-elect-renew-deadline=20s"},
  {"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--leader-elect-retry-period=5s"}
]'
```

## Step 5: Verify Leader Election

After fixing the issue, verify leader election is working:

```bash
kubectl get leases -n flux-system
```

Check that each lease has a valid holder and recent renewTime:

```bash
kubectl get leases -n flux-system -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.holderIdentity}{"\t"}{.spec.renewTime}{"\n"}{end}'
```

Verify controllers are reconciling:

```bash
flux check
flux get all --all-namespaces | head -20
```

## Prevention Tips

- Monitor lease renewal times and alert when they are stale
- Ensure NTP is configured on all cluster nodes to prevent clock skew
- Use pod disruption budgets carefully to avoid disrupting controller pods during node maintenance
- Verify RBAC permissions after Flux upgrades
- Monitor API server latency and availability
- Set appropriate lease duration values based on your cluster network characteristics
- Run `flux check` as part of your cluster monitoring to detect controller health issues

## Summary

Flux controller leader election failures are typically caused by stale leases from terminated pods, API server connectivity issues, clock skew between nodes, or insufficient RBAC permissions. Deleting stale leases, ensuring API server connectivity, synchronizing node clocks, and verifying RBAC permissions will resolve most leader election failures. Proactive monitoring of lease objects and API server health is the best prevention strategy.
