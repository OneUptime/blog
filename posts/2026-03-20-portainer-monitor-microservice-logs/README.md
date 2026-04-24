# How to Monitor Microservice Logs Across Containers in Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Logging, Microservice, Docker, Loki, Monitoring, Observability

Description: Learn how to monitor and aggregate logs from multiple microservice containers in Portainer, using both the built-in log viewer and centralized logging solutions.

---

When running multiple microservices, logs are scattered across containers. Portainer provides a basic per-container log viewer, and this guide shows how to centralize logs from all services for cross-service tracing and debugging.

## Viewing Logs per Container in Portainer

For a quick look at a single service:

1. Go to **Containers** in Portainer.
2. Click a container name.
3. Select the **Logs** tab.
4. Enable **Auto refresh** and **Timestamp**.

## Viewing Stack Logs in Portainer

For containers deployed as a stack:

1. Go to **Stacks**.
2. Click the stack name.
3. Open the service or container you want to inspect, then open its **Logs** view.

## Aggregating Logs with Loki and Grafana

For cross-service log queries, deploy the Loki stack (Alloy + Loki + Grafana):

```yaml
services:
  loki:
    image: grafana/loki:latest
    restart: unless-stopped
    command: -config.file=/etc/loki/loki-config.yaml
    ports:
      - "3100:3100"
    volumes:
      - ./loki-config.yaml:/etc/loki/loki-config.yaml:ro
      - loki_data:/tmp/loki

  alloy:
    image: grafana/alloy:latest
    restart: unless-stopped
    command:
      - run
      - --server.http.listen-addr=0.0.0.0:12345
      - --storage.path=/var/lib/alloy/data
      - /etc/alloy/config.alloy
    ports:
      - "12345:12345"
    volumes:
      - ./config.alloy:/etc/alloy/config.alloy:ro
      - /var/run/docker.sock:/var/run/docker.sock
      - alloy_data:/var/lib/alloy/data

  grafana:
    image: grafana/grafana:latest
    restart: unless-stopped
    ports:
      - "3200:3000"
    volumes:
      - grafana_data:/var/lib/grafana

volumes:
  loki_data:
  alloy_data:
  grafana_data:
```

## Loki and Alloy Configuration

```yaml
# loki-config.yaml

auth_enabled: false

server:
  http_listen_port: 3100

common:
  ring:
    instance_addr: 127.0.0.1
    kvstore:
      store: inmemory
  replication_factor: 1
  path_prefix: /tmp/loki

schema_config:
  configs:
    - from: 2024-04-01
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h

storage_config:
  filesystem:
    directory: /tmp/loki/chunks
```

```hcl
# config.alloy

discovery.docker "containers" {
  host = "unix:///var/run/docker.sock"
}

discovery.relabel "logs" {
  targets = []

  rule {
    source_labels = ["__meta_docker_container_name"]
    regex = "/(.*)"
    target_label = "container"
  }

  rule {
    source_labels = ["__meta_docker_container_label_com_docker_compose_service"]
    target_label = "service"
  }
}

loki.source.docker "containers" {
  host          = "unix:///var/run/docker.sock"
  targets       = discovery.docker.containers.targets
  labels        = {"job" = "docker-containers"}
  relabel_rules = discovery.relabel.logs.rules
  forward_to    = [loki.write.local.receiver]
}

loki.write "local" {
  endpoint {
    url = "http://loki:3100/loki/api/v1/push"
  }
}
```

## Querying Cross-Service Logs in Grafana

After setup, add a Loki data source in Grafana with the URL `http://loki:3100`, then query logs across all microservices:

```logql
# All errors from any container
{container=~".+"} |= "error"

# Trace a specific request ID across services
{job="docker-containers"} |= "req-12345"

# User service errors only
{service="user-service"} | json | level="error"
```

## Using Portainer for Log Forwarding

If you prefer Docker's Loki logging driver instead of Alloy, install the Loki Docker plugin on each Docker host and configure the service:

```yaml
services:
  user-service:
    image: user-service:latest
    logging:
      driver: loki
      options:
        loki-url: "http://loki:3100/loki/api/v1/push"
```

With Docker Compose, the Loki driver automatically adds `compose_project` and `compose_service` labels that you can filter on in Grafana.
