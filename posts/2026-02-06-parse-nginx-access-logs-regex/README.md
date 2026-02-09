# How to Parse NGINX Access Logs into Structured OpenTelemetry Attributes with Custom Regex Patterns

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, NGINX, Log Parsing, Filelog Receiver, Regex

Description: Parse NGINX access logs into structured OpenTelemetry log attributes using custom regex patterns in the filelog receiver.

NGINX is the most widely deployed reverse proxy and web server. Parsing its access logs into structured OpenTelemetry attributes lets you build dashboards, set up alerts on specific URL patterns, and trace request flow through your infrastructure.

## Default NGINX Log Format

NGINX ships with a default `combined` log format that looks like this:

```
172.16.0.1 - admin [06/Feb/2026:14:23:45 +0000] "POST /api/v2/orders HTTP/1.1" 201 892 "https://shop.example.com/checkout" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
```

This is very similar to Apache's combined format, but NGINX also supports custom log formats that many production deployments use.

## Parsing the Default Combined Format

```yaml
receivers:
  filelog/nginx:
    include:
      - /var/log/nginx/access.log
    start_at: end
    operators:
      - type: regex_parser
        regex: '^(?P<remote_addr>[^\s]+) - (?P<remote_user>[^\s]+) \[(?P<time_local>[^\]]+)\] "(?P<method>[A-Z]+) (?P<request_uri>[^\s]+) (?P<protocol>[^"]+)" (?P<status>\d{3}) (?P<body_bytes_sent>\d+) "(?P<http_referer>[^"]*)" "(?P<http_user_agent>[^"]*)"'
        timestamp:
          parse_from: attributes.time_local
          layout: "02/Jan/2006:15:04:05 -0700"
```

## Parsing Custom NGINX Log Formats

Many teams use a custom log format that includes additional fields like request time and upstream response time. A common custom format in `nginx.conf`:

```nginx
log_format custom '$remote_addr - $remote_user [$time_local] '
                  '"$request" $status $body_bytes_sent '
                  '"$http_referer" "$http_user_agent" '
                  '$request_time $upstream_response_time';
```

This produces log lines like:

```
172.16.0.1 - - [06/Feb/2026:14:23:45 +0000] "GET /api/users HTTP/1.1" 200 4521 "-" "curl/7.88.1" 0.042 0.039
```

The regex for this custom format:

```yaml
receivers:
  filelog/nginx-custom:
    include:
      - /var/log/nginx/access.log
    start_at: end
    operators:
      - type: regex_parser
        regex: '^(?P<remote_addr>[^\s]+) - (?P<remote_user>[^\s]+) \[(?P<time_local>[^\]]+)\] "(?P<method>[A-Z]+) (?P<request_uri>[^\s]+) (?P<protocol>[^"]+)" (?P<status>\d{3}) (?P<body_bytes_sent>\d+) "(?P<http_referer>[^"]*)" "(?P<http_user_agent>[^"]*)" (?P<request_time>[0-9.]+) (?P<upstream_response_time>[0-9.]+|-)'
        timestamp:
          parse_from: attributes.time_local
          layout: "02/Jan/2006:15:04:05 -0700"

      # Map to OpenTelemetry semantic conventions
      - type: move
        from: attributes.remote_addr
        to: attributes["client.address"]
      - type: move
        from: attributes.method
        to: attributes["http.request.method"]
      - type: move
        from: attributes.request_uri
        to: attributes["url.path"]
      - type: move
        from: attributes.protocol
        to: attributes["network.protocol.version"]
      - type: move
        from: attributes.status
        to: attributes["http.response.status_code"]
      - type: move
        from: attributes.body_bytes_sent
        to: attributes["http.response.body.size"]
      - type: move
        from: attributes.http_user_agent
        to: attributes["user_agent.original"]
      - type: move
        from: attributes.request_time
        to: attributes["http.server.request.duration"]
      - type: move
        from: attributes.upstream_response_time
        to: attributes["http.server.upstream.duration"]

      # Clean up unused fields
      - type: remove
        field: attributes.remote_user
        if: 'attributes.remote_user == "-"'
      - type: remove
        field: attributes.http_referer
        if: 'attributes.http_referer == "-"'
      - type: remove
        field: attributes.time_local
```

