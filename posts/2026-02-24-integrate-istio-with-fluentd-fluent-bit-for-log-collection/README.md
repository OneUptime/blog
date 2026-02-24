# How to Integrate Istio with Fluentd/Fluent Bit for Log Collection

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Fluentd, Fluent Bit, Logging, Kubernetes, Observability

Description: How to collect and forward Istio Envoy access logs using Fluentd and Fluent Bit to various logging backends.

---

Collecting logs from Istio's Envoy sidecars is critical for understanding what is happening in your mesh. Fluentd and Fluent Bit are two of the most popular log collection tools in the Kubernetes ecosystem. Fluent Bit is the lightweight option that works well as a node-level log forwarder, while Fluentd is the heavier but more feature-rich log processor. Many teams use both together: Fluent Bit on each node to collect and forward logs, and Fluentd as a centralized aggregator.

## Fluent Bit vs Fluentd

Fluent Bit is written in C and has a much smaller memory footprint (about 450KB). It is designed to run as a DaemonSet on every node. Fluentd is written in Ruby, uses more resources, but has a massive plugin ecosystem. For Istio log collection, Fluent Bit as the forwarder and Fluentd as the aggregator is a proven pattern.

## Configuring Istio for JSON Access Logs

Before setting up log collection, make sure Istio outputs access logs in JSON format. This makes parsing much easier:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON
```

If you want to customize which fields are logged:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-logging
  namespace: istio-system
spec:
  accessLogging:
  - providers:
    - name: envoy
```

## Deploying Fluent Bit as a DaemonSet

Deploy Fluent Bit to collect logs from all containers on each node:

```bash
helm repo add fluent https://fluent.github.io/helm-charts
helm repo update

helm install fluent-bit fluent/fluent-bit \
  --namespace logging \
  --create-namespace \
  --values fluent-bit-values.yaml
```

Here is the values file with Istio-specific configuration:

```yaml
config:
  inputs: |
    [INPUT]
        Name              tail
        Tag               kube.*
        Path              /var/log/containers/*.log
        Parser            cri
        DB                /var/log/flb_kube.db
        Mem_Buf_Limit     5MB
        Skip_Long_Lines   On
        Refresh_Interval  10

  filters: |
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

    [FILTER]
        Name    grep
        Match   kube.*
        Regex   $kubernetes['container_name'] istio-proxy

    [FILTER]
        Name         parser
        Match        kube.*
        Key_Name     log
        Parser       istio-envoy-json
        Reserve_Data On

  customParsers: |
    [PARSER]
        Name        istio-envoy-json
        Format      json
        Time_Key    start_time
        Time_Format %Y-%m-%dT%H:%M:%S.%LZ

  outputs: |
    [OUTPUT]
        Name            forward
        Match           kube.*
        Host            fluentd-aggregator.logging.svc
        Port            24224
        Retry_Limit     5

    [OUTPUT]
        Name            es
        Match           kube.*
        Host            elasticsearch.logging.svc
        Port            9200
        Index           istio-logs
        Type            _doc
        Logstash_Format On
        Logstash_Prefix istio
        Retry_Limit     5
```

The grep filter is important here. It filters logs to only process those from `istio-proxy` containers, which are the Envoy sidecars.

## Deploying Fluentd as an Aggregator

If you want Fluentd as a central aggregator that receives logs from Fluent Bit:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fluentd-aggregator
  namespace: logging
spec:
  replicas: 2
  selector:
    matchLabels:
      app: fluentd
  template:
    metadata:
      labels:
        app: fluentd
      annotations:
        sidecar.istio.io/inject: "false"
    spec:
      containers:
      - name: fluentd
        image: fluent/fluentd-kubernetes-daemonset:v1-debian-elasticsearch
        ports:
        - containerPort: 24224
          name: forward
          protocol: TCP
        volumeMounts:
        - name: config
          mountPath: /fluentd/etc
      volumes:
      - name: config
        configMap:
          name: fluentd-config
---
apiVersion: v1
kind: Service
metadata:
  name: fluentd-aggregator
  namespace: logging
spec:
  selector:
    app: fluentd
  ports:
  - port: 24224
    name: forward
    targetPort: 24224
