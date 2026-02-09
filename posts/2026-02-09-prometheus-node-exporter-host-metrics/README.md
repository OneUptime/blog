# How to Implement Prometheus Node Exporter for Host-Level Metrics Collection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Monitoring, Node Exporter

Description: Learn how to deploy and configure Prometheus Node Exporter for comprehensive host-level metrics collection, including CPU, memory, disk, and network monitoring with best practices.

---

Prometheus Node Exporter is the standard way to collect host-level metrics from your servers and make them available to Prometheus. It exposes a wide range of hardware and OS metrics that are essential for monitoring system health and performance.

In this guide, you'll learn how to deploy Node Exporter, configure it properly, and integrate it with Prometheus for comprehensive infrastructure monitoring.

## Understanding Node Exporter

Node Exporter is a Prometheus exporter that runs on your hosts and exposes system metrics via HTTP. It collects metrics from various subsystems including CPU, memory, disk I/O, network, and filesystem usage.

Unlike application-specific exporters, Node Exporter focuses on the underlying infrastructure. It provides insights into hardware utilization, system load, and resource availability that help you understand the foundation your applications run on.

## Installing Node Exporter on Linux

Download and install Node Exporter on your target hosts:

```bash
# Download the latest release
wget https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-amd64.tar.gz

# Extract the archive
tar xvfz node_exporter-1.7.0.linux-amd64.tar.gz

# Move binary to system path
sudo mv node_exporter-1.7.0.linux-amd64/node_exporter /usr/local/bin/

# Create systemd service file
sudo cat > /etc/systemd/system/node_exporter.service <<EOF
[Unit]
Description=Prometheus Node Exporter
After=network.target

[Service]
Type=simple
User=node_exporter
ExecStart=/usr/local/bin/node_exporter \
  --collector.filesystem.mount-points-exclude='^/(dev|proc|sys|var/lib/docker/.+)($|/)' \
  --collector.netclass.ignored-devices='^(veth.*)$'
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Create dedicated user
sudo useradd -rs /bin/false node_exporter

# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable node_exporter
sudo systemctl start node_exporter
```

Node Exporter now runs on port 9100 by default.

## Configuring Prometheus to Scrape Node Exporter

Add Node Exporter targets to your Prometheus configuration:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'node_exporter'
    static_configs:
      - targets:
          - 'node01.example.com:9100'
          - 'node02.example.com:9100'
          - 'node03.example.com:9100'
    relabel_configs:
      # Add hostname label from target address
      - source_labels: [__address__]
        regex: '([^:]+):.*'
        target_label: instance
        replacement: '$1'

      # Add environment label
      - target_label: environment
        replacement: 'production'
```

This configuration scrapes Node Exporter endpoints every 15 seconds and adds custom labels for better organization.

## Deploying Node Exporter on Kubernetes

Use a DaemonSet to run Node Exporter on every node in your cluster:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: node-exporter
  template:
    metadata:
      labels:
        app: node-exporter
    spec:
      hostNetwork: true
      hostPID: true
      hostIPC: true
      containers:
      - name: node-exporter
        image: prom/node-exporter:v1.7.0
        args:
          - '--path.procfs=/host/proc'
          - '--path.sysfs=/host/sys'
          - '--path.rootfs=/host/root'
          - '--collector.filesystem.mount-points-exclude=^/(dev|proc|sys|var/lib/docker/.+|var/lib/kubelet/.+)($|/)'
          - '--collector.netclass.ignored-devices=^(veth.*|cali.*|flannel.*|cni.*)$'
        ports:
        - containerPort: 9100
          hostPort: 9100
          name: metrics
        resources:
          limits:
            cpu: 200m
            memory: 200Mi
          requests:
            cpu: 100m
            memory: 100Mi
        volumeMounts:
        - name: proc
          mountPath: /host/proc
          readOnly: true
        - name: sys
          mountPath: /host/sys
          readOnly: true
        - name: root
          mountPath: /host/root
          readOnly: true
      volumes:
      - name: proc
        hostPath:
          path: /proc
      - name: sys
        hostPath:
          path: /sys
      - name: root
        hostPath:
          path: /
---
apiVersion: v1
kind: Service
metadata:
  name: node-exporter
  namespace: monitoring
  labels:
    app: node-exporter
spec:
  type: ClusterIP
  clusterIP: None
  ports:
  - name: metrics
    port: 9100
    targetPort: 9100
  selector:
    app: node-exporter
```

The DaemonSet ensures Node Exporter runs on every node, including nodes added to the cluster later.

## Enabling Specific Collectors

Node Exporter includes many collectors, but not all are enabled by default. Enable collectors based on your needs:

