# How to Manage Helm Release Versions in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Helm

Description: Learn how to manage Helm release versions in Rancher, including viewing release history, comparing versions, and understanding revision tracking.

Every time you install or upgrade a Helm chart, Helm creates a new release revision. Managing these revisions is important for tracking changes, debugging issues, and understanding the history of your deployments. Rancher provides visibility into Helm release versions through its UI, and you can use the Helm CLI for more advanced version management. This guide covers all aspects of managing Helm release versions.

## Prerequisites

- A running Rancher instance (v2.7 or later)
- A managed Kubernetes cluster with existing Helm releases
- Access to the namespace containing the releases

## Understanding Helm Releases and Revisions

A **release** is an instance of a Helm chart deployed to a cluster. It has a unique name within a namespace.

A **revision** is a snapshot of a release at a specific point in time. Each install, upgrade, or rollback creates a new revision with an incrementing number.

For example:
- Revision 1: Initial install of redis chart v18.0.0
- Revision 2: Upgrade to redis chart v18.1.0 with new values
- Revision 3: Rollback to revision 1
- Revision 4: Upgrade to redis chart v19.0.0

## Step 1: View Installed Releases in Rancher

Navigate to **Apps > Installed Apps** in the Rancher dashboard. This page shows all Helm releases in the cluster with:

- **Name**: The release name
- **Namespace**: Where the release is installed
- **Status**: Current status (deployed, failed, pending-upgrade, etc.)
- **Chart**: The chart name and version
- **App Version**: The version of the application itself
- **Updated**: When the release was last modified

Click on a release name to see its details.

## Step 2: View Release History

### Via the Rancher UI

Click on a release in **Apps > Installed Apps** to see its detail page. The page shows the current revision and status.

### Via the Helm CLI

For release history details, use the Helm CLI against the cluster (for example, from a workstation configured with the cluster's kubeconfig):

```bash
helm history my-redis -n default
```

Output:

```plaintext
REVISION    UPDATED                     STATUS          CHART           APP VERSION     DESCRIPTION
1           Mon Mar 10 10:00:00 2026    superseded      redis-18.0.0    7.2.0           Install complete
2           Tue Mar 12 14:30:00 2026    superseded      redis-18.1.0    7.2.1           Upgrade complete
3           Wed Mar 15 09:15:00 2026    superseded      redis-18.0.0    7.2.0           Rollback to 1
4           Thu Mar 18 16:45:00 2026    deployed        redis-19.0.0    7.4.0           Upgrade complete
```

## Step 3: Inspect a Specific Revision

To see the values used in a specific revision:

```bash
helm get values my-redis --revision 2 -n default
```

To see all computed values (including defaults):

```bash
helm get values my-redis --revision 2 --all -n default
```

To see the rendered manifests for a revision:

```bash
helm get manifest my-redis --revision 2 -n default
```

To see the release notes:

```bash
helm get notes my-redis --revision 2 -n default
```

To see everything at once:

```bash
helm get all my-redis --revision 2 -n default
```

## Step 4: Compare Revisions

To understand what changed between revisions, compare the values:

```bash
# Get values from two revisions as YAML

helm get values my-redis --revision 1 -n default -o yaml > revision1.yaml
helm get values my-redis --revision 2 -n default -o yaml > revision2.yaml

# Compare them
diff revision1.yaml revision2.yaml
```

Compare the rendered manifests:

```bash
helm get manifest my-redis --revision 1 -n default > manifest1.yaml
helm get manifest my-redis --revision 2 -n default > manifest2.yaml
diff manifest1.yaml manifest2.yaml
```

Use the `helm diff` plugin for a more streamlined comparison:

```bash
# Install the diff plugin
# Helm 4 users may need --verify=false for plugins that don't publish provenance files
helm plugin install https://github.com/databus23/helm-diff

# Compare revisions
helm diff revision my-redis 1 2 -n default
```

## Step 5: Check Available Chart Versions

To see which chart versions are available for upgrade:

### Via Rancher UI

1. Go to **Apps > Installed Apps**
2. Click the three-dot menu next to a release
3. Select **Edit/Upgrade**
4. Use the version dropdown to see available chart versions

### Via Helm CLI

```bash
# List all available versions of a chart
helm search repo bitnami/redis --versions

# Show versions matching a constraint
helm search repo bitnami/redis --version ">=18.0.0 <20.0.0"
```

## Step 6: Control Revision History Length

By default, Helm stores release information as Kubernetes Secrets and keeps a maximum of 10 revisions. You can change this:

```bash
# Set max history during upgrade
helm upgrade my-redis bitnami/redis \
  --namespace default \
  --history-max 20 \
  -f values.yaml
```

To set a global default, configure the `HELM_MAX_HISTORY` environment variable.

To inspect the underlying release Secrets manually:

```bash
# View release secrets
kubectl get secrets -n default -l owner=helm,name=my-redis

# Helm manages these automatically based on history-max
```

## Step 7: Handle Stuck or Failed Releases

### Pending-Install or Pending-Upgrade

If a release is stuck in a pending state:

```bash
# Check the status
helm status my-redis -n default

# If stuck, inspect the Helm release Secrets and their labels
kubectl get secrets -n default -l owner=helm,name=my-redis --show-labels
```

### Failed Releases

If an upgrade fails:

```bash
# View the history to see the failure
helm history my-redis -n default

# Roll back to a known-good revision
helm rollback my-redis 3 -n default
```

### Orphaned Resources

Sometimes resources are left behind after a failed release:

```bash
# List common namespaced resources labeled with the release name
kubectl get all -l app.kubernetes.io/instance=my-redis -n default

# If needed, uninstall the release without running hooks
helm uninstall my-redis -n default --no-hooks
```

## Release Status Reference

| Status | Description |
|--------|-------------|
| `unknown` | The release is in an uncertain state |
| `deployed` | Successfully installed or upgraded |
| `uninstalled` | The release has been uninstalled from Kubernetes |
| `superseded` | A previous revision replaced by a newer one |
| `failed` | The install or upgrade failed |
| `uninstalling` | Currently being uninstalled |
| `pending-install` | Install in progress |
| `pending-upgrade` | Upgrade in progress |
| `pending-rollback` | Rollback in progress |

## Best Practices

1. **Keep history manageable**: Set `--history-max` to a reasonable value (10-20) to avoid excessive Secret storage
2. **Document changes**: Use `--description` during upgrades to record why changes were made:
   ```bash
   helm upgrade my-redis bitnami/redis --description "Upgrade to fix CVE-2026-1234" -n default
   ```
3. **Pin chart versions**: Always specify chart versions in your upgrade commands to avoid unexpected changes
4. **Diff before upgrading**: Use `helm diff upgrade` to preview changes before applying them
5. **Monitor after upgrades**: Check pod health and logs immediately after any version change

## Summary

Managing Helm release versions in Rancher involves tracking revisions, comparing changes, and understanding the release lifecycle. Rancher's UI provides a quick overview of installed releases and their status, while the Helm CLI offers detailed history, value comparison, and manifest inspection. Use revision history to troubleshoot issues, the diff plugin to preview changes, and proper history limits to keep your cluster clean.
