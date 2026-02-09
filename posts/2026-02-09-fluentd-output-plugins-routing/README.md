# How to Use Fluentd Output Plugins for Routing Logs to Multiple Destinations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fluentd, Logging, Routing, Configuration, Integration

Description: Master Fluentd output plugin configuration to route logs to multiple destinations based on tags and filters, including Elasticsearch, S3, Kafka, HTTP endpoints, and custom routing strategies.

---

Fluentd's flexible output system lets you send logs to multiple destinations simultaneously based on tags, filters, and conditions. You can route error logs to PagerDuty for immediate alerting while sending all logs to Elasticsearch for analysis and archiving to S3 for long-term storage. This multi-destination routing creates comprehensive logging pipelines without duplicating collection infrastructure.

## Understanding Fluentd Output Routing

Fluentd matches log events against output plugin configurations using tag patterns. When an event flows through the pipeline, Fluentd evaluates all match directives in order and sends the event to outputs where the tag matches. The match pattern supports wildcards, making it easy to route subsets of logs to specific destinations.

Tags typically follow a hierarchical structure like app.production.web or system.auth.syslog. This hierarchy enables flexible routing patterns. You can match all app logs with app.**, production logs with **.production.**, or specific services with app.production.api.

Multiple output plugins can match the same event. If you configure outputs for both app.** and **.production.**, an event tagged app.production.web matches both and gets sent to both destinations. This fan-out pattern lets you implement redundant storage or specialized processing pipelines.

## Basic Multi-Destination Configuration

Start with a simple configuration that sends logs to multiple outputs:

```ruby
# Send all logs to Elasticsearch
<match **>
  @type elasticsearch
  host elasticsearch.example.com
  port 9200
  index_name fluentd
  type_name _doc

  <buffer>
    flush_interval 10s
  </buffer>
</match>

# Send error logs to Slack
<match **.error>
  @type slack
  webhook_url https://hooks.slack.com/services/YOUR/WEBHOOK/URL
  channel "#alerts"
  username "Fluentd"
  message "Error detected: %s"
  message_keys message

  <buffer>
    flush_interval 5s
  </buffer>
</match>
```

This configuration sends all logs to Elasticsearch and additionally sends error-tagged logs to Slack. Events tagged app.production.error match both patterns and go to both destinations.

## Tag-Based Routing Strategies

Design a tagging scheme that enables clean routing logic:

```ruby
# Route by environment
<match production.**>
  @type elasticsearch
  host prod-elasticsearch.example.com
  port 9200
  index_name production-logs
</match>

<match staging.**>
  @type elasticsearch
  host staging-elasticsearch.example.com
  port 9200
  index_name staging-logs
</match>

<match development.**>
  @type stdout
</match>

# Route by severity
<match **.critical **.error>
  @type http
  endpoint https://alerting-service.example.com/alerts
  http_method post
  <buffer>
    flush_interval 1s
  </buffer>
</match>

<match **.info **.debug>
  @type file
  path /var/log/fluentd/debug/${tag}
  <buffer tag,time>
    timekey 3600
    timekey_wait 10m
  </buffer>
</match>
```

Tag hierarchies let you route at different levels of granularity. The pattern **.critical matches app.production.critical, system.staging.critical, and any other critical-tagged event.

## Using Copy Plugin for Fan-Out

The copy plugin duplicates events to multiple outputs without reprocessing:

```ruby
<match application.**>
  @type copy

  # Store in Elasticsearch for analysis
  <store>
    @type elasticsearch
    host elasticsearch.example.com
    port 9200
    index_name application-logs

    <buffer>
      flush_interval 10s
    </buffer>
  </store>

  # Archive to S3 for compliance
  <store>
    @type s3
    aws_key_id YOUR_AWS_KEY_ID
    aws_sec_key YOUR_AWS_SECRET_KEY
    s3_bucket application-logs-archive
    s3_region us-east-1
    path logs/
    time_slice_format %Y%m%d

    <buffer time>
      timekey 3600
      timekey_wait 10m
    </buffer>
  </store>

  # Send to Kafka for real-time processing
  <store>
    @type kafka2
    brokers kafka1.example.com:9092,kafka2.example.com:9092
    default_topic application-events
    <format>
      @type json
    </format>
  </store>

  # Keep copy plugin efficient with ignore_error
  <store ignore_error>
    @type stdout
  </store>
</match>
```

