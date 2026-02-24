# How to Configure JSON Access Log Format in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, JSON, Access Logs, Envoy, Logging, Observability

Description: How to configure Istio to output access logs in JSON format with custom fields for easier parsing, filtering, and integration with log systems.

---

Text-format access logs are human-readable but a pain to parse programmatically. When you are shipping logs to Elasticsearch, Loki, Splunk, or any other aggregation system, JSON is the way to go. Each field becomes a structured attribute that you can filter, search, and aggregate without writing fragile regex parsers.

Istio supports JSON access logs natively, and you can customize which fields are included and what they are named.

## Enabling JSON Access Logs

The simplest way to switch from TEXT to JSON:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON
```

With default JSON encoding, the output includes all standard Envoy fields:

```json
{
  "authority": "httpbin.default:8000",
  "bytes_received": "0",
  "bytes_sent": "615",
  "connection_termination_details": null,
  "downstream_local_address": "10.244.1.5:8000",
  "downstream_remote_address": "10.244.1.3:45678",
  "duration": "4",
  "method": "GET",
  "path": "/status/200",
  "protocol": "HTTP/1.1",
  "request_id": "a1b2c3d4-e5f6-7890",
  "requested_server_name": null,
  "response_code": "200",
  "response_code_details": "via_upstream",
  "response_flags": "-",
  "route_name": "default",
  "start_time": "2026-02-24T10:30:45.123Z",
  "upstream_cluster": "inbound|8000||",
  "upstream_host": "10.244.1.5:8000",
  "upstream_local_address": "127.0.0.6:44444",
  "upstream_service_time": "3",
  "upstream_transport_failure_reason": null,
  "user_agent": "curl/7.88.1",
  "x_forwarded_for": null
}
```

## Custom JSON Fields with Extension Providers

To control exactly which fields appear in your JSON logs, define a custom extension provider:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
      - name: json-access-log
        envoyFileAccessLog:
          path: /dev/stdout
          logFormat:
            labels:
              timestamp: "%START_TIME%"
              method: "%REQ(:METHOD)%"
              path: "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%"
              protocol: "%PROTOCOL%"
              response_code: "%RESPONSE_CODE%"
              response_flags: "%RESPONSE_FLAGS%"
              response_code_details: "%RESPONSE_CODE_DETAILS%"
              bytes_received: "%BYTES_RECEIVED%"
              bytes_sent: "%BYTES_SENT%"
              duration_ms: "%DURATION%"
              upstream_service_time_ms: "%RESP(X-ENVOY-UPSTREAM-SERVICE-TIME)%"
              upstream_host: "%UPSTREAM_HOST%"
              upstream_cluster: "%UPSTREAM_CLUSTER%"
              downstream_remote_address: "%DOWNSTREAM_REMOTE_ADDRESS%"
              request_id: "%REQ(X-REQUEST-ID)%"
              authority: "%REQ(:AUTHORITY)%"
              user_agent: "%REQ(USER-AGENT)%"
```

Then reference it with the Telemetry API:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: json-logging
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: json-access-log
```

This gives you full control over the field names and which fields are included. The result is a clean JSON object:

```json
{
  "timestamp": "2026-02-24T10:30:45.123Z",
  "method": "GET",
  "path": "/status/200",
  "protocol": "HTTP/1.1",
  "response_code": "200",
  "response_flags": "-",
  "response_code_details": "via_upstream",
  "bytes_received": "0",
  "bytes_sent": "615",
  "duration_ms": "4",
  "upstream_service_time_ms": "3",
  "upstream_host": "10.244.1.5:8000",
  "upstream_cluster": "inbound|8000||",
  "downstream_remote_address": "10.244.1.3:45678",
  "request_id": "a1b2c3d4-e5f6-7890",
  "authority": "httpbin.default:8000",
  "user_agent": "curl/7.88.1"
}
```

## Adding Kubernetes Context to Logs

One limitation of Envoy access logs is that they do not include Kubernetes metadata like pod name, namespace, or labels. You can add some of this through environment variables:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
      - name: json-with-k8s
        envoyFileAccessLog:
          path: /dev/stdout
          logFormat:
            labels:
              timestamp: "%START_TIME%"
              method: "%REQ(:METHOD)%"
              path: "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%"
              response_code: "%RESPONSE_CODE%"
              response_flags: "%RESPONSE_FLAGS%"
              duration_ms: "%DURATION%"
              upstream_host: "%UPSTREAM_HOST%"
              request_id: "%REQ(X-REQUEST-ID)%"
              pod_name: "%ENVIRONMENT(POD_NAME)%"
              pod_namespace: "%ENVIRONMENT(POD_NAMESPACE)%"
              service_account: "%ENVIRONMENT(SERVICE_ACCOUNT)%"
```

The `%ENVIRONMENT(VAR_NAME)%` syntax reads environment variables from the sidecar container. Istio automatically sets `POD_NAME`, `POD_NAMESPACE`, and `SERVICE_ACCOUNT` in the sidecar.

## Adding Custom Request Headers

Include application-specific headers in the log output:

