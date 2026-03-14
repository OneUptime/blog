# How to Get Logs Without SSH on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Logging, Talosctl, Kubernetes, Debugging, Observability

Description: Complete guide to accessing system and application logs on Talos Linux nodes without SSH using talosctl and Kubernetes tools.

---

Logging is fundamental to operating any system. When something breaks, logs are where you go first. On traditional Linux servers, you SSH in and check `/var/log/syslog`, run `journalctl`, or look at application-specific log files. On Talos Linux, none of those approaches work because there is no SSH access.

But that does not mean you are flying blind. Talos Linux provides comprehensive logging through the talosctl API, Kubernetes-native tools, and integration points for centralized logging systems. This guide covers all the ways to access logs on Talos Linux.

## System Service Logs with talosctl

Every service managed by Talos writes logs that are accessible through talosctl:

```bash
# View kubelet logs
talosctl logs kubelet --nodes 192.168.1.10

# View etcd logs (control plane nodes only)
talosctl logs etcd --nodes 192.168.1.10

# View the Talos API service logs
talosctl logs apid --nodes 192.168.1.10

# View the machine daemon logs
talosctl logs machined --nodes 192.168.1.10

# View the trust daemon logs
talosctl logs trustd --nodes 192.168.1.10
```

### Following Logs in Real Time

Add the `--follow` flag to stream logs as they are written:

```bash
# Stream kubelet logs in real time
talosctl logs kubelet --nodes 192.168.1.10 --follow

# Stream etcd logs in real time
talosctl logs etcd --nodes 192.168.1.10 --follow
```

This is the equivalent of `journalctl -f` or `tail -f` on a traditional system.

### Filtering by Time

You can limit logs to a specific time range:

```bash
# Get logs from the last hour
talosctl logs kubelet --nodes 192.168.1.10 --tail 1000

# The --tail flag limits the number of recent log lines returned
talosctl logs kubelet --nodes 192.168.1.10 --tail 100
```

## Kernel Logs

Kernel messages are separate from service logs and are accessed through dmesg:

```bash
# View kernel ring buffer
talosctl dmesg --nodes 192.168.1.10

# Follow kernel messages in real time
talosctl dmesg --nodes 192.168.1.10 --follow
```

Kernel logs are critical for diagnosing hardware issues, driver problems, and OOM (out-of-memory) events.

## Kubernetes Pod Logs

For application logs, use standard Kubernetes tools:

```bash
# View logs from a specific pod
kubectl logs <pod-name> -n <namespace>

# Follow pod logs in real time
kubectl logs <pod-name> -n <namespace> --follow

# View logs from a specific container in a multi-container pod
kubectl logs <pod-name> -n <namespace> -c <container-name>

# View logs from all pods with a specific label
kubectl logs -l app=myapp -n <namespace>

# View logs from a previous container instance (after a restart)
kubectl logs <pod-name> -n <namespace> --previous
```

### Control Plane Component Logs

Kubernetes control plane components run as static pods on Talos. Access their logs through kubectl:

```bash
# API server logs
kubectl logs -n kube-system -l component=kube-apiserver

# Controller manager logs
kubectl logs -n kube-system -l component=kube-controller-manager

# Scheduler logs
kubectl logs -n kube-system -l component=kube-scheduler

# Etcd logs (through Kubernetes)
kubectl logs -n kube-system -l component=etcd
```

## Container Runtime Logs

Talos uses containerd as its container runtime. You can access container-level logs through talosctl:

```bash
# List all Kubernetes containers on a node
talosctl containers --nodes 192.168.1.10 -k

# View logs for a specific container by ID
talosctl logs --nodes 192.168.1.10 -k <container-id>
```

This is useful when kubectl cannot access pod logs, for example during API server outages.

## Aggregating Logs from Multiple Nodes

When debugging cluster-wide issues, you need logs from multiple nodes simultaneously:

```bash
# Get kubelet logs from all control plane nodes
talosctl logs kubelet --nodes 192.168.1.10,192.168.1.11,192.168.1.12

# The output includes the node address for each log line
# making it easy to see which node generated each message
```

For a quick health check across nodes:

