# How to Parse Logs with Logstash

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Logstash, Log Parsing, Grok, ELK Stack, Data Pipeline, Log Processing

Description: A comprehensive guide to parsing logs with Logstash, covering Grok patterns, filter plugins, multiline handling, and advanced transformation techniques.

---

Logstash is a powerful data processing pipeline that ingests, transforms, and outputs data. This guide focuses on parsing logs with Logstash using Grok patterns and various filter plugins to structure unstructured log data.

## Installing Logstash

### Debian/Ubuntu

```bash
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo gpg --dearmor -o /usr/share/keyrings/elasticsearch-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/elasticsearch-keyring.gpg] https://artifacts.elastic.co/packages/8.x/apt stable main" | sudo tee /etc/apt/sources.list.d/elastic-8.x.list
sudo apt update && sudo apt install logstash
```

### Docker

```bash
docker run -d \
  --name logstash \
  -v $(pwd)/pipeline:/usr/share/logstash/pipeline \
  -v $(pwd)/config:/usr/share/logstash/config \
  docker.elastic.co/logstash/logstash:8.11.0
```

## Basic Pipeline Structure

```ruby
# /etc/logstash/conf.d/pipeline.conf
input {
  # Data sources
}

filter {
  # Data transformation
}

output {
  # Data destinations
}
```

## Input Plugins

### Beats Input

```ruby
input {
  beats {
    port => 5044
    ssl => true
    ssl_certificate => "/etc/logstash/certs/logstash.crt"
    ssl_key => "/etc/logstash/certs/logstash.key"
    ssl_certificate_authorities => ["/etc/logstash/certs/ca.crt"]
  }
}
```

### File Input

```ruby
input {
  file {
    path => "/var/log/nginx/access.log"
    start_position => "beginning"
    sincedb_path => "/var/lib/logstash/sincedb_nginx"
    codec => "plain"
    type => "nginx-access"
  }
}
```

### TCP/UDP Input

```ruby
input {
  tcp {
    port => 5000
    codec => json_lines
  }

  udp {
    port => 5001
    codec => json
  }
}
```

### Kafka Input

```ruby
input {
  kafka {
    bootstrap_servers => "kafka1:9092,kafka2:9092"
    topics => ["logs"]
    group_id => "logstash-consumers"
    codec => json
    auto_offset_reset => "latest"
  }
}
```

## Grok Pattern Basics

### Common Built-in Patterns

| Pattern | Description | Example Match |
|---------|-------------|---------------|
| %{WORD} | Word characters | hello |
| %{NUMBER} | Integer or float | 123.45 |
| %{INT} | Integer | 123 |
| %{IP} | IPv4 or IPv6 | 192.168.1.1 |
| %{HOSTNAME} | Hostname | server.example.com |
| %{TIMESTAMP_ISO8601} | ISO timestamp | 2024-01-21T10:30:00Z |
| %{LOGLEVEL} | Log level | ERROR, INFO |
| %{GREEDYDATA} | Everything remaining | any text here |

### Basic Grok Filter

```ruby
filter {
  grok {
    match => { "message" => "%{TIMESTAMP_ISO8601:timestamp} %{LOGLEVEL:level} %{GREEDYDATA:log_message}" }
  }
}
```

### Multiple Patterns

```ruby
filter {
  grok {
    match => {
      "message" => [
        "%{TIMESTAMP_ISO8601:timestamp} %{LOGLEVEL:level} \[%{DATA:service}\] %{GREEDYDATA:log_message}",
        "%{TIMESTAMP_ISO8601:timestamp} %{LOGLEVEL:level} %{GREEDYDATA:log_message}"
      ]
    }
  }
}
```

## Common Log Formats

### Apache/Nginx Access Logs

```ruby
filter {
  grok {
    match => {
      "message" => "%{COMBINEDAPACHELOG}"
    }
  }

  # Parse timestamp
  date {
    match => [ "timestamp", "dd/MMM/yyyy:HH:mm:ss Z" ]
    target => "@timestamp"
    remove_field => ["timestamp"]
  }

  # GeoIP lookup
  geoip {
    source => "clientip"
    target => "geoip"
  }

  # User agent parsing
  useragent {
    source => "agent"
    target => "user_agent"
  }

  # Convert types
  mutate {
    convert => {
      "bytes" => "integer"
      "response" => "integer"
    }
  }
}
```

