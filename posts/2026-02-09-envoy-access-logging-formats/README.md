# How to implement Envoy access logging with custom formats

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Envoy, Logging, Observability

Description: Learn how to configure Envoy access logs with custom formats including JSON logging, command operators, and integration with logging backends.

---

Access logs provide detailed information about every request processed by Envoy. Proper access logging is essential for debugging, auditing, and understanding traffic patterns. Envoy supports multiple output formats and destinations, from simple text logs to structured JSON sent to external logging services.

## Basic File Access Logging

```yaml
access_log:
- name: envoy.access_loggers.file
  typed_config:
    "@type": type.googleapis.com/envoy.extensions.access_loggers.file.v3.FileAccessLog
    path: /dev/stdout
```

This logs to stdout in Envoy's default format.

## Custom Text Format

```yaml
access_log:
- name: envoy.access_loggers.file
  typed_config:
    "@type": type.googleapis.com/envoy.extensions.access_loggers.file.v3.FileAccessLog
    path: /dev/stdout
    format: "[%START_TIME%] \"%REQ(:METHOD)% %REQ(X-ENVOY-ORIGINAL-PATH?:PATH)% %PROTOCOL%\" %RESPONSE_CODE% %RESPONSE_FLAGS% %BYTES_RECEIVED% %BYTES_SENT% %DURATION% %RESP(X-ENVOY-UPSTREAM-SERVICE-TIME)% \"%REQ(X-FORWARDED-FOR)%\" \"%REQ(USER-AGENT)%\" \"%REQ(X-REQUEST-ID)%\" \"%REQ(:AUTHORITY)%\" \"%UPSTREAM_HOST%\"\n"
```

## JSON Access Logging

```yaml
access_log:
- name: envoy.access_loggers.file
  typed_config:
    "@type": type.googleapis.com/envoy.extensions.access_loggers.file.v3.FileAccessLog
    path: /dev/stdout
    typed_json_format:
      timestamp: "%START_TIME%"
      method: "%REQ(:METHOD)%"
      path: "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%"
      protocol: "%PROTOCOL%"
      response_code: "%RESPONSE_CODE%"
      response_flags: "%RESPONSE_FLAGS%"
      bytes_received: "%BYTES_RECEIVED%"
      bytes_sent: "%BYTES_SENT%"
      duration: "%DURATION%"
      upstream_service_time: "%RESP(X-ENVOY-UPSTREAM-SERVICE-TIME)%"
      x_forwarded_for: "%REQ(X-FORWARDED-FOR)%"
      user_agent: "%REQ(USER-AGENT)%"
      request_id: "%REQ(X-REQUEST-ID)%"
      authority: "%REQ(:AUTHORITY)%"
      upstream_host: "%UPSTREAM_HOST%"
      upstream_cluster: "%UPSTREAM_CLUSTER%"
```

JSON format is ideal for log aggregation systems like Elasticsearch.

## Useful Command Operators

Common access log operators:

- %START_TIME%: Request start time
- %DURATION%: Total duration in milliseconds
- %RESPONSE_CODE%: HTTP response code
- %RESPONSE_FLAGS%: Response flags (UH, UF, etc.)
- %BYTES_RECEIVED%: Body bytes received
- %BYTES_SENT%: Body bytes sent
- %PROTOCOL%: HTTP protocol (HTTP/1.1, HTTP/2)
- %UPSTREAM_HOST%: Upstream host selected
- %UPSTREAM_CLUSTER%: Upstream cluster name
- %REQ(X)%: Request header X
- %RESP(X)%: Response header X
- %TRAILER(X)%: Trailer X
- %DYNAMIC_METADATA(NAMESPACE:KEY)%: Dynamic metadata

## Conditional Logging

Log only failed requests:

```yaml
access_log:
- name: envoy.access_loggers.file
  typed_config:
    "@type": type.googleapis.com/envoy.extensions.access_loggers.file.v3.FileAccessLog
    path: /var/log/envoy/errors.log
  filter:
    status_code_filter:
      comparison:
        op: GE
        value:
          default_value: 400
          runtime_key: access_log_error_threshold
```

## gRPC Access Log Service

Send logs to external service:

```yaml
access_log:
- name: envoy.access_loggers.http_grpc
  typed_config:
    "@type": type.googleapis.com/envoy.extensions.access_loggers.grpc.v3.HttpGrpcAccessLogConfig
    common_config:
      log_name: envoy_access_log
      grpc_service:
        envoy_grpc:
          cluster_name: access_log_cluster
      transport_api_version: V3
```

## Response Flag Meanings

Important response flags:
- UH: No healthy upstream
- UF: Upstream connection failure
- UO: Upstream overflow (circuit breaking)
- NR: No route configured
- UR: Upstream retry limit exceeded
- UC: Upstream connection termination
- UT: Upstream request timeout
- RL: Rate limited
- UAEX: Unauthorized external service
- RLSE: Rate limit service error

## Sampling Access Logs

Log a percentage of requests:

```yaml
access_log:
- name: envoy.access_loggers.file
  typed_config:
    "@type": type.googleapis.com/envoy.extensions.access_loggers.file.v3.FileAccessLog
    path: /dev/stdout
  filter:
    runtime_filter:
      runtime_key: access_log_sampling_rate
      percent_sampled:
        numerator: 10
        denominator: HUNDRED
```

Log 10% of requests.

## Per-Route Access Logs

Different logging per route:

```yaml
routes:
- match:
    prefix: "/api/sensitive"
  route:
    cluster: sensitive_service
  typed_per_filter_config:
    envoy.filters.http.router:
      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
      access_log:
      - name: envoy.access_loggers.file
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.access_loggers.file.v3.FileAccessLog
          path: /var/log/envoy/sensitive.log
```

## Best Practices

1. Use JSON format for machine parsing
2. Include request IDs for request tracing
3. Log upstream information for debugging
4. Sample high-volume endpoints
5. Use conditional logging to reduce volume
6. Send logs to centralized logging system
7. Monitor log delivery failures

## Conclusion

Envoy access logs provide comprehensive request information for debugging and auditing. Use JSON format for structured logging, customize fields based on your needs, and implement sampling or filtering to manage log volume. Send logs to external systems for aggregation and analysis, and monitor log delivery to ensure complete visibility into your traffic patterns.
