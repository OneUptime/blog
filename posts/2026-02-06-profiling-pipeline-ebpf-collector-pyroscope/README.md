# How to Build a Complete Profiling Pipeline: eBPF Agent to Collector to Pyroscope Backend

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, eBPF, Profiling, Pyroscope

Description: Build an end-to-end profiling pipeline from eBPF agent through OpenTelemetry Collector to Pyroscope storage backend.

Setting up individual profiling components is one thing. Wiring them together into a production-grade pipeline that is reliable, scalable, and easy to operate is another. This post walks through building a complete profiling pipeline: from the eBPF profiling agent that captures stack samples, through the OpenTelemetry Collector that processes and routes them, to the Pyroscope backend that stores and serves them.

## Architecture Overview

The pipeline has three stages:

```
[eBPF Profiler Agent]  -->  [OTel Collector]  -->  [Pyroscope Backend]
   (per host)              (gateway/pool)         (storage + query)
```

The eBPF agent runs as a DaemonSet (one per node in Kubernetes) or as a systemd service on bare metal. It captures CPU stack samples from all target processes on the host and exports them as OpenTelemetry profiles to the Collector.

The Collector acts as a gateway. It receives profiles from multiple agents, enriches them with metadata, batches them, and exports them to Pyroscope.

Pyroscope stores the profiles and provides the query API used by Grafana for visualization.

## Stage 1: eBPF Profiler Agent DaemonSet

```yaml
# profiler-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: otel-ebpf-profiler
  namespace: observability
spec:
  selector:
    matchLabels:
      app: otel-ebpf-profiler
  template:
    metadata:
      labels:
        app: otel-ebpf-profiler
    spec:
      hostPID: true
      containers:
        - name: profiler
          image: ghcr.io/open-telemetry/opentelemetry-ebpf-profiler:v0.8.0
          env:
            - name: OTEL_EXPORTER_OTLP_ENDPOINT
              value: "http://otel-collector-gateway.observability:4317"
            - name: OTEL_PROFILER_SAMPLING_FREQUENCY
              value: "19"
            - name: OTEL_PROFILER_MAX_STACK_DEPTH
              value: "64"
            - name: NODE_NAME
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName
            - name: OTEL_RESOURCE_ATTRIBUTES
              value: "host.name=$(NODE_NAME)"
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
          securityContext:
            privileged: true
          volumeMounts:
            - name: sys-kernel
              mountPath: /sys/kernel
              readOnly: true
            - name: lib-modules
              mountPath: /lib/modules
              readOnly: true
            - name: proc
              mountPath: /proc
              readOnly: true
      volumes:
        - name: sys-kernel
          hostPath:
            path: /sys/kernel
        - name: lib-modules
          hostPath:
            path: /lib/modules
        - name: proc
          hostPath:
            path: /proc
      tolerations:
        - operator: Exists
```

The `hostPID: true` setting lets the profiler see all processes on the node. The `tolerations` section ensures the profiler runs on every node, including those with taints.

## Stage 2: OpenTelemetry Collector Gateway

Deploy the Collector as a Deployment (not a DaemonSet) to act as a centralized gateway:

```yaml
# collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        # Allow larger messages for profile data
        max_recv_msg_size_mib: 16

processors:
  # Add Kubernetes metadata to profiles
  k8sattributes:
    auth_type: serviceAccount
    extract:
      metadata:
        - k8s.namespace.name
        - k8s.pod.name
        - k8s.deployment.name
        - k8s.container.name
    pod_association:
      - sources:
          - from: resource_attribute
            name: host.name

  # Batch profiles to reduce export overhead
  batch:
    timeout: 15s
    send_batch_size: 1000
    send_batch_max_size: 2000

  # Limit memory usage
  memory_limiter:
    check_interval: 5s
    limit_mib: 1024
    spike_limit_mib: 256

exporters:
  otlphttp/pyroscope:
    endpoint: http://pyroscope.observability:4040
    tls:
      insecure: true
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 60s
      max_elapsed_time: 300s

service:
  pipelines:
    profiles:
      receivers: [otlp]
      processors: [memory_limiter, k8sattributes, batch]
      exporters: [otlphttp/pyroscope]
```

```yaml
# collector-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector-gateway
  namespace: observability
spec:
  replicas: 2
  selector:
    matchLabels:
      app: otel-collector-gateway
  template:
    metadata:
      labels:
        app: otel-collector-gateway
    spec:
      containers:
        - name: collector
          image: otel/opentelemetry-collector-contrib:0.96.0
          args: ["--config=/etc/otel/config.yaml"]
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: "2"
              memory: 2Gi
          volumeMounts:
            - name: config
              mountPath: /etc/otel
      volumes:
        - name: config
          configMap:
            name: otel-collector-config
```

## Stage 3: Pyroscope Backend

Deploy Pyroscope with persistent storage:

```yaml
# pyroscope-deployment.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: pyroscope
  namespace: observability
spec:
  replicas: 1
  selector:
    matchLabels:
      app: pyroscope
  template:
    metadata:
      labels:
        app: pyroscope
    spec:
      containers:
        - name: pyroscope
          image: grafana/pyroscope:1.7.0
          args:
            - "-config.file=/etc/pyroscope/config.yaml"
          ports:
            - containerPort: 4040
          volumeMounts:
            - name: data
              mountPath: /data
            - name: config
              mountPath: /etc/pyroscope
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 50Gi
```

Pyroscope configuration:

```yaml
# pyroscope-config.yaml
storage:
  backend: filesystem
  filesystem:
    dir: /data

# Retention: keep 7 days of profiles
limits:
  max_query_lookback: 168h

server:
  http_listen_port: 4040
```

## Verifying the Pipeline

After deploying all three stages, verify data is flowing:

```bash
# Check that the profiler agents are running on all nodes
kubectl get pods -n observability -l app=otel-ebpf-profiler

# Check collector logs for incoming profile data
kubectl logs -n observability deployment/otel-collector-gateway | grep profiles

# Query Pyroscope directly to confirm data is arriving
curl http://pyroscope.observability:4040/api/v1/labels
# Should return labels like "service_name", "host.name", etc.
```

## Scaling Considerations

For large clusters (100+ nodes), the Collector gateway can become a bottleneck. Scale it horizontally by increasing replicas and placing a load balancer in front. Use the Collector's built-in load balancing exporter if you run multiple Pyroscope instances.

For storage, Pyroscope supports object storage backends (S3, GCS) for long-term retention. Switch from filesystem to S3 for clusters generating more than a few GB of profile data per day.

This three-stage architecture gives you a clean separation of concerns: collection, processing, and storage. Each stage can be scaled, monitored, and upgraded independently.
