# How to Collect Docker Container Logs and Enrich Them with Container Name and Image Metadata in the Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Docker, Logs, Metadata Enrichment

Description: Learn how to collect Docker container logs and enrich each log record with container name, image, and labels using the OpenTelemetry Collector.

When you collect Docker container logs from disk, each log line carries minimal context. You get the message, a timestamp, and the stream type. But for effective troubleshooting, you need to know which container produced the log, what image it was running, and what labels were attached. The OpenTelemetry Collector can enrich log records with this metadata using a combination of the filelog receiver and the Docker observer or resource detection processor.

## The Problem with Raw Docker Logs

Raw Docker JSON logs at `/var/lib/docker/containers/` only include the container ID in the file path. A typical log line looks like:

```json
{"log":"Connection refused to database\n","stream":"stderr","time":"2026-02-06T08:30:00.123Z"}
```

Without container name, image, or labels, finding the source of this error means manually running `docker inspect` with the container ID. That does not scale when you have dozens of containers.

## Using the Docker Stats Receiver for Metadata

The OpenTelemetry Collector Contrib distribution includes the `docker_observer` extension and the resource detection processor. But the simplest approach is to use the Docker API directly through a custom pipeline that combines filelog with metadata enrichment.

Here is a Collector config that pulls metadata from the Docker API:

```yaml
extensions:
  docker_observer:
    # The Docker API endpoint
    endpoint: unix:///var/run/docker.sock
    # How often to refresh container metadata
    cache_sync_interval: 60s

receivers:
  filelog:
    include:
      - /var/lib/docker/containers/*/*-json.log
    start_at: end
    operators:
      # Parse the JSON log line
      - type: json_parser
        timestamp:
          parse_from: attributes.time
          layout: '%Y-%m-%dT%H:%M:%S.%LZ'
      # Extract container ID from the file path
      - type: regex_parser
        regex: '/var/lib/docker/containers/(?P<container_id>[a-f0-9]{64})/'
        parse_from: attributes["log.file.path"]
      - type: move
        from: attributes.log
        to: body

processors:
  # Use the resource detection processor to add Docker metadata
  resourcedetection:
    detectors: [docker]
    timeout: 2s
    override: false

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
  otlp:
    endpoint: "your-backend:4317"
    tls:
      insecure: false

service:
  extensions: [docker_observer]
  pipelines:
    logs:
      receivers: [filelog]
      processors: [resourcedetection, transform, batch]
      exporters: [otlp]
```

## Using the Docker API for Container Name Lookup

A more direct approach uses a script or the Collector's built-in container log parsing. The filelog receiver supports a `container` parser that can resolve container metadata:

```yaml
receivers:
  filelog:
    include:
      - /var/lib/docker/containers/*/*-json.log
    start_at: end
    operators:
      - type: json_parser
        timestamp:
          parse_from: attributes.time
          layout: '%Y-%m-%dT%H:%M:%S.%LZ'
      - type: move
        from: attributes.log
        to: body
      # Extract the container ID from the log file path
      - type: regex_parser
        regex: '/var/lib/docker/containers/(?P<container_id>[a-f0-9]{64})/'
        parse_from: attributes["log.file.path"]
```

Then use the `k8s_tagger` or a custom lookup processor. For non-Kubernetes Docker setups, you can write a simple enrichment script that queries the Docker API:

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
  -v ./config.yaml:/etc/otelcol/config.yaml \
  otel/opentelemetry-collector-contrib:latest
```

The Docker socket gives the Collector read access to container metadata. The `:ro` flag ensures it cannot modify anything.

## Caching Metadata for Performance

Querying the Docker API for every log line is expensive. Cache the results:

```yaml
extensions:
  docker_observer:
    endpoint: unix:///var/run/docker.sock
    # Refresh metadata every 60 seconds instead of per-log-line
    cache_sync_interval: 60s
```

This means metadata updates (like label changes) take up to 60 seconds to appear in your logs. For most use cases, that delay is acceptable.

## Summary

Enriching Docker container logs with metadata transforms raw log lines into actionable observability data. You can extract the container ID from file paths, query the Docker API for container name, image, and labels, and attach those as resource attributes. The key is caching metadata lookups and mounting both the Docker socket and the container log directory into your Collector container.
