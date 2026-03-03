# How to Configure Log Forwarding in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Logging, Log Forwarding, Observability, Kubernetes

Description: Learn how to configure log forwarding in Talos Linux to send system and kernel logs to external logging destinations

---

Talos Linux generates valuable logs from its system services, kernel, and Kubernetes components, but since nodes are immutable and have limited local storage, you need to forward these logs to an external system for long-term storage and analysis. This guide covers how to set up log forwarding in Talos Linux and the different options available to you.

## Understanding Logging in Talos Linux

Talos Linux handles logging differently from traditional Linux distributions. There is no syslog daemon running by default, no /var/log directory full of log files, and no way to SSH in and tail a file. Instead, logs are stored in a circular buffer in memory and are accessible through the Talos API.

While you can view logs using `talosctl logs`, this approach has limitations:

- Logs are stored in a memory buffer with limited size
- When the buffer fills up, old logs are discarded
- If a node crashes, the in-memory logs are lost
- You cannot search across multiple nodes at once

Log forwarding solves all of these problems by sending logs to an external destination as they are generated.

## Configuring Log Forwarding

Log forwarding is configured in the machine configuration. Talos Linux supports sending logs to any endpoint that accepts JSON-formatted logs over TCP or UDP:

```yaml
# Machine configuration for log forwarding
machine:
  logging:
    destinations:
      - endpoint: "udp://192.168.1.100:5514/"
        format: json_lines
```

This configuration tells Talos to send all machine logs to the specified endpoint using UDP on port 5514 in JSON lines format.

## Supported Protocols

Talos Linux supports two transport protocols for log forwarding:

### UDP

```yaml
machine:
  logging:
    destinations:
      - endpoint: "udp://logserver.example.com:5514/"
        format: json_lines
```

UDP is fire-and-forget - logs are sent without waiting for acknowledgment. This is faster and does not block the node if the logging server is down, but some logs might be lost during network issues.

### TCP

```yaml
machine:
  logging:
    destinations:
      - endpoint: "tcp://logserver.example.com:5514/"
        format: json_lines
```

TCP provides reliable delivery with acknowledgment. If the connection drops, Talos will attempt to reconnect. This is more reliable but can cause backpressure if the logging server is slow or unavailable.

## The JSON Lines Format

Talos sends logs in JSON lines format, where each log entry is a JSON object on its own line:

```json
{"msg":"service started","talos-level":"info","talos-service":"machined","talos-time":"2024-03-01T12:00:00.000Z"}
{"msg":"kubelet is running","talos-level":"info","talos-service":"kubelet","talos-time":"2024-03-01T12:00:01.000Z"}
```

Each log entry includes:
- **msg**: The actual log message
- **talos-level**: The log level (info, warning, error)
- **talos-service**: Which Talos service generated the log
- **talos-time**: The timestamp when the log was generated

## Sending Logs to Multiple Destinations

You can configure multiple logging destinations for redundancy:

```yaml
machine:
  logging:
    destinations:
      - endpoint: "tcp://primary-logs.example.com:5514/"
        format: json_lines
      - endpoint: "udp://backup-logs.example.com:5514/"
        format: json_lines
```

This sends the same logs to both destinations. If one destination is unavailable, logs still reach the other.

## Applying the Configuration

To add log forwarding to an existing cluster, update the machine configuration:

```bash
# Create a config patch file
cat > log-forwarding-patch.yaml <<EOF
machine:
  logging:
    destinations:
      - endpoint: "tcp://logserver.example.com:5514/"
        format: json_lines
EOF

# Apply the patch to a node
talosctl apply-config --nodes 192.168.1.10 \
  --config-patch @log-forwarding-patch.yaml

# Or apply using talosctl patch
talosctl patch machineconfig --nodes 192.168.1.10 \
  --patch '[{"op": "add", "path": "/machine/logging", "value": {"destinations": [{"endpoint": "tcp://logserver.example.com:5514/", "format": "json_lines"}]}}]'
```

You need to apply this configuration to each node in your cluster.

## Applying to All Nodes at Once

For a cluster-wide configuration, apply to all nodes:

```bash
#!/bin/bash
# apply-logging.sh - Enable log forwarding on all nodes

ALL_NODES="192.168.1.10 192.168.1.11 192.168.1.12 192.168.1.20 192.168.1.21 192.168.1.22"
LOG_SERVER="tcp://logserver.example.com:5514/"

for node in $ALL_NODES; do
  echo "Applying log forwarding config to $node..."
  talosctl patch machineconfig --nodes "$node" \
    --patch "[{\"op\": \"add\", \"path\": \"/machine/logging\", \"value\": {\"destinations\": [{\"endpoint\": \"$LOG_SERVER\", \"format\": \"json_lines\"}]}}]"
done

echo "Log forwarding configured on all nodes."
```

