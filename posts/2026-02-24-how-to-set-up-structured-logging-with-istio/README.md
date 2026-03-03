# How to Set Up Structured Logging with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Structured Logging, JSON, Envoy, Observability

Description: A practical guide to setting up structured JSON logging in Istio for better log parsing, querying, and integration with log aggregation systems.

---

Plain text access logs are hard to work with at scale. When you're running grep against gigabytes of log files trying to find a specific request, you start wishing those logs were in a structured format. Istio supports JSON-formatted structured logging out of the box, and configuring it properly makes a huge difference when you need to debug production issues.

## Why Structured Logs Matter

Unstructured logs look something like this:

```text
[2026-02-24T10:15:30.123Z] "GET /api/users HTTP/1.1" 200 - via_upstream - "-" 0 1234 45 43 "-" "curl/7.68.0" "abc-123-def" "users.default.svc.cluster.local" "10.244.0.15:8080"
```

That's Envoy's default text format. It has all the information you need, but parsing it programmatically means writing regex patterns and hoping the format doesn't change between versions.

Structured JSON logs give you the same data in a format that every log aggregation tool understands natively:

```json
{
  "start_time": "2026-02-24T10:15:30.123Z",
  "method": "GET",
  "path": "/api/users",
  "protocol": "HTTP/1.1",
  "response_code": 200,
  "upstream_host": "10.244.0.15:8080",
  "duration": 45,
  "request_id": "abc-123-def"
}
```

## Enabling JSON Access Logs

The simplest way to enable structured logging is through the IstioOperator configuration during installation:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON
```

If you already have Istio installed, you can update the mesh configuration:

```bash
kubectl edit configmap istio -n istio-system
```

Find or add the `accessLogEncoding` field under `meshConfig`:

```yaml
data:
  mesh: |-
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON
```

After making changes, restart the Istio control plane or wait for the configuration to propagate to the sidecars.

## Customizing the Log Format

The default JSON format includes a standard set of fields. You can customize which fields appear and how they're named using the `accessLogFormat` field in MeshConfig:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON
    accessLogFormat: |
      {
        "timestamp": "%START_TIME%",
        "method": "%REQ(:METHOD)%",
        "path": "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%",
        "protocol": "%PROTOCOL%",
        "status": "%RESPONSE_CODE%",
        "response_flags": "%RESPONSE_FLAGS%",
        "bytes_received": "%BYTES_RECEIVED%",
        "bytes_sent": "%BYTES_SENT%",
        "duration_ms": "%DURATION%",
        "upstream_response_time_ms": "%RESP(X-ENVOY-UPSTREAM-SERVICE-TIME)%",
        "forwarded_for": "%REQ(X-FORWARDED-FOR)%",
        "user_agent": "%REQ(USER-AGENT)%",
        "request_id": "%REQ(X-REQUEST-ID)%",
        "authority": "%REQ(:AUTHORITY)%",
        "upstream_host": "%UPSTREAM_HOST%",
        "upstream_cluster": "%UPSTREAM_CLUSTER%",
        "upstream_service_time": "%RESP(X-ENVOY-UPSTREAM-SERVICE-TIME)%",
        "source_principal": "%DOWNSTREAM_PEER_SUBJECT%",
        "destination_principal": "%UPSTREAM_PEER_SUBJECT%",
        "route_name": "%ROUTE_NAME%",
        "connection_termination_details": "%CONNECTION_TERMINATION_DETAILS%",
        "trace_id": "%REQ(X-B3-TRACEID)%",
        "span_id": "%REQ(X-B3-SPANID)%"
      }
```

Notice that we're including `trace_id` and `span_id` fields. This is valuable for correlating logs with distributed traces later on.

## Using the Telemetry API for Structured Logging

The Telemetry API offers a more Kubernetes-native approach. You can configure access log providers with custom formats:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: structured-logging
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: envoy
```

The provider named `envoy` uses whatever format is configured in the mesh config. To use a custom provider with OpenTelemetry-based logging, define it in the mesh config first:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
      - name: otel-access-log
        envoyOtelAls:
          service: opentelemetry-collector.observability.svc.cluster.local
          port: 4317
          logFormat:
            labels:
              method: "%REQ(:METHOD)%"
              path: "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%"
              protocol: "%PROTOCOL%"
              response_code: "%RESPONSE_CODE%"
              duration: "%DURATION%"
              request_id: "%REQ(X-REQUEST-ID)%"
              upstream_host: "%UPSTREAM_HOST%"
              trace_id: "%REQ(X-B3-TRACEID)%"
```

