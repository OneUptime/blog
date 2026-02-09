# How to Parse Apache Combined Access Logs with the Filelog Receiver regex_parser and Named Capture Groups

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Apache, Filelog Receiver, Log Parsing, Regex

Description: Parse Apache combined access log format into structured OpenTelemetry attributes using the filelog receiver regex_parser operator.

Apache's combined log format is one of the most common log formats you will encounter. It packs a lot of useful information into a single line, but in its raw form it is just an unstructured string. The filelog receiver's `regex_parser` operator can extract all those fields into proper OpenTelemetry log attributes.

## The Apache Combined Log Format

A typical Apache combined access log line looks like this:

```
192.168.1.100 - frank [10/Oct/2024:13:55:36 -0700] "GET /api/users HTTP/1.1" 200 2326 "https://example.com/page" "Mozilla/5.0 (X11; Linux x86_64)"
```

The fields are: remote host, identity, remote user, timestamp, request line, status code, response size, referer, and user agent.

## Building the Regex Pattern

Each field in the combined format has a specific structure. Named capture groups let us map each field directly to an attribute:

```yaml
receivers:
  filelog/apache:
    include:
      - /var/log/apache2/access.log
      - /var/log/httpd/access_log
    start_at: end
    operators:
      - type: regex_parser
        regex: '^(?P<remote_host>[^\s]+) (?P<ident>[^\s]+) (?P<remote_user>[^\s]+) \[(?P<timestamp>[^\]]+)\] "(?P<method>[A-Z]+) (?P<path>[^\s]+) (?P<protocol>[^"]+)" (?P<status>\d{3}) (?P<bytes>\d+|-) "(?P<referer>[^"]*)" "(?P<user_agent>[^"]*)"'
        timestamp:
          parse_from: attributes.timestamp
          layout: "02/Jan/2006:15:04:05 -0700"
        severity:
          parse_from: attributes.status
          mapping:
            error: ["500", "501", "502", "503", "504"]
            warn: ["400", "401", "403", "404", "405"]
            info: ["200", "201", "204", "301", "302", "304"]
```

Let me break down the regex piece by piece:

- `(?P<remote_host>[^\s]+)` - captures the IP address or hostname
- `(?P<ident>[^\s]+)` - captures the identity field (usually "-")
- `(?P<remote_user>[^\s]+)` - captures the authenticated user
- `\[(?P<timestamp>[^\]]+)\]` - captures the timestamp inside brackets
- `"(?P<method>[A-Z]+) (?P<path>[^\s]+) (?P<protocol>[^"]+)"` - splits the request line into method, path, and protocol
- `(?P<status>\d{3})` - captures the 3-digit status code
- `(?P<bytes>\d+|-)` - captures response size (or "-" for none)
- `"(?P<referer>[^"]*)"` - captures the referer header
- `"(?P<user_agent>[^"]*)"` - captures the user agent string

## Complete Collector Configuration

```yaml
receivers:
  filelog/apache:
    include:
      - /var/log/apache2/access.log
    start_at: end
    # Poll every 200ms for new log lines
    poll_interval: 200ms
    operators:
      # Step 1: Parse the combined log format
      - type: regex_parser
        regex: '^(?P<remote_host>[^\s]+) (?P<ident>[^\s]+) (?P<remote_user>[^\s]+) \[(?P<timestamp>[^\]]+)\] "(?P<method>[A-Z]+) (?P<path>[^\s]+) (?P<protocol>[^"]+)" (?P<status>\d{3}) (?P<bytes>\d+|-) "(?P<referer>[^"]*)" "(?P<user_agent>[^"]*)"'
        timestamp:
          parse_from: attributes.timestamp
          layout: "02/Jan/2006:15:04:05 -0700"

      # Step 2: Map to semantic convention attribute names
      - type: move
        from: attributes.remote_host
        to: attributes["net.peer.ip"]
      - type: move
        from: attributes.method
        to: attributes["http.request.method"]
      - type: move
        from: attributes.path
        to: attributes["url.path"]
      - type: move
        from: attributes.status
        to: attributes["http.response.status_code"]
      - type: move
        from: attributes.bytes
        to: attributes["http.response.body.size"]
      - type: move
        from: attributes.user_agent
        to: attributes["user_agent.original"]
      - type: move
        from: attributes.referer
        to: attributes["http.request.header.referer"]

      # Step 3: Clean up placeholder fields
      - type: remove
        field: attributes.ident
        if: 'attributes.ident == "-"'
      - type: remove
        field: attributes.remote_user
        if: 'attributes.remote_user == "-"'
      - type: remove
        field: attributes.timestamp

processors:
  # Add resource attributes
  resource:
    attributes:
      - key: service.name
        value: "apache-httpd"
        action: upsert

  batch:
    timeout: 5s

exporters:
  otlp:
    endpoint: "backend.internal:4317"

service:
  pipelines:
    logs:
      receivers: [filelog/apache]
      processors: [resource, batch]
      exporters: [otlp]
```

## Handling Edge Cases

Apache logs can have some tricky variations. Here are common edge cases and how to handle them:

### Request Lines with Unusual Characters

Sometimes the request path contains spaces or special characters:

```
192.168.1.100 - - [10/Oct/2024:13:55:36 -0700] "GET /path with spaces HTTP/1.1" 200 2326 "-" "-"
```

For this, use a more permissive regex for the path:

```yaml
# Instead of (?P<path>[^\s]+), use:
regex: '... "(?P<method>[A-Z]+) (?P<path>.+?) (?P<protocol>HTTP/[0-9.]+)" ...'
```

### Missing or Malformed Lines

Add a fallback for lines that do not match your regex:

```yaml
operators:
  - type: regex_parser
    regex: '^(?P<remote_host>[^\s]+) ...'
    on_error: send
    # Lines that fail parsing still get sent, just without structured attributes
```

The `on_error: send` setting ensures that unparseable lines are still forwarded instead of being silently dropped.

### Virtual Host Logs

If Apache is configured with `%v` (virtual host) at the beginning:

```
www.example.com 192.168.1.100 - frank [10/Oct/2024:13:55:36 -0700] "GET / HTTP/1.1" 200 2326 "-" "-"
```

Prepend a virtual host capture group:

```yaml
regex: '^(?P<virtual_host>[^\s]+) (?P<remote_host>[^\s]+) ...'
```

## Verifying the Parse Output

After deploying, check that attributes are correctly extracted by inspecting logs in your backend. You should see structured attributes like:

```json
{
  "attributes": {
    "http.request.method": "GET",
    "url.path": "/api/users",
    "http.response.status_code": "200",
    "http.response.body.size": "2326",
    "net.peer.ip": "192.168.1.100",
    "user_agent.original": "Mozilla/5.0 (X11; Linux x86_64)"
  }
}
```

Structured attributes make it much easier to filter, aggregate, and alert on specific request patterns compared to searching through raw log strings.
