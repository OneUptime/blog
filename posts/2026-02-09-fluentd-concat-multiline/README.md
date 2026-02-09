# How to Implement Fluentd Concat Plugin for Multi-Line Log Parsing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fluentd, Logging, Parsing, Multi-Line, Configuration

Description: Master Fluentd concat plugin to correctly parse multi-line log entries like stack traces, JSON objects, and application logs that span multiple lines, including pattern matching and timeout configuration.

---

Multi-line logs present a challenge for log collectors because each logical log entry spans multiple physical lines. Stack traces, exception details, and formatted output often spread across dozens of lines that need to be treated as a single event. The Fluentd concat plugin solves this by buffering lines and concatenating them based on patterns that identify where entries begin and end.

## Understanding Multi-Line Log Challenges

Standard log collection reads files line by line, treating each line as a separate event. This works fine for single-line logs but breaks multi-line entries into fragments. A Java exception with a 20-line stack trace becomes 20 separate log events, making analysis nearly impossible.

The concat plugin watches for patterns that indicate the start of a new log entry. When it sees a starting pattern, it knows the previous entry is complete and can be emitted. All lines between start patterns get concatenated into a single event. This requires defining patterns that reliably identify log entry boundaries.

Different log formats need different concatenation strategies. Some logs have explicit start markers. Others require detecting continuation lines. The concat plugin handles both through flexible pattern matching.

## Installing the Concat Plugin

The concat plugin comes from the fluent-plugin-concat gem:

```bash
# Install the plugin
gem install fluent-plugin-concat

# Or add to Gemfile for containerized deployments
gem 'fluent-plugin-concat'
```

For Docker-based deployments, create a custom Fluentd image:

```dockerfile
# Dockerfile
FROM fluent/fluentd:v1.16-1

USER root

# Install concat plugin
RUN gem install fluent-plugin-concat

USER fluent
```

Build and use the custom image:

```bash
docker build -t fluentd-concat:latest .
docker push your-registry/fluentd-concat:latest
```

## Basic Concat Configuration

Configure concat as a filter that processes logs before they reach output:

```ruby
# Source reads container logs
<source>
  @type tail
  path /var/log/containers/*.log
  pos_file /var/log/fluentd/containers.pos
  tag kubernetes.*
  <parse>
    @type json
    time_key time
    time_format %Y-%m-%dT%H:%M:%S.%NZ
  </parse>
</source>

# Concat filter for multi-line Java logs
<filter kubernetes.**>
  @type concat
  key log
  stream_identity_key container_id
  multiline_start_regexp /^\d{4}-\d{2}-\d{2}/
  flush_interval 5s
  timeout_label @NORMAL
</filter>

# Output to Elasticsearch
<match kubernetes.**>
  @type elasticsearch
  host elasticsearch.example.com
  port 9200
  index_name kubernetes-logs
</match>
```

This configuration concatenates lines in the log field, using container_id to track separate log streams, and starts new entries when lines begin with a date like "2024-02-09".

## Concatenating Java Stack Traces

Java exceptions span multiple lines with a predictable pattern. The first line states the exception, followed by indented stack trace lines:

```ruby
<filter app.java.**>
  @type concat
  key message
  stream_identity_key container_id

  # New entry starts with timestamp and log level
  multiline_start_regexp /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3}\s+(ERROR|WARN|INFO|DEBUG)/

  # Flush entries after 10 seconds of inactivity
  flush_interval 10s
  timeout_label @NORMAL

  # Keep entries in memory for up to 60 seconds
  use_first_timestamp true
</filter>
```

Example log that gets concatenated:

```
2024-02-09 10:30:45.123 ERROR [main] Application failed to start
java.lang.NullPointerException: Cannot invoke method on null object
    at com.example.Application.initialize(Application.java:45)
    at com.example.Application.main(Application.java:20)
    at sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
    at sun.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:62)
Caused by: java.lang.RuntimeException: Configuration file not found
    at com.example.ConfigLoader.load(ConfigLoader.java:15)
    ... 4 more
```

This entire exception becomes a single log event.

## Parsing Python Stack Traces