```yaml
logFormat:
  labels:
    timestamp: "%START_TIME%"
    method: "%REQ(:METHOD)%"
    path: "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%"
    response_code: "%RESPONSE_CODE%"
    duration_ms: "%DURATION%"
    # Custom headers
    user_id: "%REQ(X-USER-ID)%"
    tenant_id: "%REQ(X-TENANT-ID)%"
    trace_id: "%REQ(X-B3-TRACEID)%"
    correlation_id: "%REQ(X-CORRELATION-ID)%"
    # Response headers
    rate_limit_remaining: "%RESP(X-RATELIMIT-REMAINING)%"
```

## Practical Field Selections

### Minimal Production Format

For services where you want logging but need to minimize volume:

```yaml
logFormat:
  labels:
    t: "%START_TIME%"
    m: "%REQ(:METHOD)%"
    p: "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%"
    c: "%RESPONSE_CODE%"
    f: "%RESPONSE_FLAGS%"
    d: "%DURATION%"
    id: "%REQ(X-REQUEST-ID)%"
```

Short field names reduce the per-line size. With 1000 requests per second, saving 200 bytes per line means saving 200KB/s of log data.

### Full Debug Format

For services under investigation:

```yaml
logFormat:
  labels:
    timestamp: "%START_TIME%"
    method: "%REQ(:METHOD)%"
    path: "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%"
    protocol: "%PROTOCOL%"
    response_code: "%RESPONSE_CODE%"
    response_flags: "%RESPONSE_FLAGS%"
    response_code_details: "%RESPONSE_CODE_DETAILS%"
    connection_termination_details: "%CONNECTION_TERMINATION_DETAILS%"
    upstream_transport_failure_reason: "%UPSTREAM_TRANSPORT_FAILURE_REASON%"
    bytes_received: "%BYTES_RECEIVED%"
    bytes_sent: "%BYTES_SENT%"
    duration_ms: "%DURATION%"
    request_duration_ms: "%REQUEST_DURATION%"
    response_duration_ms: "%RESPONSE_DURATION%"
    response_tx_duration_ms: "%RESPONSE_TX_DURATION%"
    upstream_service_time_ms: "%RESP(X-ENVOY-UPSTREAM-SERVICE-TIME)%"
    upstream_host: "%UPSTREAM_HOST%"
    upstream_cluster: "%UPSTREAM_CLUSTER%"
    upstream_local_address: "%UPSTREAM_LOCAL_ADDRESS%"
    downstream_local_address: "%DOWNSTREAM_LOCAL_ADDRESS%"
    downstream_remote_address: "%DOWNSTREAM_REMOTE_ADDRESS%"
    requested_server_name: "%REQUESTED_SERVER_NAME%"
    route_name: "%ROUTE_NAME%"
    request_id: "%REQ(X-REQUEST-ID)%"
    authority: "%REQ(:AUTHORITY)%"
    user_agent: "%REQ(USER-AGENT)%"
    x_forwarded_for: "%REQ(X-FORWARDED-FOR)%"
    trace_id: "%REQ(X-B3-TRACEID)%"
    pod_name: "%ENVIRONMENT(POD_NAME)%"
    pod_namespace: "%ENVIRONMENT(POD_NAMESPACE)%"
```

### gRPC-Focused Format

For services that primarily handle gRPC traffic:

```yaml
logFormat:
  labels:
    timestamp: "%START_TIME%"
    method: "%REQ(:METHOD)%"
    path: "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%"
    grpc_status: "%GRPC_STATUS%"
    response_code: "%RESPONSE_CODE%"
    response_flags: "%RESPONSE_FLAGS%"
    duration_ms: "%DURATION%"
    upstream_host: "%UPSTREAM_HOST%"
    request_id: "%REQ(X-REQUEST-ID)%"
    grpc_message: "%RESP(GRPC-MESSAGE)%"
```

## Working with JSON Logs

### Filtering with jq

```bash
# All 503 errors
kubectl logs deploy/my-service -c istio-proxy | jq 'select(.response_code == "503")'

# Slow requests
kubectl logs deploy/my-service -c istio-proxy | jq 'select((.duration_ms | tonumber) > 1000)'

# Requests to a specific path
kubectl logs deploy/my-service -c istio-proxy | jq 'select(.path | startswith("/api/users"))'

# Summary of response codes
kubectl logs deploy/my-service -c istio-proxy | jq -s 'group_by(.response_code) | map({code: .[0].response_code, count: length}) | sort_by(.count) | reverse'
```

### Parsing with Log Aggregators

JSON logs are automatically parsed by most log aggregation systems:

- **Elasticsearch** - JSON fields become document fields, searchable and aggregatable
- **Loki** - Use JSON pipeline stage to extract label values
- **Splunk** - JSON fields are auto-extracted in search
- **CloudWatch** - JSON fields become filterable attributes

No custom parsers needed. This alone is a strong reason to use JSON over TEXT format.

## Verifying Your JSON Configuration

After applying the configuration:

```bash
# Send a test request
kubectl exec deploy/sleep -- curl -s httpbin.default:8000/status/200

# Check the log output
kubectl logs deploy/httpbin -c istio-proxy --tail=1 | jq .
```

If `jq` fails to parse the output, there might be non-JSON lines mixed in (like Envoy startup messages). Filter those out:

```bash
kubectl logs deploy/httpbin -c istio-proxy --tail=10 | grep '^{' | jq .
```

JSON access log configuration is a one-time setup that pays dividends every time you need to debug something or build a log-based dashboard. Spend the time to get the fields right for your use case, and structured logging will make everything downstream simpler.
