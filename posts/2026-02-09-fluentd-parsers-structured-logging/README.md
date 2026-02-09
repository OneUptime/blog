# How to configure Fluentd parsers for structured logging formats

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fluentd, Parsers, Structured Logging, JSON, EFK Stack

Description: Master Fluentd parsers to extract structured data from JSON, nginx, Apache, syslog, and custom log formats for efficient searching and analysis in Elasticsearch.

---

Raw log lines are difficult to search and analyze. Fluentd parsers transform unstructured text into structured records with named fields, making logs searchable, filterable, and analyzable in Elasticsearch. Properly configured parsers are essential for extracting meaningful data from application logs, web server access logs, and system logs.

This guide covers configuring Fluentd parsers for common log formats and creating custom parsers for application-specific logging patterns.

## Understanding Fluentd parser plugins

Fluentd parsers convert log strings into structured records:
- Extract fields from text using regular expressions or built-in formats
- Parse timestamps into proper date objects
- Handle multi-format logs with fallback patterns
- Support JSON, Apache, nginx, syslog, and custom formats

Parsers are typically used in `<parse>` directives within source and filter plugins.

## Parsing JSON logs

Most modern applications output JSON logs:

```yaml
# JSON parser configuration
<source>
  @type tail
  path /var/log/containers/*-app-*.log
  pos_file /var/log/app-json.pos
  tag app.json
  <parse>
    @type json
    time_key timestamp
    time_format %Y-%m-%dT%H:%M:%S.%L%z
    keep_time_key true
  </parse>
</source>
```

Example JSON log and parsed output:

```json
Input: {"timestamp":"2026-02-09T10:15:30.123Z","level":"INFO","message":"User logged in","user_id":12345}

Output record:
{
  "timestamp": "2026-02-09T10:15:30.123Z",
  "level": "INFO",
  "message": "User logged in",
  "user_id": 12345
}
```

## Parsing nginx access logs

Parse nginx combined log format:

```yaml
<source>
  @type tail
  path /var/log/nginx/access.log
  pos_file /var/log/nginx-access.pos
  tag nginx.access
  <parse>
    @type nginx
    # Parses: combined format
    # $remote_addr - $remote_user [$time_local] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent"
  </parse>
</source>
```

Parsed nginx log:

```
Input: 192.168.1.100 - - [09/Feb/2026:10:15:30 +0000] "GET /api/users HTTP/1.1" 200 1234 "https://example.com" "Mozilla/5.0"

Output:
{
  "remote": "192.168.1.100",
  "user": "-",
  "method": "GET",
  "path": "/api/users",
  "code": "200",
  "size": "1234",
  "referer": "https://example.com",
  "agent": "Mozilla/5.0"
}
```

Custom nginx log format:

```yaml
<parse>
  @type regexp
  expression /^(?<remote>[^ ]*) - (?<user>[^ ]*) \[(?<time>[^\]]*)\] "(?<method>\S+)(?: +(?<path>[^ ]*) +\S*)?" (?<code>[^ ]*) (?<size>[^ ]*) "(?<referer>[^\"]*)" "(?<agent>[^\"]*)" (?<request_time>[^ ]*)/
  time_format %d/%b/%Y:%H:%M:%S %z
</parse>
```

## Parsing Apache access logs

Parse Apache combined format:

```yaml
<source>
  @type tail
  path /var/log/apache2/access.log
  pos_file /var/log/apache-access.pos
  tag apache.access
  <parse>
    @type apache2
    # Parses Apache combined log format
  </parse>
</source>
```

Custom Apache format with response time:

```yaml
<parse>
  @type regexp
  expression /^(?<host>[^ ]*) [^ ]* (?<user>[^ ]*) \[(?<time>[^\]]*)\] "(?<method>\S+)(?: +(?<path>[^\"]*?)(?: +\S*)?)?" (?<code>[^ ]*) (?<size>[^ ]*) (?<duration>[^ ]*)/
  time_format %d/%b/%Y:%H:%M:%S %z
  types size:integer,duration:float
</parse>
```

## Parsing syslog format

Parse standard syslog messages:

```yaml
<source>
  @type syslog
  port 5140
  bind 0.0.0.0
  tag system.syslog
  <parse>
    @type syslog
    message_format auto
    with_priority true
  </parse>
</source>
```

Parse RFC5424 syslog:

```yaml
<parse>
  @type syslog
  message_format rfc5424
</parse>
```

Parse RFC3164 syslog:

```yaml
<parse>
  @type syslog
  message_format rfc3164
</parse>
```

## Creating custom parsers with regexp

Parse application-specific log formats:

```yaml
# Parse custom application logs
# Format: [2026-02-09 10:15:30.123] INFO [RequestID:abc123] [UserID:12345] User login successful
<filter app.**>
  @type parser
  key_name log
  <parse>
    @type regexp
    expression /^\[(?<time>[^\]]+)\] (?<level>\w+) \[RequestID:(?<request_id>[^\]]+)\] \[UserID:(?<user_id>[^\]]+)\] (?<message>.*)$/
    time_format %Y-%m-%d %H:%M:%S.%L
    types user_id:integer
  </parse>
</filter>
```

## Using multi-format parsers

Handle logs in multiple formats with fallback:

```yaml
<source>
  @type tail
  path /var/log/containers/*.log
  pos_file /var/log/multi-format.pos
  tag app
  <parse>
    @type multi_format
    # Try JSON first
    <pattern>
      format json
      time_key timestamp
      time_format %Y-%m-%dT%H:%M:%S.%NZ
    </pattern>
    # Fall back to custom format
    <pattern>
      format regexp
      expression /^(?<time>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \[(?<level>\w+)\] (?<message>.*)$/
      time_format %Y-%m-%d %H:%M:%S
    </pattern>
    # Last resort: treat as plain text
    <pattern>
      format none
      message_key log
    </pattern>
  </parse>
</source>
```

## Parsing multiline logs

Handle stack traces and multiline messages:

```yaml
<source>
  @type tail
  path /var/log/app/*.log
  pos_file /var/log/app-multiline.pos
  tag app.multiline
  <parse>
    @type multiline
    format_firstline /^\d{4}-\d{2}-\d{2}/
    format1 /^(?<time>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \[(?<level>\w+)\] (?<message>.*)/
    time_format %Y-%m-%d %H:%M:%S
  </parse>
</source>
```

## Parsing CSV logs

Extract fields from CSV format logs:

```yaml
<parse>
  @type csv
  keys time,user_id,action,resource,status
  time_key time
  time_format %Y-%m-%d %H:%M:%S
</parse>
```

With header row:

```yaml
<parse>
  @type csv
  keys []  # Empty to use header row
  header_row true
</parse>
```

## Using named capture groups

Extract nested JSON fields:

```yaml
<filter app.**>
  @type parser
  key_name message
  reserve_data true
  <parse>
    @type json
  </parse>
</filter>

# Now extract specific fields from parsed JSON
<filter app.**>
  @type record_transformer
  enable_ruby true
  <record>
    user_email ${record.dig("user", "email")}
    request_method ${record.dig("request", "method")}
    response_status ${record.dig("response", "status")}
  </record>
</filter>
```

## Type casting parsed fields

Convert string fields to appropriate types:

```yaml
<parse>
  @type regexp
  expression /^(?<time>[^ ]+) (?<level>\w+) (?<user_id>\d+) (?<duration>[\d.]+) (?<message>.*)$/
  time_format %Y-%m-%dT%H:%M:%S
  types user_id:integer,duration:float
</parse>
```

Supported types:
- `string` (default)
- `integer` or `int`
- `float`
- `bool` or `boolean`
- `time`
- `array`

## Handling parser errors

Configure error handling for unparseable logs:

```yaml
<source>
  @type tail
  path /var/log/app/*.log
  pos_file /var/log/app.pos
  tag app
  <parse>
    @type json
    time_key timestamp
  </parse>
  # Emit unparsed records with error tag
  emit_unmatched_lines true
  unmatched_lines_tag app.unparsed
</source>

# Log unparsed records
<match app.unparsed>
  @type file
  path /var/log/fluentd/unparsed
  <format>
    @type single_value
    message_key log
  </format>
</match>
```

## Building complex parsers

Parse complex log formats with multiple steps:

```yaml
# Step 1: Extract outer structure
<filter app.**>
  @type parser
  key_name log
  reserve_data true
  <parse>
    @type regexp
    expression /^(?<timestamp>[^ ]+) (?<source>\w+) (?<payload>.*)$/
  </parse>
</filter>

# Step 2: Parse payload based on source
<filter app.**>
  @type parser
  key_name payload
  reserve_data true
  <parse>
    @type multi_format
    <pattern>
      format json
    </pattern>
    <pattern>
      format none
    </pattern>
  </parse>
</filter>

# Step 3: Extract nested fields
<filter app.**>
  @type record_transformer
  enable_ruby true
  remove_keys payload
  <record>
    level ${record.dig("payload", "level") || "INFO"}
    message ${record.dig("payload", "msg") || record["payload"]}
  </record>
</filter>
```

## Testing parsers

Test parser configuration:

```bash
# Create test input file
cat > /tmp/test.log <<EOF
{"timestamp":"2026-02-09T10:15:30Z","level":"INFO","message":"Test message"}
EOF

# Test parser with fluent-cat
cat /tmp/test.log | fluent-cat test.debug

# View parsed output
tail -f /var/log/fluentd/test.log
```

Use Fluentd test plugin:

```bash
# Install test plugin
gem install fluent-plugin-test-dump

# Run test
fluentd -c test.conf --dry-run
```

## Best practices

1. **Use built-in parsers:** Leverage nginx, apache2, json, syslog parsers when possible
2. **Test regexps thoroughly:** Validate patterns with sample logs
3. **Handle parse failures:** Configure emit_unmatched_lines for debugging
4. **Type cast appropriately:** Convert numeric and boolean fields
5. **Use multi-format parsers:** Support multiple log formats gracefully
6. **Document custom patterns:** Comment complex regular expressions
7. **Performance matters:** Simple parsers are faster than complex ones
8. **Monitor parser metrics:** Track parse errors and slow parsing

## Conclusion

Fluentd parsers transform raw log lines into structured, searchable data. By properly configuring parsers for JSON, nginx, Apache, syslog, and custom formats, you extract maximum value from your logs. Combined with type casting, error handling, and multi-format support, well-configured parsers form the foundation of effective log analysis in your EFK stack.
