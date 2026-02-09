# How to Set Up Fluent Bit as a Lightweight Alternative to Fluentd

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fluent Bit, Fluentd, Logging, Kubernetes, Performance

Description: Learn how to deploy Fluent Bit as a resource-efficient log collector and forwarder, including configuration for multiple inputs, filtering, parsing, and output to various destinations with minimal memory footprint.

---

Fluent Bit offers the same log collection capabilities as Fluentd but with a fraction of the resource consumption. Written in C instead of Ruby, Fluent Bit uses approximately 450KB of memory compared to Fluentd's 40MB base footprint. This makes it ideal for edge devices, resource-constrained environments, and Kubernetes clusters where you need a log collector on every node without significant overhead.

## Understanding Fluent Bit Architecture

Fluent Bit operates as a single-threaded event processor with a simple pipeline: input, parser, filter, buffer, output. Unlike Fluentd's plugin-based Ruby architecture, Fluent Bit uses compiled C plugins that execute with minimal overhead. The core focuses on performance and efficiency rather than flexibility.

This design makes Fluent Bit perfect for the collection and forwarding use case. It excels at reading logs from files, containers, or system sources, applying basic transformations, and shipping to a central aggregator. For complex filtering logic or routing, many deployments use Fluent Bit for collection and forward to Fluentd for heavy processing.

The memory efficiency becomes critical in large Kubernetes deployments. With 100 nodes, using Fluentd DaemonSet consumes 4GB of memory just for log collection. Fluent Bit reduces this to 45MB, freeing resources for actual workloads.

## Installing Fluent Bit on Kubernetes

Deploy Fluent Bit as a DaemonSet to run on every node:

```yaml
# fluent-bit-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluent-bit
  namespace: logging
  labels:
    app: fluent-bit
spec:
  selector:
    matchLabels:
      app: fluent-bit
  template:
    metadata:
      labels:
        app: fluent-bit
    spec:
      serviceAccountName: fluent-bit
      containers:
      - name: fluent-bit
        image: fluent/fluent-bit:2.2
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 256Mi
        volumeMounts:
        - name: varlog
          mountPath: /var/log
          readOnly: true
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
        - name: fluent-bit-config
          mountPath: /fluent-bit/etc/
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: varlibdockercontainers
        hostPath:
          path: /var/lib/docker/containers
      - name: fluent-bit-config
        configMap:
          name: fluent-bit-config
```

Create the ServiceAccount:

```yaml
# fluent-bit-rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: fluent-bit
  namespace: logging
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: fluent-bit
rules:
- apiGroups: [""]
  resources:
  - namespaces
  - pods
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: fluent-bit
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: fluent-bit
subjects:
- kind: ServiceAccount
  name: fluent-bit
  namespace: logging
```

Deploy the resources:

```bash
kubectl create namespace logging
kubectl apply -f fluent-bit-rbac.yaml
kubectl apply -f fluent-bit-daemonset.yaml
```

## Basic Configuration Structure

Fluent Bit uses a simple INI-like configuration format. Create a ConfigMap with the main configuration:

```yaml
# fluent-bit-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: logging
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush         5
        Daemon        off
        Log_Level     info
        Parsers_File  parsers.conf

    [INPUT]
        Name              tail
        Path              /var/log/containers/*.log
        Parser            docker
        Tag               kube.*
        Refresh_Interval  5
        Mem_Buf_Limit     5MB
        Skip_Long_Lines   On

    [FILTER]
        Name                kubernetes
        Match               kube.*
        Kube_URL            https://kubernetes.default.svc:443
        Kube_CA_File        /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        Kube_Token_File     /var/run/secrets/kubernetes.io/serviceaccount/token
        Kube_Tag_Prefix     kube.var.log.containers.
        Merge_Log           On
        Keep_Log            Off
        K8S-Logging.Parser  On
        K8S-Logging.Exclude On

    [OUTPUT]
        Name            es
        Match           *
        Host            elasticsearch.logging.svc.cluster.local
        Port            9200
        Index           fluent-bit
        Type            _doc
        Retry_Limit     5

  parsers.conf: |
    [PARSER]
        Name        docker
        Format      json
        Time_Key    time
        Time_Format %Y-%m-%dT%H:%M:%S.%L
        Time_Keep   On

    [PARSER]
        Name        syslog
        Format      regex
        Regex       ^\<(?<pri>[0-9]+)\>(?<time>[^ ]* {1,2}[^ ]* [^ ]*) (?<host>[^ ]*) (?<ident>[a-zA-Z0-9_\/\.\-]*)(?:\[(?<pid>[0-9]+)\])?(?:[^\:]*\:)? *(?<message>.*)$
        Time_Key    time
        Time_Format %b %d %H:%M:%S
```