## Verifying Log Forwarding

After applying the configuration, verify that logs are being received:

```bash
# Check the Talos service logs for any errors
talosctl logs machined --nodes 192.168.1.10 | grep -i log

# On the receiving end, check that logs are arriving
# This depends on your logging backend
```

You can also generate a test event by restarting a service:

```bash
# Restart a service to generate log entries
talosctl service kubelet restart --nodes 192.168.1.20

# Check the logging server to see if the restart events appear
```

## Setting Up a Simple Log Receiver

For testing, you can set up a simple log receiver using netcat:

```bash
# On the log server machine, listen for UDP logs
nc -ulk 5514

# Or for TCP logs
nc -lk 5514
```

This is not suitable for production but helps verify that log forwarding is working before you set up a proper logging stack.

## Log Forwarding Architecture Patterns

### Direct to Logging Backend

The simplest pattern sends logs directly from Talos nodes to your logging backend:

```
Talos Node 1 ---> Elasticsearch/Loki/Splunk
Talos Node 2 --->
Talos Node 3 --->
```

```yaml
machine:
  logging:
    destinations:
      - endpoint: "tcp://elasticsearch.example.com:5514/"
        format: json_lines
```

### Via a Log Aggregator

A more robust pattern uses a log aggregator like Fluentd, Vector, or Logstash in between:

```
Talos Node 1 ---> Fluentd/Vector/Logstash ---> Elasticsearch/Loki/Splunk
Talos Node 2 --->
Talos Node 3 --->
```

```yaml
machine:
  logging:
    destinations:
      - endpoint: "tcp://fluentd.example.com:24224/"
        format: json_lines
```

The aggregator can parse, filter, transform, and route logs to multiple backends.

### Using a DaemonSet Log Collector

Some teams prefer to run a log collector as a Kubernetes DaemonSet that reads from the local node:

```yaml
machine:
  logging:
    destinations:
      - endpoint: "tcp://127.0.0.1:5514/"
        format: json_lines
```

This sends logs to a local port where a DaemonSet pod (running Vector, Fluent Bit, or similar) collects and forwards them.

## What Gets Forwarded

The log forwarding mechanism sends logs from Talos system services:

- **machined**: Core Talos management service
- **apid**: API server for talosctl
- **containerd**: Container runtime
- **kubelet**: Kubernetes node agent
- **etcd**: Distributed key-value store (control plane)
- **trustd**: Certificate management
- **kernel**: Kernel-level messages

Note that application logs from Kubernetes pods are not forwarded through this mechanism. Pod logs should be collected separately using a Kubernetes-level log collector like Fluent Bit or Vector running as a DaemonSet.

## Handling High Log Volume

If your cluster generates a high volume of logs, consider these strategies:

```yaml
# Use UDP for lower overhead
machine:
  logging:
    destinations:
      - endpoint: "udp://logserver.example.com:5514/"
        format: json_lines
```

Additional strategies:
- Use a local log aggregator to batch and compress logs before sending
- Filter logs at the aggregator level to drop low-value entries
- Set appropriate log retention policies on your logging backend
- Size your logging infrastructure based on your cluster size

## Troubleshooting

### Logs Not Arriving

If logs are not reaching your destination:

```bash
# Check if the endpoint is reachable from the node
talosctl dmesg --nodes 192.168.1.10 | grep -i "log\|connect"

# Verify the machine config has the correct logging configuration
talosctl get machineconfig --nodes 192.168.1.10 -o yaml | grep -A10 logging

# Check firewall rules between nodes and the log server
```

### Connection Errors

For TCP connections, check for connection-related errors:

```bash
# Check Talos logs for connection issues
talosctl logs machined --nodes 192.168.1.10 | grep -i "connection\|refused\|timeout"
```

## Best Practices

- Always forward logs to an external system. Relying on in-memory logs is not sufficient for production.
- Use TCP for reliable delivery if you cannot afford to lose any logs.
- Use UDP if performance is more important than guaranteed delivery.
- Set up multiple destinations for redundancy.
- Size your logging backend to handle the volume from your entire cluster.
- Collect Kubernetes pod logs separately using a DaemonSet-based collector.
- Test your log forwarding setup in staging before deploying to production.
- Monitor the logging pipeline itself to know when logs stop arriving.
- Apply log forwarding configuration to all nodes, not just some.

Configuring log forwarding in Talos Linux is straightforward but essential. Without it, you are flying blind when it comes to diagnosing issues on your nodes.
