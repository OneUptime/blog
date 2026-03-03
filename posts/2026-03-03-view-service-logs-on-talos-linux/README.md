# How to View Service Logs on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Logs, Troubleshooting, Kubernetes, Monitoring, Observability

Description: A comprehensive guide to viewing, filtering, and analyzing service logs on Talos Linux using talosctl for effective troubleshooting and monitoring.

---

Logs are your primary tool for understanding what is happening inside a Talos Linux node. When a service is misbehaving, the logs tell you why. When a pod is not starting, the kubelet logs explain the reason. When etcd is having issues, the etcd logs reveal the problem. Since Talos Linux does not provide SSH access, all log access happens through the `talosctl` command. This guide covers everything you need to know about viewing and working with service logs.

## Basic Log Commands

The fundamental command for viewing logs is `talosctl logs`:

```bash
# View logs for a specific service
talosctl logs kubelet -n <node-ip>

# View logs for etcd
talosctl logs etcd -n <control-plane-ip>

# View logs for containerd
talosctl logs containerd -n <node-ip>

# View logs for the Talos API daemon
talosctl logs apid -n <node-ip>
```

By default, this shows the most recent logs. The output streams to your terminal in chronological order.

## Viewing Kubernetes Component Logs

Kubernetes control plane components run as containers, and their logs are accessible through `talosctl`:

```bash
# API server logs
talosctl logs kube-apiserver -n <control-plane-ip>

# Controller manager logs
talosctl logs kube-controller-manager -n <control-plane-ip>

# Scheduler logs
talosctl logs kube-scheduler -n <control-plane-ip>

# Kube-proxy logs (if running as static pod)
talosctl logs kube-proxy -n <node-ip>
```

## Following Logs in Real Time

To watch logs as they are written (similar to `tail -f`):

```bash
# Follow kubelet logs in real time
talosctl logs kubelet -n <node-ip> -f

# Follow etcd logs
talosctl logs etcd -n <control-plane-ip> -f

# Follow API server logs
talosctl logs kube-apiserver -n <control-plane-ip> -f
```

The `-f` flag keeps the connection open and streams new log entries as they appear. Press Ctrl+C to stop.

## Filtering Logs by Time

You can retrieve logs from a specific time window:

```bash
# Logs since a specific time ago
talosctl logs kubelet -n <node-ip> --since 1h

# Logs since a specific timestamp
talosctl logs kubelet -n <node-ip> --since "2026-03-03T10:00:00Z"

# Combine with follow for recent logs plus real-time streaming
talosctl logs kubelet -n <node-ip> --since 10m -f
```

## Filtering Log Content

Since `talosctl logs` outputs plain text, you can use standard command-line tools to filter:

```bash
# Search for error messages in kubelet logs
talosctl logs kubelet -n <node-ip> | grep -i error

# Search for a specific pod name
talosctl logs kubelet -n <node-ip> | grep "my-pod-name"

# Search for multiple patterns
talosctl logs kubelet -n <node-ip> | grep -E "error|warning|failed"

# Exclude noisy lines
talosctl logs kubelet -n <node-ip> | grep -v "healthz\|readyz"

# Count occurrences of errors
talosctl logs kubelet -n <node-ip> | grep -ic error
```

## Viewing Kernel Logs (dmesg)

The kernel ring buffer provides low-level system messages:

```bash
# View kernel messages
talosctl dmesg -n <node-ip>

# Follow kernel messages in real time
talosctl dmesg -n <node-ip> -f

# Search for specific kernel messages
talosctl dmesg -n <node-ip> | grep -i "oom\|error\|panic\|warning"

# Check for hardware errors
talosctl dmesg -n <node-ip> | grep -i "hardware\|mce\|edac"

# Check disk-related messages
talosctl dmesg -n <node-ip> | grep -i "sd[a-z]\|nvme\|ata\|scsi"

# Check network-related messages
talosctl dmesg -n <node-ip> | grep -i "eth\|link\|network"
```

## Viewing Logs from Multiple Nodes

You can query logs from multiple nodes in one command:

```bash
# Logs from all control plane nodes
talosctl logs etcd -n 10.0.0.1,10.0.0.2,10.0.0.3

# Logs from specific workers
talosctl logs kubelet -n 10.0.0.11,10.0.0.12
```

Each log line is prefixed with the node IP, so you can tell which node produced which message.

## Building a Log Investigation Workflow

When troubleshooting an issue, follow this systematic approach:

### Step 1: Get the Big Picture

```bash
# Check all service status first
talosctl services -n <node-ip>

# Look for any services not in Running/OK state
```

### Step 2: Check the Relevant Service Logs

```bash
# For node issues, start with kubelet
talosctl logs kubelet -n <node-ip> | grep -i "error\|fail" | tail -30

# For cluster-level issues, check etcd
talosctl logs etcd -n <control-plane-ip> | grep -i "error\|fail" | tail -30

# For API access issues, check the API server
talosctl logs kube-apiserver -n <control-plane-ip> | grep -i "error\|fail" | tail -30
```

