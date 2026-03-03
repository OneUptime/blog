# How to View Service Logs with talosctl logs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, talosctl, Service Logs, Debugging, Kubernetes

Description: A complete guide to viewing and managing Talos Linux service logs using the talosctl logs command.

---

Talos Linux runs a set of system services that manage everything from the Kubernetes control plane to networking and storage. Unlike traditional Linux where you would use `journalctl` or read log files, Talos exposes service logs through its API. The `talosctl logs` command is your primary tool for accessing these logs, and knowing how to use it effectively is essential for operating a Talos cluster.

This guide covers every aspect of using `talosctl logs` for day-to-day operations and troubleshooting.

## Understanding Talos Services

Before diving into log commands, it helps to know what services Talos runs. Each service produces its own log stream that you can query independently.

```bash
# List all services running on a Talos node
talosctl -n 192.168.1.10 services
```

You will see output similar to this:

```text
SERVICE       STATE     HEALTH   LAST CHANGE
apid          Running   OK       3h ago
containerd    Running   OK       3h ago
cri           Running   OK       3h ago
etcd          Running   OK       3h ago
kubelet       Running   OK       3h ago
machined      Running   OK       3h ago
trustd        Running   OK       3h ago
udevd         Running   OK       3h ago
```

On control plane nodes you will also see `etcd`. Worker nodes will have a smaller set of services. Each of these service names can be passed to `talosctl logs`.

## Basic Log Viewing

To view logs from a specific service, pass the service name as an argument:

```bash
# View kubelet logs on a specific node
talosctl -n 192.168.1.10 logs kubelet

# View etcd logs on a control plane node
talosctl -n 192.168.1.10 logs etcd

# View the machined service logs
talosctl -n 192.168.1.10 logs machined

# View containerd runtime logs
talosctl -n 192.168.1.10 logs containerd
```

The output streams the log content to your terminal, starting from the oldest available entry.

## Following Logs in Real Time

For real-time debugging, use the `-f` or `--follow` flag to stream new log entries as they appear:

```bash
# Follow kubelet logs in real time
talosctl -n 192.168.1.10 logs kubelet -f

# Follow etcd logs
talosctl -n 192.168.1.10 logs etcd --follow

# Follow apid logs to watch API activity
talosctl -n 192.168.1.10 logs apid -f
```

This is the equivalent of `tail -f` on a traditional system. Press Ctrl+C to stop following.

## Viewing Logs from Multiple Nodes

One of the powerful features of `talosctl` is the ability to query multiple nodes at once. When you specify multiple nodes, the output is interleaved and prefixed with the node address:

```bash
# View kubelet logs across all worker nodes
talosctl -n 192.168.1.20,192.168.1.21,192.168.1.22 logs kubelet

# Follow etcd logs on all control plane nodes
talosctl -n 192.168.1.10,192.168.1.11,192.168.1.12 logs etcd -f
```

This is extremely useful when you need to correlate events across nodes. For example, if a pod keeps getting rescheduled, you can watch kubelet logs on all nodes to see where it lands and why it might be failing.

## Controlling Log Output

You can control the amount of log output with the `--tail` flag:

```bash
# Show only the last 50 lines of kubelet logs
talosctl -n 192.168.1.10 logs kubelet --tail 50

# Show the last 100 lines of etcd logs
talosctl -n 192.168.1.10 logs etcd --tail 100

# Combine tail with follow to see recent logs then stream new ones
talosctl -n 192.168.1.10 logs kubelet --tail 20 -f
```

## Viewing Kubernetes Control Plane Logs

Talos runs Kubernetes control plane components as static pods, but you can view their logs through `talosctl` as well:

```bash
# View API server logs
talosctl -n 192.168.1.10 logs kube-apiserver

# View controller manager logs
talosctl -n 192.168.1.10 logs kube-controller-manager

# View scheduler logs
talosctl -n 192.168.1.10 logs kube-scheduler

# View kube-proxy logs (if using kube-proxy)
talosctl -n 192.168.1.10 logs kube-proxy
```

