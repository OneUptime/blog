# How to Use Podman with Fluentd for Log Collection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Fluentd, Logging, Log Collection, Observability

Description: Learn how to use Podman with Fluentd to collect, process, and forward container logs to centralized storage for analysis and monitoring.

---

> Fluentd running alongside your Podman containers creates a unified logging layer that collects, transforms, and routes logs from every container to your preferred storage and analysis tools.

Container logs are ephemeral by default. Stopped containers can still retain logs, but once a container is removed its local logs disappear. For production systems, you need a reliable way to collect, process, and store logs from all your containers. Fluentd is an open-source log collector that excels at this task. Running Fluentd in a Podman container alongside your application containers creates a centralized logging pipeline that captures everything and routes it to your storage backend of choice.

---

## Deploying Fluentd in Podman

Start with a basic Fluentd container:

```bash
mkdir -p ~/fluentd/{config,logs,buffer}

podman run -d \
  --name fluentd \
  --restart always \
  -p 24224:24224 \
  -p 24224:24224/udp \
  -v ~/fluentd/config:/fluentd/etc:ro,Z \
  -v ~/fluentd/logs:/fluentd/log:Z \
  -v ~/fluentd/buffer:/fluentd/buffer:Z \
  fluent/fluentd:v1.16-1
```

## Configuring Fluentd

Create the Fluentd configuration file:

```xml
# ~/fluentd/config/fluent.conf

# Accept logs from containers via forward protocol

<source>
  @type forward
  port 24224
  bind 0.0.0.0
</source>

# Accept logs from files
<source>
  @type tail
  path /fluentd/log/containers/*.log
  pos_file /fluentd/buffer/containers.log.pos
  tag container.*
  follow_inodes true
  <parse>
    @type json
    time_key time
    time_type string
    time_format %Y-%m-%dT%H:%M:%S.%NZ
  </parse>
</source>

# Add metadata
<filter **>
  @type record_transformer
  <record>
    hostname "#{Socket.gethostname}"
    environment "#{ENV['ENVIRONMENT'] || 'production'}"
  </record>
</filter>

# Output to file (rotated daily)
<match **>
  @type file
  path /fluentd/log/output/app
  append true
  <format>
    @type json
  </format>
  <buffer time>
    timekey 1d
    timekey_wait 10m
    flush_mode interval
    flush_interval 30s
  </buffer>
</match>
```

## Sending Container Logs to Fluentd

Podman does not support the `fluentd` logging driver. Podman's supported log drivers are `k8s-file`, `journald` (default unless changed), `none`, `passthrough`, and `passthrough-tty`. To forward container logs to Fluentd, pipe them from `podman logs` into `fluent-cat`, or mount shared log volumes:

```bash
# Forward logs by piping podman logs to Fluentd
podman logs -f myapp 2>&1 | \
  fluent-cat --none --message-key log -h localhost -p 24224 app.myapp
```

Alternatively, write application logs to a shared volume that Fluentd monitors:

```bash
# Run a container that writes logs to a shared volume
podman run -d \
  --name myapp \
  -v ~/fluentd/logs/containers:/var/log/app:Z \
  myapp:latest

# Fluentd picks up logs from the shared volume via its tail input plugin
```

## Building a Custom Fluentd Image

The base Fluentd image is minimal. Add plugins for your specific needs:

```dockerfile
# Containerfile.fluentd
FROM fluent/fluentd:v1.16-1

USER root

# Install plugins
RUN gem install \
    fluent-plugin-elasticsearch \
    fluent-plugin-s3 \
    fluent-plugin-prometheus \
    fluent-plugin-rewrite-tag-filter \
    fluent-plugin-multi-format-parser

USER fluent
```

```bash
podman build -f Containerfile.fluentd -t custom-fluentd:latest .
```

## Forwarding to Elasticsearch

Configure Fluentd to send logs to Elasticsearch:

```xml
# fluent.conf - Elasticsearch output
<match app.**>
  @type elasticsearch
  host elasticsearch
  port 9200
  logstash_format true
  logstash_prefix container-logs
  logstash_dateformat %Y.%m.%d
  include_tag_key true
  tag_key @log_name
  flush_interval 5s

  <buffer>
    @type file
    path /fluentd/buffer/elasticsearch
    flush_mode interval
    flush_interval 5s
    retry_type exponential_backoff
    retry_wait 1s
    retry_max_interval 60s
    retry_forever true
    chunk_limit_size 8m
    total_limit_size 2g
    overflow_action block
  </buffer>
</match>
```

