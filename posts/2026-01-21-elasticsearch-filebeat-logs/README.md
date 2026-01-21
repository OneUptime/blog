# How to Ingest Logs into Elasticsearch with Filebeat

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Filebeat, Log Shipping, Beats, Log Ingestion, Observability

Description: A comprehensive guide to ingesting logs into Elasticsearch with Filebeat, covering installation, configuration, modules, processors, and best practices for efficient log shipping.

---

Filebeat is a lightweight log shipper that sends log data to Elasticsearch for indexing and analysis. This guide covers complete Filebeat configuration for various log sources and environments.

## Installing Filebeat

### Debian/Ubuntu

```bash
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo gpg --dearmor -o /usr/share/keyrings/elasticsearch-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/elasticsearch-keyring.gpg] https://artifacts.elastic.co/packages/8.x/apt stable main" | sudo tee /etc/apt/sources.list.d/elastic-8.x.list
sudo apt update && sudo apt install filebeat
```

### RHEL/CentOS

```bash
sudo rpm --import https://artifacts.elastic.co/GPG-KEY-elasticsearch
cat <<EOF | sudo tee /etc/yum.repos.d/elasticsearch.repo
[elasticsearch]
name=Elasticsearch repository for 8.x packages
baseurl=https://artifacts.elastic.co/packages/8.x/yum
gpgcheck=1
gpgkey=https://artifacts.elastic.co/GPG-KEY-elasticsearch
enabled=1
autorefresh=1
type=rpm-md
EOF
sudo yum install filebeat
```

### Docker

```bash
docker run -d \
  --name filebeat \
  --user=root \
  -v /var/log:/var/log:ro \
  -v /var/lib/docker/containers:/var/lib/docker/containers:ro \
  -v $(pwd)/filebeat.yml:/usr/share/filebeat/filebeat.yml:ro \
  docker.elastic.co/beats/filebeat:8.11.0
```

## Basic Configuration

### Minimal Configuration

```yaml
# /etc/filebeat/filebeat.yml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/*.log

output.elasticsearch:
  hosts: ["localhost:9200"]
```

### Production Configuration

```yaml
# /etc/filebeat/filebeat.yml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/app/*.log
    fields:
      app: my-application
      environment: production
    fields_under_root: true

    # Multiline for stack traces
    multiline:
      pattern: '^\d{4}-\d{2}-\d{2}'
      negate: true
      match: after
      max_lines: 500
      timeout: 5s

    # Harvester settings
    close_inactive: 5m
    close_renamed: true
    close_removed: true
    clean_inactive: 48h
    clean_removed: true

    # Backpressure handling
    backoff.init: 1s
    backoff.max: 10s

# Global processors
processors:
  - add_host_metadata:
      when.not.contains.tags: forwarded
  - add_cloud_metadata: ~
  - add_docker_metadata: ~

# Elasticsearch output
output.elasticsearch:
  hosts: ["https://elasticsearch:9200"]
  protocol: "https"
  username: "${ES_USERNAME}"
  password: "${ES_PASSWORD}"
  ssl:
    enabled: true
    certificate_authorities: ["/etc/filebeat/ca.crt"]

  # Performance tuning
  bulk_max_size: 2048
  worker: 4
  compression_level: 3

  # Index configuration
  index: "logs-%{[fields.app]}-%{+yyyy.MM.dd}"

# Queue settings for buffering
queue.mem:
  events: 4096
  flush.min_events: 2048
  flush.timeout: 1s

# Logging configuration
logging.level: info
logging.to_files: true
logging.files:
  path: /var/log/filebeat
  name: filebeat
  keepfiles: 7
  permissions: 0640
```

## Input Types

### Log Input (File-based)

```yaml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/nginx/access.log
      - /var/log/nginx/error.log
    tags: ["nginx"]

    # Exclude patterns
    exclude_files: ['\.gz$']
    exclude_lines: ['^DEBUG']
    include_lines: ['^ERR', '^WARN']
```

### Filestream Input (Recommended)

```yaml
filebeat.inputs:
  - type: filestream
    id: application-logs
    enabled: true
    paths:
      - /var/log/app/*.log

    prospector:
      scanner:
        fingerprint.enabled: true
        check_interval: 10s

    file_identity.fingerprint: ~

    parsers:
      - multiline:
          type: pattern
          pattern: '^\d{4}-\d{2}-\d{2}'
          negate: true
          match: after
```

### Container Input

```yaml
filebeat.inputs:
  - type: container
    enabled: true
    paths:
      - /var/lib/docker/containers/*/*.log

    # Parse container info
    stream: all

    processors:
      - add_kubernetes_metadata:
          host: ${NODE_NAME}
          matchers:
            - logs_path:
                logs_path: "/var/lib/docker/containers/"
```

### Syslog Input

