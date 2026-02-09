# How to Parse NGINX Access and Error Logs into Structured OpenTelemetry Log Records with the Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, NGINX, Log Parsing, Collector

Description: Parse NGINX access and error logs into structured OpenTelemetry log records using the Collector filelog receiver with regex operators.

NGINX writes access and error logs in specific formats. The access log uses a configurable format (default is the "combined" format), and the error log has its own structure. The OpenTelemetry Collector's filelog receiver can parse both formats into structured log records with proper attributes for HTTP method, status code, response time, and more.

## NGINX Log Formats

The default combined access log format:

```
10.0.0.5 - alice [06/Feb/2026:10:30:00 +0000] "GET /api/users HTTP/1.1" 200 1234 "https://example.com/" "Mozilla/5.0"
```

The error log format:

```
2026/02/06 10:30:00 [error] 12345#0: *67890 connect() failed (111: Connection refused) while connecting to upstream, client: 10.0.0.5, server: example.com, request: "GET /api/users HTTP/1.1", upstream: "http://10.0.0.10:8080/api/users"
```

## Configuring NGINX for Better Log Parsing

Configure a JSON log format in NGINX for easier parsing:

```nginx
http {
    log_format json_combined escape=json
    '{'
        '"time_local":"$time_iso8601",'
        '"remote_addr":"$remote_addr",'
        '"remote_user":"$remote_user",'
        '"request_method":"$request_method",'
        '"request_uri":"$request_uri",'
        '"server_protocol":"$server_protocol",'
        '"status":$status,'
        '"body_bytes_sent":$body_bytes_sent,'
        '"request_time":$request_time,'
        '"http_referrer":"$http_referer",'
        '"http_user_agent":"$http_user_agent",'
        '"upstream_response_time":"$upstream_response_time",'
        '"upstream_addr":"$upstream_addr"'
    '}';

    access_log /var/log/nginx/access.log json_combined;
    error_log /var/log/nginx/error.log warn;
}
```

## Parsing JSON Access Logs

When using JSON format, the Collector config is straightforward:

```yaml
receivers:
  filelog/nginx-access:
    include:
      - /var/log/nginx/access.log
    start_at: end
    operators:
      - type: json_parser
        timestamp:
          parse_from: attributes.time_local
          layout: '%Y-%m-%dT%H:%M:%S%z'

      # Map to OpenTelemetry semantic conventions
      - type: move
        from: attributes.request_method
        to: attributes["http.method"]
      - type: move
        from: attributes.request_uri
        to: attributes["http.url"]
      - type: move
        from: attributes.status
        to: attributes["http.status_code"]
      - type: move
        from: attributes.remote_addr
        to: attributes["net.peer.ip"]
      - type: move
        from: attributes.body_bytes_sent
        to: attributes["http.response_content_length"]
      - type: move
        from: attributes.request_time
        to: attributes["http.request_time_seconds"]
      - type: move
        from: attributes.http_user_agent
        to: attributes["http.user_agent"]

      # Set the log body to a readable summary
      - type: add
        field: body
        value: 'EXPR(attributes["http.method"] + " " + attributes["http.url"])'

      # Set severity based on status code
      - type: severity_parser
        parse_from: attributes["http.status_code"]
        mapping:
          info: [200, 201, 204, 301, 302, 304]
          warn: [400, 401, 403, 404, 405]
          error: [500, 502, 503, 504]

processors:
  batch:
    timeout: 5s
  resource:
    attributes:
      - key: service.name
        value: nginx
        action: upsert

exporters:
  otlp:
    endpoint: "your-backend:4317"
    tls:
      insecure: false

service:
  pipelines:
    logs:
      receivers: [filelog/nginx-access]
      processors: [resource, batch]
      exporters: [otlp]
```

## Parsing the Default Combined Format

If you cannot change the NGINX log format, parse the default combined format with regex:

```yaml
receivers:
  filelog/nginx-access:
    include:
      - /var/log/nginx/access.log
    start_at: end
    operators:
      - type: regex_parser
        regex: '^(?P<remote_addr>\S+) - (?P<remote_user>\S+) \[(?P<time_local>[^\]]+)\] "(?P<method>\S+) (?P<path>\S+) (?P<protocol>\S+)" (?P<status>\d+) (?P<body_bytes_sent>\d+) "(?P<referer>[^"]*)" "(?P<user_agent>[^"]*)"'
        timestamp:
          parse_from: attributes.time_local
          layout: '%d/%b/%Y:%H:%M:%S %z'
        severity:
          parse_from: attributes.status
          mapping:
            info: ["200", "201", "204", "301", "302"]
            warn: ["400", "401", "403", "404"]
            error: ["500", "502", "503", "504"]
```

## Parsing NGINX Error Logs

Error logs need a different regex:

```yaml
receivers:
  filelog/nginx-error:
    include:
      - /var/log/nginx/error.log
    start_at: end
    operators:
      - type: regex_parser
        regex: '^(?P<timestamp>\d{4}/\d{2}/\d{2} \d{2}:\d{2}:\d{2}) \[(?P<level>\w+)\] (?P<pid>\d+)#(?P<tid>\d+): (?:\*(?P<connection_id>\d+) )?(?P<message>.*)'
        timestamp:
          parse_from: attributes.timestamp
          layout: '%Y/%m/%d %H:%M:%S'
        severity:
          parse_from: attributes.level
          mapping:
            debug: debug
            info: info
            warn: warn
            error: error
            fatal: crit
      - type: move
        from: attributes.message
        to: body
```

## Combined Configuration

Here is the full config that handles both access and error logs:

```yaml
receivers:
  filelog/nginx-access:
    include:
      - /var/log/nginx/access.log
    start_at: end
    operators:
      - type: json_parser
        timestamp:
          parse_from: attributes.time_local
          layout: '%Y-%m-%dT%H:%M:%S%z'
      - type: move
        from: attributes.request_method
        to: attributes["http.method"]
      - type: move
        from: attributes.status
        to: attributes["http.status_code"]
      - type: add
        field: attributes["log.type"]
        value: "access"

  filelog/nginx-error:
    include:
      - /var/log/nginx/error.log
    start_at: end
    operators:
      - type: regex_parser
        regex: '^(?P<timestamp>\d{4}/\d{2}/\d{2} \d{2}:\d{2}:\d{2}) \[(?P<level>\w+)\] (?P<pid>\d+)#(?P<tid>\d+): (?P<message>.*)'
        timestamp:
          parse_from: attributes.timestamp
          layout: '%Y/%m/%d %H:%M:%S'
        severity:
          parse_from: attributes.level
      - type: move
        from: attributes.message
        to: body
      - type: add
        field: attributes["log.type"]
        value: "error"

processors:
  batch:
    timeout: 5s
  resource:
    attributes:
      - key: service.name
        value: nginx
        action: upsert

exporters:
  otlp:
    endpoint: "your-backend:4317"
    tls:
      insecure: false

service:
  pipelines:
    logs:
      receivers: [filelog/nginx-access, filelog/nginx-error]
      processors: [resource, batch]
      exporters: [otlp]
```

## Summary

NGINX logs can be parsed into structured OpenTelemetry log records using the Collector's filelog receiver. Using JSON log format in NGINX simplifies parsing significantly. For the default combined format, use regex operators. Handle access and error logs separately since they have different formats. Map NGINX fields to OpenTelemetry semantic conventions for consistent querying across your observability stack.
