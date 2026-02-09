# How to Deploy NATS Surveyor for Real-Time NATS Cluster Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NATS, Monitoring, Kubernetes

Description: Learn how to deploy and configure NATS Surveyor for comprehensive real-time monitoring of NATS clusters with Prometheus metrics, Grafana dashboards, and performance insights.

---

NATS Surveyor is the official monitoring tool for NATS clusters, providing detailed insights into cluster health, message flow, connection statistics, and performance metrics. Running on Kubernetes, Surveyor integrates seamlessly with Prometheus and Grafana to deliver production-grade observability for your NATS infrastructure.

This guide covers deploying NATS Surveyor alongside your NATS cluster with comprehensive monitoring configuration.

## Understanding NATS Surveyor Architecture

NATS Surveyor works by polling NATS server monitoring endpoints and exposing metrics in Prometheus format. It collects data about:

- Server connections and subscriptions
- Message rates and byte rates
- Subject statistics and slow consumers
- JetStream metrics (streams, consumers, storage)
- Cluster routing and gateway information
- Client connection details

Unlike passive monitoring, Surveyor actively queries NATS servers for detailed statistics, providing deeper insights than basic metrics exporters.

## Deploying NATS with Monitoring Enabled

First, deploy NATS with monitoring endpoints enabled:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nats-config
  namespace: nats-system
data:
  nats.conf: |
    port: 4222
    http_port: 8222

    # Enable JetStream
    jetstream {
      store_dir: /data/jetstream
      max_mem: 1G
      max_file: 10G
    }

    # Cluster configuration
    cluster {
      name: nats-cluster
      port: 6222
      routes = [
        nats://nats-0.nats:6222
        nats://nats-1.nats:6222
        nats://nats-2.nats:6222
      ]
    }

    # Enable detailed monitoring
    server_name: $POD_NAME
    server_tags: [
      "namespace:nats-system",
      "cluster:nats-cluster"
    ]
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: nats
  namespace: nats-system
spec:
  serviceName: nats
  replicas: 3
  selector:
    matchLabels:
      app: nats
  template:
    metadata:
      labels:
        app: nats
    spec:
      containers:
      - name: nats
        image: nats:2.10-alpine
        ports:
        - containerPort: 4222
          name: client
        - containerPort: 6222
          name: cluster
        - containerPort: 8222
          name: monitor
        env:
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        command:
        - nats-server
        - --config
        - /etc/nats-config/nats.conf
        volumeMounts:
        - name: config
          mountPath: /etc/nats-config
        - name: data
          mountPath: /data
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
      volumes:
      - name: config
        configMap:
          name: nats-config
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 50Gi
---
apiVersion: v1
kind: Service
metadata:
  name: nats
  namespace: nats-system
spec:
  clusterIP: None
  selector:
    app: nats
  ports:
  - name: client
    port: 4222
  - name: cluster
    port: 6222
  - name: monitor
    port: 8222
```

## Deploying NATS Surveyor

Deploy Surveyor to collect and expose NATS metrics:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: nats-surveyor
  namespace: nats-system
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nats-surveyor
  namespace: nats-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nats-surveyor
  template:
    metadata:
      labels:
        app: nats-surveyor
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "7777"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: nats-surveyor
      containers:
      - name: surveyor
        image: natsio/nats-surveyor:0.5.0
        ports:
        - containerPort: 7777
          name: metrics
        args:
        - -varz
        - -connz
        - -routez
        - -subz
        - -gatewayz
        - -healthz
        - -jsz=all
        - -observe
        - nats://nats-0.nats:8222
        - nats://nats-1.nats:8222
        - nats://nats-2.nats:8222
        env:
        - name: NATS_SURVEYOR_SERVERS
          value: "nats://nats:4222"
        - name: NATS_SURVEYOR_JETSTREAM
          value: "true"
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        livenessProbe:
          httpGet:
            path: /healthz
            port: 7777
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /metrics
            port: 7777
          initialDelaySeconds: 5
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: nats-surveyor
  namespace: nats-system
  labels:
    app: nats-surveyor
spec:
  type: ClusterIP
  ports:
  - port: 7777
    targetPort: 7777
    name: metrics
  selector:
    app: nats-surveyor
```

