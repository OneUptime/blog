# How to Monitor Podman VM Resource Usage and Running Container Metrics via the

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Podman, Metric, VM Monitoring

Description: Monitor Podman machine VM resource usage and per-container metrics using the OpenTelemetry Collector with the Docker-compatible API.

On macOS and Windows, Podman runs containers inside a lightweight Linux VM managed by `podman machine`. Monitoring both the VM's resource usage and individual container metrics gives you full visibility into your Podman environment. The OpenTelemetry Collector can collect both layers of metrics through the Podman API and host metrics receivers.

## Understanding the Podman Machine Architecture

When you run `podman machine init` and `podman machine start`, Podman creates a Linux VM (typically using QEMU or Apple Virtualization on macOS, or WSL/Hyper-V on Windows). Containers run inside this VM, so resource consumption happens at two levels: the VM itself consumes host resources, and containers consume VM resources.

```bash
# Check your Podman machine status

podman machine info

# See resource allocation
podman machine inspect
```

## Collecting VM-Level Metrics

The VM appears as a process on your host system. You can monitor its resource footprint using the host metrics receiver:

```yaml
# collector-config.yaml
receivers:
  # Monitor the host system where the Podman VM runs
  hostmetrics:
    collection_interval: 15s
    scrapers:
      cpu:
        metrics:
          system.cpu.utilization:
            enabled: true
      memory:
        metrics:
          system.memory.utilization:
            enabled: true
      disk: {}
      network: {}
      process:
        # Filter to only the Podman VM process
        include:
          match_type: regexp
          names: ["qemu.*", "vfkit.*", "vmmem.*", "podman.*"]
        metrics:
          process.cpu.utilization:
            enabled: true
          process.memory.physical_usage:
            enabled: true

processors:
  batch:
    timeout: 10s

  # Tag all metrics with the Podman machine name
  resource:
    attributes:
      - key: podman.machine
        value: "podman-machine-default"
        action: upsert

exporters:
  otlp:
    endpoint: "your-backend:4317"
    tls:
      insecure: false

service:
  pipelines:
    metrics:
      receivers: [hostmetrics]
      processors: [resource, batch]
      exporters: [otlp]
```

The process scraper filters for QEMU, vfkit, or WSL VM processes (the VM providers used by Podman). This tells you how much host CPU and memory the entire Podman VM is consuming.

## Collecting Per-Container Metrics

For container-level metrics, use the `docker_stats` receiver pointed at the Podman socket. The `docker_stats` receiver is supported by the Linux build of the OpenTelemetry Collector, so run it inside the Podman machine or another Linux environment that can access the Podman socket. On macOS, Docker-compatible clients can use the forwarded machine socket path:

```bash
# Check the forwarded socket path (macOS)
podman machine inspect --format '{{.ConnectionInfo.PodmanSocket.Path}}'

# Use that socket with Docker-compatible clients
export DOCKER_HOST="unix://$(podman machine inspect --format '{{.ConnectionInfo.PodmanSocket.Path}}')"
```

Then configure the Collector to use the socket path that is available where the Collector is running:

```yaml
receivers:
  docker_stats:
    endpoint: unix:///var/run/docker.sock
    collection_interval: 15s
    metrics:
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
```

## Running the Collector Inside the Podman Machine

For the most reliable metrics collection, run the Collector inside the Podman machine itself:

```bash
# SSH into the Podman machine
podman machine ssh

# Inside the VM, the socket is at the standard location
ls -la "${XDG_RUNTIME_DIR}/podman/podman.sock"
```

Then run the Collector as a Podman container with socket access:

```bash
podman run -d \
  --name otel-collector \
  -u 0 \
  --security-opt label=disable \
  -v "${XDG_RUNTIME_DIR}/podman/podman.sock:/var/run/docker.sock" \
  -v ./collector-config.yaml:/etc/otelcol-contrib/config.yaml:Z \
  -p 4317:4317 \
  docker.io/otel/opentelemetry-collector-contrib:latest
```

## Combined Configuration

Here is a full config that collects both VM-level host metrics and per-container metrics:

```yaml
receivers:
  hostmetrics:
    collection_interval: 15s
    scrapers:
      cpu: {}
      memory: {}
      disk: {}
      network: {}
      filesystem: {}

  docker_stats:
    endpoint: unix:///var/run/docker.sock
    collection_interval: 15s
    container_labels_to_metric_labels:
      # Map Podman labels to metric attributes
      app: service.name

  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s
    send_batch_size: 200

  memory_limiter:
    check_interval: 1s
    limit_mib: 128

  resource:
    attributes:
      - key: container.runtime
        value: "podman"
        action: upsert

exporters:
  otlp:
    endpoint: "your-backend:4317"
    tls:
      insecure: false

service:
  pipelines:
    metrics/host:
      receivers: [hostmetrics]
      processors: [resource, batch]
      exporters: [otlp]
    metrics/containers:
      receivers: [docker_stats]
      processors: [resource, batch]
      exporters: [otlp]
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp]
```

Notice the two separate metrics pipelines. This keeps VM-level and container-level metrics processing independent.

## Querying Podman Machine Stats Programmatically

You can also query Podman machine stats via the CLI for custom metrics:

```python
import subprocess
import json

# Get Podman machine info
result = subprocess.run(
    ["podman", "machine", "inspect"],
    capture_output=True, text=True
)
machine_info = json.loads(result.stdout)

# Extract resource allocation
for machine in machine_info:
    print(f"Machine: {machine['Name']}")
    print(f"  CPUs: {machine['Resources']['CPUs']}")
    print(f"  Memory: {machine['Resources']['Memory']} MB")
    print(f"  Disk: {machine['Resources']['DiskSize']} GB")
```

## Monitoring Tips

Set alerts on these key thresholds:

- **VM CPU**: If the VM is consistently above 85% CPU, increase the allocated CPUs with `podman machine set --cpus 4` on QEMU-backed machines.
- **VM Memory**: If memory pressure is high, increase with `podman machine set --memory 4096` on QEMU-backed machines.
- **Container memory percent**: If a container hits its memory limit, it will be killed. Alert at 80%.
- **Disk usage**: Container images and volumes can fill the VM disk. Monitor filesystem usage.

## Summary

Monitoring Podman requires attention to both the VM layer and the container layer. The host metrics receiver tracks VM resource consumption, while the docker_stats receiver (using Podman's Docker-compatible API) provides per-container metrics. Running the Collector inside the Podman machine gives the most reliable access to both data sources.
