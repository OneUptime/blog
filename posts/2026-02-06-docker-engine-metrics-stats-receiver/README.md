# How to Monitor Docker Engine Metrics (CPU, Memory, Network, Block I/O per Container) with the Docker Stats Receiver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Docker, Metrics, Docker Stats Receiver

Description: Monitor per-container CPU, memory, network, and block I/O metrics from the Docker engine using the OpenTelemetry Collector Docker stats receiver.

The OpenTelemetry Collector's `docker_stats` receiver connects to the Docker daemon API and collects per-container resource metrics. This gives you real-time visibility into CPU usage, memory consumption, network throughput, and block I/O for every running container. It is the equivalent of running `docker stats` but with the data flowing into your observability pipeline.

## How the Docker Stats Receiver Works

The receiver queries the Docker engine API (via the Unix socket at `/var/run/docker.sock`) at a configurable interval. For each running container, it collects the same metrics you see in `docker stats`, then converts them to OpenTelemetry metric format. The receiver runs inside the Collector, so you do not need to install any agents inside your application containers.

## Collector Configuration

Here is a complete Collector configuration using the Docker stats receiver:

```yaml
receivers:
  docker_stats:
    # Docker API endpoint
    endpoint: unix:///var/run/docker.sock
    # How often to collect metrics (default is 10s)
    collection_interval: 15s
    # Timeout for Docker API calls
    timeout: 10s
    # Only collect metrics for containers with these labels
    # Omit this to collect for all containers
    # container_labels_to_metric_labels:
    #   com.docker.compose.service: service_name
    # Include specific metrics you care about
    metrics:
      container.cpu.usage.total:
        enabled: true
      container.cpu.usage.percpu:
        enabled: true
      container.cpu.percent:
        enabled: true
      container.memory.usage.total:
        enabled: true
      container.memory.usage.limit:
        enabled: true
      container.memory.percent:
        enabled: true
      container.network.io.usage.rx_bytes:
        enabled: true
      container.network.io.usage.tx_bytes:
        enabled: true
      container.blockio.io_service_bytes_recursive:
        enabled: true

processors:
  batch:
    timeout: 10s
    send_batch_size: 200

  # Convert container labels to resource attributes
  resource:
    attributes:
      - key: host.name
        from_attribute: ""
        action: upsert
        value: "docker-host-01"

exporters:
  otlp:
    endpoint: "your-metrics-backend:4317"
    tls:
      insecure: false

  # Debug exporter for development
  logging:
    loglevel: debug

service:
  pipelines:
    metrics:
      receivers: [docker_stats]
      processors: [resource, batch]
      exporters: [otlp]
```

## Running the Collector with Docker Socket Access

The Collector needs access to the Docker socket. Run it with:

```bash
docker run -d \
  --name otel-collector \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v ./otel-collector-config.yaml:/etc/otelcol-contrib/config.yaml \
  otel/opentelemetry-collector-contrib:latest
```

The `:ro` flag makes the mount read-only. The Collector only reads from the API and never modifies container state.

## Understanding the Metrics

Here is what each metric category tells you:

### CPU Metrics

```
container.cpu.usage.total     - Total CPU time consumed in nanoseconds
container.cpu.percent         - CPU usage as a percentage of available CPU
container.cpu.usage.percpu    - CPU time per individual CPU core
```

The percent metric is most useful for dashboards and alerting. Values above 80% sustained may indicate the container needs more CPU resources.

### Memory Metrics

```
container.memory.usage.total  - Current memory usage in bytes
container.memory.usage.limit  - Memory limit set on the container
container.memory.percent      - Memory usage as a percentage of the limit
```

When `container.memory.percent` approaches 100%, the container is at risk of being OOM-killed by the kernel.

### Network Metrics

```
container.network.io.usage.rx_bytes  - Bytes received
container.network.io.usage.tx_bytes  - Bytes transmitted
```

These are cumulative counters. Calculate the rate of change to get bytes per second.

### Block I/O Metrics

```
container.blockio.io_service_bytes_recursive  - Bytes read/written to block devices
```

High block I/O can indicate disk-intensive workloads or containers that are swapping memory to disk.

## Mapping Container Labels to Metric Labels

Docker Compose adds labels like `com.docker.compose.service` and `com.docker.compose.project` to containers. You can map these to metric labels:

```yaml
receivers:
  docker_stats:
    endpoint: unix:///var/run/docker.sock
    collection_interval: 15s
    # Map Docker labels to OpenTelemetry resource attributes
    container_labels_to_metric_labels:
      com.docker.compose.service: compose_service
      com.docker.compose.project: compose_project
    env_vars_to_metric_labels:
      OTEL_SERVICE_NAME: service.name
```

This lets you filter and group metrics by Compose service name in your dashboards.

## Setting Up Alerts

With these metrics flowing into your backend, set up alerts for common failure scenarios:

```yaml
# Example alert rules (Prometheus format for reference)
# CPU usage above 90% for 5 minutes
- alert: ContainerHighCPU
  expr: container_cpu_percent > 90
  for: 5m

# Memory usage above 85% of limit
- alert: ContainerMemoryPressure
  expr: container_memory_percent > 85
  for: 2m

# No network traffic for 5 minutes (possible dead container)
- alert: ContainerNoNetworkTraffic
  expr: rate(container_network_io_usage_rx_bytes[5m]) == 0
  for: 5m
```

## Excluding Specific Containers

You may not want metrics for every container. Use label filters to exclude infrastructure containers:

```yaml
receivers:
  docker_stats:
    endpoint: unix:///var/run/docker.sock
    collection_interval: 15s
    # Only monitor containers with this label
    container_labels_to_metric_labels:
      monitoring.enabled: ""
    excluded_images:
      - "otel/opentelemetry-collector-contrib"
      - "grafana/grafana"
```

## Summary

The Docker stats receiver gives you per-container CPU, memory, network, and I/O metrics without touching your application code. Mount the Docker socket into the Collector, configure which metrics you need, and set up alerts on the critical thresholds. This approach works for any Docker host, whether you are running standalone containers or Docker Compose stacks.
