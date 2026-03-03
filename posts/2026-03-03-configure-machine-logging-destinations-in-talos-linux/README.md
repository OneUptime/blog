# How to Configure Machine Logging Destinations in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Machine Logging, Syslog, Log Forwarding, Kubernetes

Description: Learn how to configure machine-level log destinations in Talos Linux to forward system logs to external collectors.

---

Talos Linux generates machine-level logs from its core system services - machined, apid, trustd, containerd, and others. These logs are separate from Kubernetes container logs and provide visibility into the operating system layer. By default, these logs are only accessible through the `talosctl logs` command and are stored in memory buffers with limited retention. Configuring log destinations lets you forward these machine logs to external systems for long-term storage, analysis, and alerting.

This guide covers the machine logging destination configuration in detail, including all supported formats, transport protocols, and practical integration patterns.

## Understanding Machine Logging in Talos

Talos Linux distinguishes between two types of logs. Kubernetes container logs are standard container stdout/stderr captured by containerd and stored at `/var/log/pods/`. Machine logs come from Talos system services and are accessible only through the Talos API.

The machine logging destination configuration controls where Talos sends its system service logs. Without this configuration, logs exist only in the in-memory circular buffer on each node and are lost when the buffer fills up or the node reboots.

```bash
# View machine logs without any destination configured
# These are from the in-memory buffer only
talosctl -n 192.168.1.10 logs machined
talosctl -n 192.168.1.10 logs apid
talosctl -n 192.168.1.10 logs trustd
```

## Basic Logging Destination Configuration

The logging destination is configured in the `machine.logging` section of the Talos machine configuration:

```yaml
# basic-logging-destination.yaml
# Configure a single logging destination
machine:
  logging:
    destinations:
      - endpoint: "tcp://192.168.1.100:5140"
        format: json_lines
```

This sends all machine logs to the specified TCP endpoint in JSON lines format. Each log entry is a separate JSON object on its own line.

Apply this configuration:

```bash
# Apply to a single node
talosctl apply-config --nodes 192.168.1.10 --patch @basic-logging-destination.yaml

# Apply to all nodes in the cluster
talosctl apply-config --nodes 192.168.1.10,192.168.1.11,192.168.1.20,192.168.1.21 \
  --patch @basic-logging-destination.yaml
```

## Supported Formats

Talos supports two log output formats:

### JSON Lines Format

The `json_lines` format sends each log entry as a complete JSON object per line:

```json
{"talos-level":"info","talos-service":"machined","talos-time":"2026-03-03T10:15:32.123Z","msg":"configuration applied successfully"}
{"talos-level":"warn","talos-service":"etcd","talos-time":"2026-03-03T10:15:33.456Z","msg":"slow disk detected","latency":"250ms"}
```

This format is the most widely compatible and works with virtually every log collector.

```yaml
# JSON lines configuration
machine:
  logging:
    destinations:
      - endpoint: "tcp://log-collector:5140"
        format: json_lines
```

### Default Format

If you omit the format field, Talos uses its default internal format:

```yaml
# Default format configuration
machine:
  logging:
    destinations:
      - endpoint: "tcp://log-collector:5140"
```

The JSON lines format is recommended for most use cases because it provides structured data that log collectors can parse without custom configuration.

## Transport Protocols

### TCP Transport

TCP provides reliable, ordered delivery of log messages:

```yaml
# TCP logging destination
machine:
  logging:
    destinations:
      - endpoint: "tcp://192.168.1.100:5140"
        format: json_lines
```

TCP is the recommended transport for production use because it guarantees delivery. If the receiver is temporarily unavailable, TCP will buffer and retry.

### UDP Transport

UDP provides fire-and-forget delivery with lower overhead:

```yaml
# UDP logging destination
machine:
  logging:
    destinations:
      - endpoint: "udp://192.168.1.100:5140"
        format: json_lines
```

UDP is faster but does not guarantee delivery. Use it only when some log loss is acceptable, such as in development environments.

## Configuring Multiple Destinations

Talos supports sending logs to multiple destinations simultaneously. This is useful for redundancy or when different teams need the same log data in different systems:

```yaml
# multiple-destinations.yaml
# Send logs to multiple collectors
machine:
  logging:
    destinations:
      # Primary logging destination
      - endpoint: "tcp://primary-collector.monitoring.svc:5140"
        format: json_lines
      # Secondary logging destination for security team
      - endpoint: "tcp://security-collector.security.svc:5141"
        format: json_lines
      # Third destination for compliance archival
      - endpoint: "tcp://compliance-archive.compliance.svc:5142"
        format: json_lines
```

Each destination operates independently. If one destination is unreachable, logs continue flowing to the others.

## Setting Up Log Receivers

You need a service running at each destination endpoint to receive the logs. Here are configurations for common collectors.

### Vector as a Log Receiver