These are accessible through `talosctl` even though they technically run as containers. This is because Talos manages the control plane lifecycle directly rather than leaving it to kubelet alone.

## Piping and Filtering Log Output

Since `talosctl logs` outputs to stdout, you can use standard Unix tools to filter and process the output:

```bash
# Search for error messages in kubelet logs
talosctl -n 192.168.1.10 logs kubelet | grep -i error

# Find specific pod-related messages
talosctl -n 192.168.1.10 logs kubelet | grep "my-pod-name"

# Count occurrences of warnings
talosctl -n 192.168.1.10 logs kubelet | grep -c -i warning

# Extract timestamps and error messages
talosctl -n 192.168.1.10 logs kubelet | grep -i error | awk '{print $1, $2, $0}'
```

## Debugging Common Issues with Service Logs

### etcd Cluster Problems

When etcd is unhealthy, the cluster cannot function properly. Check etcd logs for leader election issues, disk performance warnings, and connection problems:

```bash
# Look for etcd leadership changes
talosctl -n 192.168.1.10 logs etcd | grep -i "leader\|election\|campaign"

# Check for slow disk warnings
talosctl -n 192.168.1.10 logs etcd | grep -i "slow\|took too long"

# Find connection errors between etcd members
talosctl -n 192.168.1.10 logs etcd | grep -i "unreachable\|connection refused"
```

### kubelet Issues

Kubelet problems often manifest as pods failing to start or nodes reporting NotReady:

```bash
# Check for image pull failures
talosctl -n 192.168.1.20 logs kubelet | grep -i "pull\|image"

# Look for resource pressure events
talosctl -n 192.168.1.20 logs kubelet | grep -i "eviction\|pressure\|insufficient"

# Find CNI-related errors
talosctl -n 192.168.1.20 logs kubelet | grep -i "cni\|network"
```

### API Server Issues

API server log entries help diagnose authentication, authorization, and admission control problems:

```bash
# Check for authentication failures
talosctl -n 192.168.1.10 logs kube-apiserver | grep -i "unauthorized\|forbidden"

# Look for admission webhook timeouts
talosctl -n 192.168.1.10 logs kube-apiserver | grep -i "webhook\|admission"

# Find certificate-related errors
talosctl -n 192.168.1.10 logs kube-apiserver | grep -i "certificate\|tls\|x509"
```

## Using JSON Output

For programmatic processing, you can request JSON-formatted output:

```bash
# Get logs in JSON format for parsing
talosctl -n 192.168.1.10 logs kubelet -o json

# Parse JSON logs with jq
talosctl -n 192.168.1.10 logs kubelet -o json | jq '.msg'

# Filter by log level using jq
talosctl -n 192.168.1.10 logs kubelet -o json | jq 'select(.level == "error")'
```

JSON output is particularly useful when you want to build scripts that automatically detect and report problems.

## Viewing Logs from the Talos Dashboard

Talos also provides a terminal-based dashboard that shows service status and logs in a visual interface:

```bash
# Open the Talos dashboard for a node
talosctl -n 192.168.1.10 dashboard
```

The dashboard shows a live view of all services, their health status, and scrollable log output. You can switch between services using the keyboard. This is a convenient way to get an overview of node health without running multiple log commands.

## Log Retention and Buffer Sizes

Talos keeps a limited buffer of logs in memory. The exact size depends on the service and how verbose it is, but as a general rule, very active services like kubelet and API server will have their oldest logs rotated out faster than quiet services.

If you need long-term log retention, configure log forwarding to an external system:

```yaml
# Configure log forwarding for persistence
machine:
  logging:
    destinations:
      - endpoint: "tcp://log-collector:5140"
        format: json_lines
```

This ensures that even if the in-memory buffer fills up, you have a complete log history available in your external log storage.

The `talosctl logs` command is the foundation of Talos Linux troubleshooting. Getting comfortable with it, including the various flags for following, tailing, and formatting output, will make you much more effective at diagnosing issues in your Talos-managed Kubernetes clusters.
