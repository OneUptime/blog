# How to Configure Structured JSON Logging in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, JSON Logging, Observability, Kubernetes, Envoy

Description: Complete guide to configuring structured JSON logging for Istio access logs and control plane components to improve log parsing and analysis capabilities.

---

If you've ever tried to parse Istio's default text-based access logs with a script, you know the pain. The format is a space-delimited string with quoted fields and variable-length values, and it breaks in fun ways when you try to split on spaces. JSON logging solves this by giving you structured, parseable log entries with named fields.

Switching to JSON logging is one of the first things you should do after installing Istio. It makes everything downstream easier: log parsing, searching, alerting, and dashboarding all become more reliable.

## Enabling JSON Access Logs

The simplest way to switch Envoy access logs to JSON format is through the mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON
```

Setting `accessLogEncoding: JSON` tells Envoy to use JSON format for its access logs. With an empty `accessLogFormat`, Istio uses its default JSON template which includes a comprehensive set of fields.

Apply this:

```bash
istioctl install -f istio-operator.yaml
```

After applying, existing proxies will pick up the change when they reconnect to Istiod (usually within a few seconds). No pod restart needed.

## The Default JSON Fields

When you use the default JSON format, each access log entry includes these fields:

```json
{
  "authority": "httpbin.default.svc.cluster.local:8080",
  "bytes_received": 0,
  "bytes_sent": 1234,
  "connection_termination_details": null,
  "downstream_local_address": "10.0.1.5:8080",
  "downstream_remote_address": "10.0.1.3:45678",
  "duration": 45,
  "method": "GET",
  "path": "/get",
  "protocol": "HTTP/1.1",
  "request_id": "abc-123-def",
  "requested_server_name": "outbound_.8080_._.httpbin.default.svc.cluster.local",
  "response_code": 200,
  "response_code_details": "via_upstream",
  "response_flags": "-",
  "route_name": "default",
  "start_time": "2026-02-24T10:00:00.000Z",
  "upstream_cluster": "outbound|8080||httpbin.default.svc.cluster.local",
  "upstream_host": "10.0.2.10:8080",
  "upstream_local_address": "10.0.1.5:34567",
  "upstream_service_time": "43",
  "upstream_transport_failure_reason": null,
  "user_agent": "curl/7.68.0"
}
```

## Custom JSON Format

If you want to customize which fields appear in your JSON logs, use the `accessLogFormat` field with Envoy's command operators:

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
        "bytes_in": "%BYTES_RECEIVED%",
        "bytes_out": "%BYTES_SENT%",
        "duration_ms": "%DURATION%",
        "upstream_time_ms": "%RESP(X-ENVOY-UPSTREAM-SERVICE-TIME)%",
        "upstream_host": "%UPSTREAM_HOST%",
        "upstream_cluster": "%UPSTREAM_CLUSTER%",
        "request_id": "%REQ(X-REQUEST-ID)%",
        "trace_id": "%REQ(X-B3-TRACEID)%",
        "user_agent": "%REQ(USER-AGENT)%",
        "source_ip": "%DOWNSTREAM_REMOTE_ADDRESS_WITHOUT_PORT%",
        "destination": "%UPSTREAM_HOST%",
        "authority": "%REQ(:AUTHORITY)%"
      }
```

## Using the Telemetry API with Extension Providers

The modern approach (Istio 1.12+) uses extension providers defined in the mesh config, then activated through the Telemetry API:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
      - name: json-file-logger
        envoyFileAccessLog:
          path: /dev/stdout
          logFormat:
            labels:
              timestamp: "%START_TIME%"
              source_namespace: "%DOWNSTREAM_PEER_NAMESPACE%"
              source_workload: "%DOWNSTREAM_PEER_ID%"
              destination_namespace: "%UPSTREAM_PEER_NAMESPACE%"
              destination_workload: "%UPSTREAM_PEER_ID%"
              method: "%REQ(:METHOD)%"
              path: "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%"
              protocol: "%PROTOCOL%"
              response_code: "%RESPONSE_CODE%"
              response_flags: "%RESPONSE_FLAGS%"
              duration: "%DURATION%"
              request_id: "%REQ(X-REQUEST-ID)%"
              trace_id: "%REQ(X-B3-TRACEID)%"
              connection_id: "%CONNECTION_ID%"
              upstream_host: "%UPSTREAM_HOST%"
              upstream_cluster: "%UPSTREAM_CLUSTER%"
```

Then activate it:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: json-logging
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: json-file-logger
```

## Istiod JSON Logging

The Envoy access logs are only part of the picture. Istiod itself can also output JSON-formatted logs. Set the `LOG_AS_JSON` environment variable:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        env:
          - name: LOG_AS_JSON
            value: "true"
```

With this enabled, Istiod logs change from text format:

```text
2026-02-24T10:00:00.000000Z	info	ads	Push debounce stable 5 for: 100ms
```

To JSON format:

```json
{"level":"info","time":"2026-02-24T10:00:00.000000Z","scope":"ads","msg":"Push debounce stable 5 for: 100ms"}
```

This makes it much easier to parse Istiod logs in your centralized logging platform.

## Parsing JSON Logs in Log Collectors

Once your logs are in JSON format, configuring your log collector to parse them is straightforward.

For Fluent Bit:

```ini
[INPUT]
    Name              tail
    Path              /var/log/containers/*_istio-proxy_*.log
    Parser            cri
    Tag               istio.*

[FILTER]
    Name              kubernetes
    Match             istio.*
    Merge_Log         On
    Keep_Log          Off
    K8S-Logging.Parser On

[FILTER]
    Name              parser
    Match             istio.*
    Key_Name          log
    Parser            json
    Reserve_Data      On
```

For Promtail (Loki):

```yaml
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
            request_id: request_id
            upstream_cluster: upstream_cluster
      - labels:
            method:
            response_code:
```

## Querying JSON Logs

With structured JSON logs in your logging platform, querying becomes very powerful:

```bash
# Elasticsearch: Find all 5xx errors for a specific service
curl -s "http://elasticsearch:9200/istio-*/_search" -H 'Content-Type: application/json' -d '{
  "query": {
    "bool": {
      "must": [
        {"range": {"response_code": {"gte": 500}}},
        {"match": {"upstream_cluster": "outbound|8080||my-service"}}
      ]
    }
  }
}'
```

```text
# Loki: Find slow requests
{namespace="default"} | json | duration > 1000
```

## Handling Mixed Log Formats

During migration, you might have some proxies with JSON logging and some without. Your log parser needs to handle both gracefully. Fluent Bit's multi-parser feature helps:

```ini
[FILTER]
    Name              parser
    Match             istio.*
    Key_Name          log
    Parser            json
    Parser            istio_text
    Reserve_Data      On
```

## Performance Considerations

JSON logging adds a small amount of overhead compared to text logging. Each log entry is slightly larger due to the field names. In practice, the difference is minimal and the benefits far outweigh the cost.

If log volume is a concern, consider using the Telemetry API to filter what gets logged rather than switching back to text format. Structured logging with selective filtering gives you the best of both worlds: easy parsing and manageable volume.

Structured JSON logging is foundational for operating Istio well. It turns your logs from barely parseable text strings into proper data that you can query, aggregate, and build dashboards on. Make the switch early and everything else in your observability stack gets easier.
