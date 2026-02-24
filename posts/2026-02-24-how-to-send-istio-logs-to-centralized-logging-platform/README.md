# How to Send Istio Logs to Centralized Logging Platform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Logging, Observability, Kubernetes, Monitoring

Description: Step-by-step guide to configuring Istio to send access logs and control plane logs to centralized logging platforms like Elasticsearch, Loki, and cloud-native solutions.

---

Running Istio without centralized logging is like having security cameras but never looking at the recordings. The logs are there, but if they're scattered across hundreds of pods on dozens of nodes, good luck finding what you need when something breaks at 2 AM.

Getting Istio logs into a centralized logging platform is essential for any production mesh. It lets you search across all your proxies at once, set up alerts, and correlate events across services. Here's how to set it up with some of the most common logging stacks.

## The Architecture

There are two main approaches to collecting Istio logs:

1. **Node-level agents** - A DaemonSet runs a log collector on every node, which reads container logs from the filesystem
2. **Sidecar collectors** - A logging sidecar runs in each pod alongside the Istio proxy

The node-level agent approach is the standard pattern and what most people should use. Sidecar collectors are only needed for special cases where you need per-pod log processing.

## Setting Up Structured Logging First

Before shipping logs anywhere, make sure your access logs are in a parseable format. JSON is the way to go:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON
    accessLogFormat: ""
```

With `accessLogEncoding: JSON` and an empty `accessLogFormat`, Istio uses its default JSON format which includes all the standard fields.

## Fluent Bit DaemonSet

Fluent Bit is lightweight and built for Kubernetes. Here's a configuration that collects Istio proxy logs and sends them to Elasticsearch:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: logging
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush         5
        Log_Level     info
        Daemon        off
        Parsers_File  parsers.conf

    [INPUT]
        Name              tail
        Path              /var/log/containers/*_istio-proxy_*.log
        Parser            cri
        Tag               istio.*
        Refresh_Interval  10
        DB                /var/log/flb_istio.db

    [FILTER]
        Name              kubernetes
        Match             istio.*
        Kube_URL          https://kubernetes.default.svc:443
        Kube_Tag_Prefix   istio.var.log.containers.
        Merge_Log         On
        K8S-Logging.Parser On

    [FILTER]
        Name              modify
        Match             istio.*
        Add               log_source istio-proxy

    [OUTPUT]
        Name              es
        Match             istio.*
        Host              elasticsearch.logging.svc
        Port              9200
        Index             istio-logs
        Type              _doc
        Logstash_Format   On
        Logstash_Prefix   istio

  parsers.conf: |
    [PARSER]
        Name              cri
        Format            regex
        Regex             ^(?<time>[^ ]+) (?<stream>stdout|stderr) (?<logtag>[^ ]*) (?<log>.*)$
        Time_Key          time
        Time_Format       %Y-%m-%dT%H:%M:%S.%L%z
```

Deploy it as a DaemonSet:

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
    spec:
      serviceAccountName: fluent-bit
      containers:
        - name: fluent-bit
          image: fluent/fluent-bit:latest
          volumeMounts:
            - name: varlog
              mountPath: /var/log
            - name: config
              mountPath: /fluent-bit/etc/
      volumes:
        - name: varlog
          hostPath:
            path: /var/log
        - name: config
          configMap:
            name: fluent-bit-config
```

## Sending to Grafana Loki

Loki is a popular choice because it's cheaper than Elasticsearch for log storage and integrates well with Grafana. Using Promtail to ship logs:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: promtail-config
  namespace: logging
data:
  promtail.yaml: |
    server:
      http_listen_port: 9080

    positions:
      filename: /tmp/positions.yaml

    clients:
      - url: http://loki.logging.svc:3100/loki/api/v1/push

    scrape_configs:
      - job_name: istio-proxy
        pipeline_stages:
          - cri: {}
          - json:
              expressions:
                method: method
                path: path
                response_code: response_code
                duration: duration
                upstream_host: upstream_host
          - labels:
              method:
              response_code:
          - timestamp:
              source: start_time
              format: "2006-01-02T15:04:05.000Z"
        kubernetes_sd_configs:
          - role: pod
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_container_name]
            regex: istio-proxy
            action: keep
          - source_labels: [__meta_kubernetes_namespace]
            target_label: namespace
          - source_labels: [__meta_kubernetes_pod_name]
            target_label: pod
          - source_labels: [__meta_kubernetes_pod_label_app]
            target_label: app
```

## Using Istio's OpenTelemetry Access Log Provider

Istio supports sending access logs via OpenTelemetry protocol, which gives you a vendor-neutral way to ship logs:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
      - name: otel-access-log
        envoyOtelAls:
          service: otel-collector.logging.svc.cluster.local
          port: 4317
          logFormat:
            text: "[%START_TIME%] %REQ(:METHOD)% %REQ(X-ENVOY-ORIGINAL-PATH?:PATH)% %PROTOCOL% %RESPONSE_CODE% %RESPONSE_FLAGS%"
```

Then enable it for your workloads:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: otel-logging
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: otel-access-log
```

You'll need an OpenTelemetry Collector running to receive these logs:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: logging
data:
  config.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317

    processors:
      batch:
        timeout: 10s

    exporters:
      loki:
        endpoint: http://loki.logging.svc:3100/loki/api/v1/push

    service:
      pipelines:
        logs:
          receivers: [otlp]
          processors: [batch]
          exporters: [loki]
```

## Collecting Istiod Control Plane Logs

Don't forget about the control plane. Istiod logs are just as important as proxy logs. Since Istiod runs as a regular Kubernetes deployment, the same node-level log collection picks up its logs.

To specifically target Istiod logs in your Fluent Bit config:

```yaml
[INPUT]
    Name              tail
    Path              /var/log/containers/istiod-*_istio-system_discovery-*.log
    Parser            cri
    Tag               istiod.*
    Refresh_Interval  10

[OUTPUT]
    Name              es
    Match             istiod.*
    Host              elasticsearch.logging.svc
    Port              9200
    Logstash_Format   On
    Logstash_Prefix   istiod
```

## Cloud Provider Integrations

If you're running on a cloud provider, you might already have logging infrastructure in place.

**AWS CloudWatch**: The CloudWatch agent or Fluent Bit with the CloudWatch output plugin works well. AWS also provides a managed Fluent Bit add-on for EKS.

**Google Cloud Logging**: GKE automatically ships all container logs to Cloud Logging. You just need to use log-based filters to find Istio logs:

```
resource.type="k8s_container"
resource.labels.container_name="istio-proxy"
```

**Azure Monitor**: AKS with Container Insights automatically collects container logs. You can query them in Log Analytics with KQL:

```
ContainerLog
| where Name contains "istio-proxy"
| where LogEntry contains "response_code"
```

## Verification

After setting up your logging pipeline, verify that logs are flowing:

```bash
# Generate some traffic
kubectl exec deploy/sleep -n default -- curl -s http://httpbin.default:8080/get

# Check Fluent Bit is processing
kubectl logs -n logging daemonset/fluent-bit --tail=20

# Verify in your logging platform
# For Elasticsearch:
curl -s "http://elasticsearch:9200/istio-*/_count" | python3 -m json.tool
```

Getting Istio logs into a centralized platform is one of the first things you should set up after installing Istio. It pays off immediately the first time you need to troubleshoot a production issue, and you'll wonder how you ever managed without it.
