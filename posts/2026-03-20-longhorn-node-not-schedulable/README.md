# How to Fix Longhorn Node Not Schedulable Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Troubleshooting, Node Scheduling, Kubernetes, Storage, SUSE Rancher

Description: Learn how to diagnose and fix Longhorn nodes marked as not schedulable for replica placement, covering disk pressure, condition checks, and allowScheduling configuration.

---

When a Longhorn node is marked as "not schedulable", Longhorn will not place new replicas on it. This reduces available storage capacity and can cause volumes to remain degraded if there are not enough schedulable nodes.

---

## Step 1: Identify Non-Schedulable Nodes

```bash
# List Longhorn nodes and their scheduling status

kubectl get nodes.longhorn.io -n longhorn-system \
  -o custom-columns='NAME:.metadata.name,ALLOW_SCHEDULING:.spec.allowScheduling,SCHEDULABLE:.status.conditions[?(@.type=="Schedulable")].status,READY:.status.conditions[?(@.type=="Ready")].status'

# Get detailed status of a specific Longhorn node
kubectl describe node.longhorn.io <node-name> -n longhorn-system
```

---

## Cause 1: Disk Space Exceeded Threshold

Longhorn stops scheduling replicas on a disk when available space falls below the configured minimum free-space threshold (`Storage Minimal Available Percentage`, default 25%). If you use the default disk path (`/var/lib/longhorn`), Longhorn also reserves 30% of the root disk by default.

```bash
# Check disk usage on the Longhorn node
kubectl get node.longhorn.io <node-name> -n longhorn-system \
  -o jsonpath='{.status.diskStatus}' | jq .

# Check actual disk usage on the host for the Longhorn disk path
df -h <disk-path>
```

Fix: Free disk space or add a new disk to the node.

---

## Cause 2: Node Scheduling Disabled Manually

```bash
# Check if scheduling was manually disabled
kubectl get node.longhorn.io <node-name> -n longhorn-system \
  -o jsonpath='{.spec.allowScheduling}'

# Re-enable scheduling
kubectl patch node.longhorn.io <node-name> -n longhorn-system \
  --type merge \
  -p '{"spec":{"allowScheduling":true}}'
```

---

## Cause 3: Longhorn Disk Not Configured Properly

```bash
# List disks configured on the node
kubectl get node.longhorn.io <node-name> -n longhorn-system \
  -o jsonpath='{.spec.disks}' | jq .

# Check disk conditions
kubectl get node.longhorn.io <node-name> -n longhorn-system \
  -o yaml | grep -A 20 diskStatus
```

If a disk's `Ready` condition is `False`, or its `Schedulable` condition is `False`, check:

```bash
# On the host node - check if the Longhorn disk path exists
ls -la <disk-path>

# Check if Longhorn can write to the disk
touch <disk-path>/test && rm <disk-path>/test
```

---

## Cause 4: Node Kubernetes Taint Prevents Longhorn Scheduling

```bash
# Check node taints
kubectl describe node <node-name> | grep Taints

# If the node has a custom taint, configure Kubernetes Taint Toleration in Longhorn
# Settings > Kubernetes Taint Toleration in Longhorn UI
```

Add toleration in Longhorn settings:

```yaml
# In Longhorn UI: Settings > Kubernetes Taint Toleration
# Format: key=value:effect
dedicated=storage:NoSchedule
```

Also ensure the Longhorn user-deployed components (manager, UI, and driver) were installed or upgraded with matching tolerations.

---

## Cause 5: Node Eviction Was Requested

```bash
# Check if eviction is requested
kubectl get node.longhorn.io <node-name> -n longhorn-system \
  -o jsonpath='{.spec.evictionRequested}'

# Cancel eviction
kubectl patch node.longhorn.io <node-name> -n longhorn-system \
  --type merge \
  -p '{"spec":{"evictionRequested":false}}'
```

Eviction is only valid when scheduling is disabled on the node, so if you want the node to accept replicas again, re-enable `allowScheduling` after canceling eviction.

---

## Best Practices

- Keep Longhorn disks well above the minimum free-space limit. With the default `Storage Minimal Available Percentage` of 25%, keep at least 25% free on each disk to leave room for rebuilds.
- Use separate dedicated disks for Longhorn storage on each node for better isolation.
- Regularly check `kubectl get nodes.longhorn.io` in your monitoring dashboard to catch scheduling issues before they impact data availability.
