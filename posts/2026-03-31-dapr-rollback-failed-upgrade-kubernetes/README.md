# How to Roll Back a Failed Dapr Upgrade on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, Rollback, Upgrade, Helm

Description: Roll back a failed Dapr upgrade on Kubernetes using Helm rollback, restoring the previous control plane version while minimizing application downtime.

---

## When to Roll Back

Roll back a Dapr upgrade when:
- Control plane pods fail to start after the upgrade
- Applications start receiving unexpected errors
- Sidecar injection stops working
- mTLS certificate errors appear after upgrading

## Check Upgrade Status Before Rolling Back

```bash
# Check Helm release history
helm history dapr -n dapr-system

# REVISION  STATUS     DESCRIPTION
# 1         superseded Install complete
# 2         failed     Upgrade failed
# 3         deployed   Rollback to revision 1

# Check current pod states
kubectl get pods -n dapr-system
kubectl rollout status deployment/dapr-operator -n dapr-system
```

## Rolling Back with Helm

```bash
# Roll back to the previous release
helm rollback dapr -n dapr-system

# Roll back to a specific revision
helm rollback dapr 1 -n dapr-system

# Roll back and wait for pods to be ready
helm rollback dapr -n dapr-system --wait --timeout 300s

# Verify the rollback
helm status dapr -n dapr-system
dapr status -k
```

## Verifying Post-Rollback Health

```bash
# All control plane pods should be Running
kubectl get pods -n dapr-system

# Check Dapr version is back to previous
dapr status -k | grep Version

# Verify sidecar injection still works
kubectl delete pod test-app-xxxxxxxxx  # Force pod restart
kubectl get pod -l app=test-app        # Should show 2/2 READY
```

## Manual Rollback (If Helm Fails)

If Helm rollback fails, manually restore the previous image tags:

```bash
# Get the previous image tag from Helm history
helm get manifest dapr -n dapr-system --revision 1 | grep "image:"

# Manually set images back
kubectl set image deployment/dapr-operator \
  dapr-operator=docker.io/daprio/operator:1.12.5 \
  -n dapr-system

kubectl set image deployment/dapr-sentry \
  dapr-sentry=docker.io/daprio/sentry:1.12.5 \
  -n dapr-system

kubectl set image deployment/dapr-sidecar-injector \
  dapr-sidecar-injector=docker.io/daprio/injector:1.12.5 \
  -n dapr-system

kubectl set image statefulset/dapr-placement-server \
  dapr-placement-server=docker.io/daprio/placement:1.12.5 \
  -n dapr-system
```

## Avoiding Failed Upgrades

Use `--dry-run` before upgrading:

```bash
# Test the upgrade without applying
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  --version 1.14.0 \
  -f values.yaml \
  --dry-run

# Stage the upgrade in a non-production namespace first
kubectl create namespace dapr-staging
helm install dapr-staging dapr/dapr \
  --namespace dapr-staging \
  --version 1.14.0 \
  -f values.yaml \
  --wait
```

## Summary

Rolling back a failed Dapr upgrade is straightforward with `helm rollback dapr -n dapr-system`. Always check `helm history` to confirm the target revision before rolling back, and verify all control plane pods return to a Running state afterward. Prevent upgrade failures by testing new Dapr versions in a staging namespace before applying to production.
