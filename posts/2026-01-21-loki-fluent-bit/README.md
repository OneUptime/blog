# How to Ship Logs to Loki with Fluent Bit

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, Fluent Bit, Log Collection, Log Shipping, Cloud Native, Observability

Description: A comprehensive guide to shipping logs to Grafana Loki using Fluent Bit, covering output plugin configuration, filtering, parsing, and production deployment patterns.

---

Fluent Bit is a lightweight and high-performance log processor and forwarder that integrates seamlessly with Grafana Loki. As part of the Fluentd ecosystem, Fluent Bit offers a smaller memory footprint while providing powerful log processing capabilities. This guide covers how to configure Fluent Bit to ship logs to Loki effectively.

## Prerequisites

Before starting, ensure you have:

- Grafana Loki instance running and accessible
- Fluent Bit 2.0 or later installed
- Understanding of Fluent Bit's input/filter/output pipeline
- Access to systems where logs need to be collected

## Installing Fluent Bit

### Package Installation (Ubuntu/Debian)

```bash
# Add GPG key
curl https://raw.githubusercontent.com/fluent/fluent-bit/master/install.sh | sh
```

### Docker Installation

```bash
docker run -d \
  --name fluent-bit \
  -v /var/log:/var/log:ro \
  -v $(pwd)/fluent-bit.conf:/fluent-bit/etc/fluent-bit.conf \
  fluent/fluent-bit:2.2
```

### Kubernetes Helm Installation

```bash
helm repo add fluent https://fluent.github.io/helm-charts
helm install fluent-bit fluent/fluent-bit \
  --namespace logging \
  --create-namespace
```

## Basic Configuration

Create a basic `fluent-bit.conf`:

```ini
[SERVICE]
    Flush         1
    Log_Level     info
    Daemon        off
    Parsers_File  parsers.conf

[INPUT]
    Name          tail
    Path          /var/log/*.log
    Tag           logs.*

[OUTPUT]
    Name          loki
    Match         *
    Host          loki
    Port          3100
    Labels        job=fluent-bit
```

## Loki Output Plugin Configuration

### Basic Output

```ini
[OUTPUT]
    Name              loki
    Match             *
    Host              loki.example.com
    Port              3100
    TLS               on
    TLS.verify        on
```

### Complete Output Configuration

```ini
[OUTPUT]
    Name              loki
    Match             *
    Host              loki-gateway.loki.svc.cluster.local
    Port              80
    # Authentication
    HTTP_User         admin
    HTTP_Passwd       ${LOKI_PASSWORD}
    # TLS settings
    TLS               off
    TLS.verify        on
    TLS.ca_file       /certs/ca.crt
    TLS.crt_file      /certs/client.crt
    TLS.key_file      /certs/client.key
    # Tenant ID for multi-tenancy
    Tenant_ID         production
    # Labels
    Labels            job=fluent-bit, environment=production
    # Auto-create labels from record keys
    Label_Keys        $kubernetes['namespace_name'],$kubernetes['pod_name']
    # Remove keys from log line after adding as labels
    Remove_Keys       kubernetes,stream
    # Line format
    Line_Format       json
    # Batching
    batch_wait        1
    batch_size        1048576
    # Retry settings
    Retry_Limit       5
```

### Label Configuration

```ini
[OUTPUT]
    Name              loki
    Match             *
    Host              loki
    Port              3100
    # Static labels
    Labels            job=myapp, env=prod, region=us-east-1
    # Dynamic labels from record
    Label_Keys        $level,$service,$host
    # Label map file
    Label_Map_Path    /fluent-bit/etc/labelmap.json
```

Label map file (`labelmap.json`):

```json
{
  "kubernetes": {
    "namespace_name": "namespace",
    "pod_name": "pod",
    "container_name": "container",
    "labels": {
      "app": "app",
      "version": "version"
    }
  },
  "level": "level",
  "stream": "stream"
}
```

## Input Plugins

### Tail Input (Log Files)

```ini
[INPUT]
    Name              tail
    Path              /var/log/app/*.log
    Path_Key          filename
    Tag               app.logs
    DB                /var/lib/fluent-bit/tail.db
    DB.Sync           Normal
    Mem_Buf_Limit     10MB
    Skip_Long_Lines   On
    Refresh_Interval  10
    Read_from_Head    False
    # Multi-line parsing
    Multiline         On
    Parser_Firstline  multiline_start
```

