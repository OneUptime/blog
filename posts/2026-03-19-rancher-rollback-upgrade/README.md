# How to Roll Back a Failed Rancher Upgrade

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Upgrade

Description: Learn how to safely roll back a failed Rancher upgrade using Helm rollback and etcd snapshot restoration.

Sometimes a Rancher upgrade does not go as planned. Pods may crash, the UI may become unresponsive, or managed clusters may lose connectivity. This guide covers the supported rollback pattern for Rancher on Kubernetes: restore the pre-upgrade Rancher or local cluster state from backup, then start the previous Rancher version with Helm. It also covers etcd snapshot restoration for RKE, RKE2, and K3s clusters when you need to revert the upstream cluster state.

For Rancher v2.6.4+, v2.7.7+, and v2.14.0+, review Rancher's version-specific rollback notes because additional cleanup may be required before the rollback succeeds.

## Prerequisites

- `kubectl` and Helm 3 installed and configured
- Access to the Kubernetes cluster running Rancher
- A pre-upgrade Rancher backup or local cluster snapshot. For RKE2 and K3s, retain the server token file used to encrypt bootstrap data

## Identifying a Failed Upgrade

Before rolling back, confirm that the upgrade has actually failed. Common signs include:

- Rancher pods stuck in `CrashLoopBackOff` or `Error` state
- The Rancher UI is inaccessible
- Helm reports the release as `FAILED`
- Managed clusters show as disconnected

Check the current state:

```bash
helm list -n cattle-system
kubectl get pods -n cattle-system
kubectl get events -n cattle-system --sort-by='.lastTimestamp' | tail -20
```

Check pod logs for errors:

```bash
kubectl logs deploy/rancher -n cattle-system --tail=50
```

## Method 1: Helm Rollback

After you restore the pre-upgrade Rancher or local cluster state, use Helm to start the previous Rancher release revision. Helm rollback alone does not revert Rancher's persisted data.

### Step 1: List Helm Release History

```bash
helm history rancher -n cattle-system
```

This shows all revisions of the Rancher release. Identify the last successful revision number.

### Step 2: Roll Back to the Previous Revision

```bash
helm rollback rancher <REVISION_NUMBER> -n cattle-system
```

For example, to roll back to revision 5:

```bash
helm rollback rancher 5 -n cattle-system
```

### Step 3: Monitor the Rollback

```bash
kubectl rollout status deploy/rancher -n cattle-system
```

Watch the pods:

```bash
kubectl get pods -n cattle-system -w
```

### Step 4: Verify the Rollback

Check that the previous version is running:

```bash
kubectl get settings.management.cattle.io server-version -o jsonpath='{.value}'
helm list -n cattle-system
```

Access the Rancher UI and confirm all clusters are connected.

## Method 2: Restore from etcd Snapshot

If the Rancher server's local cluster state must be restored, use the procedure for the Kubernetes distribution that runs Rancher. This is a more involved process because it reverts the upstream cluster state.

### For RKE Clusters

For legacy RKE1 clusters (RKE1 reached end of life on July 31, 2025), restore the snapshot from an etcd node:

```bash
rke etcd snapshot-restore --config cluster.yml --name pre-upgrade-snapshot
```

In RKE v0.2.0+ releases, `rke etcd snapshot-restore` rebuilds the cluster and restarts system pods, so you do not need to run `rke up` separately.

### For RKE2 Clusters

Stop the RKE2 service on all server nodes:

```bash
systemctl stop rke2-server
```

On the first server node, restore the snapshot:

```bash
rke2 server \
  --cluster-reset \
  --cluster-reset-restore-path=/var/lib/rancher/rke2/server/db/snapshots/pre-upgrade-snapshot
```

Start the service:

```bash
systemctl start rke2-server
```

On remaining server nodes, delete the data directory and rejoin:

```bash
rm -rf /var/lib/rancher/rke2/server/db
systemctl start rke2-server
```

### For K3s Clusters

Stop K3s on all server nodes:

```bash
systemctl stop k3s
```

Restore on the first server:

```bash
k3s server \
  --cluster-reset \
  --cluster-reset-restore-path=/var/lib/rancher/k3s/server/db/snapshots/pre-upgrade-snapshot
```

Start K3s:

```bash
systemctl start k3s
```

On remaining server nodes, delete the data directory and rejoin:

```bash
rm -rf /var/lib/rancher/k3s/server/db
systemctl start k3s
```

## Method 3: Reinstall the Previous Version After Restoring Data

If Helm release history is unavailable after you restore the pre-upgrade Rancher or local cluster state, you can redeploy the previous Rancher chart version with the same values. Do not use this as a substitute for restoring Rancher data from backup.

### Step 1: Save Current Values

```bash
helm get values rancher -n cattle-system -o yaml > saved-values.yaml
```

### Step 2: Uninstall Rancher

```bash
helm uninstall rancher -n cattle-system
```

### Step 3: Install the Previous Version

```bash
helm install rancher rancher-stable/rancher \
  --namespace cattle-system \
  --create-namespace \
  --values saved-values.yaml \
  --version <PREVIOUS_VERSION> \
  --wait
```

### Step 4: Verify

```bash
kubectl rollout status deploy/rancher -n cattle-system
kubectl get pods -n cattle-system
```

## Post-Rollback Steps

After a successful rollback, take these additional steps:

### Re-verify Managed Clusters

Check that all downstream clusters are reporting correctly:

```bash
kubectl get clusters.management.cattle.io
```

In the Rancher UI, go to each cluster and verify it shows as `Active`.

### Check Cluster Agents

After restoring the local cluster, the `cattle-cluster-agent` should reconnect automatically. If a downstream cluster still shows as `Unavailable`, inspect its agent pods in the downstream cluster before taking further action.

### Review Webhook Status

The Rancher webhook may be in a bad state after a rollback. Check it:

```bash
kubectl get pods -n cattle-system -l app=rancher-webhook
kubectl get mutatingwebhookconfiguration rancher.cattle.io
kubectl get validatingwebhookconfiguration rancher.cattle.io
```

If webhooks are causing issues, you can temporarily delete them:

```bash
kubectl delete mutatingwebhookconfiguration rancher.cattle.io
kubectl delete validatingwebhookconfiguration rancher.cattle.io
```

Rancher will recreate them when it starts up properly.

### Document the Failure

Record what went wrong for future reference:

- The version you attempted to upgrade to
- Error messages from logs
- Which rollback method worked
- Any manual steps required after the rollback

## Preventing Future Upgrade Failures

- Always take a Rancher backup and, when applicable, an etcd snapshot before upgrading. For RKE2 and K3s, back up the server token as well
- Test upgrades in a staging environment first
- Upgrade one minor version at a time
- Check the Rancher support matrix for Kubernetes compatibility
- Read the full release notes before upgrading
- Have a documented rollback plan ready before starting

## Conclusion

Rolling back a failed Rancher upgrade is manageable when you have prepared properly. Restoring the pre-upgrade state is the critical step, and Helm is then used to start the previous Rancher version. The key is to always have a backup before upgrading and to know the rollback procedure before you begin the upgrade process.
