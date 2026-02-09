# How to configure OpenTelemetry Collector receivers for metrics and traces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Observability, Metrics, Traces, Configuration

Description: Configure OpenTelemetry Collector receivers for collecting metrics and traces from various sources including OTLP, Prometheus, Jaeger, Zipkin, and host metrics with practical configuration examples.

---

Receivers are the entry point for telemetry data in the OpenTelemetry Collector. They accept data in various formats from different sources and convert it into the collector's internal representation. This guide covers configuring receivers for common observability scenarios, from application traces to infrastructure metrics.

## Understanding Receiver Types

Receivers fall into two main categories: push-based and pull-based. Push receivers listen on a port and accept data sent by instrumented applications or other collectors. Examples include OTLP, Jaeger, and Zipkin receivers. Pull receivers actively scrape or query external systems for telemetry. Examples include Prometheus and host metrics receivers.

Each receiver has specific configuration options for protocols, ports, authentication, and data format. The collector can run multiple receivers simultaneously, allowing it to accept telemetry from heterogeneous sources and normalize everything to OpenTelemetry format.

## Configuring OTLP Receiver

OTLP (OpenTelemetry Protocol) is the native protocol for OpenTelemetry. Configure it to accept traces, metrics, and logs:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        max_recv_msg_size_mib: 16
        max_concurrent_streams: 100
        read_buffer_size: 524288
        write_buffer_size: 524288
        keepalive:
          server_parameters:
            max_connection_idle: 5m
            max_connection_age: 30m
            max_connection_age_grace: 5m
            time: 2h
            timeout: 20s
      http:
        endpoint: 0.0.0.0:4318
        cors:
          allowed_origins:
          - https://frontend.example.com
          - https://app.example.com
          allowed_headers:
          - Content-Type
          - Authorization
          max_age: 7200

    # TLS configuration for secure communication
    # tls:
    #   cert_file: /certs/server.crt
    #   key_file: /certs/server.key
    #   client_ca_file: /certs/ca.crt
    #   min_version: "1.2"

exporters:
  logging:
    loglevel: debug

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [logging]
    metrics:
      receivers: [otlp]
      exporters: [logging]
```

Test the OTLP receiver:

```bash
# Send test trace via grpc
grpcurl -plaintext -d @ localhost:4317 \
  opentelemetry.proto.collector.trace.v1.TraceService/Export <<EOF
{
  "resource_spans": [{
    "resource": {
      "attributes": [{
        "key": "service.name",
        "value": {"string_value": "test-service"}
      }]
    },
    "scope_spans": [{
      "spans": [{
        "trace_id": "0123456789abcdef0123456789abcdef",
        "span_id": "0123456789abcdef",
        "name": "test-span",
        "kind": 1,
        "start_time_unix_nano": 1234567890000000000,
        "end_time_unix_nano": 1234567891000000000
      }]
    }]
  }]
}
EOF

# Check collector logs for received trace
kubectl logs -n observability -l app=otel-collector | grep "test-span"
```

## Configuring Prometheus Receiver

The Prometheus receiver scrapes metrics from endpoints exposing Prometheus format:

```yaml
receivers:
  prometheus:
    config:
      scrape_configs:
      - job_name: 'kubernetes-pods'
        kubernetes_sd_configs:
        - role: pod
        relabel_configs:
        # Only scrape pods with prometheus.io/scrape annotation
        - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
          action: keep
          regex: true
        # Use custom port if specified
        - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port]
          action: replace
          target_label: __address__
          regex: (.+)
          replacement: $1:${1}
        # Use custom path if specified
        - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
          action: replace
          target_label: __metrics_path__
          regex: (.+)
        # Add pod labels as metric labels
        - source_labels: [__meta_kubernetes_namespace]
          target_label: namespace
        - source_labels: [__meta_kubernetes_pod_name]
          target_label: pod
        - source_labels: [__meta_kubernetes_pod_label_app]
          target_label: app

      - job_name: 'kubernetes-nodes'
        kubernetes_sd_configs:
        - role: node
        relabel_configs:
        - source_labels: [__address__]
          regex: '(.*):10250'
          replacement: '${1}:9100'
          target_label: __address__
        - source_labels: [__meta_kubernetes_node_name]
          target_label: node

      - job_name: 'kubernetes-service-endpoints'
        kubernetes_sd_configs:
        - role: endpoints
        relabel_configs:
        - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_scrape]
          action: keep
          regex: true
        - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_path]
          action: replace
          target_label: __metrics_path__
          regex: (.+)
        - source_labels: [__address__, __meta_kubernetes_service_annotation_prometheus_io_port]
          action: replace
          target_label: __address__
          regex: ([^:]+)(?::\d+)?;(\d+)
          replacement: $1:$2

exporters:
  prometheusremotewrite:
    endpoint: http://prometheus:9090/api/v1/write

service:
  pipelines:
    metrics:
      receivers: [prometheus]
      exporters: [prometheusremotewrite]
```

Annotate pods to enable scraping:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: monitored-app
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "8080"
    prometheus.io/path: "/metrics"
spec:
  containers:
  - name: app
    image: myapp:latest
    ports:
    - containerPort: 8080
```

## Configuring Host Metrics Receiver

Collect system-level metrics from the host:

