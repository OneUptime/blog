# How to Roll Back Helm Releases in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Helm

Description: Learn how to roll back Helm releases in Rancher to recover from failed upgrades, configuration errors, or unstable deployments.

When a Helm upgrade goes wrong, whether due to a misconfigured value, an incompatible chart version, or a buggy application release, you need to quickly roll back to a known good state. Rancher helps you inspect installed apps and recent operations, while Helm provides the rollback mechanism for releases. This guide covers the practical workflow and best practices for rolling back Helm releases.

## Prerequisites

- A running Rancher instance (v2.7 or later)
- A managed Kubernetes cluster with Helm releases that have been upgraded at least once
- Access to the namespace containing the releases

## Understanding Helm Rollbacks

When you roll back a Helm release, Helm:

1. Retrieves the chart, manifest, hooks, and values from the target revision
2. Creates a new release revision that copies that target state
3. Applies the stored manifest from that revision to the cluster
4. Creates a new revision (the rollback itself is a new revision)

For example, if you roll back from revision 4 to revision 2, you get revision 5 that matches the state of revision 2.

## Step 1: Identify the Problem

Before rolling back, confirm the upgrade caused the issue:

```bash
# Check release status

helm status my-app -n default

# View release history
helm history my-app -n default

# Check pod status
kubectl get pods -l app.kubernetes.io/instance=my-app -n default

# View pod events
kubectl describe pods -l app.kubernetes.io/instance=my-app -n default

# Check logs
kubectl logs -l app.kubernetes.io/instance=my-app -n default --tail=50
```

In the Rancher UI, open the target cluster's Cluster Dashboard, navigate to **Apps > Installed Apps**, and check the release status. Then go to **Workloads** to inspect pod health.

## Step 2: Locate the Release in Rancher

1. Click **☰ > Cluster Management**
2. Find the cluster and click **Explore**
3. Navigate to **Apps > Installed Apps**
4. Find the release you want to inspect
5. Review its details, current chart version, and recent operations

Rancher shows the installed app details and recent Helm operations, but the documented rollback workflow is to use the Helm CLI from a shell with access to the cluster.

## Step 3: Roll Back via the Helm CLI

### Roll Back to the Previous Revision

```bash
helm rollback my-app -n default
```

Without specifying a revision, Helm rolls back to the immediately previous revision.

### Roll Back to a Specific Revision

First, view the history to find the target revision:

```bash
helm history my-app -n default
```

Then roll back to the desired revision:

```bash
helm rollback my-app 2 -n default
```

### Roll Back with Options

```bash
# Wait for rollback to complete
helm rollback my-app 2 -n default --wait --timeout 5m

# Force resource replacement if needed
helm rollback my-app 2 -n default --force

# Clean up resources created during the rollback if the rollback fails
helm rollback my-app 2 -n default --cleanup-on-fail
```

## Step 4: Verify the Rollback

After the rollback completes:

```bash
# Check the release status
helm status my-app -n default

# Verify the revision
helm history my-app -n default

# Check the current computed values
helm get values my-app -n default --all

# Verify pods are healthy
kubectl get pods -l app.kubernetes.io/instance=my-app -n default

# Test the application
kubectl port-forward svc/my-app 8080:80 -n default
```

In Rancher, open the target cluster's Cluster Dashboard, navigate to **Apps > Installed Apps**, and verify the release shows as **Deployed**. Check **Workloads** to confirm all pods are running.

## Handling Special Rollback Scenarios

### Rolling Back with Persistent Data

If the chart manages databases or other stateful services, be aware that:

- Schema migrations applied during the upgrade are not automatically reverted
- Data written by the new version may not be compatible with the old version
- PersistentVolumeClaims are not affected by Helm rollbacks

Before rolling back stateful applications:

1. Take a backup of your data
2. Check if the application supports downgrade migrations
3. Test the rollback in a staging environment first

### Rolling Back When Pods Are Stuck

If new pods are stuck in a crash loop and old pods have been terminated:

```bash
# Force the rollback
helm rollback my-app 2 -n default --force

# If pods are still stuck, check for PVC issues
kubectl get pvc -l app.kubernetes.io/instance=my-app -n default

# Check for resource quota issues
kubectl describe resourcequota -n default
```

### Rolling Back Custom Resource Definitions

Helm does not delete CRDs during rollback. If a chart upgrade added new CRDs, they remain after rollback. This is usually harmless, but if the CRDs cause issues:

```bash
# List CRDs related to the chart
kubectl get crds | grep my-app

# Manually remove if needed (be careful - this deletes all instances)
kubectl delete crd myresource.example.com
```

### Rolling Back with Hook Failures

If Helm rollback hooks (`pre-rollback`, `post-rollback`) fail during rollback:

```bash
# Skip hooks during rollback
helm rollback my-app 2 -n default --no-hooks
```

Only use this if you understand the impact of skipping hooks.

## Automating Rollbacks

### Using --atomic on Upgrades

The best way to handle rollbacks is to prevent the need for manual intervention:

```bash
helm upgrade my-app my-chart \
  --version 2.0.0 \
  --namespace default \
  -f values.yaml \
  --atomic \
  --timeout 5m
```

The `--atomic` flag automatically rolls back if the upgrade fails or times out.

### CI/CD Pipeline Rollback

In a CI/CD pipeline, automate rollback on failure:

```bash
#!/bin/bash
set -e

# Attempt the upgrade
if ! helm upgrade my-app my-chart \
  --version $CHART_VERSION \
  --namespace default \
  -f values.yaml \
  --wait \
  --timeout 5m; then

  echo "Upgrade failed, rolling back..."
  helm rollback my-app -n default --wait --timeout 5m
  exit 1
fi

echo "Upgrade successful"
```

### Health Check After Upgrade

```bash
#!/bin/bash
set -e

# Upgrade
helm upgrade my-app my-chart --version 2.0.0 -n default -f values.yaml --wait

# Forward the service locally for the health check
kubectl port-forward svc/my-app 8080:80 -n default >/tmp/my-app-port-forward.log 2>&1 &
PF_PID=$!
trap 'kill $PF_PID 2>/dev/null || true' EXIT

# Wait for the port-forward to be ready
sleep 5

# Check application health
if ! curl -sf http://127.0.0.1:8080/health; then
  echo "Health check failed, rolling back..."
  helm rollback my-app -n default --wait
  exit 1
fi
```

## Rolling Back in Multi-Chart Environments

When multiple charts depend on each other, plan the rollback order:

1. Roll back dependent charts first (e.g., application before database)
2. Verify each rollback before proceeding
3. Consider the impact on inter-service communication

```bash
# Roll back in reverse dependency order
helm rollback frontend 3 -n default --wait
helm rollback backend 5 -n default --wait
helm rollback database 2 -n default --wait
```

## Best Practices

1. Always keep enough revision history for meaningful rollbacks (`--history-max 10` or more)
2. Use `--atomic` for production upgrades to enable automatic rollback
3. Test rollback procedures regularly in staging environments
4. Document the rollback process for your team
5. Back up data before rolling back stateful applications
6. If you use the `helm-diff` plugin, compare the current state with the target revision before rolling back
7. Monitor application health immediately after a rollback

## Summary

Rolling back Helm releases in Rancher is straightforward once you identify the release in Rancher and perform the rollback with the Helm CLI. The key is to maintain sufficient revision history, verify the target revision before rolling back, and confirm application health after the rollback completes. For production environments, use the `--atomic` flag on upgrades to enable automatic rollbacks, and always test rollback procedures in staging before relying on them in production.