Apply the configuration:

```bash
kubectl apply -f fluent-bit-config.yaml
kubectl rollout restart daemonset/fluent-bit -n logging
```

## Configuring Multiple Input Sources

Fluent Bit can collect logs from various sources simultaneously. Configure multiple input sections:

```ini
# Container logs
[INPUT]
    Name              tail
    Path              /var/log/containers/*.log
    Parser            docker
    Tag               kube.*
    Mem_Buf_Limit     5MB

# System logs
[INPUT]
    Name              tail
    Path              /var/log/syslog
    Parser            syslog
    Tag               system.syslog

# Kernel logs
[INPUT]
    Name              kmsg
    Tag               kernel

# Systemd journal
[INPUT]
    Name              systemd
    Tag               systemd.*
    Read_From_Tail    On
    Strip_Underscores On

# CPU metrics
[INPUT]
    Name              cpu
    Tag               metrics.cpu
    Interval_Sec      60

# Memory metrics
[INPUT]
    Name              mem
    Tag               metrics.memory
    Interval_Sec      60
```

Each input gets a unique tag for routing and filtering downstream.

## Parsing and Filtering Logs

Add custom parsers for application-specific log formats:

```ini
# JSON application logs
[PARSER]
    Name        app_json
    Format      json
    Time_Key    timestamp
    Time_Format %Y-%m-%dT%H:%M:%S.%L%z

# Nginx access logs
[PARSER]
    Name        nginx
    Format      regex
    Regex       ^(?<remote>[^ ]*) (?<host>[^ ]*) (?<user>[^ ]*) \[(?<time>[^\]]*)\] "(?<method>\S+)(?: +(?<path>[^\"]*?)(?: +\S*)?)?" (?<code>[^ ]*) (?<size>[^ ]*)(?: "(?<referer>[^\"]*)" "(?<agent>[^\"]*)")?$
    Time_Key    time
    Time_Format %d/%b/%Y:%H:%M:%S %z

# Apache error logs
[PARSER]
    Name        apache_error
    Format      regex
    Regex       ^\[[^ ]* (?<time>[^\]]*)\] \[(?<level>[^\]]*)\](?: \[pid (?<pid>[^\]]*)\])?( \[client (?<client>[^\]]*)\])? (?<message>.*)$
    Time_Key    time
    Time_Format %a %b %d %H:%M:%S.%L %Y
```

Apply filters to enrich and modify log records:

```ini
# Kubernetes metadata enrichment
[FILTER]
    Name                kubernetes
    Match               kube.*
    Kube_URL            https://kubernetes.default.svc:443
    Merge_Log           On
    Keep_Log            Off
    Labels              On
    Annotations         Off

# Add hostname to all records
[FILTER]
    Name        record_modifier
    Match       *
    Record      hostname ${HOSTNAME}

# Parse nested JSON in message field
[FILTER]
    Name        parser
    Match       kube.*
    Key_Name    log
    Parser      app_json
    Reserve_Data On

# Filter out debug logs
[FILTER]
    Name        grep
    Match       *
    Exclude     level DEBUG

# Modify log level field
[FILTER]
    Name        modify
    Match       *
    Rename      lvl level
    Add         environment production
```

## Configuring Multiple Outputs

Send logs to multiple destinations based on tags:

```ini
# Send all logs to Elasticsearch
[OUTPUT]
    Name            es
    Match           kube.*
    Host            elasticsearch.logging.svc
    Port            9200
    Index           kubernetes
    Type            _doc
    Logstash_Format On
    Logstash_Prefix k8s
    Retry_Limit     5

# Send error logs to Slack
[OUTPUT]
    Name            slack
    Match           *
    Webhook         https://hooks.slack.com/services/YOUR/WEBHOOK/URL
    Condition       Matching level ERROR

# Send metrics to Prometheus
[OUTPUT]
    Name            prometheus_exporter
    Match           metrics.*
    Host            0.0.0.0
    Port            2021

# Forward to Fluentd aggregator for complex processing
[OUTPUT]
    Name            forward
    Match           *
    Host            fluentd-aggregator.logging.svc
    Port            24224
    Require_ack_response On

# Send critical logs to file for local debugging
[OUTPUT]
    Name            file
    Match           *
    Path            /var/log/fluent-bit
    Format          json
    Condition       Matching level CRITICAL
```

