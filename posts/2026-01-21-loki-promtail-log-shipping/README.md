# How to Ship Logs to Loki with Promtail

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, Promtail, Log Collection, Log Shipping, Pipeline, Observability

Description: A comprehensive guide to shipping logs to Grafana Loki using Promtail, covering agent configuration, pipeline stages, label extraction, and production deployment patterns.

---

Promtail is the official log collection agent for Grafana Loki. It discovers log files, extracts labels, transforms log lines through pipeline stages, and pushes them to Loki. This guide covers everything from basic setup to advanced pipeline configurations for production environments.

## Prerequisites

Before starting, ensure you have:

- Grafana Loki instance running and accessible
- Access to systems where logs need to be collected
- Basic understanding of YAML configuration
- Familiarity with regular expressions (for advanced parsing)

## Installing Promtail

### Binary Installation

```bash
# Download latest release
PROMTAIL_VERSION="2.9.4"
curl -LO "https://github.com/grafana/loki/releases/download/v${PROMTAIL_VERSION}/promtail-linux-amd64.zip"
unzip promtail-linux-amd64.zip
chmod +x promtail-linux-amd64
sudo mv promtail-linux-amd64 /usr/local/bin/promtail
```

### Docker Installation

```bash
docker run -d \
  --name promtail \
  -v /var/log:/var/log:ro \
  -v $(pwd)/promtail-config.yaml:/etc/promtail/config.yaml \
  grafana/promtail:2.9.4 \
  -config.file=/etc/promtail/config.yaml
```

### Systemd Service

```ini
# /etc/systemd/system/promtail.service
[Unit]
Description=Promtail service
After=network.target

[Service]
Type=simple
User=promtail
ExecStart=/usr/local/bin/promtail -config.file=/etc/promtail/config.yaml
Restart=on-failure
RestartSec=20
StandardOutput=append:/var/log/promtail/promtail.log
StandardError=append:/var/log/promtail/promtail.log

[Install]
WantedBy=multi-user.target
```

## Basic Configuration

Create a basic `promtail-config.yaml`:

```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /var/lib/promtail/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: system
    static_configs:
      - targets:
          - localhost
        labels:
          job: varlogs
          host: ${HOSTNAME}
          __path__: /var/log/*.log
```

## Configuration Deep Dive

### Server Configuration

```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0
  log_level: info
  log_format: logfmt
  # Enable profiling endpoints
  profiling_enabled: false
  # Graceful shutdown timeout
  graceful_shutdown_timeout: 30s
```

### Positions Configuration

Positions track which log files have been read:

```yaml
positions:
  filename: /var/lib/promtail/positions.yaml
  sync_period: 10s
  ignore_invalid_yaml: false
```

### Client Configuration

```yaml
clients:
  - url: http://loki:3100/loki/api/v1/push
    tenant_id: default
    batchwait: 1s
    batchsize: 1048576  # 1MB
    timeout: 10s
    backoff_config:
      min_period: 500ms
      max_period: 5m
      max_retries: 10
    # Basic auth
    basic_auth:
      username: admin
      password_file: /etc/promtail/password
    # TLS configuration
    tls_config:
      ca_file: /etc/promtail/ca.crt
      cert_file: /etc/promtail/client.crt
      key_file: /etc/promtail/client.key
      insecure_skip_verify: false
    # External labels applied to all logs
    external_labels:
      environment: production
      cluster: us-east-1
```

### Multiple Loki Endpoints

```yaml
clients:
  # Primary Loki cluster
  - url: http://loki-primary:3100/loki/api/v1/push
    tenant_id: primary
  # Secondary for replication
  - url: http://loki-secondary:3100/loki/api/v1/push
    tenant_id: secondary
```

## Scrape Configurations

### Static Configuration

```yaml
scrape_configs:
  - job_name: application
    static_configs:
      - targets:
          - localhost
        labels:
          job: myapp
          environment: production
          __path__: /var/log/myapp/*.log
```

### File Discovery with Glob Patterns

```yaml
scrape_configs:
  - job_name: applications
    static_configs:
      - targets:
          - localhost
        labels:
          job: apps
          __path__: /var/log/apps/**/*.log
      - targets:
          - localhost
        labels:
          job: nginx
          __path__: /var/log/nginx/{access,error}.log
```

### Journal Scraping (systemd)

