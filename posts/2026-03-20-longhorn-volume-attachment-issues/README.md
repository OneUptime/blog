# How to Troubleshoot Longhorn Volume Attachment Issues - Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Troubleshooting, Volume Attachment, Kubernetes, Storage, Debugging, SUSE Rancher

Description: Learn how to diagnose and fix Longhorn volume attachment failures including volumes stuck in attaching state, node-to-replica communication errors, and iSCSI connectivity issues.

---

Volume attachment failures are one of the most common Longhorn operational issues. A volume stuck in `Attaching` state prevents pods from starting and blocks deployments. This guide covers the main causes and fixes.

---

## Step 1: Identify the Problem

```bash
# Check which volumes are stuck in Attaching or Detaching

kubectl get volumes.longhorn.io -n longhorn-system | grep -Ei 'attaching|detaching'

# Get detailed status of a specific volume
kubectl describe volumes.longhorn.io <volume-name> -n longhorn-system

# Check the PVC binding status
kubectl get pvc -A | grep -v Bound
```

---

## Common Causes and Fixes

### Cause 1: Replicas Are on Unavailable Nodes

```bash
# Check replica status
kubectl get replicas.longhorn.io -n longhorn-system | grep <volume-name>

# If replicas are on nodes that are NotReady
kubectl get nodes

# Option 1: Bring the node back online
# Option 2: Wait for Longhorn to detect the node as offline and rebuild replicas
# Request a detach so Longhorn can reattach the volume elsewhere:
kubectl patch volumes.longhorn.io <volume-name> -n longhorn-system \
  --type merge \
  -p '{"spec":{"nodeID":""}}'
```

---

### Cause 2: iSCSI/NVMe Initiator Not Installed on Node

```bash
# Check if open-iscsi is installed
iscsiadm --version

# Install on Debian/Ubuntu if missing
sudo apt-get install -y open-iscsi
sudo systemctl enable --now iscsid

# For V2 Data Engine volumes, load the required SPDK/NVMe-oF kernel modules
sudo modprobe vfio_pci
sudo modprobe uio_pci_generic
sudo modprobe nvme-tcp
```

---

### Cause 3: Volume Is Attached to a Different Node

Longhorn RWO volumes can only be attached to one node at a time. If the original node is gone but the Longhorn attachment ticket remains:

```bash
# Inspect the Longhorn VolumeAttachment CR
kubectl get volumeattachment.longhorn.io <volume-name> -n longhorn-system -o yaml

# If an invalid ticket is blocking reattachment, remove it carefully
kubectl edit volumeattachment.longhorn.io <volume-name> -n longhorn-system
```

---

### Cause 4: Engine Process Crashed

```bash
# Check Longhorn instance manager pods and note the pod on the affected node
kubectl get pods -n longhorn-system -l longhorn.io/component=instance-manager -o wide

# Check the instance manager logs for that node
kubectl logs -n longhorn-system <instance-manager-pod> --tail=100

# Restart the instance manager pod (it will respawn automatically)
kubectl delete pod -n longhorn-system <instance-manager-pod>
```

---

### Cause 5: Insufficient Disk Space

```bash
# Check node disk usage
kubectl get nodes.longhorn.io -n longhorn-system -o wide

# Check Longhorn node storage
kubectl get nodes.longhorn.io <node-name> -n longhorn-system \
  -o jsonpath='{.status.diskStatus}'
```

---

## Step 5: Force Volume Detach (Last Resort)

If a volume is stuck and preventing pod scheduling:

```bash
# Force detach via Longhorn UI: Volume > Detach (with force)
# Or via API:
LONGHORN_URL=http://longhorn-frontend.longhorn-system.svc.cluster.local
curl -X POST \
  "${LONGHORN_URL}/v1/volumes/<volume-name>?action=detach" \
  -H "Content-Type: application/json" \
  -d '{"hostId":"","forceDetach":true}'
```

---

## Best Practices

- Install `open-iscsi` on all nodes **before** installing Longhorn - it is a hard requirement.
- Use `PodDisruptionBudgets` to ensure pods using Longhorn volumes are drained safely during node maintenance.
- Configure **Longhorn's Node Drain Policy** via the Longhorn settings to match your maintenance workflow.