The copy plugin sends the same event to all three destinations. If one destination fails, the others continue processing.

## Conditional Routing with Rewrite Tag Filter

Use rewrite_tag_filter to add routing tags based on log content:

```ruby
# Parse and tag based on log level
<match application.**>
  @type rewrite_tag_filter
  <rule>
    key level
    pattern /^ERROR$/
    tag ${tag}.error
  </rule>
  <rule>
    key level
    pattern /^WARN$/
    tag ${tag}.warning
  </rule>
  <rule>
    key level
    pattern /^INFO$/
    tag ${tag}.info
  </rule>
</match>

# Route retagged logs
<match application.**.error>
  @type copy
  <store>
    @type elasticsearch
    host elasticsearch.example.com
    index_name error-logs
  </store>
  <store>
    @type pagerduty
    service_key YOUR_PAGERDUTY_KEY
  </store>
</match>

<match application.**.warning>
  @type elasticsearch
  host elasticsearch.example.com
  index_name warning-logs
</match>

<match application.**.info>
  @type elasticsearch
  host elasticsearch.example.com
  index_name info-logs
</match>
```

Events get retagged based on their level field, then routed to appropriate destinations. Errors trigger PagerDuty alerts while info logs go only to Elasticsearch.

## Output Plugin Configuration Patterns

Elasticsearch output with time-based indices:

```ruby
<match logs.**>
  @type elasticsearch
  host elasticsearch-cluster.example.com
  port 9200

  # Dynamic index naming
  logstash_format true
  logstash_prefix ${tag}
  logstash_dateformat %Y.%m.%d

  # Index management
  template_name log_template
  template_file /etc/fluentd/templates/log_template.json

  # Performance tuning
  request_timeout 15s
  reload_connections false
  reconnect_on_error true

  <buffer tag,time>
    @type file
    path /var/log/fluentd/buffer/elasticsearch
    timekey 60
    flush_interval 10s
    chunk_limit_size 5M
  </buffer>
</match>
```

S3 output for long-term archival:

```ruby
<match archive.**>
  @type s3
  aws_key_id YOUR_AWS_KEY
  aws_sec_key YOUR_AWS_SECRET
  s3_bucket log-archives
  s3_region us-west-2

  # Organize by date and tag
  path logs/%Y/%m/%d/${tag}/
  s3_object_key_format %{path}%{time_slice}_%{index}.%{file_extension}
  time_slice_format %Y%m%d%H

  # Compression
  store_as gzip

  # Buffer large chunks for efficiency
  <buffer tag,time>
    @type file
    path /var/log/fluentd/buffer/s3
    timekey 3600
    timekey_wait 10m
    chunk_limit_size 256m
  </buffer>

  # Format as JSON lines
  <format>
    @type json
  </format>
</match>
```

Kafka output for event streaming:

```ruby
<match events.**>
  @type kafka2

  # Kafka cluster configuration
  brokers kafka1.example.com:9092,kafka2.example.com:9092,kafka3.example.com:9092

  # Topic routing
  topic_key topic
  default_topic application-events

  # Kafka producer settings
  required_acks 1
  compression_codec snappy
  max_send_retries 3

  # Buffer configuration
  <buffer topic>
    @type file
    path /var/log/fluentd/buffer/kafka
    flush_interval 5s
    chunk_limit_size 10M
  </buffer>

  # Message format
  <format>
    @type json
  </format>
</match>
```

HTTP output for webhooks and APIs:

```ruby
<match webhooks.**>
  @type http
  endpoint https://api.example.com/logs
  http_method post

  # Authentication
  headers {"Authorization":"Bearer YOUR_TOKEN"}

  # Retry configuration
  retryable_response_codes [503]
  <secondary>
    @type file
    path /var/log/fluentd/failed/http
  </secondary>

  # Serialization
  <format>
    @type json
  </format>

  <buffer>
    flush_interval 5s
    chunk_limit_size 1M
  </buffer>
</match>
```