Python stack traces have a different structure, starting with "Traceback":

```ruby
<filter app.python.**>
  @type concat
  key log
  stream_identity_key pod_name

  # Python logs start with timestamp or "Traceback"
  multiline_start_regexp /^(\d{4}-\d{2}-\d{2}|Traceback)/

  # Continue lines start with whitespace or specific markers
  multiline_end_regexp /^(?!\s+|  File|    )/

  flush_interval 5s
</filter>
```

Example Python traceback:

```
2024-02-09 10:30:45,123 ERROR Exception occurred
Traceback (most recent call last):
  File "/app/main.py", line 42, in process_request
    result = calculate_value(data)
  File "/app/calculator.py", line 18, in calculate_value
    return data['amount'] / data['count']
ZeroDivisionError: division by zero
```

## Handling Multi-Line JSON

Applications that output formatted JSON across multiple lines need special handling:

```ruby
<filter app.json.**>
  @type concat
  key message
  stream_identity_key container_id

  # JSON objects start with opening brace
  multiline_start_regexp /^\{/

  # JSON objects end with closing brace
  multiline_end_regexp /^\}/

  flush_interval 3s
</filter>

# Parse the concatenated JSON
<filter app.json.**>
  @type parser
  key_name message
  <parse>
    @type json
  </parse>
</filter>
```

This handles logs like:

```json
{
  "timestamp": "2024-02-09T10:30:45Z",
  "level": "INFO",
  "message": "Request processed",
  "request": {
    "method": "POST",
    "path": "/api/users",
    "duration_ms": 145
  },
  "response": {
    "status": 200,
    "size": 1024
  }
}
```

## Stream Identity for Multiple Sources

The stream_identity_key parameter is critical when processing logs from multiple containers or files. It tells concat which lines belong together:

```ruby
# Without stream identity - WRONG
# Lines from different containers get mixed together
<filter kubernetes.**>
  @type concat
  key log
  multiline_start_regexp /^\d{4}/
</filter>

# With stream identity - CORRECT
# Each container's logs are tracked separately
<filter kubernetes.**>
  @type concat
  key log
  stream_identity_key $.kubernetes.container_name
  multiline_start_regexp /^\d{4}/
</filter>
```

Use unique identifiers like container ID, pod name, or file path as stream identity. Without this, logs from different sources get incorrectly concatenated together.

## Configuring Timeouts and Flush Behavior

Control how long concat waits before emitting incomplete entries:

```ruby
<filter application.**>
  @type concat
  key message
  stream_identity_key source

  multiline_start_regexp /^START/
  multiline_end_regexp /^END/

  # Flush incomplete entries after 30 seconds
  flush_interval 30s

  # Maximum time to keep an entry (prevents memory leaks)
  timeout_label @INCOMPLETE

  # Use first line's timestamp for the event
  use_first_timestamp true

  # Keep partial entries in memory
  use_partial_metadata true
</filter>

# Handle incomplete entries
<label @INCOMPLETE>
  <match application.**>
    @type relabel
    @label @NORMAL
  </match>
</label>
```

The flush_interval controls how long to wait for completing lines. Set it based on your application's logging patterns. Fast-logging applications need shorter intervals.

## Pattern Matching Strategies

Different applications require different pattern approaches:

```ruby
# Apache/Nginx access logs (single line, no concat needed)
# But error logs are multi-line

<filter nginx.error>
  @type concat
  key message
  stream_identity_key source_file

  # Error entries start with timestamp in brackets
  multiline_start_regexp /^\[/

  flush_interval 5s
</filter>

# Go application logs with goroutine dumps
<filter app.golang.**>
  @type concat
  key log
  stream_identity_key container

  # Starts with timestamp or "goroutine"
  multiline_start_regexp /^(time=|goroutine)/

  flush_interval 10s
</filter>

# Generic application with indented continuation
<filter app.generic.**>
  @type concat
  key message
  stream_identity_key host

  # Lines starting without whitespace are new entries
  multiline_start_regexp /^[^\s]/

  flush_interval 5s
</filter>
```

