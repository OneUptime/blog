# How to Configure Docker Swarm Mode Service Log Collection with the OpenTelemetry Collector DaemonSet Pattern

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Docker Swarm, Log Collection, DaemonSet

Description: Deploy the OpenTelemetry Collector as a global service in Docker Swarm to collect logs from all nodes using the DaemonSet pattern.

Docker Swarm mode schedules containers across multiple nodes. To collect logs from every node, you need the OpenTelemetry Collector running on each node, similar to the DaemonSet pattern in Kubernetes. Docker Swarm achieves this through global services, which schedule exactly one replica on every node in the cluster.

## Deploying the Collector as a Global Service

Create a Docker Swarm stack file that deploys the Collector on every node:

```yaml
# otel-stack.yaml
version: "3.8"

services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    # Global mode runs one instance on every node
    deploy:
      mode: global
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
        reservations:
          cpus: '0.1'
          memory: 128M
    configs:
      - source: collector-config
        target: /etc/otelcol-contrib/config.yaml
    volumes:
      # Mount container logs from the host
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      # Mount the Docker socket for metadata
      - /var/run/docker.sock:/var/run/docker.sock:ro
    ports:
      - target: 4317
        published: 4317
        protocol: tcp
        mode: host
    networks:
      - otel-network

configs:
  collector-config:
    file: ./otel-collector-config.yaml

networks:
  otel-network:
    driver: overlay
    attachable: true
```

Deploy the stack:

```bash
docker stack deploy -c otel-stack.yaml observability
```

## Collector Configuration for Swarm

The Collector config needs to handle logs from all containers on the node and enrich them with Swarm metadata:

```yaml
# otel-collector-config.yaml
receivers:
  filelog:
    include:
      - /var/lib/docker/containers/*/*-json.log
    start_at: end
    operators:
      # Parse Docker JSON log format
      - type: json_parser
        timestamp:
          parse_from: attributes.time
          layout: '%Y-%m-%dT%H:%M:%S.%LZ'
      - type: move
        from: attributes.log
        to: body
      - type: move
        from: attributes.stream
        to: attributes["log.iostream"]
      # Extract container ID from the file path
      - type: regex_parser
        regex: '/var/lib/docker/containers/(?P<container_id>[a-f0-9]{64})/'
        parse_from: attributes["log.file.path"]

  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 5s
    send_batch_size: 500

  memory_limiter:
    check_interval: 1s
    limit_mib: 200
    spike_limit_mib: 50

  # Add the node hostname to all logs
  resource:
    attributes:
      - key: swarm.node
        from_attribute: host.name
        action: upsert
      - key: deployment.mode
        value: "swarm"
        action: upsert

exporters:
  otlp:
    endpoint: "central-collector.example.com:4317"
    tls:
      insecure: false

service:
  pipelines:
    logs:
      receivers: [filelog]
      processors: [memory_limiter, resource, batch]
      exporters: [otlp]
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp]
```

## Enriching Logs with Swarm Service Metadata

Docker Swarm adds labels to containers that identify the service, task, and node. Use these labels for enrichment:

```yaml
receivers:
  docker_stats:
    endpoint: unix:///var/run/docker.sock
    collection_interval: 15s
    container_labels_to_metric_labels:
      com.docker.swarm.service.name: swarm.service
      com.docker.swarm.task.name: swarm.task
      com.docker.swarm.node.id: swarm.node.id
      com.docker.stack.namespace: swarm.stack
```

These labels let you filter logs by Swarm service name in your observability backend.

## Application Services Sending Traces

Application services in the Swarm can send OTLP traces to the Collector on their local node:

```yaml
# app-stack.yaml
version: "3.8"

services:
  web-api:
    image: myorg/web-api:latest
    deploy:
      replicas: 3
    environment:
      # Each task sends to the collector on its local node
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
      - OTEL_SERVICE_NAME=web-api
    networks:
      - otel-network
      - app-network

networks:
  otel-network:
    external: true
    name: observability_otel-network
  app-network:
    driver: overlay
```

Since the Collector runs on every node, the application container connects to its local instance through the overlay network.

## Handling Node Scaling

When new nodes join the Swarm, the global service automatically deploys a Collector instance on the new node. No manual intervention is needed:

```bash
# Add a new worker node
docker swarm join --token SWMTKN-1-xxx manager-ip:2377

# The Collector automatically starts on the new node
docker service ps observability_otel-collector
```

## Monitoring the Collector Deployment

Check the health of all Collector instances:

```bash
# List all Collector tasks across nodes
docker service ps observability_otel-collector

# View logs from a specific node's Collector
docker service logs observability_otel-collector --raw --tail 50
```

## Updating the Configuration

To update the Collector config, update the Docker config and redeploy:

```bash
# Remove the old config (configs are immutable)
docker config rm collector-config

# Create a new config with updated content
docker config create collector-config ./otel-collector-config.yaml

# Force a rolling update of the service
docker service update --force observability_otel-collector
```

## Summary

The global service pattern in Docker Swarm is equivalent to a Kubernetes DaemonSet. It ensures one Collector instance runs on every node, collecting logs from local container log files and receiving OTLP traces from application services. Swarm labels provide service-level metadata for log enrichment, and the global mode handles node scaling automatically. Use resource limits to prevent the Collector from consuming too many resources on production nodes.