```yaml
filebeat.inputs:
  - type: syslog
    protocol.udp:
      host: "0.0.0.0:514"

  - type: syslog
    protocol.tcp:
      host: "0.0.0.0:514"
```

### TCP/UDP Input

```yaml
filebeat.inputs:
  - type: tcp
    host: "0.0.0.0:9000"
    max_message_size: 10MiB

  - type: udp
    host: "0.0.0.0:9001"
    max_message_size: 10KiB
```

## Filebeat Modules

### Enable System Module

```bash
filebeat modules enable system
```

Configure module (`/etc/filebeat/modules.d/system.yml`):

```yaml
- module: system
  syslog:
    enabled: true
    var.paths: ["/var/log/syslog*", "/var/log/messages*"]
  auth:
    enabled: true
    var.paths: ["/var/log/auth.log*", "/var/log/secure*"]
```

### Nginx Module

```bash
filebeat modules enable nginx
```

```yaml
- module: nginx
  access:
    enabled: true
    var.paths: ["/var/log/nginx/access.log*"]
  error:
    enabled: true
    var.paths: ["/var/log/nginx/error.log*"]
  ingress_controller:
    enabled: false
```

### MySQL Module

```yaml
- module: mysql
  error:
    enabled: true
    var.paths: ["/var/log/mysql/error.log*"]
  slowlog:
    enabled: true
    var.paths: ["/var/log/mysql/mysql-slow.log*"]
```

### AWS Module

```yaml
- module: aws
  cloudtrail:
    enabled: true
    var.queue_url: "https://sqs.us-east-1.amazonaws.com/123456789/cloudtrail-queue"
    var.access_key_id: "${AWS_ACCESS_KEY_ID}"
    var.secret_access_key: "${AWS_SECRET_ACCESS_KEY}"

  elb:
    enabled: true
    var.bucket_arn: "arn:aws:s3:::my-elb-logs"
```

## Processors

### Add Fields

```yaml
processors:
  - add_fields:
      target: ""
      fields:
        environment: production
        datacenter: us-east-1
```

### Drop Events

```yaml
processors:
  - drop_event:
      when:
        or:
          - contains:
              message: "healthcheck"
          - equals:
              level: "DEBUG"
```

### Include/Exclude Fields

```yaml
processors:
  - include_fields:
      fields: ["@timestamp", "message", "level", "service"]

  - drop_fields:
      fields: ["agent", "ecs", "log.offset"]
      ignore_missing: true
```

### Rename Fields

```yaml
processors:
  - rename:
      fields:
        - from: "log.file.path"
          to: "source_file"
      ignore_missing: true
```

### Decode JSON

```yaml
processors:
  - decode_json_fields:
      fields: ["message"]
      target: ""
      overwrite_keys: true
      add_error_key: true
```

### Script Processor

```yaml
processors:
  - script:
      lang: javascript
      source: |
        function process(event) {
          var msg = event.Get("message");
          if (msg && msg.includes("ERROR")) {
            event.Put("priority", "high");
          }
          return event;
        }
```

### Dissect Processor

```yaml
processors:
  - dissect:
      tokenizer: "%{timestamp} %{level} [%{service}] %{message}"
      field: "message"
      target_prefix: ""
```

## Multiline Configuration

### Java Stack Traces

```yaml
filebeat.inputs:
  - type: log
    paths:
      - /var/log/app/*.log
    multiline:
      pattern: '^\d{4}-\d{2}-\d{2}'
      negate: true
      match: after
      max_lines: 500
```

### Python Tracebacks

```yaml
filebeat.inputs:
  - type: log
    paths:
      - /var/log/python-app/*.log
    multiline:
      pattern: '^Traceback|^  File|^    |^\S+Error:'
      negate: false
      match: after
```

### JSON with Multiline Values

```yaml
filebeat.inputs:
  - type: log
    paths:
      - /var/log/json-app/*.log
    multiline:
      pattern: '^\{'
      negate: true
      match: after
```

## Output Configuration

### Elasticsearch Output

```yaml
output.elasticsearch:
  hosts: ["https://es1:9200", "https://es2:9200", "https://es3:9200"]
  username: "filebeat_internal"
  password: "${ES_PASSWORD}"

  ssl:
    enabled: true
    certificate_authorities: ["/etc/filebeat/ca.crt"]
    certificate: "/etc/filebeat/filebeat.crt"
    key: "/etc/filebeat/filebeat.key"

  # Load balancing
  loadbalance: true

  # Index configuration
  index: "logs-%{[agent.version]}-%{+yyyy.MM.dd}"

  # Ingest pipeline
  pipeline: "logs-pipeline"

  # Performance
  bulk_max_size: 2048
  worker: 4
  compression_level: 3

  # Retry settings
  max_retries: 3
  timeout: 90
```

### Logstash Output