```yaml
receivers:
  hostmetrics:
    collection_interval: 30s
    scrapers:
      cpu:
        metrics:
          system.cpu.utilization:
            enabled: true
          system.cpu.time:
            enabled: true
      memory:
        metrics:
          system.memory.utilization:
            enabled: true
          system.memory.usage:
            enabled: true
      disk:
        metrics:
          system.disk.io:
            enabled: true
          system.disk.operations:
            enabled: true
      filesystem:
        metrics:
          system.filesystem.usage:
            enabled: true
          system.filesystem.utilization:
            enabled: true
        exclude_fs_types:
          match_type: regexp
          fs_types:
          - autofs
          - binfmt_misc
          - bpf
          - cgroup2?
          - configfs
          - debugfs
          - devpts
          - devtmpfs
          - fusectl
          - hugetlbfs
          - iso9660
          - mqueue
          - nsfs
          - overlay
          - proc
          - procfs
          - pstore
          - rpc_pipefs
          - securityfs
          - selinuxfs
          - squashfs
          - sysfs
          - tracefs
        exclude_mount_points:
          match_type: regexp
          mount_points:
          - /dev/*
          - /proc/*
          - /sys/*
          - /run/k3s/containerd/*
          - /var/lib/docker/*
          - /var/lib/kubelet/*
      network:
        metrics:
          system.network.io:
            enabled: true
          system.network.errors:
            enabled: true
          system.network.connections:
            enabled: true
      load:
        metrics:
          system.cpu.load_average.1m:
            enabled: true
          system.cpu.load_average.5m:
            enabled: true
          system.cpu.load_average.15m:
            enabled: true
      paging:
        metrics:
          system.paging.operations:
            enabled: true
      processes:
        metrics:
          system.processes.count:
            enabled: true
          system.processes.created:
            enabled: true

processors:
  resourcedetection:
    detectors: [env, system, docker, k8s]
    timeout: 5s

exporters:
  otlp:
    endpoint: otel-gateway:4317

service:
  pipelines:
    metrics:
      receivers: [hostmetrics]
      processors: [resourcedetection]
      exporters: [otlp]
```

## Configuring Jaeger Receiver

Accept traces from Jaeger clients:

```yaml
receivers:
  jaeger:
    protocols:
      grpc:
        endpoint: 0.0.0.0:14250
      thrift_http:
        endpoint: 0.0.0.0:14268
      thrift_compact:
        endpoint: 0.0.0.0:6831
      thrift_binary:
        endpoint: 0.0.0.0:6832

exporters:
  otlp:
    endpoint: otel-gateway:4317

service:
  pipelines:
    traces:
      receivers: [jaeger]
      exporters: [otlp]
```

Migrate Jaeger clients to send to collector:

```python
# Python example using Jaeger client
from jaeger_client import Config

config = Config(
    config={
        'sampler': {
            'type': 'const',
            'param': 1,
        },
        'local_agent': {
            'reporting_host': 'otel-collector',  # Collector address
            'reporting_port': 6831,
        },
    },
    service_name='my-service',
)
tracer = config.initialize_tracer()
```

## Configuring Zipkin Receiver

Accept traces from Zipkin clients:

```yaml
receivers:
  zipkin:
    endpoint: 0.0.0.0:9411

exporters:
  otlp:
    endpoint: otel-gateway:4317

service:
  pipelines:
    traces:
      receivers: [zipkin]
      exporters: [otlp]
```

## Configuring Kafka Receiver

Receive telemetry from Kafka topics:

```yaml
receivers:
  kafka:
    protocol_version: 2.8.0
    brokers:
    - kafka-1:9092
    - kafka-2:9092
    - kafka-3:9092
    topic: otlp_spans
    encoding: otlp_proto
    group_id: otel-collector
    auth:
      sasl:
        username: otel-collector
        password: ${env:KAFKA_PASSWORD}
        mechanism: SCRAM-SHA-512
      tls:
        insecure_skip_verify: false
        cert_file: /certs/client.crt
        key_file: /certs/client.key
        ca_file: /certs/ca.crt

exporters:
  otlp:
    endpoint: otel-gateway:4317

service:
  pipelines:
    traces:
      receivers: [kafka]
      exporters: [otlp]
```

## Configuring Kubeletstats Receiver

Collect Kubernetes container and pod metrics:

```yaml
receivers:
  kubeletstats:
    collection_interval: 30s
    auth_type: "serviceAccount"
    endpoint: "https://${env:K8S_NODE_NAME}:10250"
    insecure_skip_verify: true
    metric_groups:
    - node
    - pod
    - container
    - volume
    extra_metadata_labels:
    - container.id
    - k8s.volume.type

processors:
  k8sattributes:
    auth_type: "serviceAccount"
    passthrough: false
    extract:
      metadata:
      - k8s.namespace.name
      - k8s.pod.name
      - k8s.pod.uid
      - k8s.deployment.name
      - k8s.node.name
      labels:
      - tag_name: app
        key: app
        from: pod

exporters:
  otlp:
    endpoint: otel-gateway:4317

service:
  pipelines:
    metrics:
      receivers: [kubeletstats]
      processors: [k8sattributes]
      exporters: [otlp]
```

## Troubleshooting Receivers

Debug receiver issues:

```bash
# Check if receiver port is listening
kubectl exec -n observability deployment/otel-collector -- \
  netstat -tlnp | grep 4317

# Test connectivity to receiver
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  curl -v http://otel-collector:4318/v1/traces

# Enable debug logging
kubectl edit configmap otel-collector-config -n observability
# Add: service.telemetry.logs.level: debug

# View detailed logs
kubectl logs -n observability -l app=otel-collector -f | grep receiver
```

OpenTelemetry Collector receivers provide flexible ingestion of telemetry from diverse sources. By configuring appropriate receivers and understanding their options, you can consolidate observability data from legacy systems, cloud services, and modern instrumentation into a unified pipeline.
