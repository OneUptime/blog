# How to Upgrade Dapr on Kubernetes Without Downtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, Upgrade, Zero Downtime, Operation

Description: Learn how to safely upgrade Dapr on Kubernetes with zero application downtime using Helm and rolling restarts to update sidecar versions.

---

## Overview of Dapr Upgrade Process

Upgrading Dapr on Kubernetes involves two phases:
1. Upgrading the Dapr control plane (operator, sentry, placement, dashboard)
2. Restarting your application pods to pick up the new sidecar (daprd) version

The control plane upgrade is done via Helm and is backward compatible with older sidecars during the transition period. Application pods can be rolled out gradually without stopping all traffic.

## Prerequisites

- Helm 3 installed
- kubectl configured for your cluster
- Dapr currently installed via Helm (recommended) or Dapr CLI
- Access to run Helm upgrades on the cluster

## Step 1 - Check Current Version

```bash
# Check installed Dapr version
dapr status -k

# Check via Helm
helm list -n dapr-system

# Check sidecar versions on running pods
kubectl get pods --all-namespaces -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .spec.containers[*]}{.image}{"\n"}{end}{end}' | grep daprd
```

## Step 2 - Review the Release Notes

Before upgrading, check the Dapr release notes for:
- Breaking changes in component APIs
- Changes to default behaviors
- Required configuration migration steps

```bash
# View available versions
helm search repo dapr/dapr --versions | head -20
```

## Step 3 - Add or Update the Dapr Helm Repository

```bash
helm repo add dapr https://dapr.github.io/helm-charts/
helm repo update

# Verify available charts
helm search repo dapr/dapr
```

## Step 4 - Upgrade the Dapr Control Plane

```bash
# Upgrade to the target version (e.g., 1.14.0)
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  --version 1.14.0 \
  --set global.ha.enabled=true \
  --wait \
  --timeout 300s
```

Common Helm values to preserve during upgrade:

```bash
# If you customized values, export them first
helm get values dapr -n dapr-system > current-values.yaml

# Then upgrade using the existing values plus version change
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  --version 1.14.0 \
  -f current-values.yaml \
  --wait
```

## Step 5 - Verify Control Plane Is Healthy

```bash
# Check all control plane pods are running
kubectl get pods -n dapr-system

# Verify versions
dapr status -k
```

Expected output:

```text
NAME                   NAMESPACE    HEALTHY  STATUS   VERSION  AGE
dapr-operator          dapr-system  True     Running  1.14.0   2m
dapr-sentry            dapr-system  True     Running  1.14.0   2m
dapr-placement-server  dapr-system  True     Running  1.14.0   2m
dapr-dashboard         dapr-system  True     Running  0.14.0   2m
```

## Step 6 - Update Application Sidecar Versions

After the control plane is upgraded, application pods still run the old sidecar version. Restart them with a rolling update to pick up the new sidecar:

```bash
# Restart all deployments in a namespace (rolling update - no downtime)
kubectl rollout restart deployment -n default

# Or restart specific deployments
kubectl rollout restart deployment/my-api-service -n default
kubectl rollout restart deployment/my-worker-service -n default

# Wait for rollout to complete
kubectl rollout status deployment/my-api-service -n default
```

## Step 7 - Verify Sidecar Versions Updated

```bash
# Check sidecar versions on running pods
kubectl get pods -n default -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .spec.containers[*]}{.image}{"\n"}{end}{end}' | grep daprd
```

## Handle Stateful Workloads (Actors)

For actor-based services, drain actors gracefully before restarting:

```bash
# Scale down the number of replicas gradually (if using HPA)
kubectl scale deployment/actor-service --replicas=2 -n default

# Wait for actor placement to rebalance
sleep 30

# Then restart
kubectl rollout restart deployment/actor-service -n default
kubectl rollout status deployment/actor-service -n default

# Scale back to desired replica count
kubectl scale deployment/actor-service --replicas=5 -n default
```

## Automate the Upgrade in CI/CD

```bash
#!/bin/bash
set -e

TARGET_VERSION="${1:-1.14.0}"
NAMESPACE="dapr-system"
APP_NAMESPACE="default"

echo "Upgrading Dapr to $TARGET_VERSION"

# Export current values
helm get values dapr -n $NAMESPACE > /tmp/dapr-current-values.yaml

# Upgrade control plane
helm upgrade dapr dapr/dapr \
  --namespace $NAMESPACE \
  --version $TARGET_VERSION \
  -f /tmp/dapr-current-values.yaml \
  --wait \
  --timeout 300s

echo "Control plane upgraded. Verifying..."
dapr status -k

# Rolling restart all deployments
echo "Restarting application sidecars..."
kubectl rollout restart deployment -n $APP_NAMESPACE

# Wait for all to complete
kubectl rollout status deployment -n $APP_NAMESPACE --timeout=300s

echo "Upgrade complete!"
dapr status -k
```

## Rollback if Needed

If the upgrade causes issues:

```bash
# Rollback control plane
helm rollback dapr -n dapr-system

# Rollback application pods to previous sidecar
kubectl rollout undo deployment/my-api-service -n default
```

## Summary

Upgrading Dapr on Kubernetes without downtime is a two-phase process: first upgrade the control plane using `helm upgrade`, which is backward compatible with running sidecars during the transition, then trigger rolling restarts on application deployments to pick up the new sidecar version. Because Kubernetes rolling updates replace pods one at a time, traffic continues to flow throughout the upgrade process.
