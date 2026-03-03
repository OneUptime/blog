# How to Force Reset a Stuck Talos Linux Node

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Force Reset, Troubleshooting, Kubernetes, Node Recovery

Description: Learn how to force reset a Talos Linux node that is unresponsive or stuck, including ungraceful resets and physical recovery procedures.

---

Not every node reset goes smoothly. Sometimes a Talos Linux node gets stuck in a state where a graceful reset will not complete. Maybe the node is in a boot loop, the API is unresponsive, etcd is deadlocked, or the node has lost network connectivity. In these situations, you need to force a reset to get the node back to a working state.

This guide covers the different levels of force reset available in Talos, from the mildest non-graceful reset to the most aggressive physical intervention.

## Understanding Why Nodes Get Stuck

Before reaching for the force reset button, it helps to understand common causes of stuck nodes:

- **etcd quorum loss**: If a control plane node cannot communicate with the etcd cluster, it may hang trying to leave the cluster during a graceful reset.
- **Disk I/O issues**: Failing disks can cause the node to hang on I/O operations, making both normal operation and graceful shutdown impossible.
- **Kernel panics**: A kernel panic leaves the node completely unresponsive to all API calls.
- **Network partition**: The node may be running fine but unreachable from your management network.
- **Resource exhaustion**: Out of memory conditions or CPU starvation can make the node unresponsive to commands.

## Level 1: Non-Graceful Reset via API

The first approach is a non-graceful reset through the Talos API. This skips the clean shutdown procedures and immediately begins wiping partitions:

```bash
# Non-graceful reset - skips etcd leave and pod draining
talosctl reset --nodes 10.0.0.50 \
  --graceful=false \
  --reboot=true
```

The `--graceful=false` flag tells Talos to skip these steps:
- No attempt to leave the etcd cluster
- No attempt to drain Kubernetes pods
- No attempt to cleanly shut down services

Instead, it immediately proceeds to wipe the specified partitions and reboot.

### When to Use Non-Graceful Reset

Use this when the node is reachable via the Talos API but a graceful reset fails or times out:

```bash
# If a graceful reset timed out, try non-graceful
talosctl reset --nodes 10.0.0.50 \
  --graceful=false \
  --reboot=true \
  --system-labels-to-wipe STATE \
  --system-labels-to-wipe EPHEMERAL
```

## Level 2: Reboot Then Reset

If the node's current state prevents even a non-graceful reset (for example, a hung kernel), try rebooting first:

```bash
# Force reboot the node
talosctl reboot --nodes 10.0.0.50

# Wait for it to come back up
sleep 60

# Then perform the reset
talosctl reset --nodes 10.0.0.50 \
  --graceful=false \
  --reboot=true
```

If the standard reboot does not work, try a shutdown followed by a manual power-on:

```bash
# Shut down the node
talosctl shutdown --nodes 10.0.0.50

# Power the node back on through IPMI, cloud console, or physical access
```

## Level 3: IPMI/BMC Power Control

When the node is completely unresponsive to Talos API calls, use out-of-band management:

```bash
# Using ipmitool for physical servers
# Power cycle the node
ipmitool -H 10.0.0.150 -U admin -P password chassis power cycle

# Or perform a hard power off followed by power on
ipmitool -H 10.0.0.150 -U admin -P password chassis power off
sleep 10
ipmitool -H 10.0.0.150 -U admin -P password chassis power on
```

For cloud instances:

```bash
# AWS
aws ec2 reboot-instances --instance-ids i-1234567890abcdef0

# If reboot does not work, stop and start
aws ec2 stop-instances --instance-ids i-1234567890abcdef0 --force
aws ec2 wait instance-stopped --instance-ids i-1234567890abcdef0
aws ec2 start-instances --instance-ids i-1234567890abcdef0

# Azure
az vm restart --resource-group my-rg --name my-node

# GCP
gcloud compute instances reset my-node --zone us-central1-a
```

After the node comes back from a power cycle, it should be responsive to Talos API calls again, and you can perform the reset:

```bash
# Wait for the node to be reachable
until talosctl version --nodes 10.0.0.50 2>/dev/null; do
  echo "Waiting for node to come back..."
  sleep 10
done

# Now perform the reset
talosctl reset --nodes 10.0.0.50 \
  --graceful=false \
  --reboot=true
```

## Level 4: Boot from ISO and Wipe

If the node keeps booting into a broken state even after power cycling, boot from a Talos ISO to perform a clean wipe:

1. **Attach the ISO**: Mount a Talos Linux ISO through IPMI virtual media, cloud instance user data, or a physical USB drive.

