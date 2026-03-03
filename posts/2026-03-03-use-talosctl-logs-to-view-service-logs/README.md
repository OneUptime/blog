# How to Use talosctl logs to View Service Logs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Logging, talosctl, Troubleshooting

Description: Learn how to use talosctl logs to view and analyze service logs on Talos Linux nodes for effective troubleshooting.

---

When something goes wrong in a Talos Linux cluster, logs are where you find the answers. Since Talos Linux does not provide SSH access, you cannot just log into a node and tail a log file. Instead, the `talosctl logs` command streams service logs through the Talos API. This guide covers how to use it effectively for everyday troubleshooting and deep-dive investigations.

## Basic Usage

```bash
# View logs for a specific service
talosctl logs <service-name> --nodes <node-ip>
```

For example, to view kubelet logs:

```bash
# View kubelet logs
talosctl logs kubelet --nodes <node-ip>
```

This outputs the log messages from the specified service, with the most recent messages appearing last.

## Available Services

To see which services you can get logs from:

```bash
# List all services on the node
talosctl services --nodes <node-ip>
```

Common services you will check logs for:

- **etcd** - The distributed key-value store (control plane only)
- **kubelet** - The Kubernetes node agent
- **containerd** - The container runtime
- **apid** - The Talos API server
- **machined** - The Talos machine management daemon
- **trustd** - The certificate distribution service

```bash
# Examples of viewing different service logs
talosctl logs etcd --nodes <node-ip>
talosctl logs kubelet --nodes <node-ip>
talosctl logs containerd --nodes <node-ip>
talosctl logs apid --nodes <node-ip>
talosctl logs machined --nodes <node-ip>
```

## Following Logs in Real Time

The `--follow` flag streams logs as they are generated:

```bash
# Follow kubelet logs in real time
talosctl logs kubelet --nodes <node-ip> --follow
```

This works like `tail -f` on a traditional system. New log lines appear as they are written. Press Ctrl+C to stop following.

Real-time log following is invaluable during:

- Active troubleshooting sessions
- Upgrade operations (watch for errors as services restart)
- New node provisioning (watch the bootstrap process)
- Load testing (watch for resource pressure messages)

## Filtering Logs

### By Keyword

Since logs are output to stdout, pipe them through grep:

```bash
# Find error messages in etcd logs
talosctl logs etcd --nodes <node-ip> | grep -i "error"

# Find warning messages in kubelet logs
talosctl logs kubelet --nodes <node-ip> | grep -i "warn"

# Look for specific pod-related messages
talosctl logs kubelet --nodes <node-ip> | grep "my-application"
```

### By Time

Talos logs include timestamps, so you can filter by time:

```bash
# Find logs from a specific time window
talosctl logs kubelet --nodes <node-ip> | grep "2024-01-15T14:3"
```

### Combining Filters

```bash
# Find errors in kubelet logs from the last hour
talosctl logs kubelet --nodes <node-ip> | grep -i "error" | grep "$(date -u +%Y-%m-%dT%H)"
```

## Tail Behavior

By default, `talosctl logs` returns recent log entries. You can control how many lines to show:

```bash
# Show the last 100 lines of etcd logs
talosctl logs etcd --nodes <node-ip> --tail 100

# Show the last 500 lines
talosctl logs kubelet --nodes <node-ip> --tail 500
```

Combine with --follow to see the last N lines and then continue following:

```bash
# Show last 50 lines and follow
talosctl logs kubelet --nodes <node-ip> --tail 50 --follow
```

## Troubleshooting Common Issues

### etcd Not Starting

```bash
# Check etcd logs for startup errors
talosctl logs etcd --nodes <control-plane-ip>
```

Look for:

- Certificate errors (usually from trustd issues)
- "member not found" messages (etcd membership problems)
- "database space exceeded" (storage quota hit)
- "rejected connection" (network or TLS issues)

```bash
# Filter for the most relevant error messages
talosctl logs etcd --nodes <cp-ip> | grep -i "error\|fatal\|panic"
```

### kubelet Issues

```bash
# Check kubelet logs
talosctl logs kubelet --nodes <node-ip>
```

Common kubelet issues visible in logs:

- "Unable to connect to the server" - API server is unreachable
- "certificate has expired" - TLS certificate problems
- "failed to run Kubelet" - Configuration or dependency issues
- "evicting pod" - Resource pressure on the node
- "PLEG is not healthy" - Pod lifecycle event generator issues

```bash
# Look for pod eviction messages
talosctl logs kubelet --nodes <node-ip> | grep -i "evict"

# Check for certificate issues
talosctl logs kubelet --nodes <node-ip> | grep -i "certificate\|tls\|x509"
```

