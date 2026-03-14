# How to Use talosctl shutdown to Power Off Nodes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Talosctl, Node Management, Kubernetes, Infrastructure

Description: Learn how to use the talosctl shutdown command to gracefully power off Talos Linux nodes for maintenance and decommissioning

---

Powering off a node is something you will need to do from time to time when managing a Talos Linux cluster. Hardware maintenance, datacenter moves, decommissioning old machines, or simply reducing costs by shutting down idle capacity are all valid reasons. The `talosctl shutdown` command gives you a clean, API-driven way to power off nodes without needing SSH access or physical console access.

## What talosctl shutdown Does

When you run `talosctl shutdown`, the command sends a shutdown request through the Talos API to the target node. Talos then performs a graceful shutdown sequence: it stops Kubernetes workloads, shuts down system services in the correct order, unmounts filesystems, and finally powers off the machine. This is very different from just pulling the power cable. The graceful process ensures data integrity and gives workloads time to terminate properly.

One important thing to understand is that after the node is powered off, it will not come back on its own unless you have Wake-on-LAN configured or use an out-of-band management tool like IPMI. You will need to physically power the machine back on or use a remote management interface.

## Basic Usage

The most straightforward way to shut down a node is:

```bash
# Shut down a single node
talosctl shutdown --nodes 192.168.1.20
```

If your talosctl configuration already has the target node set, you can skip the `--nodes` flag:

```bash
# Shut down the currently configured node
talosctl shutdown
```

To shut down multiple nodes at once:

```bash
# Shut down multiple worker nodes
talosctl shutdown --nodes 192.168.1.20,192.168.1.21,192.168.1.22
```

Keep in mind that shutting down multiple nodes simultaneously can be disruptive. Make sure you understand the impact on your workloads before doing this.

## Pre-Shutdown Checks

Before powering off a node, run through a series of checks to make sure you are not going to cause problems for your cluster:

```bash
# Check what is running on the node
talosctl services --nodes 192.168.1.20

# List containers on the node
talosctl containers --nodes 192.168.1.20

# Check Kubernetes pods on this node
kubectl get pods --field-selector spec.nodeName=worker-3 -A

# Verify cluster health
talosctl health --nodes 192.168.1.10
```

These checks tell you exactly what will be affected when the node goes down. If you see critical workloads that cannot tolerate disruption, you should drain the node first.

## Draining Before Shutdown

While Talos handles graceful termination of workloads during shutdown, it is good practice to drain the node from Kubernetes first. This gives the scheduler time to move pods to other nodes:

```bash
# Drain the node from Kubernetes
kubectl drain worker-3 --ignore-daemonsets --delete-emptydir-data --grace-period=120

# Verify pods have been rescheduled
kubectl get pods -A -o wide | grep worker-3

# Now shut down the node
talosctl shutdown --nodes 192.168.1.20
```

The `--grace-period` flag gives your pods additional time to shut down cleanly. Adjust this based on how long your applications need to finish in-flight requests and save state.

## Shutting Down Worker Nodes

Worker nodes are the safest to shut down since they do not run control plane components. However, you still need to consider:

- Pod disruption budgets that might prevent draining
- Persistent volumes that are local to the node
- DaemonSet pods that will not be rescheduled

```bash
# Check if any persistent volumes are bound to this node
kubectl get pv -o json | jq '.items[] | select(.spec.nodeAffinity != null) | .metadata.name'

# Drain and shut down
kubectl drain worker-3 --ignore-daemonsets --delete-emptydir-data
talosctl shutdown --nodes 192.168.1.20
```

If you have local persistent volumes on the node, make sure the data is backed up or replicated before shutting down.

## Shutting Down Control Plane Nodes

Shutting down control plane nodes requires more caution. Each control plane node runs an etcd member, and losing too many etcd members at once will break your cluster. For a three-node control plane, you can safely shut down one node at a time while maintaining quorum.

```bash
# Verify etcd health and member count
talosctl etcd members --nodes 192.168.1.10

# Check that all etcd members are healthy
talosctl etcd status --nodes 192.168.1.10
```

If you need to shut down a control plane node for extended maintenance:

```bash
# First remove the etcd member if the node will be down for a long time
talosctl etcd remove-member --nodes 192.168.1.10 <member-id>

# Then shut down the node
talosctl shutdown --nodes 192.168.1.11
```

Removing the etcd member before shutdown prevents etcd from trying to replicate data to a node that is not there. When the node comes back, you will need to re-add it to etcd.

## Using the Force Flag

In some situations, you might need to force a shutdown even if the graceful process is not completing:

```bash
# Force shutdown when graceful shutdown hangs
talosctl shutdown --nodes 192.168.1.20 --force
```

The force flag tells Talos to skip some of the graceful shutdown steps and power off more quickly. Use this only when the node is stuck and a normal shutdown is not working. You risk data corruption if processes do not get a chance to flush their buffers.

## Scripting Bulk Shutdowns

If you need to shut down an entire cluster (for example, for a datacenter power maintenance window), you can script the process:

```bash
#!/bin/bash
# Script to gracefully shut down an entire Talos Linux cluster

WORKER_NODES="192.168.1.20 192.168.1.21 192.168.1.22 192.168.1.23"
CONTROL_PLANE_NODES="192.168.1.12 192.168.1.11 192.168.1.10"

echo "Phase 1: Draining and shutting down worker nodes..."
for node in $WORKER_NODES; do
  echo "Shutting down worker: $node"
  talosctl shutdown --nodes "$node"
  sleep 10
done

echo "Waiting 60 seconds for workers to power off..."
sleep 60

echo "Phase 2: Shutting down control plane nodes..."
# Shut down non-leader control plane nodes first
for node in $CONTROL_PLANE_NODES; do
  echo "Shutting down control plane node: $node"
  talosctl shutdown --nodes "$node"
  sleep 15
done

echo "Cluster shutdown complete."
```

Notice that worker nodes are shut down before control plane nodes. This ensures workloads are stopped before the control plane goes away. The last control plane node to shut down should be the etcd leader if possible.

## Verifying the Node Is Off

After issuing the shutdown command, you can verify the node is actually powered off by trying to reach it:

```bash
# This should fail if the node is off
talosctl version --nodes 192.168.1.20

# Or simply ping the node
ping -c 3 192.168.1.20
```

If the node does not respond, it has successfully shut down. If it still responds after a reasonable wait time, something may have prevented the shutdown.

## Powering Nodes Back On

Since `talosctl` cannot start a powered-off machine, you will need another method to bring nodes back online:

- Physical power button
- IPMI/iLO/iDRAC remote management
- Wake-on-LAN
- Cloud provider API (for virtual machines)

```bash
# Example: Using ipmitool to power on a node
ipmitool -I lanplus -H 192.168.1.120 -U admin -P password chassis power on

# Example: Wake-on-LAN
wakeonlan aa:bb:cc:dd:ee:ff
```

## Best Practices

Here are some tips for using `talosctl shutdown` effectively:

- Always drain Kubernetes workloads before shutting down a node.
- Never shut down more than one control plane node at a time in a production cluster.
- Document the startup order for your cluster so you know how to bring things back up.
- Test your shutdown and startup procedures in a staging environment first.
- Keep your out-of-band management credentials in a secure but accessible location.
- Use monitoring to verify that nodes have actually powered off.

The `talosctl shutdown` command is simple to use but has significant implications for your cluster. Plan your shutdowns carefully, and always verify that your cluster is healthy both before and after taking nodes offline.