2. **Boot from the ISO**: Configure the boot order to prioritize the ISO/USB over the local disk.

3. **Wipe the disk**: Once the node boots from the ISO into maintenance mode, the local disk is not in use and can be wiped completely.

```bash
# After booting from ISO, the node is in maintenance mode
# Apply a fresh config that will install to the disk
talosctl apply-config --insecure \
  --nodes 10.0.0.50 \
  --file worker.yaml
```

The installer will overwrite the existing disk contents with a fresh Talos installation.

## Handling etcd After a Force Reset

When you force-reset a control plane node without a graceful etcd leave, the etcd cluster still thinks that member exists. You need to manually remove it:

```bash
# From a healthy control plane node, list etcd members
talosctl etcd members --nodes 10.0.0.10

# Find the ID of the force-reset node and remove it
talosctl etcd remove-member --nodes 10.0.0.10 <member-id>

# Verify the member was removed
talosctl etcd members --nodes 10.0.0.10
```

This is critical for cluster health. An unreachable etcd member counts against quorum, and if you force-reset enough nodes without removing their etcd members, the cluster can lose quorum entirely.

## Handling Kubernetes After a Force Reset

The Kubernetes API server still has the node object from before the reset. Clean it up:

```bash
# Delete the old node object
kubectl delete node old-node-name

# If the node had taints or special scheduling, note them for reconfiguration
kubectl get node old-node-name -o yaml > /tmp/old-node-backup.yaml
```

Pods that were running on the force-reset node will be stuck in Terminating state. Force delete them:

```bash
# Find stuck pods
kubectl get pods --all-namespaces --field-selector spec.nodeName=old-node-name

# Force delete stuck pods
kubectl get pods --all-namespaces --field-selector spec.nodeName=old-node-name \
  -o json | jq -r '.items[] | "\(.metadata.namespace) \(.metadata.name)"' | \
  while read ns pod; do
    kubectl delete pod -n "$ns" "$pod" --force --grace-period=0
  done
```

## Recovery Script for Stuck Nodes

Here is a script that tries progressively more aggressive approaches:

```bash
#!/bin/bash
# recover-stuck-node.sh
set -euo pipefail

NODE_IP=$1

echo "Attempting recovery of ${NODE_IP}..."

# Try 1: Non-graceful reset
echo "Trying non-graceful reset..."
if talosctl reset --nodes "${NODE_IP}" --graceful=false --reboot=true 2>/dev/null; then
  echo "Non-graceful reset succeeded"
  exit 0
fi

# Try 2: Reboot first
echo "Reset failed. Trying reboot..."
if talosctl reboot --nodes "${NODE_IP}" 2>/dev/null; then
  echo "Reboot command sent. Waiting 60 seconds..."
  sleep 60
  if talosctl reset --nodes "${NODE_IP}" --graceful=false --reboot=true 2>/dev/null; then
    echo "Reset after reboot succeeded"
    exit 0
  fi
fi

# Try 3: Shutdown
echo "Reboot failed. Trying shutdown..."
if talosctl shutdown --nodes "${NODE_IP}" 2>/dev/null; then
  echo "Shutdown command sent. Manual power-on required."
  echo "After power-on, run: talosctl reset --nodes ${NODE_IP} --graceful=false --reboot=true"
  exit 0
fi

echo "All API-based recovery methods failed."
echo "Manual intervention required:"
echo "  1. Power cycle via IPMI/BMC/cloud console"
echo "  2. Boot from Talos ISO if disk is corrupted"
echo "  3. Apply fresh config after recovery"
exit 1
```

## Preventing Stuck Nodes

While you cannot prevent all node failures, you can reduce the frequency:

- **Monitor disk health**: Use SMART monitoring to detect failing disks before they cause hangs.
- **Set resource limits**: Prevent OOM kills and CPU starvation with proper resource requests and limits.
- **Maintain etcd health**: Keep your etcd cluster healthy with regular defragmentation and monitoring.
- **Use redundancy**: With three or more control plane nodes, losing one does not affect cluster operation.

## Wrapping Up

Force resetting a stuck Talos Linux node is a skill every cluster operator needs. The escalation path from non-graceful API reset through IPMI power cycling to ISO-based recovery covers every scenario you might encounter. The key is to start with the least disruptive option and escalate only when necessary. And always remember to clean up after a force reset - remove the orphaned etcd member, delete the old Kubernetes node object, and force-delete any stuck pods. With proper cleanup, the cluster recovers cleanly and the node can be reprovisioned without any lingering issues.
