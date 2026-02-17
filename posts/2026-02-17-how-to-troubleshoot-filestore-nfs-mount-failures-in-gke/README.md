# How to Troubleshoot Filestore NFS Mount Failures in GKE

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Filestore, GKE, NFS, Troubleshooting, Kubernetes

Description: A troubleshooting guide for diagnosing and fixing Filestore NFS mount failures in Google Kubernetes Engine, covering CSI driver issues, networking, and permissions.

---

NFS mount failures in GKE are frustrating because there are multiple layers where things can go wrong: the Filestore instance, the VPC network, the GKE node, the CSI driver, the PersistentVolume configuration, and the pod itself. When a pod is stuck in ContainerCreating with a mount error, you need a systematic approach to figure out which layer is the problem.

In this post, I will walk through the most common Filestore mount failures in GKE, how to diagnose each one, and how to fix them.

## Starting Point - Check Pod Events

When a pod fails to mount a Filestore volume, the first place to look is the pod events:

```bash
# Describe the failing pod to see mount errors
kubectl describe pod MY_POD_NAME
```

Look at the Events section at the bottom. Common error messages include:

- `MountVolume.SetUp failed for volume` - General mount failure
- `mount.nfs: Connection timed out` - Network connectivity issue
- `mount.nfs: access denied by server` - Permissions issue
- `Output: mount.nfs: Network is unreachable` - Network routing issue
- `FailedAttachVolume` or `FailedMount` - CSI driver issue

The error message tells you which direction to investigate.

## Problem 1 - PVC Stuck in Pending

If the PVC never transitions to Bound, the Filestore instance was not created or the PV was not found.

```bash
# Check PVC status and events
kubectl describe pvc MY_PVC_NAME
```

**For dynamic provisioning**, check:

1. Is the Filestore CSI driver running?

```bash
# Verify CSI driver pods are healthy
kubectl get pods -n kube-system -l app=gcp-filestore-csi-driver
```

If no pods are found, enable the driver:

```bash
# Enable the Filestore CSI driver
gcloud container clusters update my-cluster \
  --zone=us-central1-a \
  --update-addons=GcpFilestoreCsiDriver=ENABLED
```

2. Does the StorageClass exist and is it configured correctly?

```bash
# Check StorageClass configuration
kubectl get sc filestore-sc -o yaml
```

3. Does the service account have permissions to create Filestore instances?

```bash
# Check the Filestore API is enabled
gcloud services list --enabled --filter="name:file.googleapis.com"
```

**For pre-existing PVs**, make sure the PV exists and matches the PVC:

```bash
# List PVs and their status
kubectl get pv

# Check that the PV matches the PVC requirements
kubectl describe pv MY_PV_NAME
```

The access mode, capacity, and storageClassName must match between the PV and PVC.

## Problem 2 - Connection Timed Out

This is a networking problem. The GKE node cannot reach the Filestore IP on port 2049.

First, verify the Filestore instance is running and get its IP:

```bash
# Check Filestore instance status and IP
gcloud filestore instances describe my-filestore \
  --zone=us-central1-a \
  --format="yaml(state,networks[0].ipAddresses)"
```

Then test connectivity from a GKE node. Deploy a debug pod:

```bash
# Run a debug pod to test network connectivity
kubectl run nfs-debug --image=busybox --rm -it --restart=Never -- \
  sh -c "nc -zv FILESTORE_IP 2049 -w 5"
```

If the connection times out:

1. **Check VPC network** - Is the Filestore instance in the same VPC as the GKE cluster?

```bash
# Check which network the GKE cluster uses
gcloud container clusters describe my-cluster \
  --zone=us-central1-a \
  --format="value(network)"
```

2. **Check firewall rules** - Are there rules blocking TCP port 2049?

```bash
# List firewall rules that might block NFS
gcloud compute firewall-rules list \
  --filter="network=MY_NETWORK" \
  --format="table(name,direction,action,sourceRanges,destinationRanges)"
```

3. **Check cluster networking mode** - VPC-native clusters route pod traffic through the VPC, while routes-based clusters may have routing issues.

```bash
# Check if the cluster is VPC-native
gcloud container clusters describe my-cluster \
  --zone=us-central1-a \
  --format="value(ipAllocationPolicy.useIpAliases)"
```

If the value is `True`, it is VPC-native and should work. If `False`, you may need to set up additional routes.

## Problem 3 - Access Denied by Server

This means the TCP connection succeeds but the NFS server rejects the mount request. This usually happens with pre-existing Filestore instances where the PV NFS path is wrong.

```bash
# Verify the file share name matches what you specified in the PV
gcloud filestore instances describe my-filestore \
  --zone=us-central1-a \
  --format="value(fileShares[0].name)"
```

The NFS path in your PV must match: if the share name is `vol1`, the NFS path must be `/vol1`.

Check your PV configuration:

```bash
# Inspect the NFS server and path in the PV
kubectl get pv MY_PV_NAME -o jsonpath='{.spec.nfs.server}:{.spec.nfs.path}'
```

## Problem 4 - Stale File Handle

This error usually appears after a Filestore instance has been deleted and recreated, or after a restore from backup. The NFS client on the GKE node has cached the old file handle.

The fix is to delete and recreate the pod so it gets a fresh NFS mount:

```bash
# Delete the pod to force a remount
kubectl delete pod MY_POD_NAME

# If using a Deployment, the pod will be recreated automatically
# If the error persists, try draining the node
kubectl drain NODE_NAME --ignore-daemonsets --delete-emptydir-data
kubectl uncordon NODE_NAME
```

## Problem 5 - CSI Driver Errors

If the CSI driver itself is having issues, check its logs:

```bash
# Get logs from the CSI controller
kubectl logs -n kube-system -l app=gcp-filestore-csi-driver \
  -c gcp-filestore-driver --tail=100

# Get logs from the CSI node plugin on a specific node
kubectl logs -n kube-system -l app=gcp-filestore-csi-driver \
  -c gcp-filestore-driver --tail=100
```

Common CSI driver errors include:

- **Permission denied to Filestore API** - The GKE service account needs the `roles/file.editor` role
- **Quota exceeded** - You have hit the Filestore instance limit for your project
- **Invalid parameters** - The StorageClass parameters are wrong

Fix permission issues:

```bash
# Grant the GKE service account Filestore editor role
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:my-project.svc.id.goog[kube-system/filestore-csi-controller-sa]" \
  --role="roles/file.editor"
```

## Problem 6 - nfs-common Not Installed on Nodes

Some custom node images may not have NFS client utilities installed. If you see errors about `mount.nfs: No such file or directory`, the node is missing the NFS client.

For GKE Autopilot clusters, this should not be an issue since Google manages the nodes. For Standard clusters with custom images, make sure `nfs-common` (Debian) or `nfs-utils` (CentOS) is installed on the node image.

You can verify by SSH-ing into a node:

```bash
# SSH into a GKE node and check for NFS utilities
gcloud compute ssh NODE_NAME --zone=us-central1-a
which mount.nfs
```

## Diagnostic Checklist

When you hit an NFS mount failure in GKE, work through this list:

1. Check pod events with `kubectl describe pod`
2. Check PVC status with `kubectl describe pvc`
3. Verify the Filestore instance is READY
4. Test network connectivity from inside the cluster
5. Verify firewall rules allow TCP 2049
6. Check NFS path matches the Filestore share name
7. Check CSI driver pod logs for errors
8. Verify IAM permissions for the CSI driver service account
9. Check Filestore quota limits

Most mount failures fall into the networking category. Get the VPC, firewall rules, and cluster networking mode right, and the rest usually works out.