```yaml
output.logstash:
  hosts: ["logstash1:5044", "logstash2:5044"]
  loadbalance: true

  ssl:
    enabled: true
    certificate_authorities: ["/etc/filebeat/ca.crt"]
    certificate: "/etc/filebeat/filebeat.crt"
    key: "/etc/filebeat/filebeat.key"

  # Compression
  compression_level: 3

  # Performance
  bulk_max_size: 2048
  worker: 4
```

### Kafka Output

```yaml
output.kafka:
  hosts: ["kafka1:9092", "kafka2:9092", "kafka3:9092"]
  topic: "logs-%{[service.name]}"

  partition.round_robin:
    reachable_only: true

  required_acks: 1
  compression: gzip
  max_message_bytes: 1000000
```

## Kubernetes Deployment

### DaemonSet Configuration

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: filebeat
  namespace: logging
spec:
  selector:
    matchLabels:
      app: filebeat
  template:
    metadata:
      labels:
        app: filebeat
    spec:
      serviceAccountName: filebeat
      containers:
        - name: filebeat
          image: docker.elastic.co/beats/filebeat:8.11.0
          args:
            - "-c"
            - "/etc/filebeat/filebeat.yml"
            - "-e"
          env:
            - name: NODE_NAME
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName
            - name: ES_USERNAME
              valueFrom:
                secretKeyRef:
                  name: elasticsearch-credentials
                  key: username
            - name: ES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: elasticsearch-credentials
                  key: password
          volumeMounts:
            - name: config
              mountPath: /etc/filebeat
            - name: varlog
              mountPath: /var/log
              readOnly: true
            - name: varlibdockercontainers
              mountPath: /var/lib/docker/containers
              readOnly: true
            - name: data
              mountPath: /usr/share/filebeat/data
          resources:
            limits:
              cpu: 500m
              memory: 512Mi
            requests:
              cpu: 100m
              memory: 128Mi
      volumes:
        - name: config
          configMap:
            name: filebeat-config
        - name: varlog
          hostPath:
            path: /var/log
        - name: varlibdockercontainers
          hostPath:
            path: /var/lib/docker/containers
        - name: data
          hostPath:
            path: /var/lib/filebeat-data
```

### ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: filebeat-config
  namespace: logging
data:
  filebeat.yml: |
    filebeat.inputs:
      - type: container
        paths:
          - /var/lib/docker/containers/*/*.log
        processors:
          - add_kubernetes_metadata:
              host: ${NODE_NAME}
              matchers:
                - logs_path:
                    logs_path: "/var/lib/docker/containers/"

    processors:
      - add_cloud_metadata: ~
      - add_host_metadata: ~

    output.elasticsearch:
      hosts: ["https://elasticsearch:9200"]
      username: "${ES_USERNAME}"
      password: "${ES_PASSWORD}"
      ssl:
        certificate_authorities: ["/etc/filebeat/certs/ca.crt"]
```

## Monitoring Filebeat

### Enable Monitoring

```yaml
monitoring.enabled: true
monitoring.elasticsearch:
  hosts: ["https://monitoring-es:9200"]
  username: "beats_system"
  password: "${BEATS_PASSWORD}"
```

### Check Filebeat Status

```bash
# Service status
systemctl status filebeat

# Test configuration
filebeat test config

# Test output connectivity
filebeat test output

# View logs
journalctl -u filebeat -f
```

### Registry File

Check harvester state:

```bash
cat /var/lib/filebeat/registry/filebeat/data.json | jq '.'
```

## Troubleshooting

### Debug Mode

```bash
filebeat -e -d "*"
```

### Common Issues

#### Files Not Being Harvested

```yaml
# Increase scan frequency
filebeat.inputs:
  - type: log
    scan_frequency: 5s
    close_inactive: 1h
```

#### High Memory Usage

```yaml
# Limit queue size
queue.mem:
  events: 2048

# Limit harvester count
filebeat.inputs:
  - type: log
    harvester_limit: 100
```

#### Duplicate Events

```yaml
# Use fingerprint identity
filebeat.inputs:
  - type: filestream
    file_identity.fingerprint: ~
```

## Best Practices

1. **Use filestream input** for new deployments
2. **Configure multiline** properly for stack traces
3. **Set appropriate harvester limits** to control memory
4. **Use modules** for common log formats
5. **Enable monitoring** for visibility into Filebeat health
6. **Configure SSL** for secure transport
7. **Test configuration** before deploying

## Summary

Filebeat provides efficient log shipping to Elasticsearch with:

1. **Multiple input types** - Files, containers, syslog, TCP/UDP
2. **Built-in modules** - Pre-configured for common applications
3. **Powerful processors** - Transform data before shipping
4. **Flexible outputs** - Elasticsearch, Logstash, Kafka
5. **Kubernetes support** - Native metadata enrichment
6. **Efficient resource usage** - Lightweight with backpressure handling

With proper configuration, Filebeat can reliably ship millions of log events per day to your Elasticsearch cluster.
