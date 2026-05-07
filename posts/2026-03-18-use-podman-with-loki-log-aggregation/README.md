# How to Use Podman with Loki for Log Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Loki, Logging, Log Aggregation, Grafana

Description: Learn how to use Podman with Grafana Loki to aggregate and query container logs efficiently, providing a lightweight alternative to Elasticsearch-based logging stacks.

---

> Loki running in Podman containers provides a cost-effective, label-based log aggregation system that integrates naturally with Grafana for querying and visualizing container logs.

Grafana Loki is a log aggregation system designed to be cost-effective and easy to operate. Unlike Elasticsearch, which indexes the full text of every log line, Loki only indexes metadata labels. This makes it dramatically cheaper to run while still providing fast, powerful queries through its LogQL query language. When combined with Podman, you get a lightweight logging stack that can be deployed on a single machine or scaled across a cluster.

---

## Deploying Loki with Podman

Create the necessary directories and configuration:

```bash
mkdir -p ~/loki/config ~/loki/data/alloy
```

Create the Loki configuration:

```yaml
# ~/loki/config/loki-config.yml

auth_enabled: false

server:
  http_listen_port: 3100

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
    - from: 2024-01-01
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h

limits_config:
  reject_old_samples: true
  reject_old_samples_max_age: 168h
  max_query_length: 0h
  max_query_parallelism: 2

analytics:
  reporting_enabled: false
```

Run Loki:

```bash
podman run -d \
  --name loki \
  --restart always \
  -p 3100:3100 \
  -v ~/loki/config/loki-config.yml:/etc/loki/local-config.yaml:ro,Z \
  -v ~/loki/data:/loki:Z \
  grafana/loki:latest \
  -config.file=/etc/loki/local-config.yaml
```

Verify it is running:

```bash
curl -s http://localhost:3100/ready
```

## Deploying Grafana Alloy for Log Collection

Promtail reached end-of-life on March 2, 2026. For new Loki deployments, Grafana recommends Grafana Alloy as the log collection agent. The following Alloy configuration reads Podman container logs from journald and ships them to Loki:

```alloy
# ~/loki/config/alloy-config.alloy
loki.write "local" {
  endpoint {
    url = "http://127.0.0.1:3100/loki/api/v1/push"
  }
}

loki.relabel "podman" {
  forward_to = []

  rule {
    source_labels = ["__journal_container_name"]
    target_label  = "container"
  }

  rule {
    source_labels = ["__journal_container_id_full"]
    target_label  = "container_id"
  }
}

loki.source.journal "podman" {
  forward_to    = [loki.write.local.receiver]
  relabel_rules = loki.relabel.podman.rules
  labels        = {job = "podman"}
}
```

Run Grafana Alloy:

```bash
sudo podman run -d \
  --name alloy \
  --restart always \
  --network host \
  -v ~/loki/config/alloy-config.alloy:/etc/alloy/config.alloy:ro,Z \
  -v ~/loki/data/alloy:/var/lib/alloy/data:Z \
  -v /var/log/journal:/var/log/journal:ro \
  -v /run/log/journal:/run/log/journal:ro \
  -v /etc/machine-id:/etc/machine-id:ro \
  docker.io/grafana/alloy:latest \
  run --storage.path=/var/lib/alloy/data /etc/alloy/config.alloy
```

## Complete Loki Stack with Compose

Deploy the full stack including Grafana for visualization:

```yaml
# loki-stack.yml
version: "3"
services:
  loki:
    image: grafana/loki:latest
    restart: always
    ports:
      - "3100:3100"
    volumes:
      - ./loki/config/loki-config.yml:/etc/loki/local-config.yaml:ro
      - loki-data:/loki
    command: -config.file=/etc/loki/local-config.yaml

  alloy:
    image: docker.io/grafana/alloy:latest
    restart: always
    network_mode: host
    volumes:
      - ./loki/config/alloy-config.alloy:/etc/alloy/config.alloy:ro
      - alloy-data:/var/lib/alloy/data
      - /var/log/journal:/var/log/journal:ro
      - /run/log/journal:/run/log/journal:ro
      - /etc/machine-id:/etc/machine-id:ro
    command:
      - run
      - --storage.path=/var/lib/alloy/data
      - /etc/alloy/config.alloy
    depends_on:
      - loki

  grafana:
    image: grafana/grafana:latest
    restart: always
    ports:
      - "3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning:ro
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
    depends_on:
      - loki

volumes:
  loki-data:
  alloy-data:
  grafana-data:
```

