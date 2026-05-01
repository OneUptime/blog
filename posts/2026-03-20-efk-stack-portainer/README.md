# How to Deploy the EFK Stack (Elasticsearch, Fluentd, Kibana) via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, EFK, Elasticsearch, Fluentd, Kibana, Logging

Description: Deploy a complete EFK log aggregation stack using Portainer to collect, store, and visualize container logs with Elasticsearch full-text search and Kibana dashboards.

## Introduction

The EFK stack (Elasticsearch, Fluentd, Kibana) is the industry-standard solution for centralized log management at scale. Fluentd collects and ships logs from all containers, Elasticsearch stores and indexes them for fast full-text search, and Kibana provides dashboards and visualization. This guide covers deploying the complete EFK stack via Portainer with Docker log driver integration.

## Step 1: Deploy the EFK Stack

```yaml
# docker-compose.yml - Complete EFK stack

version: "3.8"

services:
  # Elasticsearch - Log storage and indexing
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    container_name: elasticsearch
    restart: unless-stopped
    environment:
      - node.name=elasticsearch
      - cluster.name=logs-cluster
      - discovery.type=single-node
      - xpack.security.enabled=false   # Disable for dev (enable in prod)
      - ES_JAVA_OPTS=-Xms1g -Xmx1g    # Set heap size
      - bootstrap.memory_lock=true
    ulimits:
      memlock:
        soft: -1
        hard: -1
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"
    networks:
      - efk_net
    healthcheck:
      test: ["CMD", "curl", "-fsS", "http://localhost:9200/_cluster/health?wait_for_status=yellow&timeout=5s"]
      interval: 30s
      timeout: 10s
      retries: 10

  # Fluentd - Log collection and forwarding
  fluentd:
    build: ./fluentd
    container_name: fluentd
    restart: unless-stopped
    volumes:
      - ./fluentd/conf:/fluentd/etc
    ports:
      - "24224:24224"      # TCP/UDP for Docker log driver
      - "24224:24224/udp"
    networks:
      - efk_net
    depends_on:
      elasticsearch:
        condition: service_healthy

  # Kibana - Log visualization
  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    container_name: kibana
    restart: unless-stopped
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
      - SERVER_NAME=kibana.internal
    volumes:
      - kibana_data:/usr/share/kibana/data
    ports:
      - "5601:5601"
    networks:
      - efk_net
    depends_on:
      elasticsearch:
        condition: service_healthy

volumes:
  elasticsearch_data:
  kibana_data:

networks:
  efk_net:
    driver: bridge
```

## Step 2: Configure Fluentd

```dockerfile
# fluentd/Dockerfile - Fluentd with Elasticsearch plugin
FROM fluent/fluentd:v1.16-debian-1

USER root
RUN gem install elasticsearch --no-document --version 8.11.0 && \
    gem install fluent-plugin-elasticsearch --no-document --version 5.4.3 && \
    gem install fluent-plugin-record-modifier --no-document && \
    gem install fluent-plugin-concat --no-document

USER fluent
```

```xml
# fluentd/conf/fluent.conf - Collect Docker logs and forward to Elasticsearch

<source>
  @type forward
  port 24224
  bind 0.0.0.0
</source>

# Parse JSON logs
<filter docker.**>
  @type parser
  key_name log
  reserve_data true
  remove_key_name_field false
  emit_invalid_record_to_error false
  <parse>
    @type json
  </parse>
</filter>

# Add metadata
<filter docker.**>
  @type record_modifier
  <record>
    hostname "#{Socket.gethostname}"
    collected_at ${time}
  </record>
</filter>

# Forward to Elasticsearch
<match docker.**>
  @type elasticsearch
  host elasticsearch
  port 9200
  logstash_format true
  logstash_prefix docker-logs
  logstash_dateformat %Y.%m.%d
  include_tag_key true
  tag_key @log_name
  flush_interval 5s

  <buffer>
    @type file
    path /tmp/fluentd-buffers/docker.buffer
    flush_mode interval
    retry_type exponential_backoff
    flush_interval 5s
    retry_forever true
    retry_max_interval 30s
    chunk_limit_size 2M
    queue_limit_length 8
    overflow_action block
  </buffer>
</match>
```

## Step 3: Configure Container Services to Send Logs to Fluentd

```yaml
# docker-compose.yml - Application services using Fluentd log driver
version: "3.8"

services:
  api:
    image: myapp/api:latest
    logging:
      driver: fluentd
      options:
        fluentd-address: localhost:24224 # Docker daemon connects to the host port
        tag: docker.api                   # Log tag for routing
        fluentd-async: "true"             # Don't block if Fluentd is slow
        fluentd-retry-wait: "1s"
        fluentd-max-retries: "30"
        labels: service,environment
    labels:
      - "service=api"
      - "environment=production"

  worker:
    image: myapp/worker:latest
    logging:
      driver: fluentd
      options:
        fluentd-address: localhost:24224
        tag: docker.worker
        fluentd-async: "true"
        labels: service,environment
    labels:
      - "service=worker"
      - "environment=production"
```

## Step 4: Create Kibana Data View and Dashboard

```bash
# Create Kibana data view via API
DATA_VIEW_ID=$(
  curl -s -X POST \
  "http://localhost:5601/api/data_views/data_view" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "data_view": {
      "title": "docker-logs-*",
      "timeFieldName": "@timestamp"
    }
  }' | jq -r '.data_view.id'
)

# Set as default data view
curl -s -X POST \
  "http://localhost:5601/api/data_views/default" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d "{\"data_view_id\": \"$DATA_VIEW_ID\", \"force\": true}"
```

## Step 5: Useful Kibana Queries (KQL)

```bash
# In Kibana Discover, use KQL queries:

# All errors from the API service
service: "api" AND level: "error"

# HTTP 5xx errors
status: [500 TO 599]

# Logs from the last hour with specific message
@timestamp > now-1h AND message: "database connection failed"

# Count by container name
# (use Visualize > Aggregation)

# Aggregated error rate per service
# (use Visualize > Time Series)
```

## Step 6: Set Up Kibana Alerting

```bash
# Kibana alerting requires Elastic Stack security, TLS between Kibana and
# Elasticsearch, and a persistent xpack.encryptedSavedObjects.encryptionKey.
# With the development configuration in this guide (xpack.security.enabled=false),
# enable those settings first before calling /api/alerting/rule.
```

## Conclusion

The EFK stack provides enterprise-grade log management for containerized environments. Fluentd's rich plugin ecosystem handles log transformation, routing, and multi-destination forwarding. Elasticsearch's inverted index enables sub-second full-text search across billions of log entries. Kibana's dashboards and alerting turn raw logs into actionable insights. Deploying through Portainer gives you a single management interface for both your application containers and the logging infrastructure that monitors them. For smaller environments with tighter resource constraints, consider the PLG (Promtail/Loki/Grafana) stack which requires significantly less memory than Elasticsearch.
