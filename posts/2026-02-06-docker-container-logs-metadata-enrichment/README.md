# How to Collect Docker Container Logs and Enrich Them with Container Name

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Docker, Log, Metadata Enrichment

Description: Learn how to collect Docker container logs and enrich each log record with container name, image, and labels using the OpenTelemetry Collector.

When you collect Docker container logs from disk, each log line carries minimal context. You get the message, a timestamp, and the stream type. But for effective troubleshooting, you need to know which container produced the log, what image it was running, and what labels were attached. The OpenTelemetry Collector can enrich log records with this metadata using a combination of the file log receiver, the Docker observer, and the receiver creator.

## The Problem with Raw Docker Logs

Raw Docker JSON logs at `/var/lib/docker/containers/` only include the container ID in the file path. A typical log line looks like:

```json
{"log":"Connection refused to database\n","stream":"stderr","time":"2026-02-06T08:30:00.123Z"}
```

Without container name, image, or labels, finding the source of this error means manually running `docker inspect` with the container ID. That does not scale when you have dozens of containers.

## Using the Docker Observer for Metadata

The OpenTelemetry Collector Contrib distribution includes the `docker_observer` extension and the receiver creator. The Docker observer watches running containers through the Docker API, and the receiver creator can start a `file_log` receiver for each discovered container with resource attributes taken from the Docker metadata.

Here is a Collector config that pulls metadata from the Docker API:

```yaml
extensions:
  docker_observer:
    # The Docker API endpoint
    endpoint: unix:///var/run/docker.sock
    # How often to refresh container metadata
    cache_sync_interval: 60s
    # Emit an endpoint even for containers without exposed ports
    include_all_containers: true

receivers:
  receiver_creator/docker_logs:
    watch_observers: [docker_observer]
    receivers:
      file_log:
        rule: type == "container" && port == 0
        config:
          include:
            - /var/lib/docker/containers/`container_id`/`container_id`-json.log
          start_at: end
          include_file_path: true
          operators:
            # Parse Docker JSON log lines and move the message into the body
            - type: container
              format: docker
              add_metadata_from_filepath: false
        resource_attributes:
          container.id: '`container_id`'
          container.name: '`name`'
          container.image.name: '`image`'
          # Example of copying a known label into a resource attribute
          service.name: '`"com.docker.compose.service" in labels ? labels["com.docker.compose.service"] : name`'

processors:
  # Add custom resource attributes using the transform processor
  transform:
    log_statements:
      - context: log
        statements:
          - set(resource.attributes["container.runtime"], "docker")

  batch:
    timeout: 5s
    send_batch_size: 500

exporters:
  otlp_grpc:
    endpoint: "your-backend:4317"
    tls:
      insecure: false

service:
  extensions: [docker_observer]
  pipelines:
    logs:
      receivers: [receiver_creator/docker_logs]
      processors: [transform, batch]
      exporters: [otlp_grpc]
```

## Using the Docker API for Container Name Lookup

A more direct approach uses a script or the Collector's built-in container log parsing. The file log receiver supports a `container` parser that parses Docker JSON log lines, including the log message, stream, and timestamp. It does not query the Docker API for container names by itself, so use the Docker observer pattern above or do a separate Docker API lookup when you need names and labels:

```yaml
receivers:
  file_log:
    include:
      - /var/lib/docker/containers/*/*-json.log
    include_file_path: true
    start_at: end
    operators:
      - type: container
        format: docker
        add_metadata_from_filepath: false
      # Extract the container ID from the log file path
      - type: regex_parser
        regex: '/var/lib/docker/containers/(?P<container_id>[a-f0-9]{64})/'
        parse_from: attributes["log.file.path"]
```

For non-Kubernetes Docker setups outside the Collector pipeline, you can write a simple enrichment script that queries the Docker API:

```python
import docker
import json

# Connect to the Docker daemon

client = docker.from_env()

def get_container_metadata(container_id):
    """Fetch container name, image, and labels from Docker API."""
    try:
        container = client.containers.get(container_id)
        return {
            "container.name": container.name,
            "container.image.name": container.image.tags[0] if container.image.tags else "unknown",
            "container.id": container.short_id,
            # Include all container labels as attributes
            **{f"container.label.{k}": v for k, v in container.labels.items()}
        }
    except docker.errors.NotFound:
        return {"container.id": container_id[:12]}

# Example usage
metadata = get_container_metadata("abc123def456...")
print(json.dumps(metadata, indent=2))
```

## Using the Attributes Processor for Static Labels

If your containers have well-known names, you can use the attributes processor to add metadata based on patterns:

```yaml
processors:
  attributes:
    actions:
      # Add service name based on container ID prefix patterns
      - key: service.name
        value: "web-frontend"
        action: upsert
      - key: deployment.environment
        value: "production"
        action: upsert
```

## Mounting the Docker Socket

For any approach that queries the Docker API, mount the socket into your Collector container:

```bash
docker run -d \
  --name otel-collector \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v /var/lib/docker/containers:/var/lib/docker/containers:ro \
  -v ./config.yaml:/etc/otelcol-contrib/config.yaml:ro \
  otel/opentelemetry-collector-contrib:latest
```

The Docker socket lets the Collector query container metadata. Treat socket access as sensitive: the `:ro` flag makes the bind-mounted socket file read-only as a filesystem object, but it does not make the Docker API itself read-only.

## Caching Metadata for Performance

Querying the Docker API for every log line is expensive. Use the Docker observer's container cache instead of doing per-log-line lookups:

```yaml
extensions:
  docker_observer:
    endpoint: unix:///var/run/docker.sock
    # Resync the observed container list every 60 seconds
    cache_sync_interval: 60s
```

This means metadata updates that are only picked up during a resync can take up to 60 seconds to appear in newly created receivers. For most use cases, that delay is acceptable.

## Summary

Enriching Docker container logs with metadata transforms raw log lines into actionable observability data. You can extract the container ID from file paths, query the Docker API for container name, image, and selected labels, and attach those as resource attributes. The key is caching metadata lookups and mounting both the Docker socket and the container log directory into your Collector container.
