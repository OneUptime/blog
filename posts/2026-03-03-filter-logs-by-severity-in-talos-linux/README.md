# How to Filter Logs by Severity in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Log Filtering, Severity Levels, Debugging, Kubernetes

Description: Learn how to filter Talos Linux logs by severity level to quickly find errors, warnings, and critical issues in your cluster.

---

When you are troubleshooting a problem in a Talos Linux cluster, the last thing you want is to scroll through thousands of informational log lines looking for the one error message that matters. Filtering logs by severity level lets you cut through the noise and focus on what is actually broken. Talos Linux, Kubernetes components, and your application workloads all use severity levels, but each one handles them slightly differently.

This guide covers how to filter by severity at every layer of your Talos Linux logging stack.

## Understanding Severity Levels

Most logging systems use a standard set of severity levels. While the exact names vary between systems, the concept is consistent:

```
# Common severity levels from least to most severe
DEBUG   - Detailed diagnostic information
INFO    - General operational messages
WARNING - Something unexpected but not broken
ERROR   - Something failed but the system continues
FATAL   - Something failed and the system cannot continue
```

Talos system services, Kubernetes components, and most applications all use variations of these levels. The trick is knowing how each system labels and formats them.

## Filtering Talos System Service Logs

Talos system services output structured log entries. When you use `talosctl logs` with JSON output, each entry includes a severity field that you can filter on.

```bash
# Get JSON output from machined and filter for errors
talosctl -n 192.168.1.10 logs machined -o json | jq 'select(.level == "error")'

# Filter for warnings and errors
talosctl -n 192.168.1.10 logs machined -o json | jq 'select(.level == "warning" or .level == "error")'

# Show only fatal/critical messages
talosctl -n 192.168.1.10 logs machined -o json | jq 'select(.level == "fatal" or .level == "critical")'
```

Without JSON output, you can use grep to filter by common severity keywords:

```bash
# Simple grep for error messages in kubelet logs
talosctl -n 192.168.1.10 logs kubelet | grep -i "error\|err\|E[0-9]"

# Filter for warnings
talosctl -n 192.168.1.10 logs kubelet | grep -i "warning\|warn\|W[0-9]"

# Exclude debug and info messages to see only problems
talosctl -n 192.168.1.10 logs kubelet | grep -iv "info\|debug\|I[0-9]\|D[0-9]"
```

## Filtering Kubernetes Component Logs

Kubernetes components use the klog library, which has its own format for severity levels. In the default text format, each line starts with a single character indicating the level:

```
# klog severity prefixes
I - Info
W - Warning
E - Error
F - Fatal
```

A typical klog line looks like:

```
I0303 10:15:32.123456   12345 server.go:123] Starting API server
E0303 10:15:33.234567   12345 handler.go:456] Failed to process request: connection refused
```

Filter these by their prefix character:

```bash
# Show only errors from the API server
talosctl -n 192.168.1.10 logs kube-apiserver | grep "^E"

# Show errors and warnings
talosctl -n 192.168.1.10 logs kube-apiserver | grep "^[EW]"

# Show fatal messages (these are rare but critical)
talosctl -n 192.168.1.10 logs kube-apiserver | grep "^F"
```

If your Kubernetes components are configured to output JSON (as described in our JSON logging guide), the filtering becomes easier:

```bash
# With JSON logging enabled on API server
talosctl -n 192.168.1.10 logs kube-apiserver | jq 'select(.level == "error")'
```

## Filtering Kernel Logs by Severity

Kernel logs use numeric severity levels. The `talosctl dmesg` output includes these levels in the message metadata:

```bash
# Filter kernel logs for errors and critical messages
talosctl -n 192.168.1.10 dmesg | grep -i "error\|critical\|panic\|oops"

# Look for warnings
talosctl -n 192.168.1.10 dmesg | grep -i "warning\|warn"

# Find hardware-related errors
talosctl -n 192.168.1.10 dmesg | grep -i "hardware error\|machine check\|mce"
```

## Building a Severity Filter Script

For day-to-day operations, create a shell script that filters logs by severity across services:

```bash
#!/bin/bash
# talos-error-scan.sh
# Scan all services on a node for error-level messages

NODE=$1
if [ -z "$NODE" ]; then
    echo "Usage: $0 <node-ip>"
    exit 1
fi

# List of services to check
SERVICES="machined apid trustd containerd kubelet etcd"

echo "=== Scanning node $NODE for errors ==="

for SERVICE in $SERVICES; do
    ERRORS=$(talosctl -n "$NODE" logs "$SERVICE" 2>/dev/null | grep -ci "error\|fail\|panic")
    if [ "$ERRORS" -gt 0 ]; then
        echo ""
        echo "--- $SERVICE: $ERRORS error(s) found ---"
        talosctl -n "$NODE" logs "$SERVICE" 2>/dev/null | grep -i "error\|fail\|panic" | tail -5
    fi
done

echo ""
echo "=== Kernel errors ==="
talosctl -n "$NODE" dmesg | grep -i "error\|panic\|oops" | tail -10
```

Make the script executable and run it:

```bash
# Make it executable
chmod +x talos-error-scan.sh

# Scan a node for errors
./talos-error-scan.sh 192.168.1.10
```

## Filtering Logs in a Centralized Logging System

When you have logs flowing to a centralized system like Loki, Elasticsearch, or Datadog, severity filtering becomes much more powerful because you can search across all nodes simultaneously.

### Grafana Loki (LogQL)

```logql
# Show error-level logs from all pods
{namespace=~".+"} | json | level=~"error|ERROR|err"

# Filter warnings from the kube-system namespace
{namespace="kube-system"} |= "W0" or |= "warning"

# Show errors from Talos machine logs
{source="talos-machine"} | json | talos_level="error"
```

### Elasticsearch (KQL)

```
# Filter for error severity
level: "error" OR level: "ERROR"

# Filter for warnings and above
level: ("error" OR "warning" OR "fatal" OR "critical")

# Kubernetes component errors
kubernetes.container.name: "kube-apiserver" AND level: "error"
```

## Setting Verbosity Levels

Rather than filtering after the fact, you can reduce log noise at the source by setting verbosity levels on Kubernetes components:

```yaml
# verbosity-settings.yaml
# Reduce logging verbosity to decrease noise
cluster:
  apiServer:
    extraArgs:
      v: "2"  # Default is usually 2, lower means less verbose
  controllerManager:
    extraArgs:
      v: "2"
  scheduler:
    extraArgs:
      v: "2"
machine:
  kubelet:
    extraArgs:
      v: "2"
```

The `v` flag controls verbosity on a scale from 0 to 10:

```
# Kubernetes verbosity levels
# 0 - Generally useful information (always visible)
# 1 - Reasonable default log level
# 2 - Useful steady-state info and important log messages
# 3 - Extended information about changes
# 4 - Debug-level verbosity
# 5+ - Trace-level verbosity (very noisy)
```

For production clusters, keep verbosity at 2 or lower. Only increase it temporarily when debugging specific issues.

## Creating Severity-Based Alerts

The real power of severity filtering comes when you combine it with alerting. Set up alerts that fire when error-rate thresholds are exceeded:

```yaml
# severity-alerts.yaml
# Prometheus alert rules based on log severity
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: log-severity-alerts
  namespace: monitoring
spec:
  groups:
    - name: log-severity
      rules:
        - alert: HighKubeletErrorRate
          expr: |
            increase(kubelet_runtime_operations_errors_total[5m]) > 10
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Kubelet error rate is elevated on {{ $labels.instance }}"
        - alert: EtcdErrors
          expr: |
            increase(etcd_server_health_failures[5m]) > 0
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "etcd health check failures on {{ $labels.instance }}"
```

## Practical Debugging Workflow

When you get paged about a cluster issue, here is a systematic approach using severity-based filtering:

```bash
# Step 1: Quick scan for critical errors across all control plane nodes
talosctl -n 192.168.1.10,192.168.1.11,192.168.1.12 logs etcd | grep -i "fatal\|panic" | tail -20

# Step 2: Check for errors in the last few minutes
talosctl -n 192.168.1.10 logs kube-apiserver --tail 500 | grep "^[EF]"

# Step 3: Look at kubelet errors on worker nodes
talosctl -n 192.168.1.20,192.168.1.21 logs kubelet --tail 200 | grep -i "error"

# Step 4: Check kernel for hardware or resource problems
talosctl -n 192.168.1.10,192.168.1.20 dmesg | grep -i "oom\|error\|fail" | tail -20
```

This progression goes from the most likely sources of cluster-wide problems (etcd, API server) down to node-specific issues (kubelet, kernel). By filtering for errors first, you skip the vast majority of log noise and get to the root cause faster.

Severity filtering is a fundamental skill for anyone operating Talos Linux clusters. Whether you filter at the command line with grep and jq, or in a centralized logging system with structured queries, the ability to quickly isolate error-level messages from informational noise will cut your troubleshooting time dramatically.
