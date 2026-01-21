# How to Write LogQL Queries for Loki

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, LogQL, Log Queries, Stream Selectors, Filters, Observability

Description: A comprehensive guide to writing LogQL queries for Grafana Loki, covering stream selectors, line filters, label filters, parser expressions, and advanced query patterns.

---

LogQL is the query language for Grafana Loki, inspired by PromQL. It allows you to filter, parse, and aggregate log data efficiently. Understanding LogQL is essential for effective log analysis and troubleshooting. This guide covers everything from basic queries to advanced patterns.

## Prerequisites

Before starting, ensure you have:

- Grafana Loki instance with indexed logs
- Grafana connected to Loki as a data source
- Basic understanding of log structures and labels

## LogQL Query Structure

A LogQL query consists of two main parts:

```
{stream_selector} | line_filters | parser | label_filter | line_format | ...
```

1. **Stream Selector**: Selects which log streams to query (required)
2. **Pipeline Operators**: Process and filter log lines (optional)

## Stream Selectors

Stream selectors use labels to identify log streams.

### Basic Label Matching

```logql
# Exact match
{job="nginx"}

# Multiple labels (AND logic)
{namespace="production", app="api-server"}

# Three or more labels
{cluster="us-east-1", namespace="production", app="payment-service"}
```

### Label Matching Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `=` | Exact equality | `{job="nginx"}` |
| `!=` | Not equal | `{job!="test"}` |
| `=~` | Regex match | `{job=~"nginx.*"}` |
| `!~` | Regex not match | `{job!~"test.*"}` |

### Regex Examples

```logql
# Match multiple values
{namespace=~"prod|staging"}

# Match prefix
{app=~"api-.*"}

# Match suffix
{container=~".*-sidecar"}

# Complex regex
{pod=~"api-server-[a-z0-9]+-[a-z0-9]+"}

# Case insensitive (using (?i))
{app=~"(?i)nginx"}
```

## Line Filters

Line filters search within log content.

### Filter Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `\|=` | Contains string | `{job="app"} \|= "error"` |
| `!=` | Does not contain | `{job="app"} != "debug"` |
| `\|~` | Regex match | `{job="app"} \|~ "error\|warning"` |
| `!~` | Regex not match | `{job="app"} !~ "healthcheck"` |

### Basic Line Filters

```logql
# Contains text
{namespace="production"} |= "error"

# Does not contain
{namespace="production"} != "healthcheck"

# Case insensitive search
{namespace="production"} |~ "(?i)error"

# Multiple filters (AND logic)
{namespace="production"} |= "error" != "timeout"

# Regex filter
{namespace="production"} |~ "status=[45][0-9]{2}"
```

### Chaining Filters

```logql
# Multiple contains (AND)
{namespace="production"} |= "error" |= "database"

# Mix of contains and not contains
{namespace="production"} |= "error" != "retry" != "timeout"

# Regex with contains
{namespace="production"} |= "POST" |~ "/api/v[0-9]+/users"
```

## Parser Expressions

Parsers extract structured data from log lines.

### JSON Parser

```logql
# Parse JSON logs
{namespace="production"} | json

# Extract specific fields
{namespace="production"} | json level, message, user_id

# Parse nested JSON
{namespace="production"} | json context_user_id="context.user_id"

# Filter on parsed fields
{namespace="production"} | json | level="error"

# Multiple conditions
{namespace="production"} | json | level="error" | status_code >= 500
```

### Logfmt Parser

```logql
# Parse logfmt
{namespace="production"} | logfmt

# Extract specific fields
{namespace="production"} | logfmt level, msg, duration

# Filter on parsed fields
{namespace="production"} | logfmt | level="error"
```

### Pattern Parser

For unstructured logs with consistent patterns:

```logql
# Apache/Nginx access log
{job="nginx"} | pattern `<ip> - <user> [<timestamp>] "<method> <path> <_>" <status> <size>`

# Filter by extracted field
{job="nginx"} | pattern `<ip> - <user> [<timestamp>] "<method> <path> <_>" <status> <size>` | status >= 500

# Custom application log
{job="app"} | pattern `<timestamp> <level> [<thread>] <class> - <message>`
```

### Regex Parser

```logql
# Extract with named groups
{job="nginx"} | regexp `(?P<ip>[\d\.]+) - (?P<user>\S+) \[(?P<time>[^\]]+)\]`

# Filter on extracted fields
{job="nginx"} | regexp `status=(?P<status>\d+)` | status >= 500
```

### Unpack Parser

For packed JSON logs (nested in a field):

```logql
{namespace="production"} | json | unpack
```

## Label Filter Expressions

Filter on label values after parsing.

### Comparison Operators

| Operator | Description |
|----------|-------------|
| `==`, `=` | Equal |
| `!=` | Not equal |
| `>`, `>=` | Greater than |
| `<`, `<=` | Less than |
| `=~` | Regex match |
| `!~` | Regex not match |

### Examples

```logql
# String comparison
{namespace="production"} | json | level="error"

# Numeric comparison
{namespace="production"} | json | status_code >= 500

# Regex on extracted field
{namespace="production"} | json | path=~"/api/v[0-9]+/.*"

# Combined conditions
{namespace="production"} | json | level="error" | status_code >= 500 | method="POST"

# IP address filtering
{namespace="production"} | json | ip=~"10\\..*"
```

### Type Conversions

