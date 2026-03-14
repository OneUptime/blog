# How to Use talosctl dashboard for Real-Time Monitoring

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Real-Time Monitoring, Talosctl, Dashboard

Description: Explore how to use the talosctl dashboard for real-time monitoring of Talos Linux nodes with live CPU, memory, and process views.

---

Monitoring your Talos Linux nodes does not require setting up Prometheus, Grafana, or any other external tool. The `talosctl dashboard` command provides instant, real-time visibility into node performance directly in your terminal. This built-in terminal user interface (TUI) shows live CPU usage, memory consumption, processes, and system status. It is the quickest way to understand what is happening on your nodes right now.

## Getting Started

Open the dashboard for any node in your cluster:

```bash
# Launch the dashboard for a specific node
talosctl dashboard --nodes <node-ip>
```

The terminal transforms into a multi-panel view showing system metrics. Everything updates in real time, giving you a live picture of node activity.

## Understanding the Dashboard Panels

The dashboard is divided into several information panels, each showing different aspects of the node's state.

### The Summary Panel

The top of the dashboard shows basic node information:

- Node hostname and IP addresses
- Talos version installed on the node
- Kubernetes version running
- Machine type (control plane or worker)
- System uptime

This gives you immediate context about which node you are looking at and what role it plays in the cluster.

### The CPU Panel

The CPU section shows real-time utilization:

```text
CPU: [||||||||                  ] 32%
  user:   25%
  system:  7%
  idle:   68%
```

You can see:

- Total CPU utilization as a percentage and visual bar
- Breakdown between user space, system (kernel) space, and idle time
- Per-CPU core utilization when available

High system CPU might indicate I/O bottlenecks or excessive context switching. High user CPU is usually your application workloads consuming resources.

### The Memory Panel

Memory usage shows:

```text
Memory: [||||||||||||||          ] 55%
  Total:     32.0 GB
  Used:      17.6 GB
  Cached:     8.2 GB
  Available: 14.4 GB
```

Key metrics:

- **Total** - Physical memory installed
- **Used** - Memory actively in use
- **Cached** - Memory used for disk caching (can be reclaimed)
- **Available** - Memory available for new allocations (includes cache that can be freed)

The "Available" number is what matters most. If it drops very low, the OOM killer may start terminating processes.

### The Processes Panel

The bottom section lists running processes sorted by resource usage:

```text
PID    CPU%   MEM%   COMMAND
1234   15.2   8.4    kube-apiserver
2345    8.7   3.2    etcd
3456    5.1   2.1    kubelet
4567    3.4   1.8    containerd
...
```

This shows you exactly what is consuming resources. In Talos Linux, the main processes you will see are:

- Kubernetes components (API server, etcd, kubelet, controller-manager, scheduler)
- Container runtime (containerd)
- Talos system services (machined, apid, trustd)
- Application containers running as part of your workloads

## Monitoring Multiple Nodes

To monitor several nodes, specify their IPs:

```bash
# Monitor three nodes
talosctl dashboard --nodes 10.0.0.1,10.0.0.2,10.0.0.3
```

The dashboard displays one node at a time. Use keyboard shortcuts to switch between them:

- **Tab** or **Right Arrow** to see the next node
- **Shift+Tab** or **Left Arrow** to see the previous node

This makes it easy to quickly compare resource usage across nodes.

## Keyboard Controls

The dashboard responds to several keyboard shortcuts:

| Key | Action |
|-----|--------|
| Tab | Switch to next node |
| Shift+Tab | Switch to previous node |
| Right Arrow | Switch to next node |
| Left Arrow | Switch to previous node |
| q | Quit the dashboard |

## Real-Time Monitoring Scenarios

### Monitoring During a Deployment

When deploying a large application, watch the worker nodes for resource spikes:

```bash
# Open dashboard on a worker node
talosctl dashboard --nodes <worker-ip>
```

In another terminal, apply the deployment:

```bash
kubectl apply -f my-deployment.yaml
```

Watch the dashboard for:

- CPU spikes as containers start and initialize
- Memory climbing as pods allocate resources
- New processes appearing in the process list

### Watching an Upgrade in Progress

During a Talos upgrade, the dashboard shows services stopping and restarting:

```bash
# Monitor the node being upgraded
talosctl dashboard --nodes <node-ip>
```

You will see:

- Services stop one by one
- CPU and memory usage change as processes terminate and restart
- The node briefly disconnect (during reboot) and then come back with new versions

### Investigating Slow Performance

If users report slow application responses:

```bash
# Check the node running the slow application
talosctl dashboard --nodes <node-ip>
```

Look for:

- CPU near 100% (compute bottleneck)
- Available memory near zero (memory pressure)
- A single process consuming excessive resources (runaway container)
- etcd consuming too much CPU (cluster state issues)

### Capacity Planning

Check all nodes to understand current resource utilization:

```bash
# Cycle through all nodes
talosctl dashboard --nodes <node-1>,<node-2>,<node-3>,<node-4>,<node-5>
```

Note the average utilization. If most nodes are above 70% CPU or memory, it is time to consider adding more capacity.

## Dashboard Limitations

The talosctl dashboard is designed for quick, interactive monitoring. It has some limitations compared to a full monitoring stack:

- **No historical data** - It only shows current values, not trends over time
- **No alerting** - It cannot notify you when thresholds are exceeded
- **Single node view** - You see one node at a time (though you can switch quickly)
- **No custom metrics** - It shows OS-level metrics, not application metrics
- **Terminal-based** - It requires a terminal connection to use

For these reasons, it is best used alongside (not instead of) a proper monitoring stack like Prometheus and Grafana.

## Comparing Dashboard with Other Tools

### vs. kubectl top

`kubectl top` shows Kubernetes-level resource usage:

```bash
# Kubernetes resource view
kubectl top nodes
kubectl top pods --all-namespaces --sort-by=cpu
```

The dashboard shows OS-level details that kubectl top does not, including system processes, cache usage, and per-CPU breakdown.

### vs. Node Exporter + Prometheus

Node Exporter provides the same metrics (and more) to Prometheus, but requires setup:

```bash
# You need to deploy node-exporter, configure Prometheus scraping,
# set up Grafana dashboards, etc.
```

The talosctl dashboard requires zero setup. It is always available if you have talosctl configured.

### vs. talosctl services

`talosctl services` gives a static snapshot of service status:

```bash
talosctl services --nodes <node-ip>
```

The dashboard provides the same service visibility plus live resource metrics, all in a continuously updating view.

## Tips for Effective Dashboard Use

### Terminal Size

The dashboard works best in a large terminal window. Expand your terminal to at least 120 columns wide and 40 rows tall for the best experience. A small terminal may truncate some panels.

### Remote Monitoring

The dashboard works over the network, so you can monitor remote nodes from your workstation:

```bash
# Monitor a cloud-hosted node from your laptop
talosctl dashboard --nodes <cloud-node-public-ip>
```

Just make sure port 50000 is accessible and your talosconfig has valid credentials.

### Split Terminal Workflow

A productive monitoring setup uses multiple terminal panes:

- Pane 1: `talosctl dashboard` for real-time metrics
- Pane 2: `talosctl logs <service> --follow` for live logs
- Pane 3: `kubectl` for Kubernetes-level operations

This gives you simultaneous visibility into metrics, logs, and cluster state.

### Recording Sessions

If you need to capture dashboard output for later analysis, use a terminal recording tool:

```bash
# Using script to record terminal output
script -q dashboard-recording.txt
talosctl dashboard --nodes <node-ip>
# Press q to quit dashboard, then exit to stop recording
exit
```

## Quick Health Assessment

Use the dashboard for a quick visual health check during your daily operations. Open it, cycle through your nodes, and look for anything unusual:

- Is any node's CPU consistently above 80%?
- Is any node running low on available memory?
- Are there unexpected processes consuming resources?
- Is etcd using significantly more resources than usual?

This takes about 30 seconds per node and catches many issues before they become problems.

## Conclusion

The `talosctl dashboard` command delivers instant, real-time monitoring without any infrastructure setup. It is the fastest way to check node health, investigate performance issues, and watch operations in progress. While it does not replace a full monitoring stack, it perfectly fills the gap for quick diagnostics and interactive troubleshooting. Make it part of your regular workflow, especially during deployments, upgrades, and incident response, and you will catch issues faster and understand your cluster better.
