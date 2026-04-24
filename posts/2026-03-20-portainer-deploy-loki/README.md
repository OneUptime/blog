# How to Deploy Loki via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Loki, Logging, Grafana, Self-Hosted

Description: Deploy Grafana Loki via Portainer as a cost-effective log aggregation system that works natively with Grafana for log exploration and correlation with metrics.

## Introduction

Grafana Loki is a horizontally scalable log aggregation system inspired by Prometheus. Unlike Elasticsearch, Loki indexes only labels (not the full log content), making it significantly cheaper to operate. This guide deploys Loki with Grafana Alloy for log collection.

## Deploy as a Stack

On the Docker host, create `/opt/loki/`, place `loki-config.yaml` and `alloy-config.alloy` there, then in Portainer create a stack named `loki`:

```yaml
version: "3.8"

services:
  loki:
    image: grafana/loki:latest
    container_name: loki
    command: -config.file=/etc/loki/loki-config.yaml
    volumes:
      - /opt/loki/loki-config.yaml:/etc/loki/loki-config.yaml:ro
      - loki_data:/loki
    ports:
      - "3100:3100"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "/usr/bin/loki", "-health"]
      start_period: 30s
      interval: 10s
      timeout: 5s
      retries: 5

  # Grafana Alloy - log shipper agent
  alloy:
    image: grafana/alloy:latest
    container_name: alloy
    command: run --storage.path=/var/lib/alloy/data /etc/alloy/config.alloy
    volumes:
      - /opt/loki/alloy-config.alloy:/etc/alloy/config.alloy:ro
      # Host log access
      - /var/log:/var/log:ro
      - /var/run/docker.sock:/var/run/docker.sock
      - alloy_data:/var/lib/alloy/data
    restart: unless-stopped

volumes:
  loki_data:
  alloy_data:
```

## Loki Configuration

Create `/opt/loki/loki-config.yaml`:

```yaml
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096

common:
  instance_addr: 127.0.0.1
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2020-10-24
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h

limits_config:
  # Reject logs with timestamps far in the past
  reject_old_samples: true
  reject_old_samples_max_age: 168h  # 7 days

  # Retention
  retention_period: 744h   # 31 days

compactor:
  working_directory: /loki/compactor
  delete_request_store: filesystem
  retention_enabled: true
  retention_delete_delay: 2h
```

## Grafana Alloy Configuration

Create `/opt/loki/alloy-config.alloy`:

```alloy
discovery.docker "containers" {
  host = "unix:///var/run/docker.sock"
}

discovery.relabel "containers" {
  targets = []

  rule {
    source_labels = ["__meta_docker_container_name"]
    regex         = "/(.*)"
    target_label  = "container_name"
  }
}

loki.source.docker "containers" {
  host          = "unix:///var/run/docker.sock"
  targets       = discovery.docker.containers.targets
  labels        = {"job" = "containerlogs"}
  relabel_rules = discovery.relabel.containers.rules
  forward_to    = [loki.write.local.receiver]
}

loki.source.file "system" {
  targets = [
    {
      __path__ = "/var/log/syslog",
      "job"    = "syslog",
      "host"   = "docker-host",
    },
    {
      __path__ = "/var/log/messages",
      "job"    = "syslog",
      "host"   = "docker-host",
    },
    {
      __path__ = "/var/log/*.log",
      "job"    = "syslog",
      "host"   = "docker-host",
    },
  ]
  forward_to = [loki.write.local.receiver]
  file_match {
    enabled = true
  }
}

loki.write "local" {
  endpoint {
    url = "http://loki:3100/loki/api/v1/push"
  }
}
```

## Query Logs in Grafana

After adding Loki as a data source in Grafana, use LogQL to query:

```logql
# All error logs

{job="containerlogs"} |= "ERROR"

# Nginx access logs
{container_name="nginx"} | pattern `<ip> - - <_> "<method> <path> <_>" <status> <_>`

# Rate of error logs per second
sum(rate({job="containerlogs"} |= "error" [1m]))

# Log count by container
sum by (container_name) (count_over_time({job="containerlogs"}[1h]))
```

## Integrate with Existing Grafana

Add Loki as a data source in your Grafana provisioning:

```yaml
# In grafana provisioning/datasources/datasources.yaml
apiVersion: 1
datasources:
  - name: Loki
    type: loki
    access: proxy
    url: http://<docker-host-ip>:3100
    jsonData:
      maxLines: 1000
```

## Conclusion

Loki deployed via Portainer provides a lightweight, cost-effective log aggregation solution that integrates seamlessly with Grafana. Unlike full-text search engines, Loki's label-based indexing makes it economical to store large volumes of logs. Grafana Alloy automatically discovers and ships Docker container logs, and can also tail host log files with minimal configuration.
