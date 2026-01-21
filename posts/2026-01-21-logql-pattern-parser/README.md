# How to Parse Logs with Loki Pattern Parser

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, LogQL, Pattern Parser, Log Parsing, Unstructured Logs, Text Extraction

Description: A comprehensive guide to using the Loki pattern parser for extracting structured data from unstructured log lines, covering pattern syntax, common log formats, and advanced parsing techniques.

---

The pattern parser in Loki provides a powerful way to extract structured data from unstructured log lines. Unlike regex parsing, pattern parsing uses a simpler syntax that is both more readable and often more performant. This guide covers how to effectively use the pattern parser for various log formats.

## Prerequisites

Before starting, ensure you have:

- Grafana Loki deployed with log data
- Grafana connected to Loki as a data source
- Understanding of basic LogQL queries
- Sample unstructured logs to work with

## Understanding the Pattern Parser

### Pattern Syntax

The pattern parser uses angle brackets to define capture groups:

```logql
| pattern `<field1> <_> <field2>`
```

- `<field_name>` - Captures text and assigns it to a label
- `<_>` - Captures text but discards it (anonymous capture)
- Literal text matches exactly

### Basic Example

For a log line:
```
192.168.1.100 - - [15/Jan/2024:10:30:00 +0000] "GET /api/users HTTP/1.1" 200 1234
```

Pattern:
```logql
{job="nginx"} | pattern `<ip> - - [<timestamp>] "<method> <path> <_>" <status> <bytes>`
```

Extracted labels:
- `ip: 192.168.1.100`
- `timestamp: 15/Jan/2024:10:30:00 +0000`
- `method: GET`
- `path: /api/users`
- `status: 200`
- `bytes: 1234`

## Common Log Format Patterns

### Apache/NGINX Combined Log Format

```
192.168.1.1 - john [10/Jan/2024:13:55:36 -0700] "GET /index.html HTTP/1.1" 200 2326 "http://example.com" "Mozilla/5.0"
```

```logql
{job="nginx"}
| pattern `<ip> - <user> [<timestamp>] "<method> <path> <protocol>" <status> <bytes> "<referer>" "<user_agent>"`
| status >= 400
```

### Syslog Format

```
Jan 15 10:30:00 server01 sshd[12345]: Failed password for root from 192.168.1.100
```

```logql
{job="syslog"}
| pattern `<month> <day> <time> <host> <process>[<pid>]: <message>`
| process = "sshd"
```

### Application Log Format

```
2024-01-15T10:30:00.000Z INFO [main] OrderService - Order 12345 created for user john
```

```logql
{job="app"}
| pattern `<timestamp> <level> [<thread>] <class> - <message>`
| level = "ERROR"
```

### Key-Value Logs

```
time=2024-01-15T10:30:00Z level=info msg="Request completed" status=200 duration=45ms
```

```logql
{job="app"}
| pattern `time=<timestamp> level=<level> msg="<message>" status=<status> duration=<duration>`
| status >= 400
```

## Advanced Pattern Techniques

### Multiple Pattern Stages

Use multiple patterns for complex logs:

```logql
{job="app"}
| pattern `<timestamp> <level> <message>`
| pattern `<_> user=<user_id> <_>`
| user_id != ""
```

### Combining with Other Parsers

```logql
# Pattern parse, then JSON parse nested content
{job="app"}
| pattern `<timestamp> <level> <json_payload>`
| json payload_json=json_payload
| json user_id, action from payload_json
```

### Handling Variable Formats

For logs with optional fields:

```logql
# First try full pattern
{job="nginx"}
| pattern `<ip> - <user> [<timestamp>] "<method> <path> <_>" <status> <bytes> "<referer>"`

# Fall back for logs without referer
| pattern `<ip> - <user> [<timestamp>] "<method> <path> <_>" <status> <bytes>` | referer=""
```

### Extracting from Middle of Line

```logql
# Log: "Processing order: id=12345 amount=99.99 status=pending"
{job="orders"}
| pattern `<_>id=<order_id> amount=<amount> status=<order_status>`
```

## Pattern Parser vs Other Parsers

### When to Use Pattern Parser

- Simple, consistent log formats
- Performance is critical
- Logs have clear delimiters

### When to Use Regex Parser

- Complex patterns with alternation
- Need for lookahead/lookbehind
- Highly variable formats

### When to Use JSON Parser

- JSON-formatted logs
- Nested data structures
- Need to extract multiple fields efficiently

### Comparison Example

```logql
# Pattern parser (faster, simpler)
{job="nginx"} | pattern `<ip> - - [<_>] "<method> <path> <_>" <status> <_>`

# Regex parser (more flexible)
{job="nginx"} | regexp `(?P<ip>\d+\.\d+\.\d+\.\d+).*"(?P<method>\w+) (?P<path>\S+).*" (?P<status>\d+)`

# JSON parser (structured logs)
{job="app"} | json | status >= 400
```

## Real-World Examples

### Kubernetes Container Logs

```
2024-01-15T10:30:00.000Z stdout F {"level":"info","msg":"Request handled","duration":45}
```

