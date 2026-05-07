# How to Upgrade Helm Charts in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Helm

Description: Learn how to upgrade Helm chart releases in Rancher, including changing chart versions, updating values, and handling upgrade strategies.

Upgrading Helm charts is a routine operation for keeping your applications up to date with new features, bug fixes, and security patches. Rancher simplifies the upgrade process through its UI while giving you full access to the Helm CLI for advanced scenarios. This guide covers upgrading Helm releases in Rancher, from simple value changes to major version upgrades.

## Prerequisites

- A running Rancher instance (v2.7 or later)
- A managed Kubernetes cluster with existing Helm releases
- Access to the namespace containing the releases
- Updated chart repositories (refresh before upgrading)

## Step 1: Check for Available Updates

### Via the Rancher UI

1. Navigate to **Apps > Installed Apps**
2. Look for releases with an upgrade indicator (Rancher shows when newer chart versions are available)
3. Click on a release to see the current version and available upgrades

### Via the Helm CLI

```bash
# Update repository index

helm repo update

# Check the current version
helm list -n default

# See available versions
helm search repo bitnami/redis --versions | head -10
```

## Step 2: Review Upgrade Notes

Before upgrading, review the chart's changelog and upgrade notes:

```bash
# See the chart's README
helm show readme bitnami/redis --version 19.0.0

# See what values are available in the new version
helm show values bitnami/redis --version 19.0.0
```

Check for breaking changes, especially for major version upgrades. Chart maintainers usually document required migration steps.

## Step 3: Upgrade via the Rancher UI

### Simple Upgrade

1. Go to **Apps > Installed Apps**
2. Click the three-dot menu next to the release you want to upgrade
3. Select **Edit/Upgrade**
4. Select the target version from the **Chart Version** dropdown
5. Review and update the values if needed (the form or YAML editor will show the current values)
6. Click **Upgrade**

### Update Values Without Changing the Chart Version

You can also upgrade a release by changing its configuration values without changing the chart version:

1. Go to **Apps > Installed Apps**
2. Click the three-dot menu and select **Edit/Upgrade**
3. Keep the same chart version
4. Modify the values as needed (e.g., increase replicas, change resource limits)
5. Click **Upgrade**

## Step 4: Upgrade via the Helm CLI

### Basic Upgrade

```bash
helm upgrade my-redis bitnami/redis \
  --version 19.0.0 \
  --namespace default \
  --reuse-values
```

The `--reuse-values` flag starts from the values in the current release and merges in any overrides you pass with flags like `--set` or `-f`.

### Upgrade with New Values

```bash
helm upgrade my-redis bitnami/redis \
  --version 19.0.0 \
  --namespace default \
  --set replica.replicaCount=5 \
  --set master.resources.limits.memory=512Mi
```

### Upgrade with a Values File

```bash
helm upgrade my-redis bitnami/redis \
  --version 19.0.0 \
  --namespace default \
  -f custom-values.yaml
```

Where `custom-values.yaml` contains:

```yaml
architecture: replication
replica:
  replicaCount: 5
master:
  persistence:
    size: 20Gi
  resources:
    requests:
      cpu: 200m
      memory: 256Mi
    limits:
      cpu: 1000m
      memory: 512Mi
```

### Dry Run Before Upgrading

Preview the changes without applying them:

```bash
helm upgrade my-redis bitnami/redis \
  --version 19.0.0 \
  --namespace default \
  -f custom-values.yaml \
  --dry-run
```

### Diff Before Upgrading

Use the helm-diff plugin for a clear comparison:

```bash
helm diff upgrade my-redis bitnami/redis \
  --version 19.0.0 \
  --namespace default \
  -f custom-values.yaml
```

## Step 5: Monitor the Upgrade

### Via the Rancher UI

After clicking **Upgrade**, the Rancher UI shows the operation progress. Navigate to:

1. **Apps > Installed Apps** to check the release status
2. **Workloads > Deployments** or **Workloads > StatefulSets** to watch workloads being updated
3. **Workloads > Pods** to see individual pod health

### Via kubectl

```bash
# Watch the rollout
kubectl rollout status statefulset/my-redis-master -n default

# Check pod status
kubectl get pods -l app.kubernetes.io/instance=my-redis -n default

# View recent events
kubectl events -n default --for statefulset/my-redis-master
```

## Step 6: Verify the Upgrade

After the upgrade completes:

```bash
# Confirm the new version
helm list -n default

# Check release status
helm status my-redis -n default

# Verify the values
helm get values my-redis -n default
```

Test the application:

```bash
# Port-forward and test
kubectl port-forward svc/my-redis-master 6379:6379 -n default

# In another terminal, use the release password
redis-cli -a YOUR_PASSWORD ping
```

## Handling Upgrade Failures

### Automatic Rollback

Use the `--atomic` flag to automatically roll back if the upgrade fails:

```bash
helm upgrade my-redis bitnami/redis \
  --version 19.0.0 \
  --namespace default \
  -f custom-values.yaml \
  --atomic \
  --timeout 5m
```

### Manual Rollback

If the upgrade fails without the atomic flag:

```bash
# Check history
helm history my-redis -n default

# Roll back to the last working revision
helm rollback my-redis 3 -n default
```

### Wait for Resources

Ensure the upgrade waits for all resources to be ready:

```bash
helm upgrade my-redis bitnami/redis \
  --version 19.0.0 \
  --namespace default \
  -f custom-values.yaml \
  --wait \
  --timeout 10m
```

## Upgrade Strategies

### Blue-Green Approach

For critical applications, deploy the new version alongside the old one:

1. Install the new version with a different release name
2. Test the new deployment
3. Switch traffic to the new release
4. Uninstall the old release

```bash
helm install my-redis-v2 bitnami/redis --version 19.0.0 -n default -f values.yaml
# Test my-redis-v2
# Switch traffic
helm uninstall my-redis -n default
```

### Incremental Upgrade

Apply the version and value changes in smaller steps to reduce risk:

```bash
# First, upgrade with minimal changes
helm upgrade my-redis bitnami/redis --version 19.0.0 --reuse-values -n default

# If stable, apply additional value changes
helm upgrade my-redis bitnami/redis --version 19.0.0 -f new-values.yaml -n default
```

## Best Practices

1. Always do a dry run or diff before upgrading production releases
2. Read the chart changelog for breaking changes
3. Back up persistent data before major version upgrades
4. Use `--atomic` for production upgrades to enable automatic rollback
5. Test upgrades in a staging environment first
6. Pin chart versions in your CI/CD pipelines
7. Keep custom values in version-controlled files

## Summary

Upgrading Helm charts in Rancher is straightforward whether you use the UI or the Helm CLI. Always preview changes with dry runs or diffs, use atomic upgrades for production safety, and verify the application works correctly after each upgrade. Rancher's UI provides a convenient interface for selecting versions and editing values, while the CLI offers advanced options like atomic rollbacks and timeout configuration.
