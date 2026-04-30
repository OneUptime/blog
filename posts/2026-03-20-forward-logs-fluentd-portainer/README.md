# How to Forward Container Logs to Fluentd via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Fluentd, Logging, Log Forwarding, Log Processing

Description: Configure Docker containers to forward logs to Fluentd using the built-in fluentd log driver, enabling log parsing, transformation, and multi-destination routing for Portainer-managed containers.

## Introduction

Docker's built-in Fluentd log driver forwards container logs directly to a Fluentd instance without requiring a separate file tailing agent. Fluentd then handles parsing, enrichment, and routing to downstream destinations like Elasticsearch, S3, or monitoring systems. This approach provides richer metadata and keeps log forwarding separate from application code. This guide covers deploying Fluentd and configuring containers to forward logs via Portainer.

## Step 1: Deploy Fluentd Server

```yaml
# docker-compose.yml - Fluentd with multiple output plugins

services:
  fluentd:
    build:
      context: ./fluentd
      dockerfile: Dockerfile
    container_name: fluentd
    restart: unless-stopped
    volumes:
      - ./fluentd/conf/fluent.conf:/fluentd/etc/fluent.conf
      - fluentd_buffer:/fluentd/log
    ports:
      - "24224:24224"        # Fluentd forward protocol (TCP)
      - "24224:24224/udp"    # Fluentd forward heartbeat (UDP)
      - "9880:9880"          # HTTP input (optional)
      - "24231:24231"        # Prometheus metrics
    networks:
      - logging_net
    environment:
      - FLUENTD_CONF=fluent.conf
      # Downstream destinations
      - ELASTICSEARCH_HOST=elasticsearch
      - ELASTICSEARCH_PORT=9200
      - S3_BUCKET=logs-backup
      - S3_REGION=us-east-1

volumes:
  fluentd_buffer:

networks:
  logging_net:
    driver: bridge
    name: logging_net
```

```dockerfile
# fluentd/Dockerfile
FROM fluent/fluentd:v1.19.2-debian-1.0

USER root
RUN gem install elasticsearch --no-document --version 8.19.0 && \
  gem install fluent-plugin-elasticsearch --no-document --version 5.4.3 && \
  gem install --no-document \
    fluent-plugin-s3 \
    fluent-plugin-record-modifier \
    fluent-plugin-prometheus \
    fluent-plugin-multi-format-parser

USER fluent
```

## Step 2: Configure Fluentd for Container Logs

```xml
# fluentd/conf/fluent.conf

# ==================
# INPUT: Docker containers
# ==================
<source>
  @type forward
  port 24224
  bind 0.0.0.0
</source>

# Optional: HTTP input for testing
<source>
  @type http
  port 9880
  bind 0.0.0.0
</source>

# ==================
# FILTER: Parse and enrich logs
# ==================

# Parse JSON-formatted application logs
<filter docker.**>
  @type parser
  key_name log
  reserve_data true
  emit_invalid_record_to_error false
  <parse>
    @type multi_format
    <pattern>
      format json
    </pattern>
    <pattern>
      format none
    </pattern>
  </parse>
</filter>

# Add metadata fields
<filter docker.**>
  @type record_modifier
  <record>
    hostname "#{Socket.gethostname}"
    environment production
    log_timestamp ${Time.at(time).utc.strftime('%Y-%m-%dT%H:%M:%S.%LZ')}
  </record>
</filter>

# ==================
# OUTPUT: Elasticsearch
# ==================
<match docker.**>
  @type elasticsearch
  host "#{ENV['ELASTICSEARCH_HOST'] || 'elasticsearch'}"
  port "#{ENV['ELASTICSEARCH_PORT'] || 9200}"
  logstash_format true
  logstash_prefix docker-logs
  include_tag_key true
  tag_key @log_tag

  # Resilient buffering
  <buffer>
    @type file
    path /fluentd/log/elasticsearch.buffer
    flush_mode interval
    flush_interval 5s
    retry_type exponential_backoff
    retry_max_interval 30s
    retry_forever true
    chunk_limit_size 8m
    total_limit_size 4g
    overflow_action block
  </buffer>
</match>

# ==================
# ERROR HANDLING: Send failed records to file
# ==================
<label @ERROR>
  <match **>
    @type file
    path /fluentd/log/error
    append true
    <buffer>
      @type file
      path /fluentd/log/error.buffer
    </buffer>
  </match>
</label>
```

