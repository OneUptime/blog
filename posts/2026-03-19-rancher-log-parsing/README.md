# How to Configure Log Parsing in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Logging

Description: Learn how to parse and structure Kubernetes log data in Rancher using JSON, regex, and multiline parsers.

Raw container logs are often unstructured text that is difficult to search and analyze. Log parsing transforms these raw lines into structured data with named fields, making logs searchable, filterable, and useful for analytics. This guide covers configuring various log parsers in Rancher's logging stack.

## Prerequisites

- Rancher v2.6 or later with the Logging chart installed.
- A configured ClusterOutput or Output destination.
- Cluster admin permissions.

## Understanding Log Formats

Kubernetes container logs come in several formats depending on the container runtime and application:

**Docker JSON format:**
```json
{"log":"2026-03-19T10:00:00Z INFO Starting application\n","stream":"stdout","time":"2026-03-19T10:00:00.000000000Z"}
```

**CRI format:**
```plaintext
2026-03-19T10:00:00.000000000Z stdout F 2026-03-19T10:00:00Z INFO Starting application
```

**Application-level formats vary:**
- JSON: `{"timestamp":"2026-03-19T10:00:00Z","level":"INFO","message":"Starting"}`
- Apache/NGINX: `192.168.1.1 - - [19/Mar/2026:10:00:00 +0000] "GET /api HTTP/1.1" 200 1234`
- Custom: `[2026-03-19 10:00:00] [INFO] [main] Starting application`

## Step 1: Parse JSON Logs

The most common parser for applications that output structured JSON:

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterFlow
metadata:
  name: json-parsed-logs
  namespace: cattle-logging-system
spec:
  filters:
    - parser:
        parse:
          type: json
          time_key: timestamp
          time_format: "%iso8601"
        key_name: log
        reserve_data: true
        remove_key_name_field: true
        emit_invalid_record_to_error: false
  globalOutputRefs:
    - elasticsearch-output
```

Parameters explained:
- **key_name**: The field containing the raw log line to parse.
- **reserve_data**: Keep original fields alongside parsed fields.
- **remove_key_name_field**: Remove the original raw `log` field after parsing.
- **emit_invalid_record_to_error**: Do not emit unparseable records to Fluentd's `@ERROR` label.

## Step 2: Parse Logs with Regular Expressions

For custom log formats, use regex parsing:

### Apache/NGINX Access Logs

```yaml
filters:
  - parser:
      parse:
        type: regexp
        expression: '/^(?<remote_addr>\S+) - (?<remote_user>\S+) \[(?<time_local>[^\]]+)\] "(?<method>\S+) (?<path>\S+) (?<protocol>\S+)" (?<status>\d+) (?<body_bytes_sent>\d+)/'
        time_key: time_local
        time_format: "%d/%b/%Y:%H:%M:%S %z"
        types: "status:integer,body_bytes_sent:integer"
      key_name: log
      reserve_data: true
      remove_key_name_field: true
```

### Custom Application Logs

For logs like `[2026-03-19 10:00:00] [INFO] [main] Starting application`:

```yaml
filters:
  - parser:
      parse:
        type: regexp
        expression: '/^\[(?<timestamp>[^\]]+)\] \[(?<level>\w+)\] \[(?<module>\w+)\] (?<message>.*)$/'
        time_key: timestamp
        time_format: "%Y-%m-%d %H:%M:%S"
      key_name: log
      reserve_data: true
      remove_key_name_field: true
```

### Syslog Format

```yaml
filters:
  - parser:
      parse:
        type: regexp
        expression: '/^(?<time>\w+ \d+ \d+:\d+:\d+) (?<host>\S+) (?<ident>\S+): (?<message>.*)$/'
        time_format: "%b %d %H:%M:%S"
      key_name: log
```

## Step 3: Parse Multi-Line Logs

Stack traces and multi-line log entries need special handling. Use the detectExceptions filter:

```yaml
filters:
  - detectExceptions:
      languages:
        - java
        - python
        - go
        - javascript
        - csharp
        - ruby
      multiline_flush_interval: 5
      max_lines: 500
      max_bytes: 500000