```yaml
scrape_configs:
  - job_name: journal
    journal:
      max_age: 12h
      labels:
        job: systemd-journal
      path: /var/log/journal
    relabel_configs:
      - source_labels: ['__journal__systemd_unit']
        target_label: 'unit'
      - source_labels: ['__journal__hostname']
        target_label: 'hostname'
      - source_labels: ['__journal_priority_keyword']
        target_label: 'level'
```

### Docker Container Logs

```yaml
scrape_configs:
  - job_name: docker
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 5s
    relabel_configs:
      - source_labels: ['__meta_docker_container_name']
        regex: '/(.*)'
        target_label: 'container'
      - source_labels: ['__meta_docker_container_log_stream']
        target_label: 'logstream'
      - source_labels: ['__meta_docker_container_label_com_docker_compose_service']
        target_label: 'service'
```

## Pipeline Stages

Pipeline stages transform log lines before sending to Loki.

### JSON Parsing

```yaml
scrape_configs:
  - job_name: json-logs
    static_configs:
      - targets: [localhost]
        labels:
          job: json-app
          __path__: /var/log/app/*.json
    pipeline_stages:
      - json:
          expressions:
            level: level
            message: msg
            timestamp: time
            user_id: context.user_id
            request_id: context.request_id
      - labels:
          level:
          user_id:
      - timestamp:
          source: timestamp
          format: RFC3339
      - output:
          source: message
```

### Logfmt Parsing

```yaml
pipeline_stages:
  - logfmt:
      mapping:
        level:
        msg:
        ts:
        caller:
  - labels:
      level:
  - timestamp:
      source: ts
      format: "2006-01-02T15:04:05.000Z"
```

### Regex Parsing

```yaml
pipeline_stages:
  - regex:
      expression: '^(?P<ip>[\d\.]+) - (?P<user>\S+) \[(?P<timestamp>[^\]]+)\] "(?P<method>\w+) (?P<path>\S+) (?P<protocol>\S+)" (?P<status>\d+) (?P<size>\d+)'
  - labels:
      method:
      status:
  - timestamp:
      source: timestamp
      format: "02/Jan/2006:15:04:05 -0700"
```

### Pattern Parsing

```yaml
pipeline_stages:
  - pattern:
      expression: '<ip> - <user> [<timestamp>] "<method> <path> <_>" <status> <size>'
  - labels:
      method:
      status:
```

### Multi-line Log Handling

```yaml
pipeline_stages:
  - multiline:
      firstline: '^\d{4}-\d{2}-\d{2}'
      max_wait_time: 3s
      max_lines: 1000
```

For Java stack traces:

```yaml
pipeline_stages:
  - multiline:
      firstline: '^\d{4}-\d{2}-\d{2}|^[A-Z][a-z]{2} \d{2}'
      max_wait_time: 3s
  - regex:
      expression: '^(?P<timestamp>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}) (?P<level>\w+) (?P<class>[\w.]+) - (?P<message>.*)'
  - labels:
      level:
```

### Label Manipulation

```yaml
pipeline_stages:
  # Add static labels
  - static_labels:
      environment: production

  # Extract labels from log content
  - labels:
      level:
      method:

  # Replace label values
  - labeldrop:
      - user_id  # Remove high-cardinality label

  # Rename labels
  - labelallow:
      - level
      - method
      - path
```

### Metrics Generation

```yaml
pipeline_stages:
  - metrics:
      http_requests_total:
        type: Counter
        description: "Total HTTP requests"
        source: status
        config:
          match_all: true
          action: inc

      http_request_size_bytes:
        type: Histogram
        description: "HTTP request size"
        source: size
        config:
          buckets: [100, 1000, 10000, 100000, 1000000]
```

### Filtering and Dropping

```yaml
pipeline_stages:
  # Drop logs matching pattern
  - drop:
      expression: '.*healthcheck.*'
      drop_counter_reason: healthcheck

  # Drop by label value
  - match:
      selector: '{job="nginx"}'
      stages:
        - drop:
            expression: '.*GET /health.*'
```

### Replace and Redact

```yaml
pipeline_stages:
  # Redact sensitive data
  - replace:
      expression: '(password[=:]\s*)[^\s]+'
      replace: '${1}[REDACTED]'

  - replace:
      expression: '\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
      replace: '[EMAIL_REDACTED]'

  # Mask credit card numbers
  - replace:
      expression: '\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b'
      replace: '[CC_REDACTED]'
```