## Performance Tuning

Optimize Fluent Bit for high-throughput environments:

```ini
[SERVICE]
    # Flush interval in seconds
    Flush         1

    # Grace period for flushing buffers on shutdown
    Grace         30

    # Enable HTTP monitoring server
    HTTP_Server   On
    HTTP_Listen   0.0.0.0
    HTTP_Port     2020

    # Storage configuration for reliability
    storage.path              /var/log/fluent-bit-storage/
    storage.sync              normal
    storage.checksum          off
    storage.max_chunks_up     128
    storage.backlog.mem_limit 5M

[INPUT]
    Name              tail
    Path              /var/log/containers/*.log
    Parser            docker
    Tag               kube.*

    # Buffer size per file
    Mem_Buf_Limit     5MB

    # Skip lines longer than 32KB
    Skip_Long_Lines   On

    # Refresh file list every 10 seconds
    Refresh_Interval  10

    # Enable filesystem buffering
    storage.type      filesystem

[OUTPUT]
    Name            es
    Match           *
    Host            elasticsearch
    Port            9200

    # Retry configuration
    Retry_Limit     False

    # Buffering
    storage.total_limit_size 10G
```

Monitor Fluent Bit performance:

```bash
# Access HTTP monitoring endpoint
kubectl port-forward -n logging daemonset/fluent-bit 2020:2020

# View metrics
curl http://localhost:2020/api/v1/metrics

# View active inputs
curl http://localhost:2020/api/v1/metrics/prometheus
```

## Using Fluent Bit with Fluentd

A common pattern uses Fluent Bit for collection and Fluentd for aggregation:

Fluent Bit configuration (forwarder):

```ini
[OUTPUT]
    Name            forward
    Match           *
    Host            fluentd.logging.svc
    Port            24224

    # Enable TLS
    tls             On
    tls.verify      Off

    # Shared key authentication
    Shared_Key      secure_forward_key

    # Buffer configuration
    storage.type    filesystem
```

Fluentd configuration (aggregator):

```ruby
<source>
  @type forward
  port 24224
  bind 0.0.0.0

  <security>
    self_hostname fluentd-aggregator
    shared_key secure_forward_key
  </security>
</source>

<match **>
  @type elasticsearch
  host elasticsearch
  port 9200

  # Complex transformations here
  <buffer>
    @type file
    path /var/log/fluentd/buffer
    flush_interval 10s
  </buffer>
</match>
```

This architecture keeps collection lightweight while enabling complex processing on dedicated aggregator nodes.

## Troubleshooting

Check Fluent Bit logs:

```bash
# View logs from DaemonSet
kubectl logs -n logging daemonset/fluent-bit -f

# Check specific pod
kubectl logs -n logging fluent-bit-xxxxx

# Enable debug logging
kubectl set env daemonset/fluent-bit -n logging FLB_LOG_LEVEL=debug
```

Common issues:

```bash
# Permission denied reading container logs
# Solution: Ensure hostPath volumes are mounted correctly

# Out of memory errors
# Solution: Reduce Mem_Buf_Limit or increase pod memory limits

# Connection refused to output
# Solution: Verify service DNS names and network policies

# Missing Kubernetes metadata
# Solution: Check ServiceAccount permissions and Kube_URL
```

Test configuration locally:

```bash
# Run Fluent Bit with local config
docker run -v /path/to/fluent-bit.conf:/fluent-bit/etc/fluent-bit.conf \
  fluent/fluent-bit:2.2 \
  /fluent-bit/bin/fluent-bit -c /fluent-bit/etc/fluent-bit.conf

# Validate configuration syntax
fluent-bit -c /path/to/fluent-bit.conf --dry-run
```

## Conclusion

Fluent Bit provides an efficient alternative to Fluentd for log collection scenarios where resource consumption matters. Its minimal memory footprint, native Kubernetes integration, and straightforward configuration make it ideal for edge deployments and large-scale clusters. Use Fluent Bit as a forwarder when you need heavy processing capabilities, or deploy it standalone for simple collection-to-storage pipelines. The performance benefits become substantial at scale, often reducing log collection overhead by 90% compared to Fluentd.