## Configuring Prometheus ServiceMonitor

Create a ServiceMonitor for Prometheus Operator:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: nats-surveyor
  namespace: nats-system
  labels:
    app: nats-surveyor
spec:
  selector:
    matchLabels:
      app: nats-surveyor
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
    relabelings:
    - sourceLabels: [__meta_kubernetes_pod_name]
      targetLabel: pod
    - sourceLabels: [__meta_kubernetes_namespace]
      targetLabel: namespace
```

## Setting Up Grafana Dashboards

Import the official NATS Surveyor dashboard or create a custom one:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nats-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  nats-surveyor-dashboard.json: |
    {
      "dashboard": {
        "title": "NATS Cluster Overview",
        "panels": [
          {
            "title": "Server Status",
            "type": "stat",
            "targets": [{
              "expr": "nats_core_server_info",
              "legendFormat": "{{server_name}}"
            }]
          },
          {
            "title": "Message Rate (msg/sec)",
            "type": "graph",
            "targets": [{
              "expr": "rate(nats_core_in_msgs[5m])",
              "legendFormat": "In - {{server_name}}"
            }, {
              "expr": "rate(nats_core_out_msgs[5m])",
              "legendFormat": "Out - {{server_name}}"
            }]
          },
          {
            "title": "Byte Rate (bytes/sec)",
            "type": "graph",
            "targets": [{
              "expr": "rate(nats_core_in_bytes[5m])",
              "legendFormat": "In - {{server_name}}"
            }, {
              "expr": "rate(nats_core_out_bytes[5m])",
              "legendFormat": "Out - {{server_name}}"
            }]
          },
          {
            "title": "Active Connections",
            "type": "graph",
            "targets": [{
              "expr": "nats_core_total_connections",
              "legendFormat": "{{server_name}}"
            }]
          },
          {
            "title": "Active Subscriptions",
            "type": "graph",
            "targets": [{
              "expr": "nats_core_total_subscriptions",
              "legendFormat": "{{server_name}}"
            }]
          },
          {
            "title": "Slow Consumers",
            "type": "graph",
            "targets": [{
              "expr": "nats_core_slow_consumers",
              "legendFormat": "{{server_name}}"
            }]
          },
          {
            "title": "JetStream Storage Used",
            "type": "graph",
            "targets": [{
              "expr": "nats_jetstream_store_bytes",
              "legendFormat": "{{server_name}} - {{stream}}"
            }]
          },
          {
            "title": "JetStream Messages Stored",
            "type": "graph",
            "targets": [{
              "expr": "nats_jetstream_store_msgs",
              "legendFormat": "{{server_name}} - {{stream}}"
            }]
          },
          {
            "title": "CPU Usage",
            "type": "graph",
            "targets": [{
              "expr": "nats_core_cpu",
              "legendFormat": "{{server_name}}"
            }]
          },
          {
            "title": "Memory Usage",
            "type": "graph",
            "targets": [{
              "expr": "nats_core_mem",
              "legendFormat": "{{server_name}}"
            }]
          }
        ]
      }
    }
```

## Creating Alerting Rules

Define Prometheus alerting rules for NATS:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: nats-alerts
  namespace: nats-system
spec:
  groups:
  - name: nats.rules
    interval: 30s
    rules:
    - alert: NATSServerDown
      expr: up{job="nats-surveyor"} == 0
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "NATS server is down"
        description: "NATS server {{ $labels.instance }} has been down for 1 minute"

    - alert: NATSSlowConsumer
      expr: nats_core_slow_consumers > 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Slow consumers detected"
        description: "{{ $value }} slow consumers on {{ $labels.server_name }}"

    - alert: NATSHighConnectionCount
      expr: nats_core_total_connections > 10000
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High number of connections"
        description: "{{ $labels.server_name }} has {{ $value }} connections"

    - alert: NATSJetStreamStorageHigh
      expr: (nats_jetstream_store_bytes / nats_jetstream_config_max_storage) > 0.8
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "JetStream storage usage high"
        description: "Stream {{ $labels.stream }} is at {{ $value | humanizePercentage }} capacity"

    - alert: NATSJetStreamConsumerLagging
      expr: nats_jetstream_consumer_num_pending > 10000
      for: 15m
      labels:
        severity: warning
      annotations:
        summary: "JetStream consumer lagging"
        description: "Consumer {{ $labels.consumer }} has {{ $value }} pending messages"

    - alert: NATSHighMemoryUsage
      expr: (nats_core_mem / nats_core_mem_max) > 0.85
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High memory usage"
        description: "{{ $labels.server_name }} memory at {{ $value | humanizePercentage }}"

    - alert: NATSHighCPUUsage
      expr: nats_core_cpu > 80
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "High CPU usage"
        description: "{{ $labels.server_name }} CPU at {{ $value }}%"

    - alert: NATSClusterSplitBrain
      expr: count(nats_core_server_info) != count(nats_core_route_connections)
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "Potential cluster split brain"
        description: "NATS cluster may be partitioned"
