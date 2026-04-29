# How to Debug Longhorn Replica Rebuilding Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Replica Rebuilding, Kubernetes, Storage, Troubleshooting, Degraded Volume, SUSE Rancher

Description: Learn how to troubleshoot Longhorn replica rebuilding issues including stuck rebuilds, slow progress, and replica scheduling failures that leave volumes in a degraded state.

---

When a Longhorn replica fails or a new replica is added, Longhorn starts a rebuild process to synchronize data. If the rebuild gets stuck or fails repeatedly, volumes remain degraded and data redundancy is reduced.

---

## Step 1: Identify Replica Rebuild Status

```bash
# Check volume robustness - "degraded" means one or more replicas are missing or rebuilding

kubectl get volumes.longhorn.io -n longhorn-system \
  -o custom-columns='NAME:.metadata.name,STATE:.status.state,ROBUSTNESS:.status.robustness,NODE:.status.currentNodeID'

# Get detailed replica status for a specific volume
kubectl get replicas.longhorn.io -n longhorn-system \
  -l longhornvolume=<volume-name> \
  -o wide
```

---

## Issue 1: Replica Shows "RebuildFailed" Condition

This usually means the failed replica should be removed so Longhorn can create a replacement.

```bash
# Check replica status
kubectl describe replicas.longhorn.io <replica-name> -n longhorn-system

# Delete the failed replica
kubectl delete replicas.longhorn.io <failed-replica-name> -n longhorn-system

# Longhorn will schedule a new replica automatically
```

---

## Issue 2: Rebuild Not Starting Due to Scheduling Constraints

Longhorn cannot schedule a new replica if no eligible node or disk meets its scheduling requirements.

```bash
# Check node scheduling status
kubectl get nodes.longhorn.io -n longhorn-system

# Check node conditions
kubectl get nodes.longhorn.io <node-name> -n longhorn-system -o yaml | grep -A 10 conditions

# If a node shows "Schedulable: False" or "AllowScheduling: false", check its disk status
kubectl describe nodes.longhorn.io <node-name> -n longhorn-system
```

Fix: Free up disk space or add a new node with available storage.

---

## Issue 3: Slow Replica Rebuild

Long rebuild times cause volumes to remain degraded longer, increasing risk:

```bash
# Check rebuild progress via Longhorn UI (Volume > Replicas tab)
# Or check via the instance manager log:
kubectl logs -n longhorn-system \
  -l longhorn.io/component=instance-manager \
  --tail=200 | grep -Ei "rebuild|sync"
```

To speed up rebuilds on Longhorn v1.11 and later, increase scale rebuild concurrency in Longhorn settings:

```bash
# Equivalent UI path: Settings > Danger Zone > Replica Rebuild Concurrent Sync Limit
kubectl patch settings.longhorn.io replica-rebuild-concurrent-sync-limit -n longhorn-system \
  --type merge \
  -p '{"value":"{\"v1\":\"2\"}"}'
```

---

## Issue 4: Replica Rebuild Fails with I/O Error

```bash
# Check dmesg for disk errors on the node
ssh <node> sudo dmesg | grep -Ei "error|I/O|failed" | tail -20

# Check SMART status of the disk
sudo smartctl -a /dev/sda

# If the disk is failing, evacuate volumes from that node
kubectl patch nodes.longhorn.io <node-name> -n longhorn-system \
  --type merge \
  -p '{"spec":{"allowScheduling":false,"evictionRequested":true}}'
```

---

## Issue 5: Too Many Concurrent Rebuilds Impacting Performance

```bash
# Check the current per-node rebuild limit
kubectl get settings.longhorn.io concurrent-replica-rebuild-per-node-limit \
  -n longhorn-system -o yaml

# Limit concurrent rebuilds in Longhorn settings:
kubectl patch settings.longhorn.io concurrent-replica-rebuild-per-node-limit \
  -n longhorn-system --type merge -p '{"value":"2"}'
```

---

## Best Practices

- Set **replica count to 3** for production volumes - this gives you one failure tolerance while a rebuild completes.
- Monitor rebuild duration and alert if a rebuild takes longer than 2 hours.
- After adding new nodes, verify Longhorn can schedule replicas and, if **Replica Auto Balance** is enabled, that replicas are redistributed.
- Keep enough free space to satisfy Longhorn's **Storage Minimal Available Percentage** setting, which is **25% free by default**.