### Template Stage

```yaml
pipeline_stages:
  - template:
      source: level
      template: '{{ ToLower .Value }}'

  - template:
      source: new_label
      template: '{{ .level }}_{{ .method }}'
```

## Complete Production Configuration

```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0
  log_level: info

positions:
  filename: /var/lib/promtail/positions.yaml
  sync_period: 10s

clients:
  - url: http://loki-gateway:3100/loki/api/v1/push
    tenant_id: production
    batchwait: 1s
    batchsize: 1048576
    timeout: 10s
    backoff_config:
      min_period: 500ms
      max_period: 5m
      max_retries: 10
    external_labels:
      cluster: production-us-east
      hostname: ${HOSTNAME}

scrape_configs:
  # Application JSON logs
  - job_name: application
    static_configs:
      - targets: [localhost]
        labels:
          job: myapp
          __path__: /var/log/myapp/*.log
    pipeline_stages:
      - multiline:
          firstline: '^\{'
          max_wait_time: 3s
      - json:
          expressions:
            level: level
            message: msg
            timestamp: "@timestamp"
            trace_id: trace_id
            span_id: span_id
            service: service
      - labels:
          level:
          service:
      - timestamp:
          source: timestamp
          format: RFC3339Nano
      - output:
          source: message
      # Redact PII
      - replace:
          expression: '"email":\s*"[^"]*"'
          replace: '"email": "[REDACTED]"'
      # Drop debug in production
      - drop:
          expression: '"level":\s*"debug"'
          drop_counter_reason: debug_logs

  # Nginx access logs
  - job_name: nginx-access
    static_configs:
      - targets: [localhost]
        labels:
          job: nginx
          type: access
          __path__: /var/log/nginx/access.log
    pipeline_stages:
      - regex:
          expression: '^(?P<remote_addr>[\d\.]+) - (?P<remote_user>\S+) \[(?P<time_local>[^\]]+)\] "(?P<method>\w+) (?P<request_uri>\S+) (?P<protocol>\S+)" (?P<status>\d+) (?P<body_bytes_sent>\d+) "(?P<http_referer>[^"]*)" "(?P<http_user_agent>[^"]*)" "(?P<request_time>[\d\.]+)"'
      - labels:
          method:
          status:
      - timestamp:
          source: time_local
          format: "02/Jan/2006:15:04:05 -0700"
      - metrics:
          nginx_requests_total:
            type: Counter
            description: "Total nginx requests"
            config:
              match_all: true
              action: inc
          nginx_request_duration_seconds:
            type: Histogram
            description: "Request duration"
            source: request_time
            config:
              buckets: [0.01, 0.05, 0.1, 0.5, 1, 5, 10]

  # Nginx error logs
  - job_name: nginx-error
    static_configs:
      - targets: [localhost]
        labels:
          job: nginx
          type: error
          __path__: /var/log/nginx/error.log
    pipeline_stages:
      - regex:
          expression: '^(?P<timestamp>\d{4}/\d{2}/\d{2} \d{2}:\d{2}:\d{2}) \[(?P<level>\w+)\] (?P<pid>\d+)#(?P<tid>\d+): (?P<message>.*)'
      - labels:
          level:
      - timestamp:
          source: timestamp
          format: "2006/01/02 15:04:05"

  # System logs
  - job_name: syslog
    static_configs:
      - targets: [localhost]
        labels:
          job: syslog
          __path__: /var/log/syslog
    pipeline_stages:
      - regex:
          expression: '^(?P<timestamp>\w{3}\s+\d+\s+\d{2}:\d{2}:\d{2}) (?P<hostname>\S+) (?P<program>[^\[:]+)(?:\[(?P<pid>\d+)\])?: (?P<message>.*)'
      - labels:
          program:
      - timestamp:
          source: timestamp
          format: "Jan  2 15:04:05"

  # Docker containers via file
  - job_name: docker-containers
    static_configs:
      - targets: [localhost]
        labels:
          job: docker
          __path__: /var/lib/docker/containers/*/*-json.log
    pipeline_stages:
      - json:
          expressions:
            log: log
            stream: stream
            time: time
      - regex:
          source: log
          expression: '^(?P<level>\w+)\s+(?P<message>.*)'
      - labels:
          stream:
          level:
      - timestamp:
          source: time
          format: RFC3339Nano
      - output:
          source: log
```

