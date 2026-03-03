# How to Troubleshoot Logging Issues in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Troubleshooting, Logging, Debugging, Kubernetes

Description: Practical troubleshooting guide for diagnosing and fixing common logging problems in Talos Linux clusters.

---

When logging breaks in a Talos Linux cluster, you lose visibility into what is happening. That makes troubleshooting the logging system itself a high-priority skill. Logging problems can range from container logs not appearing in your aggregation system to machine-level logs failing to reach their destination. Because Talos Linux is immutable and API-driven, the troubleshooting approach differs from traditional Linux systems where you might check file permissions or restart a service daemon.

This guide walks through the most common logging issues in Talos Linux clusters and provides systematic approaches to diagnose and resolve them.

## Container Logs Not Appearing

The most frequent logging complaint is that container logs are missing from the log aggregation system. Work through these checks in order.

### Check if the Container is Actually Producing Logs

Start with the simplest possibility - maybe the container is not writing to stdout/stderr:

```bash
# Check container logs directly through kubectl
kubectl logs deployment/my-app --tail=20

# If the pod has multiple containers, specify which one
kubectl logs pod/my-app-abc123 -c main-container --tail=20

# Check if the pod is actually running
kubectl get pod my-app-abc123 -o wide
```

If `kubectl logs` returns nothing, the application might be writing logs to a file inside the container rather than stdout. Check the application's logging configuration.

### Verify Log Files Exist on the Node

On Talos Linux, container logs are stored at `/var/log/pods/` on each node. Verify the files exist:

```bash
# List log files for a specific namespace/pod on a node
talosctl -n 192.168.1.20 ls /var/log/pods/

# Look deeper into a specific pod's log directory
talosctl -n 192.168.1.20 ls /var/log/pods/default_my-app-abc123_uid/main-container/

# Read the actual log file
talosctl -n 192.168.1.20 read /var/log/pods/default_my-app-abc123_uid/main-container/0.log
```

If the log files exist but your collector is not picking them up, the problem is in the collector configuration.

### Check the Log Collector

If you are running Promtail, Fluentd, or another log collector as a DaemonSet, verify it is running on the node where the pod is scheduled:

```bash
# Check if the log collector is running on all nodes
kubectl get pods -n logging -o wide

# Check the collector's own logs for errors
kubectl logs -n logging -l app.kubernetes.io/name=promtail --tail=50

# Verify the collector has the right volume mounts
kubectl get pod -n logging promtail-xxxxx -o yaml | grep -A 10 volumeMounts
```

Common issues include the collector not having access to `/var/log/pods`, missing tolerations that prevent it from running on control plane nodes, or incorrect path configurations.

### Fix Volume Mount Issues

On Talos Linux, ensure your log collector mounts the correct paths:

```yaml
# Correct volume mounts for log collectors on Talos Linux
volumes:
  - name: pods-log
    hostPath:
      path: /var/log/pods
  - name: containers-log
    hostPath:
      path: /var/log/containers
  - name: machine-id
    hostPath:
      path: /etc/machine-id

volumeMounts:
  - name: pods-log
    mountPath: /var/log/pods
    readOnly: true
  - name: containers-log
    mountPath: /var/log/containers
    readOnly: true
  - name: machine-id
    mountPath: /etc/machine-id
    readOnly: true
```

## Machine Logs Not Reaching Destination

If you have configured machine logging destinations and logs are not arriving, follow this troubleshooting path.

### Verify the Configuration

First confirm that the logging destination is actually configured:

```bash
# Check the current machine configuration
talosctl -n 192.168.1.10 get machineconfig -o yaml | grep -A 15 "logging"
```

You should see output like:

```yaml
logging:
  destinations:
    - endpoint: tcp://192.168.1.100:5140
      format: json_lines
```

If the logging section is missing, the configuration was not applied correctly. Re-apply it:

```bash
# Re-apply the logging configuration
talosctl apply-config --nodes 192.168.1.10 --patch @logging-patch.yaml
```

### Test Network Connectivity

Machine logs are sent from the host network. Verify the destination is reachable:

```bash
# Check if the node can reach the log receiver
talosctl -n 192.168.1.10 netstat

# Look for established connections to the log receiver port
talosctl -n 192.168.1.10 netstat | grep 5140
```

If using a Kubernetes service as the destination, remember that Talos machine-level networking may not resolve cluster DNS names. Use IP addresses or ensure the service is exposed through a NodePort or LoadBalancer:

```yaml
# Use IP address instead of DNS name for machine logging
machine:
  logging:
    destinations:
      - endpoint: "tcp://10.96.100.50:5140"  # Service ClusterIP
        format: json_lines
```

### Check the Log Receiver

Verify the receiving end is working:

```bash
# Check if the receiver pod is running
kubectl get pods -n monitoring -l app=log-receiver

# Check the receiver's logs for errors
kubectl logs -n monitoring -l app=log-receiver --tail=30

# Verify the receiver is listening on the expected port
kubectl exec -n monitoring deployment/log-receiver -- netstat -tlnp | grep 5140
```

## Logs Being Truncated

If you see log lines that are cut off, the issue is usually the container log line size limit.

### Increase the Max Log Line Size

Containerd has a default maximum log line size. On Talos Linux, you can adjust this:

```yaml
# increase-log-line-size.yaml
# Increase the maximum container log line size
machine:
  files:
    - content: |
        [plugins."io.containerd.grpc.v1.cri"]
          max_container_log_line_size = 65536
      path: /etc/cri/conf.d/20-max-log-line.toml
      op: create
```

Apply to all nodes:

```bash
talosctl apply-config --nodes 192.168.1.10,192.168.1.20 --patch @increase-log-line-size.yaml
```

## Log Collector Crashing with OOM

If your log collector DaemonSet keeps getting OOM killed, the collector is using more memory than its resource limits allow.

```bash
# Check for OOM events
kubectl get events -n logging --field-selector reason=OOMKilled

# Check the collector's resource usage
kubectl top pods -n logging
```

Fix this by increasing memory limits or reducing the collector's buffer sizes:

```yaml
# Adjust Promtail resource limits
resources:
  requests:
    memory: 128Mi
    cpu: 100m
  limits:
    memory: 512Mi
    cpu: 200m
```

For Fluentd or Vector, also tune the internal buffer configuration to reduce memory usage:

```toml
# Vector buffer tuning for lower memory usage
[sinks.output.buffer]
type = "disk"
max_size = 268435488  # 256 MB on disk instead of memory
when_full = "block"
```

## Duplicate Logs

Seeing the same log entry multiple times usually indicates that multiple collectors are picking up the same log file, or that the collector is reprocessing logs after a restart.

```bash
# Check if multiple collectors are running on the same node
kubectl get pods -n logging -o wide | sort -k 7

# Verify only one DaemonSet is collecting logs
kubectl get daemonsets -n logging
```

If you have both Promtail and Fluentd running, remove one. If the issue is reprocessing after restarts, ensure the collector is using a position file to track its read progress:

```yaml
# Promtail position file configuration
positions:
  filename: /run/promtail/positions.yaml
```

## Missing Logs After Node Reboot

Talos machine logs stored in memory are lost on reboot. This is by design since Talos uses in-memory buffers for system service logs.

To prevent log loss, ensure external forwarding is configured and working before the node reboots:

```bash
# Verify logs are being forwarded before performing maintenance
talosctl -n 192.168.1.10 logs machined --tail 5

# In your log aggregation system, verify recent entries from this node
# Then proceed with the reboot
talosctl -n 192.168.1.10 reboot
```

## Diagnostic Checklist

When facing any logging issue, run through this checklist:

```bash
# 1. Are all logging-related pods running?
kubectl get pods -n logging -o wide
kubectl get pods -n monitoring -o wide

# 2. Are the DaemonSet pods on every node?
kubectl get ds -n logging

# 3. Are there any error events?
kubectl get events -n logging --sort-by='.lastTimestamp' | tail -20

# 4. Is the machine logging configuration present?
talosctl -n 192.168.1.10 get machineconfig -o yaml | grep -A 15 logging

# 5. Are container log files being created?
talosctl -n 192.168.1.20 ls /var/log/pods/ | head -20

# 6. Is disk space available?
talosctl -n 192.168.1.20 usage /var/log

# 7. Can the collector reach the backend?
kubectl exec -n logging deployment/promtail -- wget -qO- http://loki:3100/ready
```

Logging problems in Talos Linux clusters are systematic to diagnose once you understand the two-layer architecture - machine logs through the Talos API and container logs through the Kubernetes logging pipeline. Working through each layer independently and verifying connectivity, configuration, and resource availability at each step will get you to the root cause efficiently.