```bash
# Check for errors in kubelet logs across all nodes
talosctl logs kubelet --nodes 192.168.1.10,192.168.1.11 --tail 100 | grep -i error
```

## Setting Up Centralized Logging

For production environments, you should not rely solely on talosctl for log access. Set up a centralized logging system that collects logs from all nodes automatically.

### Fluentd DaemonSet

```yaml
# Deploy Fluentd to collect logs from all nodes
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentd
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: fluentd
  template:
    metadata:
      labels:
        app: fluentd
    spec:
      containers:
        - name: fluentd
          image: fluent/fluentd-kubernetes-daemonset:v1-debian-elasticsearch
          env:
            - name: FLUENT_ELASTICSEARCH_HOST
              value: "elasticsearch.logging.svc"
            - name: FLUENT_ELASTICSEARCH_PORT
              value: "9200"
          volumeMounts:
            - name: varlog
              mountPath: /var/log
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
      tolerations:
        - operator: Exists
```

### Promtail for Loki

```yaml
# Deploy Promtail to send logs to Grafana Loki
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: promtail
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: promtail
  template:
    metadata:
      labels:
        app: promtail
    spec:
      containers:
        - name: promtail
          image: grafana/promtail:latest
          args:
            - -config.file=/etc/promtail/config.yaml
          volumeMounts:
            - name: config
              mountPath: /etc/promtail
            - name: varlog
              mountPath: /var/log
              readOnly: true
      volumes:
        - name: config
          configMap:
            name: promtail-config
        - name: varlog
          hostPath:
            path: /var/log
      tolerations:
        - operator: Exists
```

## Talos Log Streaming

Talos can stream its own logs to an external endpoint. Configure this in the machine configuration:

```yaml
# Send Talos system logs to a remote syslog server
machine:
  logging:
    destinations:
      - endpoint: "udp://syslog.example.com:514/"
        format: json_lines
```

This sends all Talos service logs (kubelet, etcd, apid, etc.) to the specified endpoint without needing any additional pods or DaemonSets.

Supported formats include:
- `json_lines` - JSON format, one event per line
- `syslog` - standard syslog format

```yaml
# Multiple log destinations
machine:
  logging:
    destinations:
      - endpoint: "tcp://logstash.example.com:5044/"
        format: json_lines
      - endpoint: "udp://syslog.example.com:514/"
        format: syslog
```

## Debugging Common Log Access Issues

### "No logs available" for a Service

If a service shows no logs, it might not have started yet:

```bash
# Check service status first
talosctl services --nodes 192.168.1.10

# If the service is in "Waiting" state, it hasn't generated any logs yet
```

### Logs Are Being Rotated Too Quickly

The kernel ring buffer and Talos log buffers have limited size. In high-traffic environments, logs might be overwritten before you can read them. This is another reason to set up centralized logging.

### Cannot Access Logs During an Outage

If the Talos API is down, you cannot use talosctl to access logs. For these situations:

1. Check the console output (physical or virtual console)
2. Use centralized logging to review historical logs
3. If the node is a worker, check its status from a working control plane node

## Practical Logging Workflow

Here is a systematic approach to log-based debugging on Talos Linux:

```bash
# Step 1: Check system events for an overview
talosctl get events --nodes 192.168.1.10

# Step 2: Check service logs for the affected component
talosctl logs kubelet --nodes 192.168.1.10 --tail 200

# Step 3: Check kernel logs for hardware-level issues
talosctl dmesg --nodes 192.168.1.10 | tail -50

# Step 4: Check Kubernetes pod logs if the issue is application-level
kubectl logs -n kube-system -l component=kube-apiserver --tail=100

# Step 5: Check container-level logs if pods are not starting
talosctl containers --nodes 192.168.1.10 -k
```

## Conclusion

While the absence of SSH on Talos Linux changes how you access logs, it does not reduce your ability to diagnose problems. Between talosctl for system service and kernel logs, kubectl for application and pod logs, and centralized logging integrations for historical analysis, you have comprehensive log access. The key recommendation for production environments is to set up centralized logging early, so you are not relying solely on real-time log access when something goes wrong at 3 AM.
