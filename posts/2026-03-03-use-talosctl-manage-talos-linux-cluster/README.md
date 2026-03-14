# How to Use talosctl to Manage Your Talos Linux Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Talosctl, Cluster Management, CLI, DevOps

Description: A comprehensive guide to using talosctl for day-to-day management of your Talos Linux Kubernetes cluster.

---

Since Talos Linux has no shell, no SSH, and no traditional system tools, `talosctl` is your only interface for managing the operating system layer. It handles everything from viewing logs to upgrading nodes to checking hardware information. Knowing your way around talosctl is essential for anyone running Talos Linux.

This guide covers the most important talosctl commands for daily cluster management.

## How talosctl Works

talosctl communicates with the Talos API that runs on every Talos Linux node. The API listens on port 50000 by default and uses mutual TLS for authentication. Your `talosconfig` file contains the necessary certificates and endpoint information.

```bash
# Set the talosconfig (do this in your shell profile)
export TALOSCONFIG="$HOME/.talos/config"
```

Every talosctl command needs to know which node(s) to talk to. You can specify this per-command with `--nodes` or set a default in your config.

## Configuring Defaults

Instead of passing `--nodes` on every command, configure defaults:

```bash
# Set the default endpoint(s) - these are the addresses talosctl connects through
talosctl config endpoint 192.168.1.101 192.168.1.102 192.168.1.103

# Set the default node(s) - these are the nodes commands are executed against
talosctl config node 192.168.1.101

# View your current configuration
talosctl config info
```

## Checking Cluster Health

The most important command for daily operations:

```bash
# Quick health check
talosctl health

# Health check with a specific timeout
talosctl health --wait-timeout 5m

# Check health across all control plane nodes
talosctl health --nodes 192.168.1.101,192.168.1.102,192.168.1.103
```

The health command verifies etcd health, Kubernetes API availability, node readiness, and core component status.

## Viewing Services

Every Talos node runs a set of system services. View their status:

```bash
# List all services on a node
talosctl services --nodes 192.168.1.101

# Output shows service name, state, health, and last event
# SERVICE      STATE     HEALTH   LAST EVENT
# apid         Running   OK       Started
# containerd   Running   OK       Started
# cri          Running   OK       Started
# etcd         Running   OK       Started
# kubelet      Running   OK       Started
# machined     Running   OK       Started
# trustd       Running   OK       Started
```

If a service shows an unhealthy state, dig deeper with logs.

## Reading Logs

Logs are one of the most frequently used features:

```bash
# View logs for a specific service
talosctl logs kubelet --nodes 192.168.1.101

# Follow logs in real-time (like tail -f)
talosctl logs kubelet --nodes 192.168.1.101 --follow

# View etcd logs
talosctl logs etcd --nodes 192.168.1.101

# View logs for the API server
talosctl logs kube-apiserver --nodes 192.168.1.101

# View kernel messages (like dmesg)
talosctl dmesg --nodes 192.168.1.101

# Follow kernel messages
talosctl dmesg --nodes 192.168.1.101 --follow
```

## Node Information

Get detailed information about nodes:

```bash
# View system information (CPU, memory, etc.)
talosctl get members

# Check the Talos version running on a node
talosctl version --nodes 192.168.1.101

# View CPU and memory info
talosctl get cpuinfo --nodes 192.168.1.101
talosctl get memoryinfo --nodes 192.168.1.101

# List network interfaces
talosctl get addresses --nodes 192.168.1.101

# List routes
talosctl get routes --nodes 192.168.1.101

# List disks
talosctl disks --nodes 192.168.1.101

# Check system time
talosctl time --nodes 192.168.1.101
```

## Managing etcd

For control plane nodes, etcd management is critical:

```bash
# View etcd cluster members
talosctl etcd members --nodes 192.168.1.101

# Check etcd status
talosctl etcd status --nodes 192.168.1.101

# Take an etcd snapshot (backup)
talosctl etcd snapshot ./etcd-backup.snapshot --nodes 192.168.1.101

# View etcd alarms
talosctl etcd alarm list --nodes 192.168.1.101

# Remove a failed etcd member
talosctl etcd remove-member <member-id> --nodes 192.168.1.101
```

