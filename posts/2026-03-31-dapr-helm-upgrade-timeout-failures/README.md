# How to Fix Dapr Helm Upgrade Timeout Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Helm, Kubernetes, Upgrade, Timeout

Description: Fix Dapr Helm upgrade timeout failures caused by slow rollouts, stuck deployments, and webhook unavailability during version upgrades.

---

Dapr Helm upgrades can time out when control plane components take too long to become ready, old pods refuse to terminate, or the admission webhook is unavailable during the transition.

## Understanding Helm Upgrade Timeouts

Helm waits for all deployments to roll out successfully within a timeout window (default: 5 minutes). If Dapr's control plane components don't start in time, Helm marks the upgrade as failed:

```yaml
Error: UPGRADE FAILED: timed out waiting for the condition
```

## Extending the Helm Timeout

The simplest fix is increasing the timeout window:

```bash
helm upgrade dapr dapr/dapr \
  -n dapr-system \
  --timeout 10m \
  --wait \
  --reuse-values
```

## Checking What's Slow

When a timeout occurs, check which pods are not ready:

```bash
kubectl get pods -n dapr-system
kubectl describe pod <pending-pod> -n dapr-system
```

Common reasons for slow startup:
- Image pull from a slow registry
- Insufficient cluster resources (CPU, memory)
- Node affinity rules preventing scheduling
- PodDisruptionBudgets blocking old pod termination

## Monitoring Resource Availability

Check if nodes have enough resources:

```bash
kubectl describe nodes | grep -A5 "Allocated resources"
kubectl top nodes
```

If resource-constrained, scale down non-critical workloads or add nodes before upgrading.

## Handling Stuck Deployments

If a deployment is stuck, check its rollout status:

```bash
kubectl rollout status deployment dapr-operator -n dapr-system --timeout=5m
```

Force a rollout if needed:

```bash
kubectl rollout restart deployment dapr-operator dapr-sentry \
  dapr-sidecar-injector -n dapr-system
kubectl rollout restart statefulset dapr-placement-server -n dapr-system
```

## Rolling Back a Failed Upgrade

If the upgrade fails, roll back to the previous version:

```bash
helm rollback dapr -n dapr-system
helm list -n dapr-system
```

Verify the rollback succeeded:

```bash
kubectl get pods -n dapr-system
dapr status -k
```

## Upgrading in Stages

For large clusters, upgrade the control plane first, then let sidecars update gradually via rolling restarts:

```bash
# Step 1: Upgrade control plane only
helm upgrade dapr dapr/dapr -n dapr-system \
  --set global.tag=1.14.0 \
  --timeout 10m \
  --wait

# Step 2: Restart app deployments to get new sidecars
kubectl rollout restart deployment -n production
```

## Pre-Upgrade Checklist

Run before any upgrade:

```bash
# Check current status
kubectl get pods -n dapr-system
dapr status -k

# Back up components and configurations
kubectl get components -A -o yaml > dapr-components-backup.yaml
kubectl get configurations -A -o yaml > dapr-configs-backup.yaml
```

## Summary

Dapr Helm upgrade timeouts are usually caused by resource constraints, slow image pulls, or stuck pods. Extend the Helm timeout with `--timeout 10m`, ensure the cluster has adequate resources before upgrading, and always have a rollback plan. Back up your Dapr components and configurations before starting major version upgrades.
