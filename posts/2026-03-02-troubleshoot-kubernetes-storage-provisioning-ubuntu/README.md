# How to Troubleshoot Kubernetes Storage Provisioning on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Kubernetes, Storage, Troubleshooting, DevOps

Description: Diagnose and fix common Kubernetes storage provisioning failures on Ubuntu, including PVC pending states, PersistentVolume binding issues, and StorageClass problems.

---

Kubernetes storage provisioning failures are some of the most frustrating issues to debug because the failures can originate from multiple layers: the StorageClass, the provisioner pod, the underlying storage system, or permissions. A PVC stuck in Pending status tells you something is wrong but not where the problem is. This guide walks through a systematic approach to diagnosing and fixing these issues on Ubuntu.

## Understand the Storage Provisioning Chain

Before debugging, understand what needs to work:

1. A Pod requests storage via a **PersistentVolumeClaim (PVC)**
2. The PVC references a **StorageClass** (or uses the default)
3. The StorageClass's **provisioner** (a controller running in the cluster) creates a **PersistentVolume (PV)**
4. Kubernetes **binds** the PVC to the PV
5. The Pod mounts the PV via the PVC

A failure at any of these steps results in the PVC staying in Pending status and pods that depend on it failing to start.

## Diagnose a Pending PVC

Start with the PVC and work outward:

```bash
# List all PVCs and their status
kubectl get pvc --all-namespaces

# Describe the pending PVC to see events
kubectl describe pvc <pvc-name> -n <namespace>
```

The events section at the bottom of `describe` output is the most useful part. Common messages:

```
Events:
  Warning  ProvisioningFailed  10s  rancher.io/local-path
             Failed to provision volume: error getting volume plugin for provisioner

  Normal   ExternalProvisioning  5s  persistentvolume-controller
             Waiting for a volume to be created either by the external provisioner
             'driver.longhorn.io' or manually created by system administrator
```

## Check the StorageClass

```bash
# List available StorageClasses
kubectl get storageclass

# Look for the default StorageClass (marked with "(default)")
# If there is no default and the PVC doesn't specify a class,
# it will stay in Pending forever

# Describe the StorageClass used by the PVC
kubectl describe storageclass <storage-class-name>
```

Common StorageClass problems:
- No default StorageClass and PVC doesn't specify one
- The provisioner name in the StorageClass doesn't match any running provisioner
- `volumeBindingMode: WaitForFirstConsumer` means the PV won't be created until a Pod is scheduled

```bash
# Set a default StorageClass if none exists
kubectl patch storageclass <storage-class-name> \
    -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
```

## Check the Provisioner

The provisioner is typically a pod running in the cluster. Check if it is running and healthy:

```bash
# Find the provisioner pod (common locations)
kubectl get pods -n kube-system | grep -E 'provisioner|csi'
kubectl get pods -n storage | grep provisioner
kubectl get pods --all-namespaces | grep provisioner

# Check provisioner pod logs
kubectl logs -n kube-system <provisioner-pod-name>
kubectl logs -n kube-system <provisioner-pod-name> --previous  # Previous crash logs

# Check for CSI driver pods
kubectl get pods --all-namespaces -l app=csi-driver
```

For local-path-provisioner (common in local/development clusters):

```bash
# Check local-path-provisioner
kubectl get pods -n local-path-storage
kubectl logs -n local-path-storage -l app=local-path-provisioner

# Common error: the hostpath directory doesn't exist
# Default path is /opt/local-path-provisioner/ on the node
ls /opt/local-path-provisioner/
```

## Check PersistentVolumes

Sometimes PVs exist but aren't binding to your PVC:

```bash
# List all PVs
kubectl get pv

# PV statuses:
# Available - not yet bound
# Bound - bound to a PVC
# Released - bound PVC was deleted but PV not yet reclaimed
# Failed - automatic reclamation failed

# A PVC won't bind to a "Released" PV (policy issue)
kubectl describe pv <pv-name>
```

If a PV is in Released state and you need to reuse it:

```bash
# Remove the claimRef to make it Available again
kubectl patch pv <pv-name> \
    -p '{"spec":{"claimRef": null}}'
```

## Diagnose Node-Level Storage Issues

For PVs backed by host paths or local storage, check the actual node:

```bash
# Find which node the pod is scheduled on
kubectl get pod <pod-name> -n <namespace> -o wide

# Check disk space on that node
kubectl get node <node-name> -o yaml | grep -A 20 allocatable

# SSH to the node (if using kubeadm)
ssh ubuntu@<node-ip>

# Check disk space
df -h

# Check the storage directory
ls -la /var/lib/kubelet/pods/
ls -la /opt/local-path-provisioner/ 2>/dev/null

# Check for disk pressure
kubectl describe node <node-name> | grep -A 5 Conditions
```

A node under disk pressure triggers taints that prevent Pod scheduling:

```bash
# Check for disk pressure taint
kubectl describe node <node-name> | grep -i taint

# If the node is under DiskPressure, free up space
# Find large directories:
sudo du -sh /var/lib/docker/* 2>/dev/null | sort -rh | head -20
sudo journalctl --vacuum-size=1G
```

## CSI Driver Issues

If using a CSI driver (AWS EBS, GCP PD, Longhorn, Rook/Ceph):

```bash
# Check CSI driver registration
kubectl get csidriver

# Check CSI node info
kubectl get csinodes

# Look for CSI driver pods
kubectl get pods --all-namespaces -l app=csi-node
kubectl get pods --all-namespaces -l app=csi-controller

# Check the CSI controller logs
kubectl logs -n <namespace> <csi-controller-pod> -c csi-provisioner
kubectl logs -n <namespace> <csi-controller-pod> -c csi-attacher
```

For Longhorn (a popular distributed storage for Kubernetes):

```bash
# Check Longhorn manager status
kubectl get pods -n longhorn-system
kubectl get volumes -n longhorn-system

# Check node disk availability
kubectl get node.longhorn.io -n longhorn-system

# View Longhorn UI if available
kubectl port-forward -n longhorn-system svc/longhorn-frontend 8080:80
```

## Fix Common Provisioning Errors

### Error: No StorageClass Found

```bash
# Create a simple local storage class for testing
kubectl apply -f - <<EOF
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: local-storage
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: kubernetes.io/no-provisioner
volumeBindingMode: WaitForFirstConsumer
EOF
```

### Error: Provisioner Not Found

```bash
# Install local-path-provisioner (Rancher)
kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/v0.0.26/deploy/local-path-storage.yaml

# Verify it is running
kubectl get pods -n local-path-storage
```

### Error: Volume Attachment Failed

```bash
# Check volume attachment objects
kubectl get volumeattachment

# Delete stuck attachments manually if needed
kubectl delete volumeattachment <attachment-name>

# Check the kubelet log on the node for mount errors
journalctl -u kubelet -n 100 | grep -i "mount\|attach\|volume"
```

### Error: Wrong Access Mode

```bash
# PVC requesting ReadWriteMany but storage only supports ReadWriteOnce
# Check what the storage backend supports

kubectl describe pvc <pvc-name> | grep -A 3 "Access Modes"
kubectl describe pv <pv-name> | grep -A 3 "Access Modes"

# If you need RWX, use a storage system that supports it:
# NFS, CephFS, or Longhorn with RWXM support
```

## Verify Storage After Fixing

```bash
# After fixes, watch the PVC status change
kubectl get pvc <pvc-name> -w

# Once Bound, verify the Pod can start
kubectl describe pod <pod-name> | grep -A 10 Events

# Test that the mount is working from inside the Pod
kubectl exec -it <pod-name> -- df -h /mountpoint
kubectl exec -it <pod-name> -- touch /mountpoint/test-file
```

## Monitoring Storage Health

Set up ongoing monitoring to catch storage issues before they cause outages:

```bash
# Check for PVCs stuck in Pending
kubectl get pvc --all-namespaces | grep -v Bound

# Check for PVs in bad states
kubectl get pv | grep -v Bound

# Check disk pressure on all nodes
kubectl get nodes -o custom-columns=\
NAME:.metadata.name,\
DISK:.status.conditions[?(@.type=="DiskPressure")].status
```

Storage provisioning failures usually have a clear root cause once you know where to look. The most common issues on fresh Ubuntu deployments are no StorageClass defined, the provisioner pod not running, and node-level disk or permission problems that prevent the provisioner from creating directories.