Then reference this provider in your Telemetry resource:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: otel-structured-logging
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: otel-access-log
```

## Adding Custom Fields

You can add application-specific metadata to your logs by including custom request headers. If your application sets a header like `X-Tenant-ID`, include it in the log format:

```yaml
accessLogFormat: |
  {
    "timestamp": "%START_TIME%",
    "method": "%REQ(:METHOD)%",
    "path": "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%",
    "status": "%RESPONSE_CODE%",
    "duration_ms": "%DURATION%",
    "request_id": "%REQ(X-REQUEST-ID)%",
    "tenant_id": "%REQ(X-TENANT-ID)%",
    "api_version": "%REQ(X-API-VERSION)%",
    "upstream_host": "%UPSTREAM_HOST%"
  }
```

This only works for headers that are present in the request or response. Envoy will output a `-` for any header that's not set.

## Configuring Per-Namespace Logging Formats

Different teams might want different log formats. The Telemetry API supports namespace-scoped configuration:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: team-alpha-logging
  namespace: team-alpha
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 400 || response.duration > duration('1s')"
```

Team Alpha's namespace gets error and slow request logging, while other namespaces follow the mesh-wide default.

## Integrating with Log Aggregation Tools

Structured JSON logs play nicely with popular log aggregation stacks.

For Elasticsearch/Fluentd/Kibana (EFK), Fluentd can parse JSON logs automatically:

```yaml
# Fluentd config snippet
<source>
  @type tail
  path /var/log/containers/*istio-proxy*.log
  pos_file /var/log/fluentd-istio.log.pos
  tag istio.access
  <parse>
    @type json
    time_key timestamp
    time_format %Y-%m-%dT%H:%M:%S.%NZ
  </parse>
</source>
```

For Grafana Loki, Promtail can handle JSON parsing with pipeline stages:

```yaml
# Promtail config snippet
scrape_configs:
  - job_name: istio-proxy
    kubernetes_sd_configs:
      - role: pod
    pipeline_stages:
      - json:
          expressions:
            method: method
            path: path
            status: status
            duration: duration_ms
            trace_id: trace_id
      - labels:
          method:
          status:
```

## Verifying Your Setup

After applying the configuration, generate some traffic and check the output:

```bash
# Watch structured logs from a specific pod
kubectl logs deploy/httpbin -c istio-proxy -f | jq .

# Generate test traffic
kubectl exec deploy/sleep -- curl -s http://httpbin:8000/get

# Verify JSON format
kubectl logs deploy/httpbin -c istio-proxy --tail=1 | python3 -m json.tool
```

If the logs come out as valid JSON, you're all set. If they're still in text format, double-check that the mesh config changes have propagated. You might need to restart the workload pods for changes to take effect:

```bash
kubectl rollout restart deployment/httpbin
```

## Handling Multi-line Logs

One issue that can come up is multi-line log entries getting split across multiple JSON objects. This typically happens when Envoy emits error messages alongside access logs. Configure your log collector to handle this by using the container runtime's log format as the outer wrapper and parsing the embedded JSON from the `log` field.

## Performance Considerations

JSON encoding adds a small overhead compared to plain text logging. In benchmarks, the difference is usually negligible - a few microseconds per request. The bigger concern is log volume. JSON logs are typically 20-30% larger than their text equivalents because of the field names. Factor this into your storage calculations and retention policies.

If log volume is a concern, combine structured logging with the sampling and filtering techniques covered in other posts. Log errors and slow requests at 100%, sample normal traffic at a lower rate, and skip health check endpoints entirely.

## Summary

Switching from plain text to structured JSON logging in Istio is a small configuration change that pays off significantly when you need to query and analyze your service mesh traffic. Use the MeshConfig for global settings, the Telemetry API for namespace and workload-level customization, and make sure to include trace correlation fields so your logs connect to your distributed traces.