## Combining with Parser Plugin

After concatenation, parse the complete log entry:

```ruby
# Concatenate Java logs
<filter java.**>
  @type concat
  key log
  stream_identity_key container_id
  multiline_start_regexp /^\d{4}-\d{2}-\d{2}/
  flush_interval 5s
</filter>

# Parse the concatenated log
<filter java.**>
  @type parser
  key_name log
  reserve_data true
  <parse>
    @type regexp
    expression /^(?<time>\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3})\s+(?<level>\w+)\s+\[(?<thread>[^\]]+)\]\s+(?<message>.*)/s
    time_key time
    time_format %Y-%m-%d %H:%M:%S.%L
  </parse>
</filter>
```

The /s modifier at the end of the regex enables multi-line matching, so the message field can contain newlines.

## Performance Considerations

Concat plugin keeps lines in memory until complete entries are identified. Monitor memory usage:

```ruby
<filter app.**>
  @type concat
  key message
  stream_identity_key container

  multiline_start_regexp /^START/

  # Limit memory usage
  flush_interval 10s

  # Maximum entries to buffer per stream
  max_lines 1000

  # Fail if entry exceeds size
  max_line_size 1048576  # 1MB
</filter>
```

For high-volume logs, tune these parameters to prevent memory exhaustion. If individual log entries exceed max_lines or max_line_size, they get flushed incomplete.

## Debugging Concat Configuration

Enable debug logging to troubleshoot pattern matching:

```ruby
<system>
  log_level debug
</system>

<filter app.**>
  @type concat
  key log
  stream_identity_key id

  multiline_start_regexp /^START/
  flush_interval 5s

  # Concat plugin emits debug logs showing:
  # - When new entries start
  # - Which lines get concatenated
  # - When entries flush
</filter>
```

Check Fluentd logs for concat plugin output:

```bash
# Watch for concat debug messages
tail -f /var/log/fluentd/fluentd.log | grep concat

# Look for patterns like:
# concat: [app.logs] Starting new entry for stream: container-123
# concat: [app.logs] Appending line to stream: container-123
# concat: [app.logs] Flushing complete entry for stream: container-123
```

## Real-World Configuration Example

Complete configuration for a Kubernetes environment with multiple application types:

```ruby
# Collect container logs
<source>
  @type tail
  path /var/log/containers/*.log
  pos_file /var/log/fluentd/containers.pos
  tag kubernetes.*
  read_from_head true
  <parse>
    @type json
    time_key time
    time_format %Y-%m-%dT%H:%M:%S.%NZ
  </parse>
</source>

# Add Kubernetes metadata
<filter kubernetes.**>
  @type kubernetes_metadata
  @id filter_kube_metadata
</filter>

# Concat Java application logs
<filter kubernetes.var.log.containers.**java**.log>
  @type concat
  key log
  stream_identity_key $.kubernetes.container_name
  multiline_start_regexp /^\d{4}-\d{2}-\d{2}/
  flush_interval 10s
  timeout_label @NORMAL
  use_first_timestamp true
</filter>

# Concat Python application logs
<filter kubernetes.var.log.containers.**python**.log>
  @type concat
  key log
  stream_identity_key $.kubernetes.container_name
  multiline_start_regexp /^(\d{4}-\d{2}-\d{2}|Traceback)/
  flush_interval 5s
  timeout_label @NORMAL
</filter>

# Output to Elasticsearch
<match kubernetes.**>
  @type elasticsearch
  host elasticsearch.logging.svc.cluster.local
  port 9200
  index_name kubernetes-${record['kubernetes']['namespace_name']}
  <buffer>
    flush_interval 10s
  </buffer>
</match>
```

## Conclusion

The concat plugin transforms Fluentd's line-by-line processing into context-aware multi-line log handling. By defining patterns that identify log entry boundaries and using stream identity to track separate sources, you ensure stack traces, exceptions, and formatted output remain intact as single events. Start with simple start-of-entry patterns, test thoroughly with sample logs, and tune timeout values based on your application's logging behavior. Proper multi-line handling makes the difference between fragmented noise and actionable log data.