```logql
# Duration comparison (converts to nanoseconds)
{namespace="production"} | json | duration > 1s

# Byte size comparison
{namespace="production"} | json | size > 1MB

# Numeric string to number
{namespace="production"} | json | unwrap response_time | response_time > 100
```

## Line Format Expression

Transform the output line.

```logql
# Simple format
{namespace="production"} | json | line_format "{{.level}} - {{.message}}"

# Include multiple fields
{namespace="production"} | json | line_format "{{.timestamp}} [{{.level}}] {{.service}}: {{.message}}"

# Conditional formatting
{namespace="production"} | json | line_format `{{ if eq .level "error" }}ERROR: {{ end }}{{.message}}`

# Template functions
{namespace="production"} | json | line_format "{{.message | ToUpper}}"
```

### Template Functions

```logql
# String manipulation
line_format "{{ .message | ToLower }}"
line_format "{{ .message | ToUpper }}"
line_format "{{ .message | Title }}"
line_format "{{ .message | Trim }}"

# Substring
line_format "{{ .id | trunc 8 }}"

# Default value
line_format "{{ .user | default \"unknown\" }}"

# Formatting
line_format "{{ printf \"%.2f\" .duration }}"
```

## Label Format Expression

Modify labels dynamically.

```logql
# Rename label
{namespace="production"} | json | label_format service="{{.app}}"

# Create new label from field
{namespace="production"} | json | label_format error_type="{{.error.type}}"

# Combine labels
{namespace="production"} | json | label_format full_name="{{.namespace}}/{{.pod}}"

# Drop label
{namespace="production"} | json | label_format pod=""
```

## Drop and Keep

Control which labels to include.

```logql
# Keep only specific labels
{namespace="production"} | json | keep level, message

# Drop specific fields
{namespace="production"} | json | drop kubernetes, stream

# Drop labels from output
{namespace="production"} | json | drop __error__, __error_details__
```

## Decolorize

Remove ANSI color codes from logs:

```logql
{namespace="production"} | decolorize
```

## Practical Examples

### Error Analysis

```logql
# All errors in production
{namespace="production"} | json | level="error"

# Errors with stack traces
{namespace="production"} |= "error" |= "stacktrace"

# HTTP 5xx errors
{namespace="production"} | json | status_code >= 500

# Database errors
{namespace="production"} | json | level="error" |= "database"
```

### API Request Analysis

```logql
# Slow requests (> 1 second)
{namespace="production", app="api"} | json | duration > 1s

# Failed authentication
{namespace="production"} | json | path="/api/auth" | status_code=401

# Specific endpoint errors
{namespace="production"} | json | path=~"/api/v1/users.*" | status_code >= 400

# POST requests with errors
{namespace="production"} | json | method="POST" | status_code >= 400
```

### User Activity

```logql
# Specific user actions
{namespace="production"} | json | user_id="12345"

# Login failures
{namespace="production"} | json | event="login_failed"

# Admin actions
{namespace="production"} | json | role="admin" | action=~"delete|update"
```

### Infrastructure Debugging

```logql
# Pod restarts
{namespace="kube-system"} |= "container restarted"

# OOM kills
{namespace="production"} |= "OOMKilled"

# Network errors
{namespace="production"} |~ "connection refused|timeout|ECONNRESET"

# Certificate issues
{namespace="production"} |~ "certificate|TLS|SSL" | level="error"
```

### Log Formatting for Readability

```logql
# Clean JSON output
{namespace="production"} | json | line_format "{{.timestamp}} [{{.level}}] {{.message}}"

# API request summary
{namespace="production"} | json
  | line_format "{{.method}} {{.path}} - {{.status_code}} ({{.duration}})"

# Error details
{namespace="production"} | json | level="error"
  | line_format "ERROR in {{.service}}: {{.message}}\nStack: {{.stacktrace}}"
```

## Query Optimization Tips

### Use Specific Labels

```logql
# Good - specific labels
{namespace="production", app="api-server", container="main"}

# Bad - broad query
{job=~".*"}
```

### Filter Early

```logql
# Good - line filter before parsing
{namespace="production"} |= "error" | json | level="error"

# Less efficient - parse all then filter
{namespace="production"} | json | level="error"
```

### Limit Time Range

Always use appropriate time ranges in Grafana to avoid scanning too much data.

### Avoid High-Cardinality in Stream Selectors

```logql
# Bad - user_id as label creates too many streams
{namespace="production", user_id="12345"}

# Good - filter after parsing
{namespace="production"} | json | user_id="12345"
```

## Common Patterns

### Extract Trace ID for Correlation

```logql
{namespace="production"} | json | trace_id!=""
  | line_format "Trace: {{.trace_id}} - {{.message}}"
```

### Request/Response Pairs

```logql
# Find request by ID
{namespace="production"} | json | request_id="abc-123"
```

### Time-Based Filtering

```logql
# Logs in last hour with errors
{namespace="production"} | json | level="error"

# Combined with rate for trends
rate({namespace="production"} | json | level="error" [5m])
```

## Conclusion

LogQL provides powerful capabilities for querying and analyzing logs in Loki. Key takeaways:

- Use specific stream selectors to narrow down log sources
- Apply line filters before parsers for better performance
- Choose the right parser (json, logfmt, pattern, regexp) for your log format
- Use label filters for structured field comparisons
- Format output with line_format for readability
- Optimize queries by filtering early and using specific labels

Mastering LogQL enables efficient log exploration, troubleshooting, and observability in Loki-based logging systems.
