# How to Send Istio Access Logs to Splunk

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Splunk, Access Logs, Logging, Observability, Monitoring

Description: How to ship Istio access logs to Splunk using the Splunk OpenTelemetry Collector, HTTP Event Collector, and Fluent Bit integration.

---

Splunk is widely used in enterprise environments for log management, security monitoring, and compliance. If your organization runs Splunk, getting Istio access logs into it lets you correlate service mesh data with everything else your security and operations teams are already tracking.

There are a few ways to get Istio logs into Splunk. The approach you pick depends on whether you are running Splunk Cloud or Splunk Enterprise, and what collector infrastructure you already have.

## Option 1: Splunk OpenTelemetry Collector

Splunk provides its own distribution of the OpenTelemetry Collector that has built-in support for sending data to Splunk. This is the recommended approach for new deployments.

Install the Splunk OTel Collector using Helm:

```bash
helm repo add splunk-otel-collector-chart https://signalfx.github.io/splunk-otel-collector-chart
helm repo update
```

Create a values file:

```yaml
# splunk-otel-values.yaml
clusterName: my-k8s-cluster

splunkObservability:
  accessToken: <SPLUNK_OBSERVABILITY_TOKEN>
  realm: us0

splunkPlatform:
  endpoint: https://splunk-hec.example.com:8088/services/collector
  token: <SPLUNK_HEC_TOKEN>
  index: istio_access_logs
  insecureSkipVerify: false

logsCollection:
  enabled: true
  containers:
    excludePaths:
      - /var/log/containers/*kube-system*.log
    extraOperators:
      - type: filter
        expr: 'body matches "istio-proxy"'

agent:
  config:
    receivers:
      filelog/istio:
        include:
          - /var/log/containers/*istio-proxy*.log
        start_at: end
        operators:
          - type: json_parser
            timestamp:
              parse_from: attributes.time
              layout: '%Y-%m-%dT%H:%M:%S.%LZ'
          - type: json_parser
            parse_from: attributes.log
            if: 'attributes.log != nil and attributes.log matches "^{"'

    service:
      pipelines:
        logs/istio:
          receivers: [filelog/istio]
          processors: [batch, resourcedetection, resource]
          exporters: [splunk_hec]
```

Install it:

```bash
helm install splunk-otel-collector \
  splunk-otel-collector-chart/splunk-otel-collector \
  -n splunk \
  --create-namespace \
  -f splunk-otel-values.yaml
```

## Option 2: HTTP Event Collector (HEC) with Fluent Bit

If you are already running Fluent Bit or prefer a lighter collector, you can use Fluent Bit's Splunk output plugin to send logs via HEC.

First, create an HEC token in Splunk:

1. Go to Settings > Data Inputs > HTTP Event Collector
2. Click "New Token"
3. Set the source type to `_json`
4. Set the default index to `istio_access_logs`
5. Save and copy the token

