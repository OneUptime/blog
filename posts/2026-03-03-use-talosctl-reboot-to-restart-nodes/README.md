# How to Use talosctl reboot to Restart Nodes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Talosctl, Node Management, Kubernetes, Infrastructure

Description: Learn how to use the talosctl reboot command to safely restart Talos Linux nodes with practical examples and best practices

---

Restarting nodes is one of the most common tasks you will perform when managing a Talos Linux cluster. Whether you are applying configuration changes, troubleshooting issues, or performing routine maintenance, the `talosctl reboot` command is your go-to tool for safely restarting nodes. This guide walks through everything you need to know about using this command effectively.

## Understanding talosctl reboot

The `talosctl reboot` command sends a reboot request to one or more Talos Linux nodes through the Talos API. Unlike traditional Linux distributions where you might SSH into a machine and run `reboot`, Talos Linux is an API-driven operating system. All management operations, including reboots, go through the `talosctl` CLI.

When you issue a reboot command, Talos Linux performs a graceful shutdown sequence. It stops all running services, drains the node from the Kubernetes cluster (if applicable), and then restarts the machine. This ensures minimal disruption to your workloads.

## Basic Usage

The simplest way to reboot a node is to target it directly by its IP address or hostname:

```bash
# Reboot a single node by IP address
talosctl reboot --nodes 192.168.1.10
```

If you have already set your target node in the talosctl configuration, you can simply run:

```bash
# Reboot the currently configured node
talosctl reboot
```

You can also reboot multiple nodes at once by passing a comma-separated list:

```bash
# Reboot multiple nodes simultaneously
talosctl reboot --nodes 192.168.1.10,192.168.1.11,192.168.1.12
```

## Checking Node Status Before Rebooting

Before you reboot a node, it is a good idea to check its current status. This helps you understand what workloads are running and whether the node is healthy:

```bash
# Check the current status of the node
talosctl health --nodes 192.168.1.10

# List services running on the node
talosctl services --nodes 192.168.1.10

# Check what pods are running on this node via kubectl
kubectl get pods --field-selector spec.nodeName=worker-1 -A
```

Gathering this information beforehand gives you confidence that you understand the impact of the reboot on your cluster.

## Rebooting Control Plane Nodes

Control plane nodes require extra caution. Since they run the Kubernetes API server, etcd, and other critical components, rebooting them can temporarily reduce the availability of your control plane.

```bash
# Reboot a control plane node
talosctl reboot --nodes 192.168.1.10
```

Here are some important things to keep in mind when rebooting control plane nodes:

1. Never reboot all control plane nodes at the same time. Reboot them one at a time and wait for each node to fully rejoin the cluster before moving to the next.
2. Verify etcd health before and after each reboot to make sure quorum is maintained.
3. If you have a three-node control plane, you can safely reboot one node at a time while maintaining quorum.

```bash
# Check etcd member health before rebooting
talosctl etcd members --nodes 192.168.1.10

# Reboot first control plane node
talosctl reboot --nodes 192.168.1.10

# Wait for the node to come back and verify health
talosctl health --nodes 192.168.1.10

# Then proceed to the next node
talosctl reboot --nodes 192.168.1.11
```

## Rebooting Worker Nodes

Worker nodes are generally safer to reboot since they do not run control plane components. However, you should still consider the workloads running on them:

```bash
# Optionally drain the node first via kubectl
kubectl drain worker-2 --ignore-daemonsets --delete-emptydir-data

# Then reboot the node
talosctl reboot --nodes 192.168.1.20

# Once the node is back, uncordon it
kubectl uncordon worker-2
```

While Talos handles draining internally during the reboot process, manually draining the node beforehand gives you more control over workload migration. This is especially useful if you have pods with long graceful shutdown periods.

## Using the Reboot Mode Flag

The `talosctl reboot` command supports a `--mode` flag that lets you control how the reboot is performed:

```bash
# Default mode - graceful reboot
talosctl reboot --nodes 192.168.1.10 --mode default

# Powercycle mode - equivalent to a hard reset
talosctl reboot --nodes 192.168.1.10 --mode powercycle
```

The default mode performs a graceful reboot, which is what you want in most cases. The powercycle mode is more aggressive and simulates a physical power cycle. Use powercycle only when a node is stuck and a graceful reboot is not working.

## Waiting for the Node to Come Back

After issuing a reboot, you will want to wait for the node to come back online. You can do this by polling the node's health:

```bash
# Reboot the node
talosctl reboot --nodes 192.168.1.10

# Wait a moment for the reboot to begin, then check health
# The command will hang until the node responds
talosctl health --nodes 192.168.1.10 --wait-timeout 5m
```

You can also watch the node's status from the Kubernetes side:

```bash
# Watch node status in Kubernetes
kubectl get nodes -w
```

## Scripting Reboots Across a Cluster

If you need to perform a rolling reboot across your entire cluster, you can script it:

```bash
#!/bin/bash
# Rolling reboot script for Talos Linux cluster

CONTROL_PLANE_NODES="192.168.1.10 192.168.1.11 192.168.1.12"
WORKER_NODES="192.168.1.20 192.168.1.21 192.168.1.22 192.168.1.23"

echo "Starting rolling reboot of control plane nodes..."
for node in $CONTROL_PLANE_NODES; do
  echo "Rebooting control plane node: $node"
  talosctl reboot --nodes "$node"

  echo "Waiting for node to come back..."
  sleep 30
  talosctl health --nodes "$node" --wait-timeout 5m

  echo "Node $node is back. Waiting 60 seconds before next reboot..."
  sleep 60
done

echo "Starting rolling reboot of worker nodes..."
for node in $WORKER_NODES; do
  echo "Rebooting worker node: $node"
  talosctl reboot --nodes "$node"

  echo "Waiting for node to come back..."
  sleep 30
  talosctl health --nodes "$node" --wait-timeout 5m

  echo "Node $node is back. Moving to next node..."
  sleep 30
done

echo "Rolling reboot complete."
```

This script reboots each node one at a time and waits for it to become healthy before proceeding to the next one. Control plane nodes get a longer wait between reboots to ensure stability.

## Troubleshooting Reboot Issues

Sometimes a node might not respond to a reboot command. Here are some common issues and how to handle them:

If the node is unresponsive to the API, try the powercycle mode:

```bash
# Force a powercycle if graceful reboot hangs
talosctl reboot --nodes 192.168.1.10 --mode powercycle
```

If even that does not work, you may need to physically power cycle the machine or use an out-of-band management interface like IPMI or iLO.

Check the node logs before and after rebooting to identify any issues:

```bash
# View recent logs from the node
talosctl logs machined --nodes 192.168.1.10
```

## Best Practices

When working with `talosctl reboot`, keep these best practices in mind:

- Always reboot nodes one at a time in production environments.
- Check etcd health before rebooting control plane nodes.
- Use the default graceful reboot mode unless the node is stuck.
- Monitor your cluster health throughout the reboot process.
- Have a rollback plan ready in case something goes wrong after the reboot.
- Consider draining worker nodes before rebooting them if you have sensitive workloads.

The `talosctl reboot` command is straightforward but powerful. By following these practices and understanding the different options available, you can safely restart your Talos Linux nodes with confidence.