```

Note the `sidecar.istio.io/inject: "false"` annotation. You generally do not want Istio sidecars on your logging infrastructure to avoid circular dependencies.

Fluentd configuration for processing Istio logs:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
  namespace: logging
data:
  fluent.conf: |
    <source>
      @type forward
      port 24224
      bind 0.0.0.0
    </source>

    <filter kube.**>
      @type record_transformer
      enable_ruby true
      <record>
        service ${record.dig("kubernetes", "labels", "app") || "unknown"}
        namespace ${record.dig("kubernetes", "namespace_name") || "unknown"}
        pod ${record.dig("kubernetes", "pod_name") || "unknown"}
      </record>
    </filter>

    <filter kube.**>
      @type grep
      <regexp>
        key $.kubernetes.container_name
        pattern /^istio-proxy$/
      </regexp>
    </filter>

    <match kube.**>
      @type elasticsearch
      host elasticsearch.logging.svc
      port 9200
      logstash_format true
      logstash_prefix istio-access
      include_tag_key true
      <buffer>
        @type file
        path /var/log/fluentd-buffers/istio
        flush_mode interval
        retry_type exponential_backoff
        flush_interval 5s
        retry_max_interval 30
        chunk_limit_size 2M
        queue_limit_length 8
        overflow_action block
      </buffer>
    </match>
```

## Filtering and Enriching Istio Logs

You can add filters to enrich the log data before sending it to your backend. For example, adding latency categories:

```yaml
<filter kube.**>
  @type record_transformer
  enable_ruby true
  <record>
    latency_category ${
      duration = record["duration"].to_i rescue 0
      if duration < 100
        "fast"
      elsif duration < 500
        "normal"
      elsif duration < 2000
        "slow"
      else
        "very_slow"
      end
    }
  </record>
</filter>
```

Filtering out health check noise:

```yaml
<filter kube.**>
  @type grep
  <exclude>
    key path
    pattern /^\/(healthz|readyz|livez)/
  </exclude>
</filter>
```

## Sending to Multiple Backends

Fluentd makes it easy to send logs to multiple destinations:

```yaml
<match kube.**>
  @type copy

  <store>
    @type elasticsearch
    host elasticsearch.logging.svc
    port 9200
    logstash_format true
    logstash_prefix istio
  </store>

  <store>
    @type s3
    aws_key_id YOUR_AWS_KEY
    aws_sec_key YOUR_AWS_SECRET
    s3_bucket istio-logs-archive
    s3_region us-east-1
    path istio-access-logs/
    <buffer time>
      @type file
      path /var/log/fluentd-buffers/s3
      timekey 3600
      timekey_wait 10m
    </buffer>
  </store>

  <store>
    @type kafka2
    brokers kafka.logging.svc:9092
    <format>
      @type json
    </format>
    topic_key istio-logs
    default_topic istio-access-logs
  </store>
</match>
```

## Monitoring the Log Pipeline

Check Fluent Bit metrics:

```bash
# Fluent Bit exposes metrics on port 2020
kubectl port-forward -n logging daemonset/fluent-bit 2020:2020
curl http://localhost:2020/api/v1/metrics
```

Check Fluentd health:

```bash
kubectl logs -n logging -l app=fluentd --tail=100
```

Key things to watch for are buffer overflow warnings and retry errors. If Fluent Bit or Fluentd cannot keep up with the log volume, you will see messages about dropped records.

## Reducing Log Volume

Istio generates a lot of access logs. To control volume, you can:

Use the Telemetry API to sample logs:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: selective-logging
  namespace: default
spec:
  accessLogging:
  - providers:
    - name: envoy
    filter:
      expression: "response.code >= 400"
```

This only logs requests that result in errors, which dramatically reduces volume while keeping the most useful data.

The Fluent Bit and Fluentd combination gives you a flexible and battle-tested log pipeline for Istio. Fluent Bit handles the high-throughput collection on each node, and Fluentd provides the processing, enrichment, and routing to whatever backends you use. The key is getting the parsing right for Istio's JSON access logs and filtering out the noise so your logging backend is not overwhelmed.
