# How to Configure Envoy Proxy Access Logging with OpenTelemetry Trace ID and Span ID Injection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Envoy, Access Logging, Trace Correlation

Description: Configure Envoy Proxy access logs to include OpenTelemetry trace ID and span ID for correlating logs with distributed traces.

Envoy Proxy access logs record details about every request. By injecting the OpenTelemetry trace ID and span ID into these logs, you can correlate access log entries with distributed traces. This makes it much easier to find the trace for a specific request when investigating issues from log data.

## Configuring Access Logging with Trace Fields

Envoy supports custom access log formats. Add trace ID and span ID fields using Envoy's format variables:

```yaml
# envoy.yaml - access_log section within http_connection_manager
static_resources:
  listeners:
    - name: listener_0
      address:
        socket_address:
          address: 0.0.0.0
          port_value: 8080
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                stat_prefix: ingress
                tracing:
                  provider:
                    name: envoy.tracers.opentelemetry
                    typed_config:
                      "@type": type.googleapis.com/envoy.config.trace.v3.OpenTelemetryConfig
                      grpc_service:
                        envoy_grpc:
                          cluster_name: otel_collector
                      service_name: envoy-proxy
                # Access log configuration with trace IDs
                access_log:
                  - name: envoy.access_loggers.file
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.access_loggers.file.v3.FileAccessLog
                      path: /var/log/envoy/access.log
                      log_format:
                        json_format:
                          timestamp: "%START_TIME%"
                          method: "%REQ(:METHOD)%"
                          path: "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%"
                          protocol: "%PROTOCOL%"
                          status: "%RESPONSE_CODE%"
                          response_flags: "%RESPONSE_FLAGS%"
                          bytes_received: "%BYTES_RECEIVED%"
                          bytes_sent: "%BYTES_SENT%"
                          duration_ms: "%DURATION%"
                          upstream_service_time: "%RESP(X-ENVOY-UPSTREAM-SERVICE-TIME)%"
                          upstream_host: "%UPSTREAM_HOST%"
                          upstream_cluster: "%UPSTREAM_CLUSTER%"
                          client_ip: "%DOWNSTREAM_REMOTE_ADDRESS_WITHOUT_PORT%"
                          user_agent: "%REQ(USER-AGENT)%"
                          # Trace correlation fields
                          trace_id: "%REQ(TRACEPARENT)%"
                          request_id: "%REQ(X-REQUEST-ID)%"
                route_config:
                  name: local_route
                  virtual_hosts:
                    - name: backend
                      domains: ["*"]
                      routes:
                        - match:
                            prefix: "/"
                          route:
                            cluster: backend
                http_filters:
                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
```

## Parsing Access Logs with the Collector

Configure the OpenTelemetry Collector to parse the JSON access logs and extract trace correlation fields:

```yaml
# otel-collector-config.yaml
receivers:
  filelog/envoy:
    include:
      - /var/log/envoy/access.log
    start_at: end
    operators:
      # Parse the JSON access log
      - type: json_parser
        timestamp:
          parse_from: attributes.timestamp
          layout: '%Y-%m-%dT%H:%M:%S.%LZ'

      # Extract trace ID from the traceparent header value
      # traceparent format: 00-<trace-id>-<span-id>-<flags>
      - type: regex_parser
        regex: '00-(?P<trace_id>[a-f0-9]{32})-(?P<span_id>[a-f0-9]{16})-(?P<trace_flags>[a-f0-9]{2})'
        parse_from: attributes.trace_id
        if: 'attributes.trace_id != nil and attributes.trace_id != "-"'

      # Set the trace context on the log record
      - type: trace_parser
        trace_id:
          parse_from: attributes.trace_id
        span_id:
          parse_from: attributes.span_id

      # Set the log body
      - type: add
        field: body
        value: 'EXPR(attributes.method + " " + attributes.path + " " + attributes.status)'

      # Map to semantic conventions
      - type: move
        from: attributes.method
        to: attributes["http.method"]
      - type: move
        from: attributes.path
        to: attributes["http.url"]
      - type: move
        from: attributes.status
        to: attributes["http.status_code"]
      - type: move
        from: attributes.duration_ms
        to: attributes["http.duration_ms"]

processors:
  batch:
    timeout: 5s
    send_batch_size: 500

  resource:
    attributes:
      - key: service.name
        value: envoy-proxy
        action: upsert

exporters:
  otlp:
    endpoint: "your-backend:4317"
    tls:
      insecure: false

service:
  pipelines:
    logs:
      receivers: [filelog/envoy]
      processors: [resource, batch]
      exporters: [otlp]
```

## Using the OpenTelemetry Access Logger

Envoy also supports sending access logs directly as OpenTelemetry logs via the `envoy.access_loggers.open_telemetry` logger:

```yaml
access_log:
  - name: envoy.access_loggers.open_telemetry
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.access_loggers.open_telemetry.v3.OpenTelemetryAccessLogConfig
      common_config:
        log_name: envoy_access
        grpc_service:
          envoy_grpc:
            cluster_name: otel_collector
        transport_api_version: V3
      body:
        string_value: "%REQ(:METHOD)% %REQ(:PATH)% %PROTOCOL% %RESPONSE_CODE%"
      attributes:
        values:
          - key: "http.method"
            value:
              string_value: "%REQ(:METHOD)%"
          - key: "http.url"
            value:
              string_value: "%REQ(:PATH)%"
          - key: "http.status_code"
            value:
              string_value: "%RESPONSE_CODE%"
          - key: "http.duration_ms"
            value:
              string_value: "%DURATION%"
          - key: "upstream.cluster"
            value:
              string_value: "%UPSTREAM_CLUSTER%"
```

This approach sends access logs directly to the Collector as OTLP logs, skipping the file-based pipeline entirely. The trace context is automatically attached because Envoy knows the active trace.

## Example Log Output

A JSON access log entry with trace correlation looks like:

```json
{
  "timestamp": "2026-02-06T10:30:00.123Z",
  "method": "GET",
  "path": "/api/users/123",
  "protocol": "HTTP/1.1",
  "status": "200",
  "duration_ms": "45",
  "upstream_host": "10.0.0.5:8080",
  "upstream_cluster": "user_service",
  "trace_id": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
  "request_id": "abc-123-def-456"
}
```

From this log entry, you can extract the trace ID `4bf92f3577b34da6a3ce929d0e0e4736` and look it up directly in your tracing backend.

## Summary

Injecting trace IDs into Envoy access logs bridges the gap between log-based debugging and trace-based debugging. Use Envoy's JSON format variables to include the `traceparent` header in access logs, then parse them in the Collector with trace context extraction. Alternatively, use the OpenTelemetry access logger extension to send logs directly to the Collector with trace context automatically attached.
