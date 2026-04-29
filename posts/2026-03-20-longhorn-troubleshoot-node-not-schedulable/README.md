# How to Troubleshoot Longhorn Node Not Schedulable Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Troubleshooting, Node Scheduling, Storage, Kubernetes, Debugging, SUSE Rancher

Description: Learn how to diagnose and fix Longhorn node scheduling failures including disabled nodes, disk conditions, tag mismatches, and eviction settings that prevent volume replicas from being placed on a...

---

When Longhorn cannot schedule volume replicas on a node, new volumes fail to provision and existing volume rebuilds stall. The most common causes are disabled nodes, full disks, missing tags, or eviction conditions.

---

## Step 1: Check Node Status in Longhorn

```bash
# List all Longhorn nodes and their schedulability

kubectl get node.longhorn.io -n longhorn-system \
  -o custom-columns='NAME:.metadata.name,SCHEDULABLE:.status.conditions[?(@.type=="Schedulable")].status,STATE:.status.conditions[?(@.type=="Ready")].status'

# Describe a specific node for detailed conditions
kubectl describe node.longhorn.io <node-name> -n longhorn-system
```

---

## Step 2: Check Disk Conditions

```bash
# Check disk status on a Longhorn node
kubectl get node.longhorn.io <node-name> -n longhorn-system -o yaml \
  | grep -A 30 diskStatus

# Key fields to look for:
# conditions:
#   Schedulable:
#     status: "False" - disk cannot accept new replicas
#     reason: DiskPressure - scheduling or free-space checks failed
# storageAvailable: <bytes> - available space
# storageScheduled: <bytes> - already allocated space
```

---

## Common Issue 1: Disk Is Full or Over-Provisioned

```bash
# Check actual disk usage on the node
kubectl debug node/<node-name> -it --image=busybox -- \
  chroot /host df -h /var/lib/longhorn

# Check Longhorn's storage scheduling settings
kubectl get setting -n longhorn-system \
  storage-over-provisioning-percentage -o yaml

# By default, Longhorn allows 100% over-provisioning
# If reduced, volumes may not schedule even with space available
# Increase the over-provisioning percentage
kubectl patch setting -n longhorn-system \
  storage-over-provisioning-percentage \
  --type merge \
  -p '{"value":"200"}'

# Also check storage-minimal-available-percentage
kubectl get setting -n longhorn-system \
  storage-minimal-available-percentage -o yaml
```

---

## Common Issue 2: Node or Disk is Disabled

```bash
# Check if the node is disabled in Longhorn
kubectl get node.longhorn.io <node-name> -n longhorn-system \
  -o jsonpath='{.spec.allowScheduling}'

# Re-enable the node for scheduling
kubectl patch node.longhorn.io <node-name> -n longhorn-system \
  --type merge \
  -p '{"spec":{"allowScheduling":true}}'

# Check if a specific disk is disabled
kubectl get node.longhorn.io <node-name> -n longhorn-system \
  -o jsonpath='{.spec.disks}'
```

In the Longhorn UI, go to **Node** → click the node → verify **Scheduling** is **Enabled** for each disk.

---

## Common Issue 3: Node Has Taints Without Tolerations

```bash
# Check Kubernetes node taints
kubectl describe node <node-name> | grep Taints

# Check if Longhorn tolerations include the node's taints
kubectl get setting -n longhorn-system \
  taint-toleration -o yaml

# Add a toleration for a custom taint
kubectl patch setting -n longhorn-system \
  taint-toleration \
  --type merge \
  -p '{"value":"dedicated=storage:NoSchedule"}'
```

The `taint-toleration` setting only applies to Longhorn system-managed components such as instance managers and CSI pods. If `longhorn-manager` itself is not running on the tainted node, update the Helm values or deployment YAML for the user-deployed Longhorn components as well.

---

## Common Issue 4: Volume Tag Mismatch

If volumes or StorageClass use node/disk tags, and nodes don't have matching tags, scheduling fails:

```bash
# Check what node tags a volume requires
kubectl get volume -n longhorn-system <volume-name> \
  -o jsonpath='{.spec.nodeSelector}'

# Check what disk tags a volume requires
kubectl get volume -n longhorn-system <volume-name> \
  -o jsonpath='{.spec.diskSelector}'

# Check what node tags a Longhorn node has
kubectl get node.longhorn.io <node-name> -n longhorn-system \
  -o jsonpath='{.spec.tags}'

# Check what disk tags are configured on the node
kubectl get node.longhorn.io <node-name> -n longhorn-system \
  -o yaml | grep -A 20 'disks:'

# Add the required tag to the node
# Longhorn UI → Node → Edit → add tag "ssd" or "fast"
```

---

## Common Issue 5: Instance Manager Pod Not Running on Node

```bash
# Check instance manager pods per node
kubectl get pod -n longhorn-system \
  -l longhorn.io/component=instance-manager \
  -o wide

# If missing on a specific node, check the node conditions
kubectl describe node <node-name> | grep -A 10 Conditions

# Restart the Longhorn manager on the node
kubectl delete pod -n longhorn-system \
  -l app=longhorn-manager \
  --field-selector spec.nodeName=<node-name>
```

---

## Step 3: Force Reschedule by Restarting Longhorn Manager

```bash
# Restart all Longhorn manager pods to force a scheduling re-evaluation
kubectl rollout restart daemonset/longhorn-manager -n longhorn-system

# Monitor pods coming back up
kubectl get pods -n longhorn-system -l app=longhorn-manager -w
```

---

## Scheduling Diagnostics Checklist

```bash
# 1. Is the node enabled for scheduling?
kubectl get node.longhorn.io <node-name> -n longhorn-system \
  -o jsonpath='{.spec.allowScheduling}'

# 2. Is the disk enabled?
kubectl get node.longhorn.io <node-name> -n longhorn-system \
  -o yaml | grep allowScheduling

# 3. Does the node have enough space?
kubectl debug node/<node-name> -it --image=busybox -- \
  chroot /host df -h /var/lib/longhorn

# 4. Do node and disk tags match the volume requirements?
kubectl get volume -n longhorn-system <volume-name> \
  -o jsonpath='{.spec.nodeSelector}'
kubectl get volume -n longhorn-system <volume-name> \
  -o jsonpath='{.spec.diskSelector}'

# 5. Is the instance manager running on this node?
kubectl get pod -n longhorn-system \
  -l longhorn.io/component=instance-manager \
  --field-selector spec.nodeName=<node-name>
```

---

## Best Practices

- Monitor Longhorn node disk usage with Prometheus and alert at 70% capacity - proactive alerting prevents scheduling failures before they affect workloads.
- Avoid manually disabling nodes in Longhorn unless you're doing planned maintenance - disabled nodes cause immediate scheduling failures for new volumes.
- Use node tags to target specific volumes to specific nodes (e.g., SSDs for databases) only when the node count is high enough that some nodes will always have space available.