```

For custom multi-line patterns, configure Fluent Bit's multiline parser through the Rancher logging chart's `fluentbitAgentOverlay` values:

```yaml
fluentbitAgentOverlay:
  customParsers: |
    [MULTILINE_PARSER]
        name          java_multiline
        type          regex
        flush_timeout 1000
        rule          "start_state"  "/^\d{4}-\d{2}-\d{2}/"  "cont"
        rule          "cont"         "/^\s+at|^\s+\.\.\./"    "cont"
```

## Step 4: Parse Key-Value Pair Logs

For logs in `key=value` format:

```yaml
filters:
  - parser:
      parse:
        type: regexp
        expression: '/(?<key1>\w+)=(?<val1>[^\s]+)\s*(?<key2>\w+)=(?<val2>[^\s]+)/'
      key_name: log
      reserve_data: true
```

A more flexible approach using Ruby expressions:

```yaml
filters:
  - record_transformer:
      enable_ruby: true
      records:
        - parsed_kv: "${Hash[record['log'].scan(/(\w+)=([^\s]+)/)]}"
```

## Step 5: Multiple Parsers with Fallback

Try multiple parsers and use the first that succeeds:

```yaml
filters:
  - parser:
      parse:
        type: multi_format
        patterns:
          - format: json
          - format: regexp
            expression: '/^\[(?<timestamp>[^\]]+)\] \[(?<level>\w+)\] (?<message>.*)$/'
          - format: none
      key_name: log
      reserve_data: true
      remove_key_name_field: true
```

## Step 6: Type Casting Parsed Fields

Convert parsed string fields to their correct types:

```yaml
filters:
  - parser:
      parse:
        type: json
        types: "status:integer,duration:float,success:bool,timestamp:time:%Y-%m-%dT%H:%M:%SZ"
      key_name: log

  # Or use record_transformer for manual casting
  - record_transformer:
      enable_ruby: true
      records:
        - status_code: "${record['status'].to_i rescue record['status']}"
          duration_ms: "${record['duration'].to_f rescue 0.0}"
```

## Step 7: Flatten Nested JSON

When parsed JSON contains nested objects that need flattening:

```yaml
filters:
  - parser:
      parse:
        type: json
      key_name: log
      reserve_data: true
      remove_key_name_field: true

  # Flatten nested fields
  - record_transformer:
      enable_ruby: true
      records:
        - request_method: "${record.dig('request', 'method')}"
          request_path: "${record.dig('request', 'path')}"
          response_status: "${record.dig('response', 'status')}"
          user_id: "${record.dig('user', 'id')}"
```

## Step 8: Parse and Normalize Timestamps

Handle various timestamp formats:

```yaml
filters:
  - parser:
      parse:
        type: json
        time_key: timestamp
        time_format: "%iso8601"
        keep_time_key: true
        utc: true
      key_name: log

  # Normalize timestamp field names
  - record_transformer:
      enable_ruby: true
      records:
        - "@timestamp": "${time.strftime('%Y-%m-%dT%H:%M:%S.%LZ')}"
```

## Step 9: Validate Parsing Configuration

Test your parser configuration:

1. Deploy a test pod that generates known log output:

```bash
kubectl run parse-test --restart=Never --image=busybox -- /bin/sh -c '
echo "{\"timestamp\":\"2026-03-19T10:00:00Z\",\"level\":\"INFO\",\"message\":\"test message\",\"status\":200}";
sleep 30
'
```

2. Check Fluentd logs for parser errors or configuration issues:

```bash
kubectl get pods -n cattle-logging-system
kubectl logs -n cattle-logging-system <fluentd-pod> -c fluentd --tail=200
```

3. Query the destination to verify fields are structured correctly.

## Step 10: Performance Considerations

- JSON parsing is faster than regex parsing. Use JSON when possible.
- `emit_invalid_record_to_error: false` avoids routing intentionally ignored records to Fluentd's `@ERROR` label.
- Heavy regex patterns can impact Fluentd CPU usage. Test with production-like log volumes.
- Multi-line parsing increases memory usage. Set appropriate `max_lines` and `max_bytes` limits.

## Summary

Log parsing in Rancher transforms unstructured log lines into structured, searchable data. Use JSON parsers for structured application logs, regex parsers for custom formats, and multi-line detection for stack traces. Chain parsers with record transformers to normalize field names and types. Always test parsers with representative log samples and monitor Fluentd performance to avoid processing bottlenecks.