## Kubernetes Deployment

### DaemonSet Configuration

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: promtail
  namespace: loki
spec:
  selector:
    matchLabels:
      app: promtail
  template:
    metadata:
      labels:
        app: promtail
    spec:
      serviceAccountName: promtail
      containers:
        - name: promtail
          image: grafana/promtail:2.9.4
          args:
            - -config.file=/etc/promtail/config.yaml
          env:
            - name: HOSTNAME
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName
          ports:
            - containerPort: 9080
              name: http
          volumeMounts:
            - name: config
              mountPath: /etc/promtail
            - name: positions
              mountPath: /var/lib/promtail
            - name: varlog
              mountPath: /var/log
              readOnly: true
            - name: containers
              mountPath: /var/lib/docker/containers
              readOnly: true
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 200m
              memory: 256Mi
      tolerations:
        - key: node-role.kubernetes.io/master
          operator: Exists
          effect: NoSchedule
        - key: node-role.kubernetes.io/control-plane
          operator: Exists
          effect: NoSchedule
      volumes:
        - name: config
          configMap:
            name: promtail-config
        - name: positions
          hostPath:
            path: /var/lib/promtail
        - name: varlog
          hostPath:
            path: /var/log
        - name: containers
          hostPath:
            path: /var/lib/docker/containers
```

### Kubernetes Scrape Config

```yaml
scrape_configs:
  - job_name: kubernetes-pods
    kubernetes_sd_configs:
      - role: pod
    pipeline_stages:
      - cri: {}
      - json:
          expressions:
            level: level
            msg: msg
      - labels:
          level:
    relabel_configs:
      - source_labels:
          - __meta_kubernetes_pod_controller_name
        regex: ([0-9a-z-.]+?)(-[0-9a-f]{8,10})?
        action: replace
        target_label: __tmp_controller_name
      - source_labels:
          - __meta_kubernetes_pod_label_app_kubernetes_io_name
          - __meta_kubernetes_pod_label_app
          - __tmp_controller_name
          - __meta_kubernetes_pod_name
        regex: ^;*([^;]+)(;.*)?$
        action: replace
        target_label: app
      - source_labels:
          - __meta_kubernetes_pod_label_app_kubernetes_io_component
          - __meta_kubernetes_pod_label_component
        regex: ^;*([^;]+)(;.*)?$
        action: replace
        target_label: component
      - action: replace
        source_labels:
          - __meta_kubernetes_pod_node_name
        target_label: node
      - action: replace
        source_labels:
          - __meta_kubernetes_namespace
        target_label: namespace
      - action: replace
        source_labels:
          - __meta_kubernetes_pod_name
        target_label: pod
      - action: replace
        source_labels:
          - __meta_kubernetes_pod_container_name
        target_label: container
      - replacement: /var/log/pods/*$1/*.log
        separator: /
        source_labels:
          - __meta_kubernetes_pod_uid
          - __meta_kubernetes_pod_container_name
        target_label: __path__
```

## Monitoring Promtail

### Metrics Endpoint

Promtail exposes metrics at `/metrics`:

```bash
curl http://localhost:9080/metrics
```

Key metrics to monitor:

```promql
# Log entries read
rate(promtail_read_lines_total[5m])

# Bytes sent to Loki
rate(promtail_sent_bytes_total[5m])

# Dropped entries
rate(promtail_dropped_entries_total[5m])

# Request latency to Loki
histogram_quantile(0.99, rate(promtail_request_duration_seconds_bucket[5m]))
```

### Troubleshooting

Check Promtail logs:

```bash
journalctl -u promtail -f
# or
docker logs promtail -f
```

Verify targets:

```bash
curl http://localhost:9080/targets
```

Check readiness:

```bash
curl http://localhost:9080/ready
```

## Conclusion

Promtail provides a powerful and flexible way to ship logs to Loki. Key takeaways:

- Use pipeline stages to parse, transform, and enrich logs
- Configure appropriate batching and retry settings for reliability
- Use relabel configs to add metadata from service discovery
- Implement multi-line handling for stack traces
- Redact sensitive data before shipping
- Monitor Promtail metrics for observability into the collection pipeline

With proper configuration, Promtail can efficiently collect logs from any source and deliver them to Loki for analysis.