### Systemd Input

```ini
[INPUT]
    Name              systemd
    Tag               systemd.*
    Systemd_Filter    _SYSTEMD_UNIT=docker.service
    Systemd_Filter    _SYSTEMD_UNIT=kubelet.service
    Read_From_Tail    On
    Strip_Underscores On
```

### Forward Input (Fluentd Compatible)

```ini
[INPUT]
    Name              forward
    Listen            0.0.0.0
    Port              24224
    Tag               forward.*
```

### Kubernetes Metadata

```ini
[INPUT]
    Name              tail
    Path              /var/log/containers/*.log
    Parser            cri
    Tag               kube.*
    Mem_Buf_Limit     50MB
    Skip_Long_Lines   On
    DB                /var/lib/fluent-bit/kube.db

[FILTER]
    Name              kubernetes
    Match             kube.*
    Kube_URL          https://kubernetes.default.svc:443
    Kube_CA_File      /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    Kube_Token_File   /var/run/secrets/kubernetes.io/serviceaccount/token
    Merge_Log         On
    Merge_Log_Key     log_processed
    K8S-Logging.Parser On
    K8S-Logging.Exclude On
    Labels            On
    Annotations       Off
```

## Filters

### Parser Filter

```ini
[FILTER]
    Name              parser
    Match             app.*
    Key_Name          log
    Parser            json
    Reserve_Data      On
    Preserve_Key      Off
```

### Modify Filter

```ini
[FILTER]
    Name              modify
    Match             *
    # Add fields
    Add               environment production
    Add               cluster us-east-1
    # Rename fields
    Rename            msg message
    Rename            lvl level
    # Remove fields
    Remove            kubernetes.labels.pod-template-hash
    Remove            kubernetes.labels.controller-revision-hash
    # Copy fields
    Copy              level severity
```

### Record Modifier

```ini
[FILTER]
    Name              record_modifier
    Match             *
    Record            hostname ${HOSTNAME}
    Record            cluster production
    Remove_key        stream
    Allowlist_key     level
    Allowlist_key     message
    Allowlist_key     timestamp
```

### Grep Filter (Include/Exclude)

```ini
# Include only error logs
[FILTER]
    Name              grep
    Match             *
    Regex             level (error|warn|fatal)

# Exclude health checks
[FILTER]
    Name              grep
    Match             *
    Exclude           message healthcheck
    Exclude           path /health
```

### Lua Filter (Custom Processing)

```ini
[FILTER]
    Name              lua
    Match             *
    Script            /fluent-bit/etc/filter.lua
    Call              enrich_log
```

Lua script (`filter.lua`):

```lua
function enrich_log(tag, timestamp, record)
    -- Add processing timestamp
    record["processed_at"] = os.date("!%Y-%m-%dT%H:%M:%SZ")

    -- Normalize log level
    if record["level"] then
        record["level"] = string.lower(record["level"])
    end

    -- Extract trace ID from message
    if record["message"] then
        local trace_id = string.match(record["message"], "trace_id=([a-f0-9]+)")
        if trace_id then
            record["trace_id"] = trace_id
        end
    end

    -- Redact sensitive data
    if record["message"] then
        record["message"] = string.gsub(record["message"], "password=[^%s]+", "password=[REDACTED]")
    end

    return 2, timestamp, record
end
```

### Nest Filter

```ini
# Nest fields under a key
[FILTER]
    Name              nest
    Match             *
    Operation         nest
    Wildcard          kubernetes_*
    Nest_under        kubernetes
    Remove_prefix     kubernetes_

# Lift nested fields
[FILTER]
    Name              nest
    Match             *
    Operation         lift
    Nested_under      kubernetes
    Add_prefix        k8s_
```

### Rewrite Tag Filter

```ini
[FILTER]
    Name              rewrite_tag
    Match             kube.*
    Rule              $kubernetes['namespace_name'] ^(kube-system|monitoring)$ infra.$TAG false
    Rule              $level ^(error|fatal)$ alerts.$TAG false
    Emitter_Name      re_emitted
```

## Parsers Configuration

Create `parsers.conf`:

```ini
[PARSER]
    Name              json
    Format            json
    Time_Key          time
    Time_Format       %Y-%m-%dT%H:%M:%S.%L%z
    Time_Keep         On

[PARSER]
    Name              apache
    Format            regex
    Regex             ^(?<host>[^ ]*) [^ ]* (?<user>[^ ]*) \[(?<time>[^\]]*)\] "(?<method>\S+)(?: +(?<path>[^\"]*?)(?: +\S*)?)?" (?<code>[^ ]*) (?<size>[^ ]*)(?: "(?<referer>[^\"]*)" "(?<agent>[^\"]*)")?$
    Time_Key          time
    Time_Format       %d/%b/%Y:%H:%M:%S %z

[PARSER]
    Name              nginx
    Format            regex
    Regex             ^(?<remote>[^ ]*) (?<host>[^ ]*) (?<user>[^ ]*) \[(?<time>[^\]]*)\] "(?<method>\S+)(?: +(?<path>[^\"]*?)(?: +\S*)?)?" (?<code>[^ ]*) (?<size>[^ ]*)(?: "(?<referer>[^\"]*)" "(?<agent>[^\"]*)")
    Time_Key          time
    Time_Format       %d/%b/%Y:%H:%M:%S %z

[PARSER]
    Name              syslog
    Format            regex
    Regex             ^\<(?<pri>[0-9]+)\>(?<time>[^ ]* {1,2}[^ ]* [^ ]*) (?<host>[^ ]*) (?<ident>[a-zA-Z0-9_\/\.\-]*)(?:\[(?<pid>[0-9]+)\])?(?:[^\:]*\:)? *(?<message>.*)$
    Time_Key          time
    Time_Format       %b %d %H:%M:%S

[PARSER]
    Name              cri
    Format            regex
    Regex             ^(?<time>[^ ]+) (?<stream>stdout|stderr) (?<logtag>[^ ]*) (?<log>.*)$
    Time_Key          time
    Time_Format       %Y-%m-%dT%H:%M:%S.%L%z

[PARSER]
    Name              docker
    Format            json
    Time_Key          time
    Time_Format       %Y-%m-%dT%H:%M:%S.%L%z

[PARSER]
    Name              multiline_start
    Format            regex
    Regex             ^(?<time>\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}).*$
```

## Complete Production Configuration

```ini
[SERVICE]
    Flush             1
    Grace             30
    Log_Level         info
    Daemon            off
    Parsers_File      parsers.conf
    HTTP_Server       On
    HTTP_Listen       0.0.0.0
    HTTP_Port         2020
    Health_Check      On
    HC_Errors_Count   5
    HC_Retry_Failure_Count 5
    HC_Period         60
    storage.path      /var/lib/fluent-bit/storage
    storage.sync      normal
    storage.checksum  off
    storage.max_chunks_up 128
    storage.backlog.mem_limit 5M

# Kubernetes container logs
[INPUT]
    Name              tail
    Path              /var/log/containers/*.log
    Exclude_Path      /var/log/containers/*_kube-system_*.log,/var/log/containers/*_monitoring_*.log
    Parser            cri
    Tag               kube.*
    Mem_Buf_Limit     50MB
    Skip_Long_Lines   On
    DB                /var/lib/fluent-bit/kube-containers.db
    DB.locking        true
    Refresh_Interval  10

# System logs
[INPUT]
    Name              tail
    Path              /var/log/syslog,/var/log/messages
    Parser            syslog
    Tag               system.*
    Mem_Buf_Limit     5MB
    DB                /var/lib/fluent-bit/system.db

# Kubernetes metadata enrichment
[FILTER]
    Name              kubernetes
    Match             kube.*
    Kube_URL          https://kubernetes.default.svc:443
    Kube_CA_File      /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    Kube_Token_File   /var/run/secrets/kubernetes.io/serviceaccount/token
    Merge_Log         On
    Merge_Log_Trim    On
    K8S-Logging.Parser On
    K8S-Logging.Exclude On
    Labels            On
    Annotations       Off
    Buffer_Size       0

# Parse JSON logs
[FILTER]
    Name              parser
    Match             kube.*
    Key_Name          log
    Parser            json
    Reserve_Data      On
    Preserve_Key      Off

# Add static labels
[FILTER]
    Name              modify
    Match             *
    Add               cluster production
    Add               region us-east-1

# Remove unnecessary fields
[FILTER]
    Name              modify
    Match             kube.*
    Remove            logtag
    Remove            kubernetes.pod_id
    Remove            kubernetes.docker_id
    Remove            kubernetes.container_hash

# Filter out noisy logs
[FILTER]
    Name              grep
    Match             kube.*
    Exclude           log healthcheck
    Exclude           log kube-probe

# Throttle high-volume sources
[FILTER]
    Name              throttle
    Match             kube.*
    Rate              1000
    Window            5
    Interval          1s

# Output to Loki
[OUTPUT]
    Name              loki
    Match             kube.*
    Host              loki-gateway.loki.svc.cluster.local
    Port              80
    Tenant_ID         production
    Labels            job=kubernetes
    Label_Keys        $kubernetes['namespace_name'],$kubernetes['pod_name'],$kubernetes['container_name'],$level
    Remove_Keys       kubernetes,stream,logtag
    Auto_Kubernetes_Labels on
    Line_Format       json
    batch_wait        1
    batch_size        1048576
    Retry_Limit       5

[OUTPUT]
    Name              loki
    Match             system.*
    Host              loki-gateway.loki.svc.cluster.local
    Port              80
    Tenant_ID         production
    Labels            job=system
    Line_Format       json
    Retry_Limit       5

# Metrics output
[OUTPUT]
    Name              prometheus_exporter
    Match             *
    Host              0.0.0.0
    Port              2021
```

