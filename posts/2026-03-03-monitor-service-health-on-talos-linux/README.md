# How to Monitor Service Health on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Monitoring, Service Health, Kubernetes, Observability, Infrastructure

Description: Learn how to monitor the health of system services on Talos Linux, including built-in health checks, log analysis, and integration with monitoring tools.

---

Monitoring the health of system services on Talos Linux is different from what you might be used to with traditional Linux distributions. There is no SSH access, no systemctl commands, and no ability to run arbitrary diagnostic scripts on the node. Instead, Talos provides a structured set of tools and APIs for checking service health. This post covers everything you need to know about keeping tabs on your Talos services.

## Checking Service Status with talosctl

The most direct way to check service health is through the `talosctl services` command. This gives you a snapshot of every system service running on a node:

```bash
# List all services on a single node
talosctl -n 192.168.1.10 services

# Example output
# NODE           SERVICE      STATE     HEALTH   LAST CHANGE
# 192.168.1.10   apid         Running   OK       12h ago
# 192.168.1.10   containerd   Running   OK       12h ago
# 192.168.1.10   cri          Running   OK       12h ago
# 192.168.1.10   etcd         Running   OK       12h ago
# 192.168.1.10   kubelet      Running   OK       12h ago
# 192.168.1.10   machined     Running   ?        12h ago
# 192.168.1.10   trustd       Running   OK       12h ago
```

You can also check services across multiple nodes at once:

```bash
# Check services on all control plane nodes
talosctl -n 192.168.1.10,192.168.1.11,192.168.1.12 services

# Check services on all nodes using endpoint proxying
talosctl -e 192.168.1.10 -n 192.168.1.10,192.168.1.11,192.168.1.20,192.168.1.21 services
```

Each service has three important fields: STATE (Running, Stopped, etc.), HEALTH (OK, ?, or an error), and LAST CHANGE (when the state last changed).

## Understanding Service Health States

The HEALTH column can show several values:

- **OK** - The service is running and passing its health checks
- **?** - The service does not have a health check defined, or the health check has not run yet
- **Error message** - The service is failing its health check, with details about why

A service can be in the "Running" state but still have a failing health check. For example, `etcd` might be running but reporting unhealthy if it has lost quorum. Always check both the STATE and HEALTH columns.

## Detailed Service Information

For more detail about a specific service, query it individually:

```bash
# Get detailed info about a specific service
talosctl -n 192.168.1.10 service etcd

# This shows additional details like:
# - Service ID
# - Memory usage
# - Health check details
# - Events history
```

The events history is particularly useful because it shows you the sequence of state transitions the service has gone through since the node last booted.

## Reading Service Logs

Logs are your primary diagnostic tool when a service is unhealthy. Talos makes service logs available through the API:

```bash
# View logs for a specific service
talosctl -n 192.168.1.10 logs kubelet

# Follow logs in real time
talosctl -n 192.168.1.10 logs etcd -f

# View logs from multiple nodes
talosctl -n 192.168.1.10,192.168.1.11 logs etcd
```

For quick troubleshooting, you can combine log viewing with filtering:

```bash
# Look for error messages in kubelet logs
talosctl -n 192.168.1.10 logs kubelet | grep -i error

# Check etcd logs for slow operations
talosctl -n 192.168.1.10 logs etcd | grep "slow"

# View recent apid connection issues
talosctl -n 192.168.1.10 logs apid | grep -i "tls\|certificate\|auth"
```

## Using the Resource API for Health Monitoring

Talos exposes system state through a resource-based API that provides a more structured way to monitor health:

```bash
# Get machine status
talosctl -n 192.168.1.10 get machinestatus -o yaml

# Check node readiness
talosctl -n 192.168.1.10 get nodestatus

# Monitor etcd member health
talosctl -n 192.168.1.10 etcd status

# Check Kubernetes node conditions
talosctl -n 192.168.1.10 get nodestatus -o yaml
```

The resource API is especially useful for automation because the output is structured and machine-parseable, unlike free-form log text.

## Setting Up Automated Health Checks

While `talosctl` is great for ad-hoc checks, you want automated monitoring for production environments. There are several approaches:

### Approach 1: Kubernetes-Based Monitoring

