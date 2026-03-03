# How to Monitor Upgrade Progress in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Monitoring, Upgrade, Cluster Operations

Description: Practical techniques for monitoring the progress of Talos Linux upgrades in real time using talosctl and Kubernetes tools.

---

When you kick off a Talos Linux upgrade, you want to know exactly what is happening on each node as it progresses. Unlike traditional Linux where you might watch package manager output over SSH, Talos is API-driven and immutable. Monitoring an upgrade requires a different set of tools and techniques. This guide covers everything you need to follow along in real time.

## What Happens During a Talos Upgrade

Before diving into monitoring, it helps to understand the upgrade sequence. When you run `talosctl upgrade` on a node, the following happens:

1. The new installer image is pulled to the node
2. The new OS image is written to the inactive system partition
3. The bootloader is updated to point to the new partition
4. The node reboots into the new OS
5. Kubernetes components restart and the node rejoins the cluster

Each of these stages can be observed through different tools.

## Monitoring with talosctl

The `talosctl` command is your primary tool for observing upgrade progress.

### Watching System Events

```bash
# Watch events on the node being upgraded
talosctl events --nodes <node-ip> --follow

# This shows real-time events including:
# - Image pull progress
# - Partition operations
# - Boot sequence events
# - Service startups
```

Events are the most direct way to see what the upgrade process is doing at any given moment.

### Following System Logs

```bash
# Follow kernel messages during and after reboot
talosctl dmesg --nodes <node-ip> --follow

# Follow specific service logs
talosctl logs machined --nodes <node-ip> --follow
talosctl logs controller-runtime --nodes <node-ip> --follow
```

During the reboot phase, the connection will drop. This is expected. Once the node comes back up, reconnect to continue monitoring.

### Checking Service Status

```bash
# List all system services and their states
talosctl services --nodes <node-ip>

# Expected output after successful upgrade:
# SERVICE           STATE     HEALTH    LAST CHANGE
# apid              Running   OK        2m ago
# containerd        Running   OK        2m ago
# cri               Running   OK        2m ago
# etcd              Running   OK        1m ago
# kubelet           Running   OK        1m ago
# machined          Running   OK        2m ago
# trustd            Running   OK        2m ago
```

If any service is stuck in a non-running state for an extended period after the reboot, that indicates a problem.

### Using talosctl health

The `health` command is a comprehensive check that waits for the node to be fully operational:

```bash
# Wait for the node to be healthy after upgrade
talosctl health --nodes <node-ip> --wait-timeout 10m

# This checks:
# - All system services are running
# - etcd is healthy (for control plane nodes)
# - Kubernetes API is accessible
# - The node is Ready in Kubernetes
```

This is the single most useful command for post-reboot monitoring. It blocks until either the node is healthy or the timeout expires.

## Monitoring from the Kubernetes Side

While talosctl shows you the OS-level view, kubectl shows you the Kubernetes-level view of the upgrade.

### Watching Node Status

```bash
# Watch node status changes in real time
kubectl get nodes --watch

# You will see the node go through states:
# Ready -> NotReady (during reboot) -> Ready (after upgrade)

# For more detail
kubectl get nodes -o wide --watch
```

### Monitoring Node Conditions

```bash
# Get detailed conditions for the upgrading node
kubectl describe node <node-name> | grep -A 20 "Conditions:"

# Watch for specific conditions
kubectl get node <node-name> -o jsonpath='{.status.conditions[*].type}{"\n"}{.status.conditions[*].status}'
```

### Watching Pod Evictions and Rescheduling

When a node goes down for upgrade, pods need to be rescheduled:

```bash
# Watch pod movements across the cluster
kubectl get pods --all-namespaces --watch \
  --field-selector spec.nodeName=<upgrading-node-name>

# Monitor pod disruption budgets
kubectl get pdb --all-namespaces
```

## Monitoring etcd During Control Plane Upgrades

Control plane upgrades are more sensitive because etcd is involved. Monitor etcd closely:

```bash
# Check etcd status from a healthy control plane node
talosctl etcd status --nodes <healthy-cp-node>

# Watch etcd member list
talosctl etcd members --nodes <healthy-cp-node>

# During the upgrade, you should see the upgrading node's
# etcd member temporarily go offline, then come back
```

If you have Prometheus monitoring etcd, watch these metrics:

```bash
# Key etcd metrics to watch during upgrades
# etcd_server_has_leader - should always be 1
# etcd_server_leader_changes_seen_total - should not spike
# etcd_disk_wal_fsync_duration_seconds - should stay low
# etcd_network_peer_round_trip_time_seconds - should stay stable
```

## Building a Monitoring Dashboard

For clusters where upgrades happen regularly, having a dashboard helps. Here is what to include in a Grafana dashboard for upgrade monitoring:

```yaml
# Key panels for an upgrade monitoring dashboard:

# Panel 1: Node Versions
# Query: talos_version per node
# Shows which nodes have been upgraded

# Panel 2: etcd Health
# Query: etcd_server_has_leader
# Binary indicator - should always be 1

# Panel 3: Node Readiness
# Query: kube_node_status_condition{condition="Ready",status="true"}
# Shows which nodes are Ready

# Panel 4: Pod Distribution
# Query: sum(kube_pod_info) by (node)
# Shows workload distribution across nodes
```

## Scripting Upgrade Progress Monitoring

For a more automated approach, you can write a monitoring script:

```bash
#!/bin/bash
# monitor-upgrade.sh - Watch upgrade progress for a node

NODE_IP=$1
CP_NODE=$2  # A healthy control plane node for API access

echo "Monitoring upgrade progress for ${NODE_IP}"
echo "Using ${CP_NODE} for cluster health checks"
echo "---"

# Phase 1: Wait for the node to go offline
echo "Waiting for node to begin reboot..."
while talosctl version --nodes ${NODE_IP} 2>/dev/null; do
    sleep 2
done
echo "Node is rebooting..."

# Phase 2: Wait for the node to come back
echo "Waiting for node to come back online..."
until talosctl version --nodes ${NODE_IP} 2>/dev/null; do
    sleep 5
done
echo "Node is back online!"

# Phase 3: Check services
echo "Checking system services..."
talosctl services --nodes ${NODE_IP}

# Phase 4: Check version
echo "Verifying new version..."
talosctl version --nodes ${NODE_IP}

# Phase 5: Check cluster health
echo "Checking cluster health..."
talosctl health --nodes ${NODE_IP} --wait-timeout 5m

echo "---"
echo "Upgrade monitoring complete for ${NODE_IP}"
```

## Monitoring a Rolling Upgrade Across Multiple Nodes

When upgrading an entire cluster, you need to track the overall progress:

```bash
# Check upgrade progress across all nodes
talosctl version --nodes <node1>,<node2>,<node3>,<node4>,<node5>

# Look for version mismatches that indicate partial upgrade
# All nodes on the target version = upgrade complete
```

Create a simple progress tracker:

```bash
#!/bin/bash
# upgrade-progress.sh

TARGET_VERSION="v1.7.0"
ALL_NODES="10.0.0.1,10.0.0.2,10.0.0.3,10.0.0.4,10.0.0.5"

echo "Upgrade progress to ${TARGET_VERSION}:"
echo "---"

IFS=',' read -ra NODES <<< "${ALL_NODES}"
UPGRADED=0
TOTAL=${#NODES[@]}

for node in "${NODES[@]}"; do
    VERSION=$(talosctl version --nodes ${node} 2>/dev/null | grep "Tag:" | head -1 | awk '{print $2}')
    if [ "${VERSION}" = "${TARGET_VERSION}" ]; then
        echo "${node}: UPGRADED (${VERSION})"
        ((UPGRADED++))
    else
        echo "${node}: PENDING (${VERSION})"
    fi
done

echo "---"
echo "Progress: ${UPGRADED}/${TOTAL} nodes upgraded"
```

## Common Warning Signs During Upgrades

Watch for these indicators that something might be going wrong:

- A node has been in NotReady state for more than 10 minutes after reboot
- etcd reports fewer members than expected
- System services are repeatedly restarting (CrashLoop equivalent at the OS level)
- Kubernetes pods on other nodes are failing due to the upgrade
- The API server becomes unreachable

If you see any of these, investigate immediately rather than continuing with additional node upgrades.

## Summary

Monitoring Talos Linux upgrades effectively requires using both `talosctl` and `kubectl` in parallel. Watch system events and logs with talosctl for the OS-level view, monitor node status and pod movements with kubectl for the Kubernetes-level view, and keep a close eye on etcd health during control plane upgrades. With the right monitoring in place, you can confidently track each upgrade step and catch problems before they cascade.
