# How to Troubleshoot Longhorn Volume Attachment Issues - Part 3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Kubernetes, Storage, Troubleshooting, Volumes

Description: A comprehensive troubleshooting guide for diagnosing and resolving Longhorn volume attachment failures that prevent pods from starting.

## Introduction

Volume attachment issues are among the most common problems in Longhorn deployments. When a pod cannot start because its volume fails to attach, it can block deployments and impact application availability. This guide provides systematic troubleshooting steps to identify and resolve attachment failures.

## Common Symptoms

- Pod stuck in `ContainerCreating` state
- `kubectl describe pod` shows `Unable to attach or mount volumes`
- PVC in `Pending` state
- Longhorn volume stuck in `Attaching` state

## Initial Diagnosis

Start with a broad diagnostic sweep:

```bash
# Check pod status

kubectl describe pod <pod-name> -n <namespace>

# Look for these error patterns in the Events section:
# "Unable to attach or mount volumes"
# "timeout expired waiting for volumes"
# "multi-attach error"
# "volume is being used by another pod"

# Check PVC status
kubectl get pvc <pvc-name> -n <namespace>
kubectl describe pvc <pvc-name> -n <namespace>

# Check PersistentVolume status
kubectl get pv | grep <pvc-name>
kubectl describe pv <pv-name>

# Check Longhorn volume status
kubectl get volumes.longhorn.io -n longhorn-system
kubectl describe volume.longhorn.io <volume-name> -n longhorn-system
```

## Issue 1: Volume Stuck in Attaching State

```bash
# Find volumes stuck in attaching state
kubectl get volumes.longhorn.io -n longhorn-system \
  -o custom-columns="NAME:.metadata.name,STATE:.status.state" | grep Attaching

# Check the volume attachment object
kubectl get volumeattachments | grep <volume-name>

# Check if the engine is starting
kubectl get engines.longhorn.io -n longhorn-system | grep <volume-name>
```

### Solution: Restart the Longhorn Manager on the Target Node

```bash
# Find which node the volume is trying to attach to
kubectl describe volume.longhorn.io <volume-name> -n longhorn-system | grep "Node ID"

# Restart the longhorn-manager pod on that node
kubectl delete pod -n longhorn-system \
  -l app=longhorn-manager \
  --field-selector spec.nodeName=<target-node>
```

## Issue 2: Multi-Attach Error

Occurs when a ReadWriteOnce volume is already attached to another node.

```bash
# Check VolumeAttachment objects
kubectl get volumeattachments

# Find the old attachment
kubectl describe volumeattachment <old-attachment>

# Check if the old pod is still terminating
kubectl get pod --all-namespaces | grep Terminating
```

### Solution: Force Delete Stuck Terminating Pod

```bash
# If a pod is stuck in Terminating state
kubectl delete pod <stuck-pod> -n <namespace> --force --grace-period=0

# If the VolumeAttachment is stuck, force delete it
kubectl delete volumeattachment <stuck-attachment> --force --grace-period=0
```

## Issue 3: Volume Attachment Fails Due to Missing iscsid

```bash
# Check if iscsid is running on the target node
kubectl debug node/<node-name> -it --profile=sysadmin --image=ubuntu -- bash
# Inside the debug pod, chroot into the host filesystem to query host systemd:
chroot /host
systemctl status iscsid
```

### Solution: Enable iscsid

```bash
# SSH to the affected node
systemctl enable iscsid
systemctl start iscsid

# Verify it is running
systemctl status iscsid
ps aux | grep iscsid
```

## Issue 4: Instance Manager Pod in Error State

```bash
# Check instance manager pods
kubectl get pods -n longhorn-system | grep instance-manager

# Get details on the failing instance manager
kubectl describe pod -n longhorn-system <instance-manager-pod>
kubectl logs -n longhorn-system <instance-manager-pod>
```

### Solution: Restart the Instance Manager

```bash
# Delete the failing instance manager (it will be recreated by Longhorn)
kubectl delete pod -n longhorn-system <instance-manager-pod>

# Watch for it to come back
kubectl get pods -n longhorn-system -w | grep instance-manager
```

## Issue 5: CSI Driver Not Ready

```bash
# Check CSI node driver registrar
kubectl get pods -n longhorn-system | grep csi

# Check CSI pods are running
kubectl get pods -n longhorn-system -l app=csi-attacher
kubectl get pods -n longhorn-system -l app=csi-provisioner

# Check CSI driver registration
kubectl get csidrivers | grep longhorn
```

### Solution: Redeploy CSI Driver

```bash
# Restart the CSI components
kubectl rollout restart deployment longhorn-driver-deployer -n longhorn-system
kubectl get pods -n longhorn-system -w | grep csi
```

## Issue 6: Node Disk Full

If the node disk is full, volume attachment fails silently.

```bash
# Check disk space on each node
kubectl get nodes.longhorn.io -n longhorn-system -o yaml | \
  grep -A 5 "diskStatus"

# Check available storage vs minimum required
kubectl get settings.longhorn.io storage-minimal-available-percentage \
  -n longhorn-system -o yaml
```

### Solution: Free Disk Space

```bash
# SSH to the full node
# Clean up old Docker/containerd images
crictl rmi --prune

# Check for old Longhorn replica data
ls -la /var/lib/longhorn/replicas/

# Remove orphaned replicas if safe to do so (use Longhorn UI to confirm)
```

## Issue 7: Longhorn Volume Engine Crash

```bash
# Check engine logs
kubectl get pods -n longhorn-system | grep engine

# Look for engine crash events
kubectl get events -n longhorn-system | grep -i engine

# Check specific engine instance logs
kubectl logs -n longhorn-system <engine-pod-name> --previous
```

## Collecting Diagnostics

For persistent attachment issues, collect a support bundle:

```bash
# Using Longhorn UI: Settings → Support Bundle → Generate

# Or check all Longhorn component logs at once
kubectl logs -n longhorn-system -l app=longhorn-manager --tail=200 > manager-logs.txt
kubectl logs -n longhorn-system -l app=csi-attacher --tail=200 > csi-attacher-logs.txt
kubectl logs -n longhorn-system -l app=csi-provisioner --tail=200 > csi-provisioner-logs.txt
kubectl logs -n longhorn-system -l app=longhorn-driver-deployer --tail=200 > driver-logs.txt
```

## Conclusion

Longhorn volume attachment issues often stem from one of a few root causes: stuck VolumeAttachment objects, missing system dependencies (iscsid), network problems, or disk space issues. By following a systematic diagnostic approach - checking pod events, volume state, instance manager health, and node conditions - you can quickly identify and resolve most attachment failures. If issues persist, the Longhorn support bundle provides comprehensive logs for deeper analysis.
