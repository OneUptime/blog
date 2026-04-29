# How to Troubleshoot Longhorn Volume Attachment Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Troubleshooting, Volume Attachment, Kubernetes, Storage, Debugging, SUSE Rancher

Description: Learn how to diagnose and fix Longhorn volume attachment failures including stuck volumes, CSI driver issues, node selector problems, and iSCSI connectivity errors.

---

Volume attachment failures prevent pods from starting and can cause application outages. Longhorn volume attachment issues typically relate to CSI driver health, node availability, or network connectivity to storage replicas.

---

## Common Volume Attachment Symptoms

| Symptom | Likely Cause |
|---|---|
| Pod stuck in `ContainerCreating` | Volume not attached to the node |
| PVC in `Pending` state | No matching node for volume |
| Volume in `Attaching` state (long time) | Node or replica unreachable |
| `Multi-Attach error` | Volume attached to wrong node |

---

## Step 1: Check the Pod Event Log

```bash
# Describe the pod to see attachment errors

kubectl describe pod <pod-name> -n <namespace>

# Look for events like:
# Warning  FailedMount    <time>   kubelet   Unable to attach or mount volumes
# Warning  FailedAttachVolume  <time>  attachdetach-controller  AttachVolume.Attach failed
```

---

## Step 2: Check the Longhorn Volume Status

```bash
# Get the volume associated with the PVC
PVC_NAME=my-pvc
NAMESPACE=default
PV_NAME=$(kubectl get pvc $PVC_NAME -n $NAMESPACE -o jsonpath='{.spec.volumeName}')
VOLUME_NAME=$(kubectl get pv $PV_NAME -o jsonpath='{.spec.csi.volumeHandle}')

# Check the Longhorn volume status
kubectl get volume -n longhorn-system $VOLUME_NAME -o yaml

# Key fields to check:
# status.state: should be "attached" when mounted
# status.robustness: should be "healthy"
# status.conditions: look for error conditions
```

---

## Step 3: Check the VolumeAttachment Object

```bash
# List Kubernetes VolumeAttachment objects
kubectl get volumeattachments

# Describe the attachment
kubectl describe volumeattachment <attachment-name>

# Compare it with Longhorn's attachment tickets
kubectl get volumeattachment.longhorn.io -n longhorn-system $VOLUME_NAME -o yaml

# If the volume is stuck in Attaching/Detaching, inspect spec.attachmentTickets
# and remove only invalid stale tickets after verifying the workload is inactive
kubectl edit volumeattachment.longhorn.io $VOLUME_NAME -n longhorn-system
```

---

## Step 4: Check Longhorn CSI Driver Pods

```bash
# Check CSI driver pods are healthy
kubectl get pods -n longhorn-system | grep csi

# Expected pods:
# csi-attacher               (handles volume attachment)
# csi-provisioner            (handles PVC provisioning)
# csi-resizer                (handles volume resize)
# csi-snapshotter            (handles snapshots)
# longhorn-csi-plugin        (node plugin)

# Check CSI attacher logs for errors
kubectl logs -n longhorn-system \
  $(kubectl get pod -n longhorn-system -l app=csi-attacher -o name | head -1) \
  -c csi-attacher
```

---

## Step 5: Check the Longhorn Manager and Instance Manager

```bash
# Check Longhorn manager on the target node
NODE=<node-name>
kubectl get pod -n longhorn-system \
  -l app=longhorn-manager \
  --field-selector spec.nodeName=$NODE

# View manager logs
kubectl logs -n longhorn-system \
  $(kubectl get pod -n longhorn-system -l app=longhorn-manager \
    --field-selector spec.nodeName=$NODE -o name) \
  -c longhorn-manager \
  | grep -i "error\|attach\|volume"

# Check instance manager
kubectl get pod -n longhorn-system \
  -l longhorn.io/component=instance-manager,longhorn.io/node=$NODE
```

---

## Step 6: Fix a Stuck Volume Detach

If a volume is stuck in `Detaching` state (usually after a node crash):

```bash
# In the Longhorn UI: Volumes → select volume → Detach

# If the volume is stuck because of a stale attachment ticket, inspect and edit
# the Longhorn VolumeAttachment CR for this volume
kubectl get volumeattachment.longhorn.io $VOLUME_NAME -n longhorn-system -o yaml
kubectl edit volumeattachment.longhorn.io $VOLUME_NAME -n longhorn-system
```

---

## Step 7: Check iSCSI Connectivity

Longhorn uses iSCSI for volume I/O. If `open-iscsi`/`iscsid` or the `iscsi_tcp` module is missing on the node, volumes won't attach:

```bash
# On the node (via SSH or a privileged debug pod), verify iscsid is running
systemctl status iscsid

# Check if iscsi_tcp module is loaded
lsmod | grep iscsi_tcp

# Load the module if missing
modprobe iscsi_tcp
```

---

## Step 8: Check Node Schedulability for Longhorn

```bash
# Check if the node is allowed to schedule Longhorn volumes
kubectl get node <node-name> -o yaml | grep -A 10 taints

# Check the StorageClass parameters used by the PVC
SC_NAME=$(kubectl get pvc $PVC_NAME -n $NAMESPACE -o jsonpath='{.spec.storageClassName}')
kubectl get sc $SC_NAME -o yaml

# View Longhorn node conditions and disk status
kubectl get node.longhorn.io <node-name> -n longhorn-system -o yaml
```

---

## Best Practices

- Check the Longhorn dashboard first - it shows volume state, replica health, and which node a volume is attached to at a glance.
- If a node crashes with volumes attached, wait for the node to recover before forcing manual cleanup when possible, and inspect Longhorn attachment tickets before detaching the volume manually.
- Ensure `open-iscsi` is installed, `iscsid` is running on all nodes, and the `iscsi_tcp` kernel module is loaded - these are required for Longhorn volume attachment and are common causes of failures on freshly added nodes.
