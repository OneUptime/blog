# How to Set Up Envoy Access Logging with Client IPv4 Information

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Envoy, Access Logging, IPv4, Observability, Configuration, Service Mesh

Description: Learn how to configure Envoy access logging to capture client IPv4 addresses, request details, and response codes in structured or plain-text formats.

---

Envoy's access logging provides per-request visibility into traffic flowing through the proxy. Capturing the client's IPv4 address in logs is essential for security auditing, debugging, and traffic analysis.
When Envoy sits behind another proxy or load balancer, make sure your `use_remote_address`, `xff_num_trusted_hops`, or Proxy Protocol settings match your trust model, because the downstream remote address can be inferred from X-Forwarded-For or Proxy Protocol.

## Access Log Command Operators

Key operators for client IP information:

| Operator | Description |
|----------|-------------|
| `%DOWNSTREAM_REMOTE_ADDRESS%` | Client IP and port |
| `%DOWNSTREAM_REMOTE_ADDRESS_WITHOUT_PORT%` | Client IP address only |
| `%DOWNSTREAM_LOCAL_ADDRESS%` | Local (Envoy) IP and port |
| `%REQ(X-FORWARDED-FOR)%` | X-Forwarded-For header value |
| `%RESPONSE_CODE%` | HTTP response status code |
| `%BYTES_SENT%` | Response bytes sent |
| `%DURATION%` | Total request duration in ms |

## Plain-Text Access Log to stdout

```yaml
# envoy-config.yaml (HCM section)

http_connection_manager:
  stat_prefix: ingress_http
  access_log:
    - name: envoy.access_loggers.stdout
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.access_loggers.stream.v3.StdoutAccessLog
        log_format:
          text_format_source:
            # Log: client_ip method path protocol status bytes duration
            inline_string: >-
              [%START_TIME%] client=%DOWNSTREAM_REMOTE_ADDRESS_WITHOUT_PORT%
              "%REQ(:METHOD)% %REQ(X-ENVOY-ORIGINAL-PATH?:PATH)% %PROTOCOL%"
              status=%RESPONSE_CODE% bytes=%BYTES_SENT% dur=%DURATION%ms\n
```

## JSON-Structured Access Log

Structured logging makes parsing with tools like Splunk, Loki, or Elasticsearch easier.

```yaml
http_connection_manager:
  stat_prefix: ingress_http
  access_log:
    - name: envoy.access_loggers.stdout
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.access_loggers.stream.v3.StdoutAccessLog
        log_format:
          json_format:
            timestamp: "%START_TIME%"
            client_ip: "%DOWNSTREAM_REMOTE_ADDRESS_WITHOUT_PORT%"
            client_port: "%DOWNSTREAM_REMOTE_PORT%"
            method: "%REQ(:METHOD)%"
            path: "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%"
            protocol: "%PROTOCOL%"
            status: "%RESPONSE_CODE%"
            bytes_sent: "%BYTES_SENT%"
            duration_ms: "%DURATION%"
            upstream: "%UPSTREAM_HOST%"
            x_forwarded_for: "%REQ(X-FORWARDED-FOR)%"
            user_agent: "%REQ(USER-AGENT)%"
```

## File-Based Access Log

```yaml
access_log:
  - name: envoy.access_loggers.file
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.access_loggers.file.v3.FileAccessLog
      path: /var/log/envoy/access.log
      log_format:
        text_format_source:
          inline_string: "%DOWNSTREAM_REMOTE_ADDRESS_WITHOUT_PORT% - [%START_TIME%] \"%REQ(:METHOD)% %REQ(:PATH)%\" %RESPONSE_CODE%\n"
```

## Filtering Access Logs by Response Code

Only log errors (4xx and 5xx) to reduce log volume in high-traffic deployments:

```yaml
access_log:
  - name: envoy.access_loggers.stdout
    filter:
      status_code_filter:
        comparison:
          op: GE
          value:
            default_value: 400
            runtime_key: access_log.min_status_code
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.access_loggers.stream.v3.StdoutAccessLog
      log_format:
        text_format_source:
          inline_string: "[ERROR] client=%DOWNSTREAM_REMOTE_ADDRESS_WITHOUT_PORT% status=%RESPONSE_CODE%\n"
```

## TCP Proxy Access Log

For TCP (non-HTTP) proxying, use the same access log configuration in the `tcp_proxy` filter:

```yaml
filters:
  - name: envoy.filters.network.tcp_proxy
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.filters.network.tcp_proxy.v3.TcpProxy
      stat_prefix: tcp_proxy
      cluster: backend
      access_log:
        - name: envoy.access_loggers.stdout
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.access_loggers.stream.v3.StdoutAccessLog
            log_format:
              text_format_source:
                inline_string: "TCP client=%DOWNSTREAM_REMOTE_ADDRESS% bytes=%BYTES_SENT%\n"
```

## Key Takeaways

- `%DOWNSTREAM_REMOTE_ADDRESS_WITHOUT_PORT%` gives the client IP address without the port number.
- Use JSON log format for structured logging that integrates cleanly with log aggregation tools.
- Filter access logs by `status_code_filter` to reduce log volume on high-traffic proxies.
- TCP proxy access logs use the same format operators but exclude HTTP-specific fields.