## Complete Logging Stack

Deploy Fluentd with Elasticsearch and Kibana:

```yaml
# logging-stack.yml
version: "3"
services:
  fluentd:
    build:
      context: .
      dockerfile: Containerfile.fluentd
    restart: always
    ports:
      - "24224:24224"
      - "24224:24224/udp"
    volumes:
      - ./fluentd/config:/fluentd/etc:ro
      - fluentd-buffer:/fluentd/buffer
    depends_on:
      - elasticsearch

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.12.0
    restart: always
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    volumes:
      - es-data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"

  kibana:
    image: docker.elastic.co/kibana/kibana:8.12.0
    restart: always
    ports:
      - "5601:5601"
    environment:
      ELASTICSEARCH_HOSTS: http://elasticsearch:9200
    depends_on:
      - elasticsearch

volumes:
  fluentd-buffer:
  es-data:
```

## Log Parsing and Transformation

Parse structured and unstructured logs:

```xml
# Parse Nginx access logs
<source>
  @type tail
  path /fluentd/log/nginx/access.log
  pos_file /fluentd/buffer/nginx-access.pos
  tag nginx.access
  <parse>
    @type regexp
    expression /^(?<remote>[^ ]*) - (?<user>[^ ]*) \[(?<time>[^\]]*)\] "(?<method>\S+) (?<path>[^ ]*) (?<protocol>\S+)" (?<status>[^ ]*) (?<size>[^ ]*)/
    time_format %d/%b/%Y:%H:%M:%S %z
  </parse>
</source>

# Parse JSON application logs
<source>
  @type tail
  path /fluentd/log/app/*.log
  pos_file /fluentd/buffer/app.pos
  tag app.log
  follow_inodes true
  <parse>
    @type json
  </parse>
</source>

# Add severity based on log content
<filter app.**>
  @type record_transformer
  enable_ruby true
  <record>
    severity ${record["level"] || (record["message"].to_s.include?("ERROR") ? "error" : "info")}
  </record>
</filter>

# Route by severity
<match app.**>
  @type rewrite_tag_filter
  <rule>
    key severity
    pattern /^error$/
    tag alert.${tag}
  </rule>
  <rule>
    key severity
    pattern /^.+$/
    tag log.${tag}
  </rule>
</match>

# Errors go to a separate index
<match alert.**>
  @type elasticsearch
  host elasticsearch
  port 9200
  logstash_format true
  logstash_prefix error-logs
</match>

# Regular logs
<match log.**>
  @type elasticsearch
  host elasticsearch
  port 9200
  logstash_format true
  logstash_prefix app-logs
</match>
```

## Forwarding to S3

Store logs in S3 for long-term retention:

```xml
<match archive.**>
  @type s3
  aws_key_id "#{ENV['AWS_ACCESS_KEY_ID']}"
  aws_sec_key "#{ENV['AWS_SECRET_ACCESS_KEY']}"
  s3_bucket container-logs-archive
  s3_region us-east-1
  path logs/

  <buffer time>
    @type file
    path /fluentd/buffer/s3
    timekey 3600
    timekey_wait 10m
    chunk_limit_size 256m
  </buffer>

  <format>
    @type json
  </format>
</match>
```

## Monitoring Fluentd Itself

Expose Fluentd metrics for Prometheus:

```xml
# Add Prometheus metrics endpoint
<source>
  @type prometheus
  port 24231
</source>

<source>
  @type prometheus_monitor
</source>

<source>
  @type prometheus_output_monitor
</source>

<source>
  @type prometheus_tail_monitor
</source>
```

```bash
podman run -d \
  --name fluentd \
  -p 24224:24224 \
  -p 24231:24231 \
  -v ~/fluentd/config:/fluentd/etc:ro,Z \
  custom-fluentd:latest
```

Add to your Prometheus configuration:

```yaml
scrape_configs:
  - job_name: 'fluentd'
    static_configs:
      - targets: ['localhost:24231']
```

## Conclusion

Fluentd running in Podman containers provides a flexible and reliable log collection layer for your containerized applications. Its plugin ecosystem supports virtually any log source and destination, from simple file output to Elasticsearch, S3, and beyond. By combining Fluentd with Podman, you create a logging infrastructure that is as portable and reproducible as the applications it monitors. The ability to parse, transform, and route logs based on content gives you the control needed to build effective logging pipelines for production systems.