```yaml
# vector-receiver.yaml
# Vector configuration to receive Talos machine logs
apiVersion: v1
kind: ConfigMap
metadata:
  name: vector-talos-config
  namespace: monitoring
data:
  vector.toml: |
    # Receive Talos machine logs over TCP
    [sources.talos_logs]
    type = "socket"
    address = "0.0.0.0:5140"
    mode = "tcp"
    decoding.codec = "json"

    # Add metadata for routing
    [transforms.enrich]
    type = "remap"
    inputs = ["talos_logs"]
    source = '''
    .source_type = "talos-machine"
    .cluster = "production"
    '''

    # Forward to Loki
    [sinks.loki]
    type = "loki"
    inputs = ["enrich"]
    endpoint = "http://loki-gateway.monitoring.svc:80"
    encoding.codec = "json"
    labels.source = "talos-machine"
    labels.service = "{{ talos-service }}"
    labels.level = "{{ talos-level }}"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vector-talos-receiver
  namespace: monitoring
spec:
  replicas: 2
  selector:
    matchLabels:
      app: vector-talos-receiver
  template:
    metadata:
      labels:
        app: vector-talos-receiver
    spec:
      containers:
        - name: vector
          image: timberio/vector:0.34.1-distroless-libc
          ports:
            - containerPort: 5140
          volumeMounts:
            - name: config
              mountPath: /etc/vector
      volumes:
        - name: config
          configMap:
            name: vector-talos-config
---
apiVersion: v1
kind: Service
metadata:
  name: vector-talos-receiver
  namespace: monitoring
spec:
  ports:
    - port: 5140
      targetPort: 5140
  selector:
    app: vector-talos-receiver
```

### Fluentd as a Log Receiver

```yaml
# fluentd-receiver-config.yaml
# Fluentd configuration for receiving Talos machine logs
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-talos-config
  namespace: monitoring
data:
  fluent.conf: |
    # Receive Talos logs over TCP
    <source>
      @type tcp
      tag talos.machine
      port 5140
      bind 0.0.0.0
      <parse>
        @type json
      </parse>
    </source>

    # Add labels and forward to Elasticsearch
    <match talos.**>
      @type elasticsearch
      host elasticsearch.monitoring.svc
      port 9200
      index_name talos-machine-logs
      <buffer>
        @type file
        path /var/log/fluentd-buffers/talos
        flush_interval 10s
        chunk_limit_size 5M
      </buffer>
    </match>
```

## Networking Considerations

Machine logs are sent from the Talos node's host network, not from within the Kubernetes pod network. This is an important distinction when planning your network architecture.

If your log receiver runs inside the cluster, the Talos nodes need to reach the receiver's Service IP or NodePort from the host network. There are several approaches:

```yaml
# Option 1: Use a NodePort service
apiVersion: v1
kind: Service
metadata:
  name: log-receiver
  namespace: monitoring
spec:
  type: NodePort
  ports:
    - port: 5140
      targetPort: 5140
      nodePort: 30140
  selector:
    app: vector-talos-receiver

# Then configure Talos to use any node's IP on the NodePort
# machine:
#   logging:
#     destinations:
#       - endpoint: "tcp://192.168.1.20:30140"
#         format: json_lines
```

```yaml
# Option 2: Use a LoadBalancer service
apiVersion: v1
kind: Service
metadata:
  name: log-receiver
  namespace: monitoring
spec:
  type: LoadBalancer
  ports:
    - port: 5140
      targetPort: 5140
  selector:
    app: vector-talos-receiver
```

```yaml
# Option 3: Use host network on the receiver pod
# This makes the receiver accessible on each node's IP
spec:
  template:
    spec:
      hostNetwork: true
```

## Verifying Log Delivery

After configuring the destination, verify that logs are flowing:

```bash
# Check if the receiver is listening
kubectl get svc -n monitoring vector-talos-receiver

# Look at the receiver logs for incoming connections
kubectl logs -n monitoring -l app=vector-talos-receiver --tail=20

# Generate a machine event to test
talosctl -n 192.168.1.10 get machinestatus

# Check that the log appeared in your aggregation system
```

## Troubleshooting Log Delivery

If logs are not arriving at your destination, check these common issues:

```bash
# 1. Verify network connectivity from the Talos node to the receiver
talosctl -n 192.168.1.10 netstat | grep 5140

# 2. Check if the endpoint is reachable from the node
talosctl -n 192.168.1.10 ping 192.168.1.100

# 3. Verify the Talos configuration was applied
talosctl -n 192.168.1.10 get machineconfig -o yaml | grep -A 10 logging

# 4. Look for errors in the machined logs
talosctl -n 192.168.1.10 logs machined | grep -i "log\|destination\|send"
```

Machine logging destinations in Talos Linux provide the foundation for persistent system-level observability. By configuring one or more destinations with the appropriate format and transport protocol, you ensure that critical operating system events are captured and available for analysis long after they have left the in-memory buffer. The configuration is straightforward - a few lines in the machine config - but the impact on your ability to troubleshoot and monitor your cluster is significant.
