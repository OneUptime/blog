# How to Implement Sidecar Containers for Log Shipping and Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Sidecar Containers, Logging, Log Aggregation, Observability

Description: Learn how to implement sidecar containers for log shipping and aggregation in Kubernetes, enabling centralized log management and analysis without modifying your application code.

---

Centralized logging is essential for debugging and monitoring distributed applications. Sidecar containers provide an elegant way to ship logs from your applications to centralized logging systems without embedding logging agents in your application code.

By using a sidecar pattern, you separate logging concerns from application logic, making it easy to swap logging backends or update logging configurations without rebuilding application images.

## Basic Fluentd Sidecar Pattern

Here's a simple example using Fluentd as a log shipper:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app-with-logging
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: app
        image: myapp:latest
        ports:
        - containerPort: 8080
        volumeMounts:
        - name: logs
          mountPath: /var/log/app

      - name: fluentd
        image: fluent/fluentd:v1.16-1
        volumeMounts:
        - name: logs
          mountPath: /var/log/app
          readOnly: true
        - name: fluentd-config
          mountPath: /fluentd/etc
        env:
        - name: FLUENT_ELASTICSEARCH_HOST
          value: "elasticsearch.logging.svc.cluster.local"
        - name: FLUENT_ELASTICSEARCH_PORT
          value: "9200"

      volumes:
      - name: logs
        emptyDir: {}
      - name: fluentd-config
        configMap:
          name: fluentd-config
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/app/*.log
      pos_file /var/log/fluentd/app.log.pos
      tag app.logs
      <parse>
        @type json
        time_key timestamp
        time_format %Y-%m-%dT%H:%M:%S.%NZ
      </parse>
    </source>

    <filter app.logs>
      @type record_transformer
      <record>
        hostname "#{Socket.gethostname}"
        pod_name "#{ENV['HOSTNAME']}"
        namespace "#{ENV['POD_NAMESPACE']}"
      </record>
    </filter>

    <match app.logs>
      @type elasticsearch
      host "#{ENV['FLUENT_ELASTICSEARCH_HOST']}"
      port "#{ENV['FLUENT_ELASTICSEARCH_PORT']}"
      logstash_format true
      logstash_prefix app-logs
      <buffer>
        @type file
        path /var/log/fluentd/buffer
        flush_mode interval
        flush_interval 5s
        retry_max_interval 30
        retry_forever true
      </buffer>
    </match>
```

## Filebeat Sidecar for ELK Stack

Use Filebeat to ship logs to Elasticsearch:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-with-filebeat
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: app
        image: myapp:latest
        volumeMounts:
        - name: logs
          mountPath: /var/log/app

      - name: filebeat
        image: docker.elastic.co/beats/filebeat:8.11.0
        args: ["-c", "/etc/filebeat.yml", "-e"]
        volumeMounts:
        - name: logs
          mountPath: /var/log/app
          readOnly: true
        - name: filebeat-config
          mountPath: /etc/filebeat.yml
          subPath: filebeat.yml
        - name: filebeat-data
          mountPath: /usr/share/filebeat/data

      volumes:
      - name: logs
        emptyDir: {}
      - name: filebeat-data
        emptyDir: {}
      - name: filebeat-config
        configMap:
          name: filebeat-config
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: filebeat-config
data:
  filebeat.yml: |
    filebeat.inputs:
    - type: log
      enabled: true
      paths:
        - /var/log/app/*.log
      fields:
        app: myapp
        environment: production
      fields_under_root: true

    processors:
    - add_kubernetes_metadata:
        host: ${HOSTNAME}
        matchers:
        - logs_path:
            logs_path: "/var/log/app/"

    output.elasticsearch:
      hosts: ["elasticsearch.logging:9200"]
      index: "app-logs-%{+yyyy.MM.dd}"
```

## Vector Sidecar for Modern Log Pipeline

Vector is a lightweight alternative:

```yaml
containers:
- name: app
  image: myapp:latest
  volumeMounts:
  - name: logs
    mountPath: /var/log/app

- name: vector
  image: timberio/vector:0.34.0-alpine
  volumeMounts:
  - name: logs
    mountPath: /var/log/app
    readOnly: true
  - name: vector-config
    mountPath: /etc/vector
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: vector-config
data:
  vector.toml: |
    [sources.app_logs]
    type = "file"
    include = ["/var/log/app/*.log"]
    read_from = "beginning"

    [transforms.parse_json]
    type = "remap"
    inputs = ["app_logs"]
    source = '''
      . = parse_json!(.message)
      .hostname = "${HOSTNAME}"
      .pod_name = "${POD_NAME}"
    '''

    [sinks.loki]
    type = "loki"
    inputs = ["parse_json"]
    endpoint = "http://loki.logging:3100"
    encoding.codec = "json"
    labels.app = "myapp"
```

## Multi-Format Log Parsing

Handle different log formats:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-multiformat
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/app/access.log
      tag app.access
      <parse>
        @type apache2
      </parse>
    </source>

    <source>
      @type tail
      path /var/log/app/error.log
      tag app.error
      <parse>
        @type multiline
        format_firstline /^\d{4}-\d{2}-\d{2}/
        format1 /^(?<time>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \[(?<level>\w+)\] (?<message>.*)/
      </parse>
    </source>

    <source>
      @type tail
      path /var/log/app/app.log
      tag app.application
      <parse>
        @type json
      </parse>
    </source>

    <match app.**>
      @type elasticsearch
      host elasticsearch.logging
      port 9200
      index_name ${tag}-%Y%m%d
    </match>
```

## Prometheus Metrics from Logs

Extract metrics from logs using mtail sidecar:

```yaml
containers:
- name: app
  image: myapp:latest
  volumeMounts:
  - name: logs
    mountPath: /var/log/app

- name: mtail
  image: mtail/mtail:latest
  args:
  - -progs
  - /etc/mtail
  - -logs
  - /var/log/app/*.log
  - -port
  - "3903"
  ports:
  - containerPort: 3903
    name: metrics
  volumeMounts:
  - name: logs
    mountPath: /var/log/app
    readOnly: true
  - name: mtail-config
    mountPath: /etc/mtail
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: mtail-config
data:
  app.mtail: |
    counter request_count by method, status
    histogram request_duration_ms buckets 10, 50, 100, 500, 1000, 5000

    /(?P<method>\w+) (?P<path>[^ ]+) .* (?P<status>\d+) (?P<duration>\d+)ms/ {
      request_count[$method][$status]++
      request_duration_ms = $duration
    }
```

Sidecar containers provide a flexible, maintainable approach to log shipping. By separating logging infrastructure from application code, you can easily update logging strategies, switch backends, and manage log pipelines without modifying your applications.

## Structured Logging Best Practices

Ensure your applications emit structured logs that sidecars can parse effectively:

```go
// Go structured logging example
package main

import (
    "go.uber.org/zap"
)

func main() {
    logger, _ := zap.NewProduction()
    defer logger.Sync()

    logger.Info("Application started",
        zap.String("version", "1.0.0"),
        zap.String("environment", "production"),
    )

    logger.Error("Database connection failed",
        zap.String("host", "postgres"),
        zap.Int("port", 5432),
        zap.Error(err),
    )
}
```

Python structured logging:

```python
import structlog
import logging

structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
)

logger = structlog.get_logger()

logger.info("request_processed",
    method="GET",
    path="/api/users",
    status_code=200,
    duration_ms=45)
```

## Log Buffering and Reliability

Configure buffering to handle bursts and ensure delivery:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-buffer-config
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/app/*.log
      tag app.logs
      <parse>
        @type json
      </parse>
    </source>

    <match app.logs>
      @type elasticsearch
      host elasticsearch
      port 9200
      <buffer>
        @type file
        path /var/log/fluentd/buffer
        flush_mode interval
        flush_interval 5s
        flush_thread_count 2
        chunk_limit_size 5M
        total_limit_size 512M
        overflow_action drop_oldest_chunk
        retry_type exponential_backoff
        retry_wait 10s
        retry_max_interval 300s
        retry_timeout 1h
      </buffer>
    </match>
```

## Multi-Destination Log Shipping

Ship logs to multiple destinations:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-multi-output
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/app/*.log
      tag app.logs
      <parse>
        @type json
      </parse>
    </source>

    # Send to Elasticsearch
    <match app.logs>
      @type copy
      <store>
        @type elasticsearch
        host elasticsearch.logging
        port 9200
        logstash_format true
        logstash_prefix app-logs
      </store>

      # Send to S3 for long-term storage
      <store>
        @type s3
        s3_bucket my-logs-archive
        s3_region us-east-1
        path logs/
        time_slice_format %Y%m%d
        <buffer>
          @type file
          path /var/log/fluentd/s3-buffer
          timekey 3600
          timekey_wait 10m
        </buffer>
      </store>

      # Send to CloudWatch
      <store>
        @type cloudwatch_logs
        log_group_name /aws/kubernetes/app-logs
        log_stream_name ${tag}
        auto_create_stream true
      </store>
    </match>
```

## Resource Management

Properly configure sidecar resources:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-with-logging-resources
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: app
        image: myapp:latest
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"

      - name: fluentd
        image: fluent/fluentd:v1.16-1
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        volumeMounts:
        - name: logs
          mountPath: /var/log/app
        - name: fluentd-buffer
          mountPath: /var/log/fluentd

      volumes:
      - name: logs
        emptyDir: {}
      - name: fluentd-buffer
        emptyDir:
          sizeLimit: 1Gi
```

## Monitoring Log Pipeline Health

Monitor your log shipping sidecars:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-with-metrics
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/app/*.log
      tag app.logs
      <parse>
        @type json
      </parse>
    </source>

    # Prometheus metrics
    <source>
      @type prometheus
      bind 0.0.0.0
      port 24231
      metrics_path /metrics
    </source>

    <source>
      @type prometheus_monitor
      interval 10
    </source>

    <source>
      @type prometheus_output_monitor
      interval 10
    </source>

    <match app.logs>
      @type elasticsearch
      host elasticsearch
      port 9200
      <buffer>
        @type file
        path /var/log/fluentd/buffer
      </buffer>
    </match>
---
apiVersion: v1
kind: Service
metadata:
  name: fluentd-metrics
  labels:
    app: myapp
spec:
  selector:
    app: myapp
  ports:
  - name: metrics
    port: 24231
    targetPort: 24231
```

## Alerting on Log Shipping Failures

Create alerts for log shipping issues:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: fluentd-alerts
spec:
  groups:
  - name: fluentd
    interval: 30s
    rules:
    - alert: FluentdHighBufferUsage
      expr: fluentd_output_status_buffer_total_bytes / fluentd_output_status_buffer_limit_bytes > 0.8
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Fluentd buffer usage high"
        description: "Fluentd buffer is {{ $value | humanizePercentage }} full"

    - alert: FluentdRetryIncreasing
      expr: rate(fluentd_output_status_retry_count[5m]) > 0.1
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Fluentd retry rate increasing"
        description: "Fluentd is retrying at {{ $value }} retries/sec"
```

Sidecar containers provide a robust, flexible solution for log shipping in Kubernetes. By separating log collection from application logic, you gain the ability to change logging infrastructure, add new destinations, and optimize log processing without modifying or redeploying your applications. This pattern is essential for maintaining observability in complex distributed systems.
