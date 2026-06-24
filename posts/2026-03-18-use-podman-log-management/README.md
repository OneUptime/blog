# How to Use Podman for Log Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Log Management, Logging, Loki, Grafana, Container

Description: Learn how to set up centralized log management using Podman containers with tools like Grafana Loki, Promtail, and the ELK stack for aggregating and analyzing container and application logs.

---

> Podman integrates naturally with journald and supports multiple logging drivers, making it straightforward to build centralized log management pipelines using containerized tools.

Log management is essential for understanding application behavior, debugging issues, and maintaining security visibility. Podman generates logs from every container it runs and supports routing those logs through different drivers. By combining Podman with containerized log aggregation tools like Loki, Promtail for existing deployments, or Elasticsearch, you can build a complete log management system without installing anything directly on the host.

This guide covers Podman's logging capabilities and walks through setting up a full log management stack.

---

## Podman Logging Fundamentals

Podman supports several logging drivers. The default depends on your system, but you can specify one explicitly:

```bash
# View container logs

podman logs my-container

# Follow logs in real time
podman logs -f my-container

# Show logs with timestamps
podman logs -t my-container

# Show last 100 lines
podman logs --tail 100 my-container

# Show logs since a specific time
podman logs --since 2024-01-01T00:00:00 my-container
```

## Configuring Logging Drivers

Podman supports `journald`, `k8s-file`, `none`, `passthrough`, and `passthrough-tty` as logging drivers. Note that `json-file` is accepted as an alias for `k8s-file` for Docker compatibility:

```bash
# Use journald (integrates with systemd journal)
podman run -d --log-driver=journald --name app my-app

# Use k8s-file (common when journald is unavailable, including many rootless setups)
podman run -d --log-driver=k8s-file --name app my-app

# Set log size limits (note: Podman supports max-size but not max-file)
podman run -d \
  --log-driver=k8s-file \
  --log-opt max-size=10mb \
  --name app my-app
```

When using journald, query logs with journalctl:

```bash
# View logs for a specific container
journalctl CONTAINER_NAME=my-container

# Follow container logs through journald
journalctl -f CONTAINER_NAME=my-container

# Filter by priority
journalctl CONTAINER_NAME=my-container -p err
```

## Setting Up Grafana Loki

Loki is a lightweight log aggregation system designed to work with Grafana. Deploy a complete Loki stack with Podman:

```bash
podman network create logging

# Create Loki config
mkdir -p ~/logging/loki
cat > ~/logging/loki/config.yml << 'EOF'
auth_enabled: false

server:
  http_listen_port: 3100

common:
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
EOF

podman run -d \
  --name loki \
  --network logging \
  -p 3100:3100 \
  -v ~/logging/loki/config.yml:/etc/loki/local-config.yaml:ro,Z \
  -v loki-data:/loki:Z \
  docker.io/grafana/loki:latest \
  -config.file=/etc/loki/local-config.yaml
```

## Deploying Promtail for Log Collection

Promtail reached end-of-life on March 2, 2026. For new Loki deployments, use Grafana Alloy; if you need to maintain an existing Promtail pipeline, the most direct Podman setup is to scrape journald:

```bash
mkdir -p ~/logging/promtail
cat > ~/logging/promtail/config.yml << 'EOF'
server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: journal
    journal:
      max_age: 12h
      labels:
        job: podman
    relabel_configs:
      - source_labels: ['__journal__systemd_unit']
        target_label: 'unit'
      - source_labels: ['__journal_container_name']
        target_label: 'container'
EOF

podman run -d \
  --name promtail \
  --network logging \
  -p 9080:9080 \
  -v ~/logging/promtail/config.yml:/etc/promtail/config.yml:ro,Z \
  -v /var/log/journal:/var/log/journal:ro \
  -v /run/log/journal:/run/log/journal:ro \
  -v /etc/machine-id:/etc/machine-id:ro \
  docker.io/grafana/promtail:latest \
  -config.file=/etc/promtail/config.yml
```

## Adding Grafana for Visualization

```bash
podman run -d \
  --name grafana \
  --network logging \
  -p 3000:3000 \
  -e GF_SECURITY_ADMIN_PASSWORD=admin \
  -v grafana-data:/var/lib/grafana:Z \
  docker.io/grafana/grafana:latest
```

Access Grafana at `http://localhost:3000`, add Loki as a data source with the URL `http://loki:3100`, and start querying logs using LogQL:

```text
# Find all error logs
{job="podman"} |= "error"

# Filter by container name
{container="web-server"} |= "404"

# Count errors per minute
rate({job="podman"} |= "error" [1m])
```

## ELK Stack Alternative

For teams that prefer Elasticsearch, deploy a minimal ELK stack:

```bash
podman pod create --name elk -p 9200:9200 -p 5601:5601

podman run -d --pod elk \
  --name elasticsearch \
  -e "discovery.type=single-node" \
  -e "ES_JAVA_OPTS=-Xms512m -Xmx512m" \
  -e "xpack.security.enabled=false" \
  -v es-data:/usr/share/elasticsearch/data:Z \
  docker.elastic.co/elasticsearch/elasticsearch:8.12.0

podman run -d --pod elk \
  --name kibana \
  -e 'ELASTICSEARCH_HOSTS=["http://127.0.0.1:9200"]' \
  docker.elastic.co/kibana/kibana:8.12.0
```

## Structured Logging from Applications

Applications should emit structured JSON logs for easier parsing:

```javascript
// Node.js structured logging example
const pino = require('pino');
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

logger.info({ event: 'server_start', port: 3000 }, 'Server started');
logger.error({ event: 'db_connection_failed', host: 'db' }, 'Database connection failed');
```

```python
# Python structured logging
import logging
import json

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_entry = {
            'timestamp': self.formatTime(record),
            'level': record.levelname,
            'message': record.getMessage(),
            'module': record.module,
        }
        return json.dumps(log_entry)

handler = logging.StreamHandler()
handler.setFormatter(JSONFormatter())
logger = logging.getLogger(__name__)
logger.addHandler(handler)
logger.setLevel(logging.INFO)
```

## Log Rotation and Retention

Configure log size limits to prevent disk exhaustion:

```bash
# Set log size limit per container (Podman truncates and reopens the log file when the limit is reached)
podman run -d \
  --log-opt max-size=50mb \
  --name app my-app
```

For system-wide defaults, edit the containers configuration:

```bash
# ~/.config/containers/containers.conf
[containers]
log_driver = "k8s-file"
log_size_max = 52428800  # 50MB
```

## Monitoring Log Pipeline Health

Create a simple health check script:

```bash
#!/bin/bash
# check-logging.sh

# Verify Loki is accepting logs
curl -fsS http://localhost:3100/ready >/dev/null && \
  echo "Loki: OK" || echo "Loki: FAILED"

# Verify Promtail is running
curl -fsS http://localhost:9080/ready >/dev/null && \
  echo "Promtail: OK" || echo "Promtail: FAILED"

# Check for recent log entries
RECENT=$(curl -g -s 'http://localhost:3100/loki/api/v1/query?query={job="podman"}' | \
  python3 -c "import sys,json; print(len(json.load(sys.stdin)['data']['result']))")
echo "Active log streams: $RECENT"
```

## Conclusion

Podman's native journald integration and flexible logging drivers make it well suited for building log management pipelines. Whether you choose the lightweight Loki stack or a full ELK deployment, Podman containers keep your logging infrastructure isolated and reproducible. Combine structured application logging with centralized aggregation to get full visibility into your containerized services.