```logql
{namespace="production"}
| pattern `<timestamp> <stream> <_> <json_line>`
| json level, msg, duration from json_line
| level = "error"
```

### AWS Load Balancer Logs

```
http 2024-01-15T10:30:00.000000Z app/my-alb/abc123 192.168.1.100:12345 10.0.0.1:80 0.001 0.002 0.000 200 200 123 456 "GET http://example.com/api/users HTTP/1.1" "Mozilla/5.0"
```

```logql
{job="alb"}
| pattern `<type> <timestamp> <elb> <client_ip>:<client_port> <target_ip>:<target_port> <request_time> <target_time> <response_time> <elb_status> <target_status> <received_bytes> <sent_bytes> "<method> <url> <_>" "<user_agent>"`
| elb_status >= 500
```

### Docker Logs

```
2024-01-15 10:30:00 container_name | INFO: Application started on port 8080
```

```logql
{job="docker"}
| pattern `<date> <time> <container> | <level>: <message>`
| level = "ERROR"
```

### PostgreSQL Logs

```
2024-01-15 10:30:00.000 UTC [12345] user@database LOG:  duration: 125.234 ms  statement: SELECT * FROM users
```

```logql
{job="postgresql"}
| pattern `<timestamp> <tz> [<pid>] <user>@<database> <level>:  duration: <duration> ms  statement: <query>`
| duration > 100
```

### Envoy Access Logs

```
[2024-01-15T10:30:00.000Z] "GET /api/users HTTP/1.1" 200 - 0 1234 45 - "192.168.1.100" "curl/7.68.0" "abc123" "api.example.com" "10.0.0.1:8080"
```

```logql
{job="envoy"}
| pattern `[<timestamp>] "<method> <path> <_>" <status> <_> <_> <bytes> <duration> <_> "<client_ip>" "<user_agent>" "<request_id>" "<host>" "<upstream>"`
| status >= 400
```

## Metric Queries with Pattern Parser

### Request Rate by Status

```logql
sum by (status) (
  rate(
    {job="nginx"}
    | pattern `<_> "<_> <_> <_>" <status> <_>`
    [5m]
  )
)
```

### Error Rate by Path

```logql
sum by (path) (
  rate(
    {job="nginx"}
    | pattern `<_> "<method> <path> <_>" <status> <_>`
    | status >= 500
    [5m]
  )
)
```

### Average Response Size

```logql
avg_over_time(
  {job="nginx"}
  | pattern `<_> "<_> <_> <_>" <_> <bytes>`
  | unwrap bytes
  [5m]
) by (job)
```

### P95 Response Time

```logql
quantile_over_time(0.95,
  {job="app"}
  | pattern `<_> duration=<duration>ms <_>`
  | unwrap duration
  [5m]
)
```

## Performance Optimization

### Efficient Pattern Design

```logql
# Less efficient - captures everything
| pattern `<date> <time> <level> <thread> <class> <method> <line> <message>`

# More efficient - only capture needed fields
| pattern `<_> <_> <level> <_> <_> <_> <_> <message>`
```

### Filter Before Pattern

```logql
# Efficient - filter first
{job="app"} |= "ERROR" | pattern `<timestamp> <level> <message>`

# Less efficient - pattern everything
{job="app"} | pattern `<timestamp> <level> <message>` | level = "ERROR"
```

### Limit Label Extraction

```logql
# Only extract labels you need
{job="nginx"}
| pattern `<_> "<method> <path> <_>" <status> <_>`
| status >= 400
```

## Troubleshooting Pattern Parser

### Pattern Not Matching

Check your pattern against actual log format:

```logql
# View raw logs first
{job="app"} | limit 10

# Test pattern incrementally
{job="app"} | pattern `<first_field> <rest>`
```

### Extracted Values Empty

Ensure delimiters match:

```logql
# If logs use tabs instead of spaces
{job="app"} | pattern `<field1>\t<field2>`

# If logs have multiple spaces
{job="app"} | pattern `<field1>  <field2>`
```

### Mixed Log Formats

Handle multiple formats:

```logql
{job="mixed"}
| pattern `<timestamp> <level> <message>`
| level != "" or line_format "{{.}}"
```

## Best Practices

### Pattern Design

1. Start with simple patterns and add complexity
2. Use `<_>` for fields you don't need
3. Match literal text exactly
4. Test patterns with sample logs

### Performance

1. Filter before parsing
2. Only extract needed fields
3. Use line filters before pattern
4. Consider regex for complex patterns

### Maintainability

1. Document pattern formats
2. Use consistent naming conventions
3. Test patterns when log format changes
4. Create reusable pattern templates

## Conclusion

The pattern parser provides an efficient way to extract structured data from unstructured logs. Key takeaways:

- Use angle brackets `<field>` for capture groups
- Use `<_>` for anonymous captures
- Match literal text exactly between captures
- Filter before parsing for better performance
- Combine with other parsers for complex logs

With proper pattern parsing, you can efficiently query and analyze even unstructured log data in Loki.
