# How to Reset Kubelet State on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubelet, Kubernetes, Troubleshooting, Node Management

Description: Learn how to reset kubelet state on Talos Linux nodes to fix pod scheduling issues, stale containers, and kubelet configuration problems.

---

Kubelet is the primary node agent in Kubernetes, responsible for managing pods, reporting node status, and communicating with the API server. On Talos Linux, kubelet runs as a system service managed by the Talos init system. When kubelet gets into a bad state - stuck pods, stale container data, or persistent error loops - you may need to reset its state to get things working again.

This guide covers the different approaches to resetting kubelet state on Talos, from a simple service restart to a full ephemeral wipe.

## Understanding Kubelet State on Talos

Kubelet maintains several categories of state on a Talos Linux node:

- **Pod manifest cache**: Information about pods that should be running on this node
- **Container state**: Metadata about running and stopped containers
- **Volume mounts**: State for persistent volumes, projected volumes, and config maps
- **Device plugins**: Registration data for GPU, FPGA, and other device plugins
- **Certificate data**: Kubelet's client certificate for communicating with the API server
- **Checkpoint data**: Checkpoints for graceful node shutdown

All of this data lives on the EPHEMERAL partition, typically under `/var/lib/kubelet/`.

## Method 1: Restart the Kubelet Service

The simplest approach is restarting kubelet. This does not wipe any state but forces kubelet to re-read its configuration and reconcile with the API server:

```bash
# Restart the kubelet service
talosctl service kubelet restart --nodes 10.0.0.50

# Check the service status
talosctl service kubelet --nodes 10.0.0.50

# Watch kubelet logs after restart
talosctl logs kubelet --nodes 10.0.0.50 --follow
```

A restart is sufficient for many issues, including:
- Kubelet not picking up new pod assignments
- Stale node conditions that are not clearing
- Health check failures after transient network issues

## Method 2: Reset Kubelet via Node Reboot

A node reboot restarts all services including kubelet, and clears any in-memory state:

```bash
# Reboot the node
talosctl reboot --nodes 10.0.0.50

# Wait for the node to come back
sleep 60

# Verify kubelet is running
talosctl service kubelet --nodes 10.0.0.50

# Check node status in Kubernetes
kubectl get node -o wide | grep 10.0.0.50
```

## Method 3: Wipe the EPHEMERAL Partition

For persistent kubelet issues that survive restarts, wipe the EPHEMERAL partition to clear all kubelet state:

```bash
# Drain the node first
kubectl drain node-name \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --timeout=300s

# Reset only the EPHEMERAL partition
talosctl reset --nodes 10.0.0.50 \
  --graceful=true \
  --reboot=true \
  --system-labels-to-wipe EPHEMERAL
```

After the reboot, kubelet starts with a completely clean state. It registers with the API server as if it were a fresh node, pulls pod definitions, downloads container images, and begins running workloads from scratch.

## Common Kubelet Issues and Fixes

### Stuck Pods

Pods stuck in Terminating, ContainerCreating, or Unknown state on a specific node:

```bash
# Check for stuck pods on the node
kubectl get pods --all-namespaces --field-selector spec.nodeName=node-name \
  -o custom-columns=NAMESPACE:.metadata.namespace,NAME:.metadata.name,STATUS:.status.phase

# Try restarting kubelet first
talosctl service kubelet restart --nodes 10.0.0.50

# Wait and check again
sleep 30
kubectl get pods --all-namespaces --field-selector spec.nodeName=node-name
```

If the restart does not fix stuck pods, the container runtime may also be stuck:

```bash
# Check containerd service
talosctl service containerd --nodes 10.0.0.50

# View containerd logs for errors
talosctl logs containerd --nodes 10.0.0.50 | tail -50
```

### Node Not Ready

When a node shows NotReady in Kubernetes:

```bash
# Check node conditions
kubectl describe node node-name | grep -A 20 "Conditions:"

# Check kubelet logs for the specific issue
talosctl logs kubelet --nodes 10.0.0.50 | grep -i "error\|fail\|not ready"

# Common causes:
# 1. Network plugin not ready - check CNI
# 2. Container runtime not responding - restart containerd
# 3. Disk pressure - check disk usage
# 4. Memory pressure - check memory usage
```

Check disk and memory conditions:

```bash
# Check disk usage
talosctl usage --nodes 10.0.0.50

# Check memory
talosctl memory --nodes 10.0.0.50

# Check system processes
talosctl processes --nodes 10.0.0.50
```

### Certificate Issues

If kubelet's certificates expire or become invalid:

```bash
# Check kubelet certificate status
talosctl logs kubelet --nodes 10.0.0.50 | grep -i "certificate\|tls\|x509"

# If certificates are the issue, a kubelet restart often triggers re-rotation
talosctl service kubelet restart --nodes 10.0.0.50

# If that does not work, the node may need to re-register
# Wipe EPHEMERAL to force new certificate generation
talosctl reset --nodes 10.0.0.50 \
  --graceful=true \
  --reboot=true \
  --system-labels-to-wipe EPHEMERAL
```