### Step 3: Check System-Level Logs

```bash
# Check kernel messages for hardware or OS issues
talosctl dmesg -n <node-ip> | tail -50

# Check controller-runtime for Talos controller issues
talosctl logs controller-runtime -n <node-ip> | tail -50
```

### Step 4: Correlate Across Services

```bash
# Look at timestamps across different services
# to find cascading failures
echo "=== etcd ===" && talosctl logs etcd -n <cp-ip> --since 5m | head -20
echo "=== apiserver ===" && talosctl logs kube-apiserver -n <cp-ip> --since 5m | head -20
echo "=== kubelet ===" && talosctl logs kubelet -n <node-ip> --since 5m | head -20
```

## Common Log Patterns to Watch For

### OOM Kills

```bash
# Check for out-of-memory kills
talosctl dmesg -n <node-ip> | grep -i "oom\|out of memory\|killed process"
```

### Certificate Errors

```bash
# Certificate-related errors
talosctl logs kube-apiserver -n <cp-ip> | grep -i "certificate\|tls\|x509"
talosctl logs kubelet -n <node-ip> | grep -i "certificate\|tls\|x509"
```

### Disk Pressure

```bash
# Disk-related warnings
talosctl logs kubelet -n <node-ip> | grep -i "disk\|evict\|imagegc\|storage"
talosctl dmesg -n <node-ip> | grep -i "no space\|readonly\|I/O error"
```

### Network Issues

```bash
# Network-related errors
talosctl logs kubelet -n <node-ip> | grep -i "network\|dns\|dial\|connection refused"
talosctl dmesg -n <node-ip> | grep -i "link is\|carrier\|mtu"
```

### etcd Issues

```bash
# etcd performance and health issues
talosctl logs etcd -n <cp-ip> | grep -i "slow\|overloaded\|election\|snapshot\|compaction"
```

## Exporting Logs for Analysis

For deeper analysis, export logs to a file:

```bash
# Export kubelet logs to a file
talosctl logs kubelet -n <node-ip> > kubelet-logs-$(date +%Y%m%d).txt

# Export logs from multiple services
for service in kubelet etcd containerd; do
    talosctl logs "$service" -n <node-ip> > "${service}-logs.txt" 2>/dev/null
done

# Create a full diagnostic bundle
mkdir -p /tmp/diag-$(date +%Y%m%d)
for service in apid containerd cri etcd kubelet trustd; do
    talosctl logs "$service" -n <node-ip> > "/tmp/diag-$(date +%Y%m%d)/${service}.log" 2>/dev/null
done
talosctl dmesg -n <node-ip> > "/tmp/diag-$(date +%Y%m%d)/dmesg.log"
```

## Centralized Log Collection

For production clusters, ship logs to a centralized logging system:

```yaml
# Deploy Fluent Bit as a DaemonSet to collect logs
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluent-bit
  namespace: logging
spec:
  selector:
    matchLabels:
      app: fluent-bit
  template:
    metadata:
      labels:
        app: fluent-bit
    spec:
      tolerations:
        - operator: Exists
      containers:
      - name: fluent-bit
        image: fluent/fluent-bit:latest
        volumeMounts:
        - name: varlog
          mountPath: /var/log
          readOnly: true
        - name: containers
          mountPath: /var/log/containers
          readOnly: true
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: containers
        hostPath:
          path: /var/log/containers
```

## Using the Controller Runtime Logs

Talos has a controller-runtime that manages system state. Its logs are useful for understanding Talos-level operations:

```bash
# View controller-runtime logs
talosctl logs controller-runtime -n <node-ip>

# Filter for specific controller actions
talosctl logs controller-runtime -n <node-ip> | grep -i "network\|address\|route"
talosctl logs controller-runtime -n <node-ip> | grep -i "machine\|config"
```

## Log Retention

Talos Linux keeps a limited amount of logs in memory (there is no persistent log storage on the immutable filesystem). If you need long-term log retention, you must ship logs to an external system.

```bash
# The amount of log data available depends on:
# - System memory
# - Log volume
# - How long the node has been running

# Recent logs are always available
# Very old logs may have been rotated out
```

## Troubleshooting Log Access Issues

If you cannot access logs:

```bash
# Verify talosctl connectivity
talosctl version -n <node-ip>

# If that fails, check:
# 1. Network connectivity to the node
# 2. Talos API port (50000) is not blocked
# 3. Your talosconfig is correct

# Check if the specific service exists
talosctl services -n <node-ip>
```

## Conclusion

Logs are your eyes and ears on a Talos Linux cluster. Since there is no SSH access, `talosctl logs` is the primary way to understand what is happening inside your nodes. Master the basic commands, learn the common log patterns for your services, and set up centralized logging for production environments. When troubleshooting, be systematic. Check service status first, then look at logs for the relevant services, and correlate timestamps across services to find cascading failures. Good log analysis skills are the difference between a quick fix and hours of guessing.