### containerd Problems

```bash
# Check containerd logs for runtime issues
talosctl logs containerd --nodes <node-ip>
```

Things to look for:

- Image pull failures
- Container creation errors
- Runtime crashes
- Storage driver issues

```bash
# Find image pull errors
talosctl logs containerd --nodes <node-ip> | grep -i "pull\|registry\|image"
```

### Node Not Joining Cluster

When a new node fails to join:

```bash
# Check machined logs for bootstrap issues
talosctl logs machined --nodes <node-ip>

# Check trustd for certificate distribution problems
talosctl logs trustd --nodes <node-ip>

# Check kubelet for API server connectivity
talosctl logs kubelet --nodes <node-ip>
```

Work through the services in dependency order: machined first, then trustd, then etcd (for control plane), then kubelet.

## Viewing Logs from Multiple Nodes

Compare logs across nodes to identify patterns:

```bash
# Check etcd logs on all control plane nodes
talosctl logs etcd --nodes 10.0.0.1 > /tmp/etcd-node1.log
talosctl logs etcd --nodes 10.0.0.2 > /tmp/etcd-node2.log
talosctl logs etcd --nodes 10.0.0.3 > /tmp/etcd-node3.log

# Compare error patterns
grep -i "error" /tmp/etcd-node*.log
```

## Saving Logs for Analysis

For longer investigations, save logs to files:

```bash
# Save all kubelet logs to a file
talosctl logs kubelet --nodes <node-ip> > kubelet-$(date +%Y%m%d).log

# Save logs from all key services
for service in etcd kubelet containerd machined; do
    talosctl logs $service --nodes <node-ip> > "${service}-$(date +%Y%m%d).log"
done
```

## Scripted Log Analysis

Build scripts to automate log checking:

```bash
#!/bin/bash
# check-errors.sh - Check all services for errors on all nodes

NODES="10.0.0.1 10.0.0.2 10.0.0.3 10.0.0.4 10.0.0.5"
SERVICES="etcd kubelet containerd machined"

for node in $NODES; do
    echo "=== $node ==="
    for service in $SERVICES; do
        # Not all services run on all nodes (etcd only on control plane)
        ERRORS=$(talosctl logs $service --nodes $node --tail 100 2>/dev/null | grep -ic "error")
        if [ "$ERRORS" -gt 0 ]; then
            echo "  $service: $ERRORS errors in last 100 lines"
        fi
    done
done
```

## Log Rotation and Retention

Talos Linux manages log rotation internally. The kernel ring buffer and service logs have limited retention. For long-term log storage, forward logs to an external system:

- Use Fluentd or Fluent Bit to collect logs from containers
- Configure log forwarding in the machine configuration
- Use a centralized logging platform (Elasticsearch, Loki, etc.)

The `talosctl logs` command is best for real-time and recent log access. For historical analysis, rely on your centralized logging infrastructure.

## talosctl logs vs. kubectl logs

These are different commands for different layers:

| Command | What It Shows |
|---------|--------------|
| `talosctl logs` | OS-level service logs (etcd, kubelet, containerd) |
| `kubectl logs` | Container/pod logs for applications running in Kubernetes |

Use `talosctl logs` when the problem is at the infrastructure level. Use `kubectl logs` when the problem is in an application container.

```bash
# Application-level logs
kubectl logs my-pod -n my-namespace

# Infrastructure-level logs
talosctl logs kubelet --nodes <node-ip>
```

If an application pod is not starting at all, check both. `kubectl describe pod` might show scheduling or image pull errors, while `talosctl logs kubelet` might reveal why the kubelet is struggling.

## Integration with Monitoring

While `talosctl logs` is great for manual investigation, production environments should also have automated log monitoring:

```bash
# Example: Stream logs to a file while watching for critical patterns
talosctl logs etcd --nodes <cp-ip> --follow | while read line; do
    if echo "$line" | grep -qi "panic\|fatal\|database space"; then
        echo "CRITICAL: $line" >> /var/log/talos-alerts.log
        # Trigger an alert
    fi
done
```

## Conclusion

The `talosctl logs` command is your primary tool for investigating issues at the Talos Linux operating system level. It provides direct access to service logs that would normally require SSH in a traditional Linux environment. Use `--follow` for real-time monitoring, pipe through grep for filtering, and save to files for detailed analysis. Combined with `kubectl logs` for application-level debugging, you have complete visibility across every layer of your cluster. Make log checking a standard part of your troubleshooting workflow and you will resolve issues faster and with more confidence.