### Container Image Issues

When kubelet cannot pull images or the image cache is corrupted:

```bash
# List cached images on the node
talosctl images --nodes 10.0.0.50

# Check containerd for image-related errors
talosctl logs containerd --nodes 10.0.0.50 | grep -i "image\|pull\|error"

# If the image cache is corrupted, an EPHEMERAL wipe clears it
# This will require re-pulling all images
```

### Volume Mount Failures

When pods fail to start due to volume mount issues:

```bash
# Check kubelet logs for volume errors
talosctl logs kubelet --nodes 10.0.0.50 | grep -i "volume\|mount\|attach"

# List current mounts
talosctl mounts --nodes 10.0.0.50

# Force unmount stuck volumes (risky - use as last resort)
# A kubelet restart usually cleans up stale mounts
talosctl service kubelet restart --nodes 10.0.0.50
```

## Kubelet Configuration on Talos

Kubelet's configuration on Talos is derived from the machine configuration. You can view and modify it:

```bash
# View current kubelet configuration
talosctl get kubeletconfig --nodes 10.0.0.50 -o yaml
```

To change kubelet settings, patch the machine configuration:

```yaml
# kubelet-patch.yaml
machine:
  kubelet:
    extraConfig:
      maxPods: 250
      serializeImagePulls: false
      imageGCHighThresholdPercent: 85
      imageGCLowThresholdPercent: 80
    extraArgs:
      v: "4"  # Increase verbosity for debugging
```

```bash
# Apply the kubelet configuration change
talosctl patch machineconfig --nodes 10.0.0.50 --patch @kubelet-patch.yaml

# Kubelet will be restarted automatically with the new config
```

## Monitoring Kubelet Health

Set up proactive monitoring to catch kubelet issues before they become critical:

```bash
# Quick health check script
#!/bin/bash
NODES=("10.0.0.50" "10.0.0.51" "10.0.0.52")

for node in "${NODES[@]}"; do
  # Check kubelet service status
  status=$(talosctl service kubelet --nodes "${node}" 2>&1)
  if echo "${status}" | grep -q "Running"; then
    echo "OK: ${node} - kubelet running"
  else
    echo "ALERT: ${node} - kubelet not running"
    echo "${status}"
  fi

  # Check for recent kubelet restarts
  restarts=$(talosctl logs kubelet --nodes "${node}" 2>/dev/null | \
    grep "Starting kubelet" | wc -l)
  if [ "${restarts}" -gt 3 ]; then
    echo "WARNING: ${node} - kubelet restarted ${restarts} times in recent logs"
  fi
done
```

## Automating Kubelet Recovery

For production environments, automate kubelet recovery:

```bash
#!/bin/bash
# kubelet-recovery.sh - automated kubelet recovery
set -euo pipefail

NODE_IP=$1

echo "Checking kubelet on ${NODE_IP}..."

# Check if kubelet is running
if ! talosctl service kubelet --nodes "${NODE_IP}" 2>/dev/null | grep -q "Running"; then
  echo "Kubelet is not running. Attempting restart..."
  talosctl service kubelet restart --nodes "${NODE_IP}"
  sleep 30
fi

# Check if the node is Ready in Kubernetes
NODE_NAME=$(kubectl get nodes -o wide | grep "${NODE_IP}" | awk '{print $1}')
NODE_STATUS=$(kubectl get node "${NODE_NAME}" -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}')

if [ "${NODE_STATUS}" != "True" ]; then
  echo "Node is not Ready. Checking kubelet logs..."
  talosctl logs kubelet --nodes "${NODE_IP}" | tail -20

  echo "Restarting kubelet..."
  talosctl service kubelet restart --nodes "${NODE_IP}"
  sleep 60

  # Check again
  NODE_STATUS=$(kubectl get node "${NODE_NAME}" -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}')
  if [ "${NODE_STATUS}" != "True" ]; then
    echo "Kubelet restart did not fix the issue. Consider EPHEMERAL wipe."
    echo "Run: talosctl reset --nodes ${NODE_IP} --graceful=true --reboot=true --system-labels-to-wipe EPHEMERAL"
  else
    echo "Node is now Ready."
  fi
else
  echo "Node is Ready. No action needed."
fi
```

## Wrapping Up

Resetting kubelet state on Talos Linux ranges from a simple service restart to a full EPHEMERAL partition wipe. The right approach depends on the severity of the issue. For most problems, a kubelet restart is sufficient. For persistent issues involving corrupted container state or certificate problems, wiping the EPHEMERAL partition gives you a clean foundation. The key is to diagnose the root cause through kubelet and containerd logs before choosing your recovery strategy, and always drain the node before performing any disruptive operations.