Regular etcd snapshots are critical for disaster recovery. Automate them with a cron job or Kubernetes CronJob.

## Upgrading Talos

Upgrading Talos Linux on a node is done through talosctl:

```bash
# Upgrade a node to a new Talos version
talosctl upgrade --nodes 192.168.1.101 \
  --image ghcr.io/siderolabs/installer:v1.9.0

# Check the upgrade progress
talosctl services --nodes 192.168.1.101

# Upgrade with a custom image from Image Factory
talosctl upgrade --nodes 192.168.1.101 \
  --image factory.talos.dev/installer/<schematic-id>:v1.9.0
```

The upgrade process:

1. Downloads the new Talos image
2. Writes it to the boot partition
3. Reboots the node
4. The node comes back up running the new version

For control plane nodes, upgrade one at a time and wait for the node to rejoin the cluster before upgrading the next one.

## Resetting a Node

If you need to wipe a node and start fresh:

```bash
# Graceful reset (drains workloads first)
talosctl reset --nodes 192.168.1.101

# Forceful reset (immediate, no draining)
talosctl reset --nodes 192.168.1.101 --graceful=false

# Reset and re-enter maintenance mode
talosctl reset --nodes 192.168.1.101 --reboot
```

Resetting a node removes its configuration and data. The node goes back to maintenance mode (if rebooted) or shuts down.

## Running Commands Across Multiple Nodes

Many talosctl commands accept multiple nodes:

```bash
# Check services on all control plane nodes
talosctl services --nodes 192.168.1.101,192.168.1.102,192.168.1.103

# View version on all nodes
talosctl version --nodes 192.168.1.101,192.168.1.102,192.168.1.103

# Check time synchronization across nodes
talosctl time --nodes 192.168.1.101,192.168.1.102,192.168.1.103
```

The output is grouped by node, so you can see the results from each one.

## Machine Configuration Operations

Manage the running configuration:

```bash
# View the current machine configuration
talosctl get machineconfig --nodes 192.168.1.101 -o yaml

# Apply a new configuration
talosctl apply-config --nodes 192.168.1.101 --file controlplane.yaml

# Patch the configuration
talosctl patch machineconfig --nodes 192.168.1.101 \
  --patch @my-patch.yaml

# Validate a configuration file
talosctl validate --config controlplane.yaml --mode metal
```

## Dashboard Mode

talosctl has a built-in terminal dashboard that shows real-time information:

```bash
# Open the dashboard for a node
talosctl dashboard --nodes 192.168.1.101
```

The dashboard shows CPU usage, memory usage, running processes, and logs in a terminal UI. It refreshes automatically, giving you a live view of what is happening on the node. Press `q` to exit.

## Container and Process Information

Even though you cannot shell into a Talos node, you can inspect running processes and containers:

```bash
# List running containers
talosctl containers --nodes 192.168.1.101

# List containers in the Kubernetes namespace
talosctl containers --nodes 192.168.1.101 -k

# List running processes
talosctl processes --nodes 192.168.1.101
```

## Useful One-Liners

Here are some practical command combinations for daily operations:

```bash
# Quick cluster overview
talosctl health && kubectl get nodes && kubectl get pods -A | grep -v Running

# Check disk usage across all nodes
talosctl disks --nodes 192.168.1.101,192.168.1.102,192.168.1.103

# Find which node is holding the VIP
talosctl get addresses --nodes 192.168.1.101,192.168.1.102,192.168.1.103 | grep "192.168.1.100"

# Check if NTP is synchronized
talosctl time --nodes 192.168.1.101,192.168.1.102,192.168.1.103
```

talosctl is a powerful tool that replaces an entire stack of traditional Linux system administration commands. The learning curve is worth it because every operation is consistent, API-driven, and auditable. Once you are comfortable with these commands, managing a Talos Linux cluster becomes straightforward and predictable.
