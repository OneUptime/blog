# How to Remove Longhorn from a Kubernetes Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Uninstall, Kubernetes, Storage, Cleanup, SUSE Rancher

Description: Learn how to safely uninstall Longhorn from a Kubernetes cluster by migrating workloads, removing volumes, and cleanly removing all Longhorn resources and system components.

---

Uninstalling Longhorn without following the correct procedure can leave orphaned resources, blocked namespaces, or corrupted PVCs. Always migrate data before uninstalling.

---

## Before You Begin

**Warning**: Uninstalling Longhorn deletes all Longhorn-managed volumes and their data. Ensure you have:
- Migrated all application data to an alternative storage solution
- Created backups of any Longhorn volumes you want to keep
- Scaled down all workloads using Longhorn volumes

---

## Step 1: Scale Down or Stop All Workloads

```bash
# Find all PVCs backed by the Longhorn CSI driver
kubectl get pv -o json | \
  jq -r '.items[] | select((.spec.csi.driver // "") == "driver.longhorn.io" and .spec.claimRef != null) | "\(.spec.claimRef.namespace)/\(.spec.claimRef.name)"'

# Scale down each deployment/statefulset using Longhorn volumes
kubectl scale deployment <name> -n <namespace> --replicas=0
kubectl scale statefulset <name> -n <namespace> --replicas=0

# Suspend or delete other workload types as needed (for example CronJobs, Jobs, DaemonSets, or standalone Pods)
```

---

## Step 2: Delete All PVCs and PVs

```bash
# List PVCs backed by the Longhorn CSI driver
kubectl get pv -o json | \
  jq -r '.items[] | select((.spec.csi.driver // "") == "driver.longhorn.io" and .spec.claimRef != null) | "\(.spec.claimRef.namespace)/\(.spec.claimRef.name)"'

# Delete each PVC
# This removes the Longhorn volume automatically only when the PV reclaim policy is Delete
kubectl delete pvc <pvc-name> -n <namespace>

# If the PV reclaim policy is Retain, delete the PV after the PVC is removed
kubectl get pv -o json | \
  jq -r '.items[] | select((.spec.csi.driver // "") == "driver.longhorn.io") | .metadata.name'
kubectl delete pv <pv-name>

# Verify no Longhorn volumes remain
kubectl get volumes.longhorn.io -n longhorn-system

# If any volumes remain, delete them from the Longhorn UI before uninstalling
```

---

## Step 3: Enable Longhorn Uninstallation Setting

Longhorn requires you to explicitly allow uninstallation to prevent accidental removal:

```bash
# Enable the deleting-confirmation-flag setting
kubectl -n longhorn-system patch settings.longhorn.io deleting-confirmation-flag \
  --type=merge -p '{"value": "true"}'

# Or via Longhorn UI: Settings → Deleting Confirmation Flag → true
```

---

## Step 4: Uninstall Longhorn via Helm

```bash
# Uninstall using Helm
helm uninstall longhorn -n longhorn-system

# Monitor the deletion of Longhorn pods
kubectl get pods -n longhorn-system -w
```

---

## Step 5: Uninstall Longhorn via Rancher UI

If Longhorn was installed through Rancher Apps:

1. Navigate to **Apps** → **Installed Apps**
2. Select **Longhorn**
3. Click **Delete**
4. Wait for all Longhorn pods to terminate

---

## Step 6: Remove the Longhorn Namespace

After uninstalling Longhorn, verify the namespace is clean:

```bash
# If resources are not disappearing cleanly, inspect the uninstall job
kubectl get job/longhorn-uninstall -n longhorn-system
kubectl logs -n longhorn-system job/longhorn-uninstall

# Check if any resources remain
kubectl get all -n longhorn-system
kubectl get crd | grep longhorn

# Delete the namespace after Longhorn resources are gone
kubectl delete namespace longhorn-system

# If the namespace is still stuck in Terminating after Step 7, finalize it
kubectl get namespace longhorn-system -o json | \
  jq '.spec.finalizers = []' | \
  kubectl replace --raw /api/v1/namespaces/longhorn-system/finalize -f -
```

---

## Step 7: Remove Longhorn CRDs

```bash
# List all Longhorn CRDs
kubectl get crd | grep longhorn

# If CRDs remain after uninstall, delete them
kubectl get crd -o name | grep longhorn.io | while read -r crd; do
  kubectl delete "$crd"
done

# If CRD deletion is blocked by leftover admission webhooks, remove them and retry
kubectl delete validatingwebhookconfiguration longhorn-webhook-validator --ignore-not-found
kubectl delete mutatingwebhookconfiguration longhorn-webhook-mutator --ignore-not-found
```

---

## Step 8: Clean Up Node Directories

On each cluster node, remove the Longhorn data directory:

```bash
# Run on each node
rm -rf /var/lib/longhorn/

# If using a custom data path, clean that directory instead
# The path is configured in Longhorn settings → Default Data Path
```

---

## Step 9: Clean Up Leftover Encrypted Devices or iSCSI Sessions

```bash
# For encrypted Longhorn volumes only, check for leftover device mapper entries
ls /dev/mapper/ | grep <longhorn-volume-name>

# Remove only the specific leftover mapping
dmsetup remove /dev/mapper/<longhorn-volume-name>

# If a stale Longhorn iSCSI session remains, log out of that specific target
iscsiadm -m node show | grep iqn.2019-10.io.longhorn
iscsiadm -m node -T <target-iqn> -p <portal-ip> --logout
```

---

## Step 10: Verify Clean Removal

```bash
# No Longhorn pods should be running
kubectl get pods -n longhorn-system

# No Longhorn CRDs should exist
kubectl get crd | grep longhorn

# No Longhorn namespace should exist
kubectl get namespace longhorn-system

# Verify PVs are gone
kubectl get pv -o json | \
  jq -r '.items[] | select((.spec.csi.driver // "") == "driver.longhorn.io") | .metadata.name'
```

---

## Best Practices

- Always migrate data before uninstalling - Longhorn does not preserve volume data after uninstallation.
- Use Velero or another backup tool to backup all Longhorn volumes before starting the uninstall process.
- If uninstalling from a production cluster, schedule uninstallation during a maintenance window and test the procedure in a staging environment first.