## Routing Based on Record Content

Use record_transformer and routing to filter by content:

```ruby
# Tag high-value transactions
<filter transactions.**>
  @type record_transformer
  enable_ruby true
  <record>
    high_value ${record["amount"].to_f > 10000}
  </record>
</filter>

<match transactions.**>
  @type rewrite_tag_filter
  <rule>
    key high_value
    pattern /^true$/
    tag ${tag}.high_value
  </rule>
</match>

# Route high-value transactions to special processing
<match transactions.**.high_value>
  @type copy
  <store>
    @type elasticsearch
    host elasticsearch.example.com
    index_name high-value-transactions
  </store>
  <store>
    @type http
    endpoint https://fraud-detection.example.com/check
  </store>
</match>
```

This pattern analyzes record content, adds routing metadata, retags events, and routes to specialized outputs.

## Implementing Fallback Outputs

Configure secondary outputs for fault tolerance:

```ruby
<match critical.**>
  @type elasticsearch
  host primary-elasticsearch.example.com
  port 9200

  <buffer>
    flush_interval 10s
    retry_max_interval 30s
    retry_timeout 1h
  </buffer>

  # Fallback to secondary cluster
  <secondary>
    @type elasticsearch
    host secondary-elasticsearch.example.com
    port 9200
  </secondary>
</match>
```

If the primary Elasticsearch cluster becomes unavailable, Fluentd automatically routes to the secondary cluster.

Multiple fallback levels:

```ruby
<match important.**>
  @type elasticsearch
  host elasticsearch.example.com

  <buffer>
    retry_timeout 30m
  </buffer>

  # First fallback: write to file
  <secondary>
    @type file
    path /var/log/fluentd/failed/important
    <buffer>
      flush_interval 60s
    </buffer>

    # Second fallback: stdout
    <secondary>
      @type stdout
    </secondary>
  </secondary>
</match>
```

This creates a three-tier fallback chain ensuring logs never get lost.

## Performance Considerations

Optimize buffer settings for multiple outputs:

```ruby
<match high-throughput.**>
  @type copy

  <store>
    @type elasticsearch
    host elasticsearch.example.com

    <buffer>
      @type file
      path /var/log/fluentd/buffer/es
      chunk_limit_size 5M
      flush_interval 10s
      flush_thread_count 8
      overflow_action drop_oldest_chunk
    </buffer>
  </store>

  <store>
    @type kafka2
    brokers kafka.example.com:9092

    <buffer>
      @type memory
      chunk_limit_size 1M
      flush_interval 5s
      flush_thread_count 4
    </buffer>
  </store>
</match>
```

Different outputs may benefit from different buffer types and sizes. Elasticsearch handles larger batches well, while Kafka benefits from frequent smaller flushes.

## Monitoring Output Health

Track output plugin performance:

```ruby
# Enable monitoring
<source>
  @type monitor_agent
  bind 0.0.0.0
  port 24220
</source>
```

Query output metrics:

```bash
# Check buffer queue lengths
curl http://localhost:24220/api/plugins.json | \
  jq '.plugins[] | select(.type=="elasticsearch") | {plugin_id, buffer_queue_length, retry_count}'

# Monitor output errors
curl http://localhost:24220/api/plugins.json | \
  jq '.plugins[] | select(.emit_count > 0) | {type, emit_count, emit_records, num_errors}'
```

Alert on output failures using Prometheus:

```ruby
<source>
  @type prometheus
  bind 0.0.0.0
  port 24231
  metrics_path /metrics
</source>

<source>
  @type prometheus_output_monitor
  interval 10
</source>
```

## Conclusion

Fluentd's output routing capabilities create sophisticated log processing pipelines from simple configuration. By combining tag patterns, copy plugins, conditional routing, and fallback strategies, you build resilient systems that deliver logs to the right destinations at the right time. Start with basic tag-based routing, add copy plugins for redundancy, and implement conditional logic as your requirements grow. The flexibility of output routing means you can adapt your logging infrastructure to new requirements without changing log collection.