## Kubernetes DaemonSet

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluent-bit
  namespace: logging
spec:
  selector:
    matchLabels:
      app: fluent-bit
  template:
    metadata:
      labels:
        app: fluent-bit
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "2020"
        prometheus.io/path: "/api/v1/metrics/prometheus"
    spec:
      serviceAccountName: fluent-bit
      containers:
        - name: fluent-bit
          image: fluent/fluent-bit:2.2
          ports:
            - containerPort: 2020
              name: metrics
          env:
            - name: HOSTNAME
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName
          volumeMounts:
            - name: config
              mountPath: /fluent-bit/etc
            - name: varlog
              mountPath: /var/log
              readOnly: true
            - name: containers
              mountPath: /var/lib/docker/containers
              readOnly: true
            - name: storage
              mountPath: /var/lib/fluent-bit
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 200m
              memory: 256Mi
          livenessProbe:
            httpGet:
              path: /api/v1/health
              port: 2020
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /api/v1/health
              port: 2020
            initialDelaySeconds: 10
            periodSeconds: 10
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
            name: fluent-bit-config
        - name: varlog
          hostPath:
            path: /var/log
        - name: containers
          hostPath:
            path: /var/lib/docker/containers
        - name: storage
          hostPath:
            path: /var/lib/fluent-bit
```

## Monitoring Fluent Bit

### Metrics Endpoint

```bash
# Health check
curl http://localhost:2020/api/v1/health

# Prometheus metrics
curl http://localhost:2020/api/v1/metrics/prometheus

# Storage metrics
curl http://localhost:2020/api/v1/storage
```

### Key Metrics

```promql
# Input records rate
rate(fluentbit_input_records_total[5m])

# Output records rate
rate(fluentbit_output_proc_records_total[5m])

# Retry rate
rate(fluentbit_output_retries_total[5m])

# Error rate
rate(fluentbit_output_errors_total[5m])

# Dropped records
rate(fluentbit_output_dropped_records_total[5m])
```

## Troubleshooting

### Enable Debug Logging

```ini
[SERVICE]
    Log_Level     debug
```

### Check Pipeline Status

```bash
curl http://localhost:2020/api/v1/metrics
```

### Common Issues

**High Memory Usage**:
```ini
[INPUT]
    Mem_Buf_Limit     10MB
    Skip_Long_Lines   On
```

**Connection Refused to Loki**:
- Verify network connectivity
- Check Loki endpoint and port
- Verify TLS settings

**Missing Logs**:
- Check file permissions
- Verify path patterns
- Check DB file for position tracking

## Conclusion

Fluent Bit provides a lightweight yet powerful solution for shipping logs to Loki. Key takeaways:

- Use appropriate input plugins for your log sources
- Apply filters to parse, enrich, and transform logs
- Configure proper labels for efficient Loki queries
- Set up batching and retry for reliable delivery
- Monitor Fluent Bit metrics for pipeline health
- Use Kubernetes filters for automatic metadata enrichment

With proper configuration, Fluent Bit can efficiently collect and ship logs from diverse sources to Loki with minimal resource overhead.