Auto-configure the Loki data source in Grafana:

```yaml
# grafana/provisioning/datasources/loki.yml
apiVersion: 1
datasources:
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    isDefault: true
```

## Sending Application Logs to Loki

Push logs directly to Loki's HTTP API:

```python
# log_sender.py
import requests
import json
import time

LOKI_URL = "http://localhost:3100/loki/api/v1/push"

def send_log(message, labels=None):
    if labels is None:
        labels = {"app": "myapp", "environment": "production"}

    timestamp = str(int(time.time() * 1e9))

    payload = {
        "streams": [
            {
                "stream": labels,
                "values": [[timestamp, message]]
            }
        ]
    }

    response = requests.post(
        LOKI_URL,
        json=payload,
        headers={"Content-Type": "application/json"}
    )
    return response.status_code

# Send logs
send_log("Application started successfully")
send_log("Processing request for user 123", {"app": "myapp", "level": "info"})
send_log("Database connection failed", {"app": "myapp", "level": "error"})
```

## Querying Logs with LogQL

Use Grafana's Explore page or the Loki API to query logs:

```bash
# Query all logs from a specific container
curl -G -s http://localhost:3100/loki/api/v1/query_range \
  --data-urlencode 'query={container="myapp"}' \
  --data-urlencode 'limit=100' | jq .

# Query error logs
curl -G -s http://localhost:3100/loki/api/v1/query_range \
  --data-urlencode 'query={app="myapp"} |= "error"' | jq .
```

Common LogQL queries:

```logql
# All logs from a container
{container="myapp"}

# Filter by text content
{container="myapp"} |= "error"

# Exclude lines matching a pattern
{container="myapp"} != "health"

# Parse JSON logs and filter by field
{container="myapp"} | json | level="error"

# Count log lines per minute
count_over_time({container="myapp"}[1m])

# Error rate
sum(rate({container="myapp"} |= "error" [5m]))
/ sum(rate({container="myapp"} [5m]))

# Top log sources by volume
topk(10, sum(rate({container=~".+"}[5m])) by (container))
```

## Collecting Podman Container Logs

If your containers use Podman's `k8s-file` log driver instead of the default `journald` driver, add file scraping for `ctr.log`. On rootful systems the log path is typically `/var/lib/containers/storage/...`; rootless Podman uses `$HOME/.local/share/containers/storage/...`.

```alloy
# Add to alloy-config.alloy
loki.source.file "podman_logs" {
  targets = [
    {
      __path__ = "/var/lib/containers/storage/overlay-containers/*/userdata/ctr.log",
      job      = "podman-file",
    },
  ]
  tail_from_end = true
  forward_to    = [loki.process.podman_cri.receiver]

  file_match {
    enabled     = true
    sync_period = "10s"
  }
}

loki.process "podman_cri" {
  forward_to = [loki.write.local.receiver]

  stage.cri {}

  stage.labels {
    values = {
      stream = "",
    }
  }
}
```

## Retention and Compaction

Configure log retention in Loki:

```yaml
# Add the compactor block and add retention_period under the existing limits_config block
compactor:
  working_directory: /loki/compactor
  compaction_interval: 10m
  retention_enabled: true
  retention_delete_delay: 2h
  retention_delete_worker_count: 150
  delete_request_store: filesystem

limits_config:
  reject_old_samples: true
  reject_old_samples_max_age: 168h
  max_query_length: 0h
  max_query_parallelism: 2
  retention_period: 744h  # 31 days
```

## Alerting with Loki

If you enable Loki's ruler and configure an Alertmanager URL, alerting rules can look like this:

```yaml
# loki/rules/alerts.yml
groups:
  - name: container-alerts
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate({container="myapp"} |= "error" [5m])) > 10
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: High error rate in container myapp

      - alert: ContainerCrashLoop
        expr: |
          count_over_time({container=~".+"} |= "container exited" [5m]) > 3
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: Container appears to be crash-looping
```

## Conclusion

Loki provides a lightweight, efficient approach to log aggregation that pairs well with Podman containers. Its label-based indexing keeps storage costs low while LogQL provides powerful querying capabilities. The tight integration with Grafana means you can explore logs alongside metrics in the same dashboard. For teams already using Prometheus and Grafana, adding Loki creates a complete observability stack with minimal additional complexity. The combination of Grafana Alloy for collection, Loki for storage, and Grafana for visualization gives you everything needed for production-grade container log management.