```

## Monitoring JetStream Streams and Consumers

Query specific JetStream metrics:

```promql
# Stream message rate
rate(nats_jetstream_stream_msg_count[5m])

# Consumer delivery rate
rate(nats_jetstream_consumer_delivered_count[5m])

# Consumer acknowledgment rate
rate(nats_jetstream_consumer_ack_count[5m])

# Stream storage usage by stream
nats_jetstream_stream_bytes

# Consumer lag
nats_jetstream_consumer_num_pending

# Failed deliveries
nats_jetstream_consumer_num_redelivered
```

## Advanced Surveyor Configuration

For larger deployments, configure Surveyor with additional options:

```yaml
env:
- name: NATS_SURVEYOR_OBSERVE_ONLY
  value: "true"  # Don't poll, only observe service latency

- name: NATS_SURVEYOR_ACCOUNTS
  value: "true"  # Include account-specific metrics

- name: NATS_SURVEYOR_COUNT_CONNECTIONS
  value: "true"  # Count connections per account

- name: NATS_SURVEYOR_POLL_TIMEOUT
  value: "3s"  # Polling timeout

- name: NATS_SURVEYOR_EXPECTED_SERVERS
  value: "3"  # Number of servers to expect

- name: NATS_SURVEYOR_CREDS
  value: "/etc/nats-creds/surveyor.creds"  # Use NATS credentials

volumeMounts:
- name: nats-creds
  mountPath: /etc/nats-creds
  readOnly: true
```

## Troubleshooting with Surveyor

Use Surveyor metrics to diagnose common issues:

```bash
# Check if all servers are reporting
kubectl exec -it nats-surveyor-xxx -n nats-system -- \
  curl -s localhost:7777/metrics | grep nats_core_server_info

# View slow consumers
kubectl exec -it nats-surveyor-xxx -n nats-system -- \
  curl -s localhost:7777/metrics | grep nats_core_slow_consumers

# Check JetStream storage
kubectl exec -it nats-surveyor-xxx -n nats-system -- \
  curl -s localhost:7777/metrics | grep nats_jetstream_store

# View connection counts
kubectl exec -it nats-surveyor-xxx -n nats-system -- \
  curl -s localhost:7777/metrics | grep nats_core_total_connections
```

## Best Practices

Follow these practices for effective NATS monitoring with Surveyor:

1. Deploy Surveyor with high availability (consider multiple replicas)
2. Use service discovery to automatically detect NATS servers
3. Configure appropriate scrape intervals (30s default)
4. Set memory limits based on cluster size
5. Enable JetStream monitoring for stream-based workloads
6. Monitor surveyor itself for collection failures
7. Use recording rules for frequently queried metrics
8. Implement multi-level alerting (warning, critical)
9. Export metrics to long-term storage for capacity planning
10. Regularly review and update alert thresholds

## Conclusion

NATS Surveyor provides comprehensive monitoring capabilities for NATS clusters running on Kubernetes. By exposing detailed metrics in Prometheus format, Surveyor enables you to track cluster health, identify performance bottlenecks, and respond to issues proactively. Combined with Grafana dashboards and Prometheus alerting, Surveyor forms the foundation of production-grade observability for NATS-based messaging systems.

Key capabilities include real-time server and connection monitoring, JetStream stream and consumer metrics, slow consumer detection, cluster health visibility, and integration with existing Prometheus and Grafana infrastructure. With proper monitoring in place, you can maintain reliable NATS clusters that scale with your application demands.