Since Talos runs Kubernetes, you can use standard monitoring stacks like Prometheus with the node exporter:

```yaml
# Prometheus ServiceMonitor for Talos node metrics
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: talos-node-metrics
  namespace: monitoring
spec:
  endpoints:
    - port: metrics
      interval: 30s
  selector:
    matchLabels:
      app: node-exporter
```

However, keep in mind that Talos does not run a traditional node exporter. You will need to deploy it as a DaemonSet with appropriate host access.

### Approach 2: External Health Probes

You can write scripts that periodically query the Talos API and report results to your monitoring system:

```bash
#!/bin/bash
# health-check.sh - Run from a monitoring server

NODES="192.168.1.10 192.168.1.11 192.168.1.12 192.168.1.20 192.168.1.21"

for node in $NODES; do
    # Check if the node is reachable
    if talosctl -n "$node" version > /dev/null 2>&1; then
        echo "OK: $node is reachable"
    else
        echo "CRITICAL: $node is unreachable"
    fi

    # Check service health
    services=$(talosctl -n "$node" services 2>/dev/null)
    if echo "$services" | grep -q "Running.*OK"; then
        echo "OK: Services healthy on $node"
    else
        echo "WARNING: Service issues on $node"
        echo "$services" | grep -v "OK"
    fi
done
```

### Approach 3: Talos API Watchers

For real-time monitoring, you can watch Talos resources for changes:

```bash
# Watch for service state changes
talosctl -n 192.168.1.10 get services --watch

# Watch for machine status changes
talosctl -n 192.168.1.10 get machinestatus --watch
```

These watch commands stream updates as they happen, which is useful for building event-driven monitoring systems.

## Monitoring etcd Specifically

etcd deserves special attention because its health directly impacts the entire cluster:

```bash
# Check etcd member status
talosctl -n 192.168.1.10 etcd status

# List etcd members
talosctl -n 192.168.1.10 etcd members

# Check for etcd alarms
talosctl -n 192.168.1.10 etcd alarm list

# Monitor etcd logs for warnings
talosctl -n 192.168.1.10 logs etcd -f | grep -E "warn|error|slow"
```

Key things to watch for in etcd:

- Frequent leader elections (indicating instability)
- Slow disk sync warnings (indicating storage performance issues)
- Database size approaching limits
- Connection failures between members

## Monitoring kubelet Health

The kubelet is the bridge between Talos and Kubernetes. If kubelet is unhealthy, the node will show as NotReady in Kubernetes:

```bash
# Check kubelet service health
talosctl -n 192.168.1.10 service kubelet

# View kubelet logs
talosctl -n 192.168.1.10 logs kubelet

# Cross-reference with Kubernetes node status
kubectl get nodes -o wide
```

## Building a Health Dashboard

For a comprehensive view, combine Talos health data with Kubernetes metrics:

```bash
# Script to generate a health summary
#!/bin/bash

echo "=== Talos Service Health ==="
talosctl -n 192.168.1.10,192.168.1.11,192.168.1.12 services

echo ""
echo "=== etcd Cluster Health ==="
talosctl -n 192.168.1.10 etcd members
talosctl -n 192.168.1.10 etcd status

echo ""
echo "=== Kubernetes Node Status ==="
kubectl get nodes -o wide

echo ""
echo "=== Pod Health ==="
kubectl get pods --all-namespaces | grep -v Running | grep -v Completed
```

## Best Practices

1. **Monitor all layers** - Check both Talos service health and Kubernetes-level health. A node can appear healthy at the OS level but have Kubernetes issues, or vice versa.

2. **Set up alerts** - Do not rely on manual checks. Automate health monitoring and send alerts when services degrade.

3. **Keep baselines** - Know what normal looks like for your cluster. Track metrics over time so you can spot trends before they become problems.

4. **Test failure scenarios** - Periodically simulate failures (shutting down a node, disconnecting network) to verify your monitoring catches them promptly.

5. **Check after changes** - Always verify service health after configuration changes, upgrades, or any cluster modifications.

Monitoring service health on Talos Linux requires adapting your approach to the API-driven model, but the tools provided are comprehensive and well-designed. By combining `talosctl` commands with automated monitoring, you can maintain full visibility into your cluster's health.