### Syslog Format

```ruby
filter {
  grok {
    match => {
      "message" => "%{SYSLOGTIMESTAMP:syslog_timestamp} %{SYSLOGHOST:syslog_hostname} %{DATA:syslog_program}(?:\[%{POSINT:syslog_pid}\])?: %{GREEDYDATA:syslog_message}"
    }
  }

  date {
    match => [ "syslog_timestamp", "MMM  d HH:mm:ss", "MMM dd HH:mm:ss" ]
    target => "@timestamp"
  }
}
```

### JSON Logs

```ruby
filter {
  json {
    source => "message"
    target => "parsed"
  }

  mutate {
    rename => {
      "[parsed][timestamp]" => "log_timestamp"
      "[parsed][level]" => "level"
      "[parsed][message]" => "log_message"
    }
    remove_field => ["message", "parsed"]
  }

  date {
    match => [ "log_timestamp", "ISO8601", "UNIX_MS" ]
    target => "@timestamp"
    remove_field => ["log_timestamp"]
  }
}
```

### Java/Spring Boot Logs

```ruby
filter {
  # Handle multiline
  multiline {
    pattern => "^%{TIMESTAMP_ISO8601}"
    negate => true
    what => "previous"
  }

  grok {
    match => {
      "message" => "%{TIMESTAMP_ISO8601:timestamp}\s+%{LOGLEVEL:level}\s+%{NUMBER:pid}\s+---\s+\[%{DATA:thread}\]\s+%{DATA:logger}\s+:\s+%{GREEDYDATA:log_message}"
    }
  }

  # Extract exception info
  if [log_message] =~ "Exception" or [log_message] =~ "Error" {
    grok {
      match => {
        "log_message" => "(?<exception_class>[a-zA-Z.]+Exception|[a-zA-Z.]+Error):\s*%{GREEDYDATA:exception_message}"
      }
      add_tag => ["exception"]
    }
  }

  date {
    match => [ "timestamp", "yyyy-MM-dd HH:mm:ss.SSS", "ISO8601" ]
    target => "@timestamp"
  }
}
```

### Python Logs

```ruby
filter {
  grok {
    match => {
      "message" => "%{TIMESTAMP_ISO8601:timestamp} - %{DATA:logger} - %{LOGLEVEL:level} - %{GREEDYDATA:log_message}"
    }
  }

  # Handle tracebacks
  if [log_message] =~ "Traceback" {
    mutate {
      add_tag => ["traceback"]
    }
  }
}
```

### Nginx Error Logs

```ruby
filter {
  grok {
    match => {
      "message" => "%{DATESTAMP:timestamp} \[%{LOGLEVEL:level}\] %{POSINT:pid}#%{NUMBER:tid}: (\*%{NUMBER:connection_id} )?%{GREEDYDATA:error_message}"
    }
  }

  date {
    match => [ "timestamp", "yyyy/MM/dd HH:mm:ss" ]
    target => "@timestamp"
  }
}
```

## Custom Grok Patterns

### Define Custom Patterns

Create `/etc/logstash/patterns/custom`:

```
# Custom patterns
APP_TIMESTAMP %{YEAR}-%{MONTHNUM}-%{MONTHDAY}[T ]%{HOUR}:%{MINUTE}:%{SECOND}(?:\.%{INT})?(?:Z|%{ISO8601_TIMEZONE})?
APP_LOGLEVEL (?:DEBUG|INFO|WARN(?:ING)?|ERROR|FATAL|TRACE)
REQUEST_ID [a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}
RESPONSE_TIME %{NUMBER:response_time_ms}ms
```

Use custom patterns:

```ruby
filter {
  grok {
    patterns_dir => ["/etc/logstash/patterns"]
    match => {
      "message" => "%{APP_TIMESTAMP:timestamp} %{APP_LOGLEVEL:level} \[%{REQUEST_ID:request_id}\] %{GREEDYDATA:log_message} - %{RESPONSE_TIME}"
    }
  }
}
```

### Inline Pattern Definition

