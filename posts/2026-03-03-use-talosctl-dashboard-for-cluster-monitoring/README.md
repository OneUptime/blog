# How to Use talosctl dashboard for Cluster Monitoring

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Monitoring, talosctl, Dashboards

Description: Explore the talosctl dashboard command for real-time monitoring of Talos Linux nodes including CPU, memory, and service status.

---

Managing a Talos Linux cluster through the command line does not mean you are limited to raw text output. The `talosctl dashboard` command provides a terminal-based graphical interface that displays real-time system information about your nodes. It is like having htop for your entire Talos Linux cluster, showing CPU usage, memory consumption, running services, and more in a single view.

## What Is the talosctl Dashboard?

The talosctl dashboard is a TUI (Terminal User Interface) built into the talosctl binary. When you run it, it opens a real-time monitoring view directly in your terminal. There is nothing to install beyond talosctl itself, no separate monitoring stack, no web server, no database.

It connects to one or more Talos nodes via the Talos API and streams system metrics in real time. The dashboard refreshes automatically, giving you a live view of what is happening across your cluster.

## Launching the Dashboard

```bash
# Open the dashboard for a single node
talosctl dashboard --nodes <node-ip>
```

The dashboard opens immediately in your terminal window. You will see panels for system summary, CPU usage, memory usage, and running processes.

## Dashboard Layout

The dashboard is organized into several sections:

### System Summary Panel

The top section shows basic system information:

- Hostname and IP addresses
- Talos version
- Kubernetes version
- Uptime
- Machine type (controlplane or worker)

### CPU Panel

Shows real-time CPU utilization broken down by:

- User time
- System time
- Idle time
- Number of CPU cores

The display updates in real time, so you can see CPU spikes as they happen.

### Memory Panel

Displays memory usage including:

- Total memory
- Used memory
- Cached memory
- Available memory

This is useful for spotting memory leaks or pods consuming more resources than expected.

### Processes Panel

Lists running processes with their CPU and memory usage, similar to the `top` command on a traditional Linux system. Since Talos Linux is minimal and does not allow shell access, this is your window into what processes are actually running on the node.

## Monitoring Multiple Nodes

You can monitor several nodes at once by specifying multiple IPs:

```bash
# Monitor multiple nodes simultaneously
talosctl dashboard --nodes 10.0.0.1,10.0.0.2,10.0.0.3
```

When monitoring multiple nodes, you can switch between them using keyboard shortcuts. The dashboard shows one node at a time but lets you cycle through them quickly.

## Keyboard Navigation

The dashboard supports keyboard shortcuts for navigation:

- **Tab** or **Right Arrow** - Switch to the next node
- **Shift+Tab** or **Left Arrow** - Switch to the previous node
- **q** - Quit the dashboard

These shortcuts make it easy to flip between nodes and compare their resource usage.

## Practical Use Cases

### Investigating High CPU Usage

If alerts tell you a node has high CPU usage, open the dashboard to see what is consuming resources:

```bash
# Check the node with reported high CPU
talosctl dashboard --nodes <problem-node-ip>
```

The CPU panel will show the current utilization, and the processes panel will show which processes are responsible. In Talos Linux, the main resource consumers are typically:

- kubelet
- containerd
- etcd (on control plane nodes)
- kube-apiserver (on control plane nodes)
- Your application containers

### Monitoring During Upgrades

During a Talos upgrade, the dashboard lets you watch the process in real time:

```bash
# Open dashboard on the node being upgraded
talosctl dashboard --nodes <node-ip>
```

You can see services restart, resource usage change, and the node come back online. This is much more informative than just waiting for the upgrade command to complete.

### Capacity Planning

Open the dashboard for each node in your cluster and note the resource usage:

```bash
# Check resource usage across all workers
talosctl dashboard --nodes <worker-1>,<worker-2>,<worker-3>
```

If most nodes are running at 80% memory utilization, you know it is time to add capacity. If they are at 20%, you might consider scaling down.

### Debugging Boot Issues

If a node is not joining the cluster properly, the dashboard can show what is happening at the system level:

```bash
# Check what the node is doing during boot
talosctl dashboard --nodes <new-node-ip>
```

You can see services starting up, watch for error states, and identify which component is blocking progress.

## Dashboard vs. Other Monitoring Options

### Dashboard vs. kubectl top

`kubectl top` shows Kubernetes-level resource usage for pods and nodes. The talosctl dashboard shows OS-level resource usage. Both are useful:

```bash
# Kubernetes-level view
kubectl top nodes
kubectl top pods --all-namespaces

# OS-level view
talosctl dashboard --nodes <node-ip>
```

The dashboard gives you more detail about what is happening on the bare metal or VM, while `kubectl top` focuses on Kubernetes resource requests and usage.

### Dashboard vs. Prometheus/Grafana

For production monitoring, you should use Prometheus and Grafana (or similar tools) because they provide:

- Historical data
- Alerting
- Multi-node aggregate views
- Custom dashboards

The talosctl dashboard is best for:

- Quick troubleshooting sessions
- Real-time observation during operations
- Environments where a full monitoring stack is not yet deployed

### Dashboard vs. talosctl services

The `talosctl services` command shows service status in a simple text format:

```bash
# Text-based service listing
talosctl services --nodes <node-ip>
```

The dashboard provides the same information plus resource metrics, all in a continuously updating view.

## Running the Dashboard Remotely

The talosctl dashboard connects over the network using the Talos API. This means you can run it from anywhere that has network access to your Talos nodes:

```bash
# Connect from your workstation to remote nodes
talosctl dashboard --nodes <remote-node-ip> --talosconfig /path/to/talosconfig
```

Make sure your talosconfig file contains the correct endpoints and credentials for the target cluster.

## Resource Overhead

The dashboard itself adds minimal overhead to the monitored nodes. It uses the existing Talos API streaming endpoints, so it is essentially just reading metrics that are already being collected. You do not need to worry about the dashboard impacting node performance.

The only consideration is network bandwidth. If you are monitoring many nodes over a slow connection, the streaming updates might consume noticeable bandwidth.

## Terminal Requirements

The dashboard works best in a terminal with:

- Support for ANSI colors
- A minimum width of 80 columns and 24 rows
- A modern terminal emulator (iTerm2, GNOME Terminal, Windows Terminal, etc.)

If your terminal is too small, the dashboard may truncate some panels. Resize your terminal window to see the full display.

## Conclusion

The `talosctl dashboard` command is a powerful, zero-setup monitoring tool for Talos Linux clusters. It gives you real-time visibility into CPU usage, memory consumption, and running processes on any node in your cluster. While it does not replace a full monitoring stack for production use, it is invaluable for quick troubleshooting, real-time observation during operations, and getting a feel for how your nodes are performing. The keyboard navigation makes it easy to switch between nodes, and the fact that it is built into talosctl means it is always available when you need it.