Configure Fluent Bit:

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
        Parsers_File  parsers.conf

    [INPUT]
        Name              tail
        Tag               istio.*
        Path              /var/log/containers/*istio-proxy*.log
        Parser            cri
        DB                /var/log/flb_istio.db
        Mem_Buf_Limit     10MB
        Skip_Long_Lines   On

    [FILTER]
        Name         kubernetes
        Match        istio.*
        Merge_Log    On
        Keep_Log     Off
        Labels       On

    [FILTER]
        Name    grep
        Match   istio.*
        Regex   log ^{

    [OUTPUT]
        Name            splunk
        Match           istio.*
        Host            splunk-hec.example.com
        Port            8088
        Splunk_Token    ${SPLUNK_HEC_TOKEN}
        Splunk_Send_Raw On
        TLS             On
        TLS.Verify      On
        event_sourcetype istio:access:json
        event_index     istio_access_logs
        event_host      ${NODE_NAME}

  parsers.conf: |
    [PARSER]
        Name        cri
        Format      regex
        Regex       ^(?<time>[^ ]+) (?<stream>stdout|stderr) (?<logtag>[^ ]*) (?<log>.*)$
        Time_Key    time
        Time_Format %Y-%m-%dT%H:%M:%S.%L%z
```

Deploy the DaemonSet with the HEC token:

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
      tolerations:
        - operator: Exists
      containers:
        - name: fluent-bit
          image: fluent/fluent-bit:3.0
          env:
            - name: SPLUNK_HEC_TOKEN
              valueFrom:
                secretKeyRef:
                  name: splunk-hec-secret
                  key: token
            - name: NODE_NAME
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName
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

## Option 3: Splunk Connect for Kubernetes

Splunk provides an official Helm chart called Splunk Connect for Kubernetes (SC4K) that handles log collection:

```bash
helm repo add splunk https://splunk.github.io/splunk-connect-for-kubernetes/
helm repo update
```

```yaml
# sc4k-values.yaml
global:
  splunk:
    hec:
      host: splunk-hec.example.com
      port: 8088
      token: <SPLUNK_HEC_TOKEN>
      protocol: https
      indexName: istio_access_logs

splunk-kubernetes-logging:
  enabled: true
  containers:
    logFormatType: cri
  customFilters:
    IstioAccessFilter:
      tag: "**istio-proxy**"
      type: grep
      body: '/^{/'
```

```bash
helm install splunk-connect splunk/splunk-connect-for-kubernetes \
  -n splunk \
  --create-namespace \
  -f sc4k-values.yaml
```

## Istio JSON Log Configuration

Make sure Istio outputs JSON for the best Splunk integration:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
      - name: json-stdout
        envoyFileAccessLog:
          path: /dev/stdout
          logFormat:
            labels:
              timestamp: "%START_TIME%"
              method: "%REQ(:METHOD)%"
              uri_path: "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%"
              protocol: "%PROTOCOL%"
              status_code: "%RESPONSE_CODE%"
              response_flags: "%RESPONSE_FLAGS%"
              bytes_in: "%BYTES_RECEIVED%"
              bytes_out: "%BYTES_SENT%"
              duration_ms: "%DURATION%"
              upstream_host: "%UPSTREAM_HOST%"
              upstream_cluster: "%UPSTREAM_CLUSTER%"
              request_id: "%REQ(X-REQUEST-ID)%"
              authority: "%REQ(:AUTHORITY)%"
              user_agent: "%REQ(USER-AGENT)%"
              source_address: "%DOWNSTREAM_REMOTE_ADDRESS%"
              destination_address: "%UPSTREAM_HOST%"
```

Enable with the Telemetry API:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: splunk-logging
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: json-stdout
```

## Splunk Source Type Configuration

Create a custom source type in Splunk for Istio access logs. In `props.conf`:

```text
[istio:access:json]
SHOULD_LINEMERGE = false
LINE_BREAKER = ([\r\n]+)
TIME_PREFIX = "timestamp":"
TIME_FORMAT = %Y-%m-%dT%H:%M:%S.%3NZ
MAX_TIMESTAMP_LOOKAHEAD = 30
KV_MODE = json
TRUNCATE = 10000
```

## Searching Istio Logs in Splunk

Once logs are ingested, you can search them with SPL:

```spl
index=istio_access_logs sourcetype="istio:access:json"
| where status_code >= 500
| stats count by uri_path, status_code, response_flags
| sort - count

index=istio_access_logs sourcetype="istio:access:json"
| where duration_ms > 2000
| table timestamp, method, uri_path, status_code, duration_ms, upstream_host

index=istio_access_logs sourcetype="istio:access:json"
| timechart span=1m count by status_code

index=istio_access_logs sourcetype="istio:access:json"
| stats p99(duration_ms) as p99_latency by authority
| sort - p99_latency
```

## Building Splunk Dashboards

Create a dashboard with these panels:

1. **Request Volume** - Timechart of total requests per minute
2. **Error Rate** - Timechart of 5xx errors as a percentage of total
3. **Top Error Paths** - Table of paths with the most errors
4. **Latency Distribution** - Chart of duration_ms with percentile markers
5. **Response Flag Breakdown** - Pie chart of response_flags for error requests
6. **Service Map** - Force-directed graph based on authority and upstream_cluster

## Splunk Alerts

Set up Splunk alerts for Istio issues:

```spl
# Alert: High error rate
index=istio_access_logs sourcetype="istio:access:json"
| where status_code >= 500
| bucket _time span=5m
| stats count as errors by _time, authority
| join type=left _time, authority
  [search index=istio_access_logs
   | bucket _time span=5m
   | stats count as total by _time, authority]
| eval error_rate = errors/total*100
| where error_rate > 5
```

```spl
# Alert: Sustained high latency
index=istio_access_logs sourcetype="istio:access:json"
| bucket _time span=5m
| stats p99(duration_ms) as p99 by _time, authority
| where p99 > 5000
```

## Performance and Cost Tips

Splunk licensing is based on daily indexed volume, so managing the volume of Istio access logs is important:

- **Filter at the source.** Use Istio's Telemetry API to only log errors and slow requests.
- **Set appropriate retention.** Istio access logs might not need the same retention as security logs.
- **Use a dedicated index.** This makes it easy to apply different retention policies and search permissions.
- **Consider event sampling.** For very high-traffic services, sample successful requests and log all errors.

Getting Istio access logs into Splunk gives your security and operations teams visibility into service mesh traffic using tools they already know. The combination of structured JSON logs, HEC ingestion, and SPL queries creates a powerful debugging and analysis workflow.