```bash
# Enable textfile collector for custom metrics
/usr/local/bin/node_exporter \
  --collector.textfile.directory=/var/lib/node_exporter/textfile \
  --collector.systemd \
  --collector.processes \
  --collector.tcpstat

# Create directory for textfile collector
sudo mkdir -p /var/lib/node_exporter/textfile
sudo chown node_exporter:node_exporter /var/lib/node_exporter/textfile
```

The textfile collector lets you expose custom metrics by writing files to the specified directory.

## Creating Custom Metrics with Textfile Collector

Generate custom metrics and expose them through Node Exporter:

```bash
#!/bin/bash
# /usr/local/bin/custom_metrics.sh

# Calculate custom metric
backup_age=$(find /var/backups -name "*.tar.gz" -mtime -1 | wc -l)

# Write metric to textfile
cat > /var/lib/node_exporter/textfile/backup_metrics.prom.$$  <<EOF
# HELP backup_recent_count Number of backup files modified in last 24 hours
# TYPE backup_recent_count gauge
backup_recent_count $backup_age
EOF

# Atomically move the file
mv /var/lib/node_exporter/textfile/backup_metrics.prom.$$ \
   /var/lib/node_exporter/textfile/backup_metrics.prom
```

Add this script to cron to update metrics regularly:

```bash
# Run every 5 minutes
*/5 * * * * /usr/local/bin/custom_metrics.sh
```

## Important Metrics to Monitor

Focus on these key Node Exporter metrics for system health:

```promql
# CPU usage percentage
100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory usage percentage
100 * (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes))

# Disk usage percentage
100 * (1 - (node_filesystem_avail_bytes{fstype!~"tmpfs|fuse.*"} /
            node_filesystem_size_bytes{fstype!~"tmpfs|fuse.*"}))

# Network receive bytes per second
rate(node_network_receive_bytes_total[5m])

# Disk I/O operations per second
rate(node_disk_io_time_seconds_total[5m])

# System load average
node_load1
node_load5
node_load15
```

These queries provide a comprehensive view of system resource utilization.

## Filtering Unwanted Metrics

Reduce cardinality by excluding irrelevant filesystems and network devices:

```bash
# Exclude virtual filesystems
--collector.filesystem.mount-points-exclude='^/(dev|proc|sys|var/lib/docker/.+|run/.+)($|/)'

# Ignore virtual network interfaces
--collector.netclass.ignored-devices='^(veth.*|docker.*|br-.*|cni.*)$'

# Exclude specific filesystem types
--collector.filesystem.fs-types-exclude='^(autofs|binfmt_misc|bpf|cgroup2?|configfs|debugfs|devpts|devtmpfs|fusectl|hugetlbfs|mqueue|nsfs|overlay|proc|procfs|pstore|rpc_pipefs|securityfs|selinuxfs|squashfs|sysfs|tracefs)$'
```

These exclusions reduce the number of metrics exported and improve Prometheus performance.

## Monitoring Node Exporter Health

Create alerts to detect Node Exporter failures:

```yaml
# prometheus-rules.yml
groups:
  - name: node_exporter
    interval: 30s
    rules:
      - alert: NodeExporterDown
        expr: up{job="node_exporter"} == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Node Exporter down on {{ $labels.instance }}"
          description: "Node Exporter has been down for more than 5 minutes"

      - alert: HighCPUUsage
        expr: 100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage on {{ $labels.instance }}"
          description: "CPU usage is {{ $value }}%"

      - alert: HighMemoryUsage
        expr: 100 * (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) > 90
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"
          description: "Memory usage is {{ $value }}%"
```

These alerts notify you when hosts experience resource pressure or when Node Exporter stops reporting.

## Securing Node Exporter

Node Exporter exposes sensitive system information. Protect it with TLS and authentication:

```yaml
# node_exporter_config.yml
tls_server_config:
  cert_file: /etc/node_exporter/cert.pem
  key_file: /etc/node_exporter/key.pem

basic_auth_users:
  prometheus: $2y$10$hashed_password_here
```

Start Node Exporter with the configuration:

```bash
/usr/local/bin/node_exporter \
  --web.config.file=/etc/node_exporter/node_exporter_config.yml
```

Update Prometheus to use authentication:

```yaml
scrape_configs:
  - job_name: 'node_exporter'
    scheme: https
    tls_config:
      ca_file: /etc/prometheus/ca.pem
    basic_auth:
      username: prometheus
      password: secure_password
    static_configs:
      - targets: ['node01.example.com:9100']
```

## Conclusion

Node Exporter provides comprehensive host-level metrics that are essential for infrastructure monitoring. By deploying it across your fleet and integrating it with Prometheus, you gain deep visibility into system resource utilization and can detect issues before they impact your applications.

Remember to filter unnecessary metrics to reduce cardinality, secure your endpoints with authentication, and create meaningful alerts based on the metrics that matter most to your infrastructure.