## Full Collector Configuration

```yaml
receivers:
  filelog/nginx-custom:
    include:
      - /var/log/nginx/access.log
    start_at: end
    poll_interval: 200ms
    operators:
      - type: regex_parser
        regex: '^(?P<remote_addr>[^\s]+) - (?P<remote_user>[^\s]+) \[(?P<time_local>[^\]]+)\] "(?P<method>[A-Z]+) (?P<request_uri>[^\s]+) (?P<protocol>[^"]+)" (?P<status>\d{3}) (?P<body_bytes_sent>\d+) "(?P<http_referer>[^"]*)" "(?P<http_user_agent>[^"]*)" (?P<request_time>[0-9.]+) (?P<upstream_response_time>[0-9.]+|-)'
        timestamp:
          parse_from: attributes.time_local
          layout: "02/Jan/2006:15:04:05 -0700"
      - type: move
        from: attributes.remote_addr
        to: attributes["client.address"]
      - type: move
        from: attributes.method
        to: attributes["http.request.method"]
      - type: move
        from: attributes.request_uri
        to: attributes["url.path"]
      - type: move
        from: attributes.status
        to: attributes["http.response.status_code"]
      - type: move
        from: attributes.body_bytes_sent
        to: attributes["http.response.body.size"]
      - type: move
        from: attributes.request_time
        to: attributes["nginx.request_time"]
      - type: remove
        field: attributes.time_local
      - type: remove
        field: attributes.remote_user
        if: 'attributes.remote_user == "-"'

  # Set severity based on status code
      - type: severity_parser
        parse_from: attributes["http.response.status_code"]
        mapping:
          error: ["500", "502", "503", "504"]
          warn: ["400", "401", "403", "404", "429"]
          info: ["200", "201", "204", "301", "302"]

processors:
  resource:
    attributes:
      - key: service.name
        value: "nginx"
        action: upsert
  batch:
    timeout: 5s

exporters:
  otlp:
    endpoint: "backend.internal:4317"

service:
  pipelines:
    logs:
      receivers: [filelog/nginx-custom]
      processors: [resource, batch]
      exporters: [otlp]
```

## Handling NGINX JSON Log Format

Some teams configure NGINX to output JSON logs directly. In that case, you can use the `json_parser` instead:

```nginx
# nginx.conf
log_format json_combined escape=json
  '{"time":"$time_iso8601",'
  '"remote_addr":"$remote_addr",'
  '"method":"$request_method",'
  '"uri":"$request_uri",'
  '"status":$status,'
  '"body_bytes_sent":$body_bytes_sent,'
  '"request_time":$request_time}';
```

```yaml
receivers:
  filelog/nginx-json:
    include:
      - /var/log/nginx/access.json.log
    operators:
      - type: json_parser
        timestamp:
          parse_from: attributes.time
          layout: "%Y-%m-%dT%H:%M:%S%z"
```

JSON logs are easier to parse and less prone to regex breakage, so consider switching to JSON format if you control the NGINX configuration.

## Performance Tuning

For high-traffic NGINX servers generating thousands of lines per second, tune the filelog receiver:

```yaml
receivers:
  filelog/nginx:
    include:
      - /var/log/nginx/access.log
    start_at: end
    poll_interval: 100ms
    # Increase max concurrent files if using log rotation
    max_concurrent_files: 10
    # Use fingerprint-based tracking for reliable rotation handling
    fingerprint_size: 1kb
```

Parsing NGINX logs with the filelog receiver turns your access logs into first-class observability data. You can correlate them with traces and metrics from the same requests flowing through your application stack.
