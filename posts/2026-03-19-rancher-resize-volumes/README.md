# How to Resize Persistent Volumes in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Storage, Persistent Volume

Description: A practical guide to expanding persistent volume sizes in Rancher-managed Kubernetes clusters without data loss.

As applications grow, their storage needs increase. Kubernetes supports online and offline volume expansion, allowing you to resize persistent volumes without losing data. This guide explains how to resize PVC-backed volumes in Rancher-managed clusters.

## Prerequisites

- A running Rancher instance (v2.6 or later)
- A managed Kubernetes cluster
- A StorageClass with `allowVolumeExpansion: true`
- A CSI driver that supports volume expansion
- kubectl access to your cluster

## Step 1: Verify Volume Expansion Support

Check if your StorageClass allows expansion:

```bash
kubectl get storageclass -o custom-columns='NAME:.metadata.name,EXPANSION:.allowVolumeExpansion'
```

If `allowVolumeExpansion` is not `true`, update the StorageClass:

```bash
kubectl patch storageclass <class-name> -p '{"allowVolumeExpansion": true}'
```

List the CSI drivers installed in your cluster:

```bash
kubectl get csidrivers
```

CSI expansion support is driver-specific. Confirm that the CSI driver backing your PVC supports volume expansion before proceeding.

## Step 2: Check Current Volume Size

```bash
kubectl get pvc my-pvc -n default -o custom-columns='NAME:.metadata.name,REQUESTED:.spec.resources.requests.storage,CAPACITY:.status.capacity.storage,STATUS:.status.phase'

kubectl describe pvc my-pvc -n default | grep -A 2 Capacity
```

## Step 3: Resize the PVC

Edit the PVC to request more storage:

```bash
kubectl patch pvc my-pvc -n default -p '{"spec":{"resources":{"requests":{"storage":"50Gi"}}}}'
```

Or edit the YAML directly:

```bash
kubectl edit pvc my-pvc -n default
```

Change the `storage` field under `spec.resources.requests`:

```yaml
spec:
  resources:
    requests:
      storage: 50Gi  # changed from 20Gi
```

## Step 4: Resize via the Rancher UI

1. Navigate to your cluster in Rancher and click **Explore**.
2. Open the PVC list for the namespace. In recent Rancher versions, PVCs are available under **Resources** > **Workloads** > **Volumes**.
3. Find the PVC you want to resize.
4. Click the three-dot menu and select **Edit Config**.
5. Update `spec.resources.requests.storage` to the new size.
6. Click **Save**.

## Step 5: Monitor the Resize Operation

Check the resize progress:

```bash
kubectl get pvc my-pvc -n default -o yaml | grep -A 8 conditions
```

During controller-side resize, you may see a condition like:

```yaml
conditions:
- type: Resizing
  status: "True"
```

If the underlying volume has been expanded but the filesystem still needs a pod restart, you may see:

```yaml
conditions:
- type: FileSystemResizePending
  status: "True"
  message: "Waiting for user to (re-)start a pod to finish file system resize"
```

After the resize is complete, these temporary resize conditions are removed and the PVC capacity reflects the new size.

## Step 6: Handle FileSystem Resize

If the PVC shows `FileSystemResizePending`, a pod restart is needed to finish the filesystem resize. Many storage drivers support online expansion and skip this step entirely:

```bash
# Check if filesystem resize is pending

kubectl get pvc my-pvc -n default -o jsonpath='{.status.conditions[*].type}'
```

If you see `FileSystemResizePending`, restart the pod:

```bash
# For a Deployment
kubectl rollout restart deployment my-app -n default

# For a StatefulSet
kubectl delete pod my-statefulset-0 -n default
# The StatefulSet controller will recreate it
```

## Step 7: Verify the New Size

After the resize is complete:

```bash
# Check PVC size
kubectl get pvc my-pvc -n default

# Check PV size
kubectl get pv $(kubectl get pvc my-pvc -n default -o jsonpath='{.spec.volumeName}')

# Verify inside the pod
kubectl exec -n default <pod-name> -- df -h /data
```

## Step 8: Resize Volumes in StatefulSets

For StatefulSets, resize each PVC individually:

```bash
# List PVCs for the StatefulSet
kubectl get pvc -n default -l app=database

# Resize each PVC
for i in 0 1 2; do
  kubectl patch pvc data-database-$i -n default \
    -p '{"spec":{"resources":{"requests":{"storage":"100Gi"}}}}'
done
```

If any of the PVCs show `FileSystemResizePending`, restart the pods one at a time to complete filesystem resize:

```bash
for i in 0 1 2; do
  kubectl delete pod database-$i -n default
  # Wait for the replacement pod to be created and become Ready before deleting the next
  kubectl wait --for=condition=Ready --for=create pod/database-$i -n default --timeout=120s
done
```

## Step 9: Automate Volume Monitoring

Create a script to monitor PVC-backed filesystems mounted at `/data` and report volumes that may need resizing when they reach a threshold:

```bash
#!/bin/bash
THRESHOLD=80
NAMESPACE="default"

for pvc in $(kubectl get pvc -n "$NAMESPACE" -o jsonpath='{.items[*].metadata.name}'); do
  POD=$(kubectl get pods -n "$NAMESPACE" -o json | jq -r --arg pvc "$pvc" \
    '.items[] | select(any(.spec.volumes[]?; .persistentVolumeClaim?.claimName == $pvc)) | .metadata.name' | head -n 1)

  if [ -z "$POD" ]; then
    continue
  fi

  USAGE=$(kubectl exec -n "$NAMESPACE" "$POD" -- sh -c "df -P /data | awk 'NR==2 {gsub(/%/, \"\", \\$5); print \\$5}'" 2>/dev/null)

  if [ -n "$USAGE" ] && [ "$USAGE" -gt "$THRESHOLD" ]; then
    CURRENT=$(kubectl get pvc "$pvc" -n "$NAMESPACE" -o jsonpath='{.spec.resources.requests.storage}')
    echo "PVC $pvc usage at ${USAGE}%, current size: $CURRENT"
  fi
done
```

## Step 10: Handle Resize Failures

If a resize operation fails:

```bash
# Check PVC events
kubectl describe pvc my-pvc -n default

# Find CSI controller pods
kubectl get pods -A | grep -i csi

# Check logs for the controller pod that manages your driver
kubectl logs -n <namespace> <csi-controller-pod> --tail=100 | grep -i resize

# Check conditions
kubectl get pvc my-pvc -n default -o json | jq '.status.conditions'
```

Common failure reasons:
- StorageClass does not allow expansion
- CSI driver does not support expansion
- Backend storage has insufficient capacity
- Volume is at maximum size for its type

## Important Notes

- Volume expansion is a one-way operation; you cannot shrink volumes
- Always ensure you have backups before resizing
- Some storage backends require the volume to be detached during resize
- Online expansion support varies by CSI driver
- The PV reclaim policy does not affect resize operations

## Summary

Resizing persistent volumes in Rancher is a straightforward process when your StorageClass and CSI driver support volume expansion. The key steps are patching the PVC with a larger storage request and, if needed, restarting pods to complete the filesystem resize. Always verify expansion support before attempting to resize, and maintain backups as a safety measure.