## Step 3: Configure Containers to Use Fluentd Driver

```yaml
# docker-compose.yml - Application stack using Fluentd logging

services:
  api:
    image: myapp/api:latest
    logging:
      driver: fluentd
      options:
        # Fluentd server address as seen by the Docker host
        fluentd-address: "localhost:24224"
        # Tag format: docker.<service-name>
        tag: docker.api
        # Don't fail container startup if Fluentd is temporarily unavailable
        fluentd-async: "true"
        fluentd-async-reconnect-interval: "500ms"
        # Retry configuration
        fluentd-retry-wait: "1s"
        fluentd-max-retries: "30"
        # Driver-side in-memory buffer limit
        fluentd-buffer-limit: "8388608"  # 8MB
    networks:
      - logging_net
      - app_net

  worker:
    image: myapp/worker:latest
    logging:
      driver: fluentd
      options:
        fluentd-address: "localhost:24224"
        tag: docker.worker
        fluentd-async: "true"
    networks:
      - logging_net
      - app_net

networks:
  logging_net:
    external: true
  app_net:
    driver: bridge
```

## Step 4: Multi-Destination Log Routing

```xml
# fluent.conf snippet - Replace the generic <match docker.**> block above
# with this more specific route, or place it before that block.

# API logs: Elasticsearch + S3 archive
<match docker.api>
  @type copy
  # Copy 1: Elasticsearch for search
  <store>
    @type elasticsearch
    host elasticsearch
    port 9200
    logstash_prefix api-logs
    logstash_format true
  </store>

  # Copy 2: S3 for long-term archive
  <store>
    @type s3
    aws_key_id "#{ENV['AWS_ACCESS_KEY']}"
    aws_sec_key "#{ENV['AWS_SECRET_KEY']}"
    s3_bucket "#{ENV['S3_BUCKET']}"
    s3_region "#{ENV['S3_REGION']}"
    path logs/api/%Y/%m/%d/
    s3_object_key_format %{path}%{time_slice}_%{index}.%{file_extension}
    store_as gzip
    <buffer time>
      @type file
      path /fluentd/log/s3-api.buffer
      timekey 3600       # 1 hour chunks
      timekey_wait 10m   # Wait 10 min for late logs
    </buffer>
  </store>
</match>
```

## Step 5: Prometheus Metrics for Fluentd

```xml
# Monitor Fluentd with Prometheus

<source>
  @type prometheus
  bind 0.0.0.0
  port 24231
  metrics_path /metrics
</source>

<filter **>
  @type prometheus
  <metric>
    name fluentd_records_total
    type counter
    desc "Total log records received"
    <labels>
      tag ${tag}
      hostname ${hostname}
    </labels>
  </metric>
</filter>
```

## Step 6: Test Fluentd Integration

```bash
# Send a test log to Fluentd HTTP input
curl -X POST -d 'json={"level":"info","msg":"Test log","service":"test"}' \
  http://localhost:9880/docker.test

# Check Fluentd is receiving logs
docker exec -i fluentd fluent-cat --host 127.0.0.1 --port 24224 test.tag \
  <<< '{"level":"info","msg":"manual test"}'

# Check Fluentd output plugin status
docker exec fluentd fluent-gem list | grep plugin

# Monitor Fluentd buffer
docker exec fluentd ls -lh /fluentd/log/

# Check Fluentd logs for errors
docker logs fluentd 2>&1 | grep -i error | tail -20
```

## Conclusion

Fluentd's log driver integration enables rich log processing between Docker containers and downstream systems. Using the forward input avoids a separate file tailing agent, and Fluentd's file buffer lets outputs like Elasticsearch recover without immediately losing queued data. `fluentd-async: true` is important in production because it lets containers start even if Fluentd is temporarily unavailable. Portainer's compose YAML makes it easy to apply consistent logging configuration across all services in a stack while keeping application code completely decoupled from the log destination.
