# How to Send Istio Logs to OneUptime

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, OneUptime, Logging, OpenTelemetry, Observability

Description: Configure Istio access logs and control plane logs to stream into OneUptime for centralized log management and analysis.

---

Istio produces two types of logs that are worth capturing: access logs from the Envoy sidecar proxies (which record every request flowing through the mesh) and control plane logs from istiod (which show what the control plane is doing). Getting both into OneUptime gives you a searchable, centralized log store that you can correlate with metrics and traces.

## Enabling Istio Access Logs

By default, Istio doesn't write access logs because of the performance overhead. You need to explicitly enable them. The easiest way is through the mesh configuration:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON
    accessLogFormat: ""
```

Apply it:

```bash
istioctl install -f istio-logging-config.yaml -y
```

With `accessLogEncoding: JSON`, each log line will be a structured JSON object with fields like:

```json
{
  "authority": "httpbin:8000",
  "bytes_received": 0,
  "bytes_sent": 580,
  "downstream_local_address": "10.244.0.15:8000",
  "downstream_remote_address": "10.244.0.12:45678",
  "duration": 4,
  "method": "GET",
  "path": "/get",
  "protocol": "HTTP/1.1",
  "request_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "response_code": 200,
  "response_flags": "-",
  "route_name": "default",
  "start_time": "2026-02-24T10:15:30.000Z",
  "upstream_cluster": "outbound|8000||httpbin.default.svc.cluster.local",
  "upstream_host": "10.244.0.15:8000",
  "upstream_service_time": "3",
  "user_agent": "curl/7.81.0"
}
```

You can also use the Telemetry API for more granular control:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-logging
  namespace: istio-system
spec:
  accessLogging:
  - providers:
    - name: otel
    filter:
      expression: "response.code >= 400"
```

This example only logs requests that result in 4xx or 5xx status codes, which significantly reduces log volume in production.

## Setting Up the Log Pipeline

The architecture is straightforward: Envoy proxies write access logs to stdout, a log collector running as a DaemonSet picks them up, and forwards them to OneUptime via the OpenTelemetry protocol.

### Step 1: Deploy the OpenTelemetry Collector as a DaemonSet

For log collection, you need the collector running on every node so it can read container logs:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-log-collector-config
  namespace: istio-system
data:
  config.yaml: |
    receivers:
      filelog:
        include:
          - /var/log/containers/*istio-proxy*.log
          - /var/log/containers/*istiod*.log
        operators:
          - type: router
            routes:
              - output: parse_json
                expr: 'body matches "^\\{"'
            default: parse_plain
          - id: parse_json
            type: json_parser
            timestamp:
              parse_from: attributes.start_time
              layout: '%Y-%m-%dT%H:%M:%S.%LZ'
          - id: parse_plain
            type: regex_parser
            regex: '(?P<message>.*)'

    processors:
      batch:
        timeout: 10s
        send_batch_size: 500
      memory_limiter:
        check_interval: 5s
        limit_mib: 256
      resource:
        attributes:
          - key: service.namespace
            from_attribute: k8s.namespace.name
            action: upsert
      k8sattributes:
        extract:
          metadata:
            - k8s.pod.name
            - k8s.namespace.name
            - k8s.deployment.name
            - k8s.node.name

    exporters:
      otlp/oneuptime:
        endpoint: "https://otlp.oneuptime.com"
        headers:
          x-oneuptime-token: "${ONEUPTIME_TOKEN}"
        tls:
          insecure: false

    service:
      pipelines:
        logs:
          receivers: [filelog]
          processors: [memory_limiter, k8sattributes, resource, batch]
          exporters: [otlp/oneuptime]
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: otel-log-collector
  namespace: istio-system
spec:
  selector:
    matchLabels:
      app: otel-log-collector
  template:
    metadata:
      labels:
        app: otel-log-collector
      annotations:
        sidecar.istio.io/inject: "false"
    spec:
      serviceAccountName: otel-collector
      containers:
      - name: otel-collector
        image: otel/opentelemetry-collector-contrib:latest
        args:
        - "--config=/etc/otel/config.yaml"
        env:
        - name: ONEUPTIME_TOKEN
          valueFrom:
            secretKeyRef:
              name: oneuptime-credentials
              key: token
        volumeMounts:
        - name: config
          mountPath: /etc/otel
        - name: varlog
          mountPath: /var/log
          readOnly: true
        - name: dockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 250m
            memory: 256Mi
      volumes:
      - name: config
        configMap:
          name: otel-log-collector-config
      - name: varlog
        hostPath:
          path: /var/log
      - name: dockercontainers
        hostPath:
          path: /var/lib/docker/containers
```

### Step 2: Configure the OpenTelemetry Log Provider in Istio

You can also configure Istio to send access logs directly to the OpenTelemetry Collector instead of stdout:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
    - name: otel
      opentelemetry:
        port: 4317
        service: otel-collector.istio-system.svc.cluster.local
        logging:
          labels:
            source_workload: "%SOURCE_WORKLOAD%"
            destination_workload: "%DESTINATION_WORKLOAD%"
            response_code: "%RESPONSE_CODE%"
    defaultConfig:
      accessLogFile: ""  # Disable file-based logging since we're using OTel directly
```

Then activate it with a Telemetry resource:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-logging
  namespace: istio-system
spec:
  accessLogging:
  - providers:
    - name: otel
```

## Filtering Logs to Reduce Volume

In a busy mesh, access logs can generate enormous volumes. Here are some strategies to keep costs and storage manageable:

### Log Only Errors

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: error-only-logging
  namespace: default
spec:
  accessLogging:
  - providers:
    - name: otel
    filter:
      expression: "response.code >= 400 || connection.mtls == false"
```

### Log Only Specific Namespaces

Apply the Telemetry resource to specific namespaces instead of mesh-wide:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: namespace-logging
  namespace: production
spec:
  accessLogging:
  - providers:
    - name: otel
```

### Exclude Health Checks

Health check endpoints generate a lot of noise. Filter them out:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: filtered-logging
  namespace: istio-system
spec:
  accessLogging:
  - providers:
    - name: otel
    filter:
      expression: "request.url_path != '/healthz' && request.url_path != '/ready'"
```

## Verifying Log Collection

After deploying everything, make sure logs are flowing:

```bash
# Generate some traffic
for i in $(seq 1 20); do
  kubectl exec deploy/sleep -- curl -s http://httpbin:8000/get > /dev/null
  kubectl exec deploy/sleep -- curl -s http://httpbin:8000/status/500 > /dev/null
done

# Check that access logs are being written
kubectl logs deploy/httpbin -c istio-proxy --tail=5

# Check the log collector is running
kubectl get pods -n istio-system -l app=otel-log-collector

# Check collector logs for any errors
kubectl logs -l app=otel-log-collector -n istio-system --tail=20
```

## Correlating Logs with Traces

One of the biggest advantages of sending both logs and traces to OneUptime is correlation. When Istio generates an access log, it includes the `x-request-id` header and trace context. This means you can click from a log entry directly to its corresponding trace in OneUptime.

Make sure your logging configuration preserves the trace correlation fields:

```json
{
  "request_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "trace_id": "abc123def456",
  "span_id": "789xyz"
}
```

With logs, metrics, and traces all flowing into OneUptime, you have the complete picture of what's happening in your Istio service mesh. When something goes wrong, you can start with an alert, look at the metrics to understand the scope, drill into traces to find the failing request path, and read the logs to get the specific error details.