```ruby
filter {
  grok {
    pattern_definitions => {
      "APP_VERSION" => "\d+\.\d+\.\d+"
      "SERVICE_NAME" => "[a-z]+-[a-z]+"
    }
    match => {
      "message" => "%{SERVICE_NAME:service}@%{APP_VERSION:version}: %{GREEDYDATA:log_message}"
    }
  }
}
```

## Filter Plugins

### Mutate Filter

```ruby
filter {
  mutate {
    # Rename fields
    rename => { "hostname" => "host.name" }

    # Remove fields
    remove_field => ["beat", "input_type", "offset"]

    # Add fields
    add_field => { "environment" => "production" }

    # Convert types
    convert => {
      "response_time" => "float"
      "status_code" => "integer"
    }

    # String operations
    lowercase => ["level"]
    uppercase => ["country_code"]
    strip => ["message"]
    gsub => [
      "message", "\r\n", "\n",
      "user_agent", "Mozilla/5.0", "Mozilla"
    ]

    # Split string to array
    split => { "tags" => "," }

    # Merge fields
    merge => { "all_ips" => "client_ip" }
  }
}
```

### Date Filter

```ruby
filter {
  date {
    match => [
      "timestamp",
      "ISO8601",
      "yyyy-MM-dd HH:mm:ss",
      "yyyy-MM-dd HH:mm:ss.SSS",
      "dd/MMM/yyyy:HH:mm:ss Z",
      "UNIX",
      "UNIX_MS"
    ]
    target => "@timestamp"
    timezone => "UTC"
    remove_field => ["timestamp"]
  }
}
```

### Conditional Processing

```ruby
filter {
  if [type] == "nginx-access" {
    grok {
      match => { "message" => "%{COMBINEDAPACHELOG}" }
    }
  } else if [type] == "syslog" {
    grok {
      match => { "message" => "%{SYSLOGLINE}" }
    }
  }

  if [level] in ["ERROR", "FATAL", "CRITICAL"] {
    mutate {
      add_tag => ["alert"]
      add_field => { "priority" => "high" }
    }
  }

  if [response] and [response] >= 500 {
    mutate {
      add_tag => ["server_error"]
    }
  }

  if [message] =~ /(?i)password|secret|token/ {
    mutate {
      add_tag => ["sensitive"]
    }
  }
}
```

### Drop Filter

```ruby
filter {
  if [message] =~ /healthcheck/ or [path] == "/health" {
    drop { }
  }

  if [level] == "DEBUG" and [environment] == "production" {
    drop { }
  }
}
```

### Clone Filter

```ruby
filter {
  clone {
    clones => ["cloned_event"]
    add_tag => ["cloned"]
  }

  if "cloned" in [tags] {
    mutate {
      update => { "index_name" => "logs-archive" }
    }
  }
}
```

### Aggregate Filter

```ruby
filter {
  # Aggregate multi-line transactions
  if [transaction_id] {
    aggregate {
      task_id => "%{transaction_id}"
      code => "
        map['lines'] ||= []
        map['lines'] << event.get('message')
        map['start_time'] ||= event.get('@timestamp')
      "
      push_map_as_event_on_timeout => true
      timeout => 30
      timeout_code => "
        event.set('transaction_duration',
          (event.get('@timestamp') - map['start_time']).to_f
        )
        event.set('full_log', map['lines'].join('\n'))
      "
    }
  }
}
```

### Ruby Filter

```ruby
filter {
  ruby {
    code => "
      # Custom processing
      message = event.get('message')

      if message
        # Extract key-value pairs
        kvs = message.scan(/(\w+)=([^\s]+)/)
        kvs.each do |k, v|
          event.set(k, v)
        end

        # Calculate derived field
        if event.get('bytes_sent') and event.get('duration')
          throughput = event.get('bytes_sent').to_f / event.get('duration').to_f
          event.set('throughput_bps', throughput)
        end
      end
    "
  }
}
```

### Dissect Filter

For simpler, faster parsing than Grok:

```ruby
filter {
  dissect {
    mapping => {
      "message" => "%{timestamp} %{+timestamp} %{level} [%{service}] %{log_message}"
    }
  }
}
```

### KV Filter

Parse key-value pairs:

```ruby
filter {
  kv {
    source => "message"
    field_split => " "
    value_split => "="
    target => "parsed"
    include_keys => ["user", "action", "status", "duration"]
  }
}
```

## GeoIP Enrichment

```ruby
filter {
  if [client_ip] {
    geoip {
      source => "client_ip"
      target => "geoip"
      database => "/etc/logstash/GeoLite2-City.mmdb"
      add_field => {
        "[geoip][coordinates]" => "%{[geoip][longitude]},%{[geoip][latitude]}"
      }
    }
  }
}
```

## DNS Lookup

```ruby
filter {
  dns {
    reverse => ["client_ip"]
    action => "replace"
    hit_cache_size => 10000
    hit_cache_ttl => 300
    failed_cache_size => 1000
    failed_cache_ttl => 60
  }
}
```

## Output Plugins

### Elasticsearch Output

```ruby
output {
  elasticsearch {
    hosts => ["https://es1:9200", "https://es2:9200"]
    user => "logstash_internal"
    password => "${ES_PASSWORD}"
    ssl => true
    cacert => "/etc/logstash/certs/ca.crt"

    # Dynamic index
    index => "logs-%{[service]}-%{+YYYY.MM.dd}"

    # Ingest pipeline
    pipeline => "logs-enrich-pipeline"

    # Document routing
    routing => "%{[tenant_id]}"

    # Performance
    bulk_max_size => 1000
    flush_size => 500
  }
}
```

### Multiple Outputs

```ruby
output {
  # Primary output
  elasticsearch {
    hosts => ["https://elasticsearch:9200"]
    index => "logs-%{+YYYY.MM.dd}"
  }

  # Archive to S3
  s3 {
    access_key_id => "${AWS_ACCESS_KEY}"
    secret_access_key => "${AWS_SECRET_KEY}"
    region => "us-east-1"
    bucket => "logs-archive"
    prefix => "logs/%{+YYYY}/%{+MM}/%{+dd}/"
    time_file => 15
    codec => "json_lines"
  }

  # Alerts to webhook
  if "alert" in [tags] {
    http {
      url => "https://alerts.example.com/webhook"
      http_method => "post"
      format => "json"
    }
  }

  # Debug output
  if [environment] == "development" {
    stdout {
      codec => rubydebug
    }
  }
}
```

## Pipeline Configuration

### pipelines.yml

```yaml
# /etc/logstash/pipelines.yml
- pipeline.id: nginx-logs
  path.config: "/etc/logstash/conf.d/nginx.conf"
  pipeline.workers: 4
  pipeline.batch.size: 1000

- pipeline.id: app-logs
  path.config: "/etc/logstash/conf.d/application.conf"
  pipeline.workers: 2
  pipeline.batch.size: 500

- pipeline.id: syslog
  path.config: "/etc/logstash/conf.d/syslog.conf"
  pipeline.workers: 2
```

### Performance Tuning

```yaml
# /etc/logstash/logstash.yml
pipeline.workers: 4
pipeline.batch.size: 1000
pipeline.batch.delay: 50

# Queue settings
queue.type: persisted
queue.max_bytes: 4gb
queue.checkpoint.writes: 1024
```

## Testing Grok Patterns

### Grok Debugger

Use Kibana's Grok Debugger or online tools:

```
Sample log: 2024-01-21 10:30:00 ERROR [user-service] Failed to process request

Pattern: %{TIMESTAMP_ISO8601:timestamp} %{LOGLEVEL:level} \[%{DATA:service}\] %{GREEDYDATA:message}
```

### Local Testing

```bash
# Test configuration
/usr/share/logstash/bin/logstash --config.test_and_exit -f /etc/logstash/conf.d/

# Test with sample data
echo '2024-01-21 10:30:00 ERROR [service] Test message' | /usr/share/logstash/bin/logstash -f test.conf
```

## Summary

Logstash provides powerful log parsing capabilities:

1. **Grok patterns** - Parse unstructured logs into structured fields
2. **Filter plugins** - Transform, enrich, and route data
3. **Conditional processing** - Apply different logic based on content
4. **Multiple outputs** - Send data to various destinations
5. **Pipeline management** - Run multiple pipelines efficiently

With proper Grok patterns and filters, you can transform any log format into structured data suitable for analysis in Elasticsearch.
