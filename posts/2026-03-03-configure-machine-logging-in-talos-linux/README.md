# How to Configure Machine Logging in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Logging, Observability, Kubernetes, Syslog

Description: A complete guide to configuring machine-level log forwarding in Talos Linux for centralized observability and troubleshooting.

---

Talos Linux does not give you SSH access, and there is no persistent filesystem where logs accumulate over time. This is a deliberate security choice, but it means you need to think about logging differently. Machine-level logs from Talos system services, the kernel, and containerd need to be forwarded somewhere external if you want to keep them for analysis and troubleshooting.

This post covers how to configure log forwarding in Talos Linux, the available formats and protocols, and practical tips for integrating with popular log aggregation systems.

## How Logging Works in Talos

Talos Linux captures logs from all its internal services - machined, apid, trustd, containerd, kubelet, and others. These logs are stored in a circular in-memory buffer. You can view them in real time using `talosctl`:

```bash
# View logs from a specific service
talosctl logs kubelet --nodes 192.168.1.10

# Follow logs in real time
talosctl logs machined --nodes 192.168.1.10 -f

# View kernel logs
talosctl dmesg --nodes 192.168.1.10
```

The in-memory buffer has a fixed size. Once it fills up, older entries are discarded. This means that if you do not forward your logs somewhere, they are gone when the buffer wraps around or the node reboots.

## Configuring Log Forwarding

Log forwarding is configured in the `machine.logging` section of the Talos machine config:

```yaml
# machine-config.yaml
machine:
  logging:
    destinations:
      - endpoint: "udp://10.0.0.50:514"
        format: json_lines
```

The configuration has two key fields:

- **endpoint** - Where to send the logs. Supports both TCP and UDP protocols.
- **format** - The log format. Options are `json_lines` and `json_lines` (Talos primarily uses JSON lines format).

## Supported Protocols

Talos can forward logs over TCP or UDP:

```yaml
# UDP - fire and forget, lower overhead, may lose messages
machine:
  logging:
    destinations:
      - endpoint: "udp://10.0.0.50:514"
        format: json_lines

# TCP - reliable delivery, connection-oriented
machine:
  logging:
    destinations:
      - endpoint: "tcp://10.0.0.50:514"
        format: json_lines
```

UDP is simpler and has less overhead, but you might lose log messages if the network is congested or the receiver is temporarily unavailable. TCP provides reliable delivery but adds connection management overhead. For most production deployments, TCP is the better choice because you do not want to lose logs when investigating issues.

## Multiple Log Destinations

You can send logs to multiple destinations simultaneously:

```yaml
machine:
  logging:
    destinations:
      # Send to syslog server
      - endpoint: "tcp://syslog.corp.internal:514"
        format: json_lines
      # Also send to a log aggregation service
      - endpoint: "tcp://logstash.corp.internal:5044"
        format: json_lines
```

This is useful when different teams need access to the same logs through different systems, or when you want redundancy in your log pipeline.

## Log Format

The `json_lines` format produces one JSON object per line, which is the standard format that most modern log aggregation tools can parse. Each log entry includes:

```json
{
  "talos-level": "info",
  "talos-service": "kubelet",
  "talos-time": "2024-01-15T10:30:45.123456Z",
  "msg": "Starting kubelet",
  "node": "192.168.1.10"
}
```

The fields include the severity level, the originating service, a timestamp, the actual log message, and the node identifier.

## Integration with Popular Log Systems

Here are configuration examples for common log aggregation platforms:

### Fluentd / Fluent Bit

Set up a Fluentd TCP input to receive Talos logs:

```yaml
# Fluentd input configuration
<source>
  @type tcp
  port 5170
  tag talos
  <parse>
    @type json
  </parse>
</source>
```

Talos config to send to Fluentd:

```yaml
machine:
  logging:
    destinations:
      - endpoint: "tcp://fluentd.monitoring.svc.cluster.local:5170"
        format: json_lines
```

### Vector

Vector can receive JSON lines over TCP:

```toml
# Vector source configuration
[sources.talos_logs]
type = "socket"
address = "0.0.0.0:5170"
mode = "tcp"
decoding.codec = "json"
```

### Loki with Promtail

For Grafana Loki, you can use a syslog receiver or a TCP input through Promtail or Vector as an intermediary:

```yaml
# Promtail configuration for receiving Talos logs
server:
  http_listen_port: 9080

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: talos
    syslog:
      listen_address: 0.0.0.0:1514
      labels:
        job: talos
```

## Applying the Configuration

For new clusters:

```bash
# Generate config with logging enabled
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --config-patch '{"machine": {"logging": {"destinations": [{"endpoint": "tcp://10.0.0.50:5170", "format": "json_lines"}]}}}'
```

For existing clusters:

```bash
# Patch a running node
talosctl patch machineconfig --nodes 192.168.1.10 \
  --patch '{"machine": {"logging": {"destinations": [{"endpoint": "tcp://10.0.0.50:5170", "format": "json_lines"}]}}}'
```

## Verifying Log Forwarding

After configuring log forwarding, verify that logs are arriving at your destination. The simplest test is to check your log aggregation system for entries with `talos-service` fields.

You can also generate some log activity and look for it:

```bash
# Trigger some service activity
talosctl service kubelet restart --nodes 192.168.1.10

# Check if the restart event appears in your log system
```

If logs are not arriving, check the network path between the Talos node and the log destination:

```bash
# Check if the logging destination is reachable
talosctl logs machined --nodes 192.168.1.10 | grep -i "log"
```

## Kubernetes Pod Logs vs. Machine Logs

It is important to distinguish between machine-level logs (what we are configuring here) and Kubernetes pod logs. Machine logs come from Talos system services and are forwarded through the `machine.logging` configuration. Pod logs come from your workloads running in Kubernetes and are typically collected by a DaemonSet like Fluent Bit or Promtail that reads from the container runtime's log files.

You need both for complete observability:

- Machine logs help you debug node-level issues (boot failures, network problems, disk errors)
- Pod logs help you debug application-level issues

## Log Retention and Volume

Since Talos logs are streamed in real time, the volume depends on how active your nodes are. A typical node generates a few hundred kilobytes to a few megabytes of logs per hour during normal operation. During upgrades, reboots, or error conditions, the volume spikes.

Plan your log storage accordingly. If you have 50 nodes running for a year, you might accumulate several hundred gigabytes of machine logs. Set appropriate retention policies in your log aggregation system.

## Troubleshooting Common Issues

**Logs not arriving** - Check firewall rules between the Talos node and the log destination. Make sure the port and protocol (TCP vs UDP) match on both sides.

**Partial logs** - If using UDP, some messages may be lost during network congestion. Switch to TCP for reliable delivery.

**JSON parsing errors** - Make sure your log receiver is configured to parse JSON lines format, not plain syslog or another format.

**High log volume** - If a service is logging excessively, it might indicate an underlying issue. Investigate the root cause rather than suppressing the logs.

## Conclusion

Log forwarding in Talos Linux is a must-have for any production deployment. Without it, you are flying blind when nodes have issues. The configuration is simple - just point Talos at a TCP or UDP endpoint and choose the JSON lines format. Integrate with whatever log aggregation system your team already uses, and make sure to set up both machine-level and pod-level log collection for complete observability. The time you invest in setting this up pays for itself the first time you need to debug a 3 AM node failure.
