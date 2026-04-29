# How to Safely Uninstall Longhorn from Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Uninstall, Kubernetes, Storage, Data Migration, SUSE Rancher, Cleanup

Description: Learn how to safely uninstall Longhorn from a Kubernetes cluster, including migrating data off Longhorn volumes, removing workloads, and cleaning up CRDs and storage data.

---

Uninstalling Longhorn requires careful preparation to avoid data loss. You must migrate data off Longhorn volumes, remove workloads using those volumes, and then follow Longhorn's official uninstall procedure.

---

## Pre-Uninstall Checklist

- [ ] Back up all Longhorn volume data to an external store
- [ ] Migrate stateful workloads to alternative storage (hostPath, NFS, cloud)
- [ ] Delete all PVCs backed by Longhorn
- [ ] Ensure no pods are mounted to Longhorn volumes

---

## Step 1: Back Up All Data

Before uninstalling, back up critical volumes. A backup target must already be configured:

```yaml
# Via Longhorn UI: Volume > Create Backup
# Or create a Backup custom resource for an existing snapshot you want to preserve.
# Find an existing snapshot name with: kubectl -n longhorn-system get snapshots.longhorn.io
apiVersion: longhorn.io/v1beta2
kind: Backup
metadata:
  name: backup-example
  namespace: longhorn-system
spec:
  backupMode: incremental
  snapshotName: snapshot-name-example
  labels:
    app: my-workload
```

---

## Step 2: Scale Down Workloads and Delete PVCs

```bash
# List PVCs backed by Longhorn's CSI driver
kubectl get pv -o jsonpath='{range .items[?(@.spec.csi.driver=="driver.longhorn.io")]}{.spec.claimRef.namespace}{"\t"}{.spec.claimRef.name}{"\n"}{end}'

# Scale down or delete the controllers that use those PVCs
kubectl scale deployment <name> --replicas=0 -n <namespace>
kubectl scale statefulset <name> --replicas=0 -n <namespace>

# Delete each Longhorn-backed PVC after workloads are stopped
kubectl delete pvc <pvc-name> -n <namespace>
```

---

## Step 3: Enable Longhorn Uninstall Mode

Longhorn has a deletion confirmation mechanism. Set the uninstall flag:

```bash
# Set Longhorn's deletion confirmation flag
kubectl -n longhorn-system patch settings.longhorn.io/deleting-confirmation-flag \
  --type=merge \
  -p '{"value":"true"}'
```

---

## Step 4: Uninstall Longhorn via Helm

```bash
# If installed via Rancher, delete the Longhorn app from Rancher UI instead.
# If installed via Helm
helm uninstall longhorn -n longhorn-system

# Watch the uninstall job created by the chart hooks
kubectl get job/longhorn-uninstall -n longhorn-system -w
```

---

## Step 5: Remove Remaining Longhorn Resources

```bash
# If you installed Longhorn with kubectl, use the official uninstall manifest.
# Replace <LONGHORN_VERSION> with the installed version, for example v1.11.1.
kubectl create -f https://raw.githubusercontent.com/longhorn/longhorn/<LONGHORN_VERSION>/uninstall/uninstall.yaml
kubectl get job/longhorn-uninstall -n longhorn-system -w

kubectl delete -f https://raw.githubusercontent.com/longhorn/longhorn/<LONGHORN_VERSION>/deploy/longhorn.yaml
kubectl delete -f https://raw.githubusercontent.com/longhorn/longhorn/<LONGHORN_VERSION>/uninstall/uninstall.yaml
```

---

## Step 6: Clean Up Node Data

On each storage node, remove Longhorn data directories:

```bash
#!/bin/bash
# run on each node
sudo rm -rf /var/lib/longhorn
# If using custom data path, adjust accordingly
```

---

## Troubleshooting Stuck Uninstall

If CRD instances or the CRDs are stuck in `Terminating`:

```bash
NAMESPACE=longhorn-system

# Delete CRD finalizers, instances, and definitions
for crd in $(kubectl get crd -o jsonpath='{.items[*].metadata.name}' | tr ' ' '\n' | grep longhorn.io); do
  kubectl -n ${NAMESPACE} get $crd -o yaml | sed "s/\- longhorn.io//g" | kubectl apply -f -
  kubectl -n ${NAMESPACE} delete $crd --all
  kubectl delete crd/$crd
done
```

---

## Best Practices

- Never delete the `longhorn-system` namespace directly - always use the proper uninstall procedure.
- Verify all backups are accessible in the backup store before uninstalling.
- After uninstalling, verify that node-local Longhorn data is deleted to reclaim disk space.
