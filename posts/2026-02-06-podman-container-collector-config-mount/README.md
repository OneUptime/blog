# How to Run the OpenTelemetry Collector as a Podman Container with Config Mount and Podman API Socket Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Podman, Collector, Container

Description: Run the OpenTelemetry Collector as a rootless Podman container with configuration file mounts and Podman API socket access for container monitoring.

Podman is a daemonless container engine that runs containers without a central daemon process. Unlike Docker, Podman runs containers in rootless mode by default, which changes how you mount configuration files and access the container API socket. This post covers how to run the OpenTelemetry Collector in Podman with the right volume mounts and socket access.

## Enabling the Podman API Socket

Podman does not run a persistent daemon like Docker. Instead, it provides an on-demand API socket through systemd. Enable it for your user:

```bash
# Enable the Podman socket for the current user (rootless mode)
systemctl --user enable --now podman.socket

# Verify the socket is active
systemctl --user status podman.socket

# Check the socket path
echo $XDG_RUNTIME_DIR/podman/podman.sock
```

The socket path is typically `/run/user/1000/podman/podman.sock` for user ID 1000. For rootful Podman, the socket lives at `/run/podman/podman.sock`.

## Creating the Collector Configuration

Write your Collector config file:

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

  # Use the Docker stats receiver - it works with Podman's Docker-compatible API
  docker_stats:
    endpoint: unix:///run/podman/podman.sock
    collection_interval: 15s

processors:
  batch:
    timeout: 5s
    send_batch_size: 256

  memory_limiter:
    check_interval: 1s
    limit_mib: 256
    spike_limit_mib: 64

exporters:
  otlp:
    endpoint: "your-backend:4317"
    tls:
      insecure: false

  logging:
    loglevel: info

extensions:
  health_check:
    endpoint: 0.0.0.0:13133

service:
  extensions: [health_check]
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp]
    metrics:
      receivers: [docker_stats]
      processors: [memory_limiter, batch]
      exporters: [otlp]
```

The `docker_stats` receiver works with Podman because Podman implements the Docker-compatible API. You just need to point it at the Podman socket instead of the Docker socket.

## Running the Collector in Rootless Mode

For rootless Podman, mount the user-level socket:

```bash
# Get the runtime directory for your user
RUNTIME_DIR=$(echo $XDG_RUNTIME_DIR)

podman run -d \
  --name otel-collector \
  -v ./otel-collector-config.yaml:/etc/otelcol-contrib/config.yaml:Z \
  -v ${RUNTIME_DIR}/podman/podman.sock:/run/podman/podman.sock:Z \
  -p 4317:4317 \
  -p 4318:4318 \
  -p 13133:13133 \
  docker.io/otel/opentelemetry-collector-contrib:latest \
  --config /etc/otelcol-contrib/config.yaml
```

Notice the `:Z` suffix on the volume mounts. This tells Podman to relabel the file for SELinux access. Without it, the Collector process inside the container cannot read the mounted files on SELinux-enforcing systems like Fedora or RHEL.

## Running the Collector in Rootful Mode

For rootful Podman (running as root), use the system socket:

```bash
sudo podman run -d \
  --name otel-collector \
  -v ./otel-collector-config.yaml:/etc/otelcol-contrib/config.yaml:Z \
  -v /run/podman/podman.sock:/run/podman/podman.sock:Z \
  -p 4317:4317 \
  -p 4318:4318 \
  docker.io/otel/opentelemetry-collector-contrib:latest \
  --config /etc/otelcol-contrib/config.yaml
```

## Using a Podman Pod

Podman supports pods, which group containers that share a network namespace. This is useful when the Collector needs to communicate with application containers over localhost:

```bash
# Create a pod with published ports
podman pod create \
  --name observability-pod \
  -p 4317:4317 \
  -p 4318:4318 \
  -p 8080:8080

# Run the Collector in the pod
podman run -d \
  --pod observability-pod \
  --name otel-collector \
  -v ./otel-collector-config.yaml:/etc/otelcol-contrib/config.yaml:Z \
  docker.io/otel/opentelemetry-collector-contrib:latest \
  --config /etc/otelcol-contrib/config.yaml

# Run your application in the same pod
podman run -d \
  --pod observability-pod \
  --name my-app \
  -e OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317 \
  my-app-image:latest
```

Inside the pod, containers reach each other at `localhost`. Your application can export to `localhost:4317` and the Collector receives it directly.

## Managing with systemd

Generate a systemd unit file for the Collector container so it starts automatically:

```bash
# Generate the systemd service file
podman generate systemd --new --name otel-collector > ~/.config/systemd/user/otel-collector.service

# Enable and start it
systemctl --user daemon-reload
systemctl --user enable --now otel-collector.service

# Check status
systemctl --user status otel-collector.service
```

The `--new` flag creates a service that recreates the container on each start instead of just restarting the existing one. This ensures the container always starts with the latest image.

## Verifying the Setup

Check that the Collector is running and healthy:

```bash
# Check container status
podman ps

# View Collector logs
podman logs otel-collector

# Test the health endpoint
curl http://localhost:13133/
```

The health check endpoint should return a 200 response when the Collector is ready.

## Troubleshooting SELinux Issues

If you see permission denied errors, check the SELinux context:

```bash
# Check the SELinux context of your config file
ls -lZ otel-collector-config.yaml

# If needed, set the correct context
chcon -t container_file_t otel-collector-config.yaml
```

The `:Z` volume mount flag should handle this automatically, but manual relabeling may be needed in some edge cases.

## Summary

Running the OpenTelemetry Collector in Podman requires a few adjustments compared to Docker. Use the Podman API socket instead of the Docker socket, add the `:Z` flag for SELinux volume mounts, and consider using Podman pods for co-located containers. The Docker-compatible API means most Collector receivers and configurations work without modification.
