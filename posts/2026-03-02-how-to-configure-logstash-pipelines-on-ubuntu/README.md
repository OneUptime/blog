# How to Configure Logstash Pipelines on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Logstash, ELK Stack, Log Management, DevOps

Description: Learn how to configure Logstash pipelines on Ubuntu to collect, parse, transform, and route log data from multiple sources to Elasticsearch and other outputs.

---

Logstash is the data processing pipeline component in the Elastic Stack (ELK). It ingests data from multiple sources simultaneously, transforms it, and sends it to your chosen destination. A Logstash pipeline consists of three stages: input (where data comes from), filter (how to transform it), and output (where it goes).

This guide focuses on writing practical Logstash pipeline configurations for common real-world scenarios: processing Nginx access logs, application JSON logs, and syslog data.

## Prerequisites

- Ubuntu 22.04 or 24.04
- Java 11 or 17 (Logstash bundles its own JVM, but it helps to have one available)
- At least 2 GB RAM (4 GB recommended - Logstash is memory-hungry)
- Elasticsearch running (for output)

## Installing Logstash

```bash
# Add Elastic repository (same key as Elasticsearch)
curl -fsSL https://artifacts.elastic.co/GPG-KEY-elasticsearch | \
  sudo gpg --dearmor -o /usr/share/keyrings/elastic-archive-keyring.gpg

echo "deb [signed-by=/usr/share/keyrings/elastic-archive-keyring.gpg] \
  https://artifacts.elastic.co/packages/8.x/apt stable main" | \
  sudo tee /etc/apt/sources.list.d/elastic-8.x.list

sudo apt update
sudo apt install -y logstash

# Enable and start the service
sudo systemctl enable logstash
sudo systemctl start logstash
```

## Logstash Directory Structure

```text
/etc/logstash/
  logstash.yml          - Main Logstash configuration
  pipelines.yml         - Defines which pipeline config files to load
  conf.d/               - Pipeline configuration files (*.conf)
/var/log/logstash/      - Log files
/var/lib/logstash/      - Data directory (queue, dead letters)
```

## Main Configuration

```bash
sudo nano /etc/logstash/logstash.yml
```

```yaml
# /etc/logstash/logstash.yml

# Bind the HTTP API (for stats and monitoring)
http.host: "127.0.0.1"
http.port: 9600

# Path to pipeline configuration
path.config: /etc/logstash/conf.d

# Pipeline settings
pipeline.workers: 2           # Number of worker threads per pipeline
pipeline.batch.size: 125      # Number of events per batch
pipeline.batch.delay: 50      # Max wait time (ms) to fill a batch

# Queue type: memory or persisted (persisted survives restarts)
queue.type: persisted
queue.max_bytes: 1gb          # Max queue size on disk

path.queue: /var/lib/logstash/queue

# Dead letter queue (captures events that fail to be written)
dead_letter_queue.enable: true
path.dead_letter_queue: /var/lib/logstash/dead_letter_queue

# Log level
log.level: info
```

## Pipeline 1: Nginx Access Log Processing

Create a pipeline for Nginx access logs:

```bash
sudo nano /etc/logstash/conf.d/nginx-logs.conf
```

```ruby
# /etc/logstash/conf.d/nginx-logs.conf

input {
  # Read from Nginx log file
  file {
    # Path to the Nginx access log
    path => "/var/log/nginx/access.log"
    # Start from the beginning when first run, otherwise from the end
    start_position => "beginning"
    # Tag events from this input for routing
    tags => ["nginx"]
    # Unique ID for this input
    id => "nginx_access_log"
  }

  # Also accept from Beats (if using Filebeat to ship logs)
  beats {
    port => 5044
    ssl_enabled => false
    id => "beats_input"
  }
}

filter {
  # Only process Nginx-tagged events in this filter block
  if "nginx" in [tags] {

    # Parse the Nginx combined log format
    grok {
      match => {
        "message" => '%{IPORHOST:client_ip} - %{USERNAME:auth_user} \[%{HTTPDATE:request_time}\] "%{WORD:http_method} %{URIPATHPARAM:request_path} HTTP/%{NUMBER:http_version}" %{NUMBER:response_code:int} %{NUMBER:bytes_sent:int} "%{URI:referrer}" "%{GREEDYDATA:user_agent}"'
      }
      # If parsing fails, add a tag
      tag_on_failure => ["_grokparsefailure_nginx"]
    }

    # Parse the timestamp to a proper date field
    date {
      match => ["request_time", "dd/MMM/yyyy:HH:mm:ss Z"]
      target => "@timestamp"
    }

    # Parse the URL to extract query parameters
    urldecode { field => "request_path" }

    # Look up the user's geographic location from their IP
    geoip {
      source => "client_ip"
      target => "geoip"
      # Optional: specify a local GeoIP database
      # database => "/usr/share/GeoIP/GeoLite2-City.mmdb"
    }

    # Parse the user agent string
    useragent {
      source => "user_agent"
      target => "ua"
    }

    # Add a field indicating if this was an error response
    if [response_code] >= 400 {
      mutate {
        add_field => { "is_error" => true }
        add_tag => ["http_error"]
      }
    }

    # Remove the original message field once parsed
    mutate {
      remove_field => ["message", "request_time"]
      convert => {
        "response_code" => "integer"
        "bytes_sent" => "integer"
      }
    }
  }
}

output {
  # Send parsed Nginx logs to Elasticsearch
  if "nginx" in [tags] {
    elasticsearch {
      hosts => ["https://localhost:9200"]
      # Use the username and password from Elasticsearch setup
      user => "elastic"
      password => "your-elasticsearch-password"
      ssl_enabled => true
      ssl_certificate_authorities => ["/etc/elasticsearch/certs/http_ca.crt"]
      # Dynamic index name based on date
      index => "nginx-logs-%{+yyyy.MM.dd}"
      # Template to define index mappings
      # template_name => "nginx-logs"
    }
  }

  # Debug: print events to stdout during development
  # stdout { codec => rubydebug }
}
```

## Pipeline 2: Application JSON Logs

```bash
sudo nano /etc/logstash/conf.d/app-logs.conf
```

```ruby
# /etc/logstash/conf.d/app-logs.conf

input {
  # Read from an application's JSON log file
  file {
    path => "/var/log/myapp/*.log"
    codec => "json"   # Parse each line as JSON automatically
    tags => ["application"]
    id => "app_log_file"
  }

  # Accept logs via TCP (for apps that ship logs directly)
  tcp {
    port => 5000
    codec => json_lines
    tags => ["tcp_application"]
    id => "tcp_app_input"
  }
}

filter {
  if "application" in [tags] or "tcp_application" in [tags] {

    # Extract the timestamp from the application's timestamp field
    # (Your app likely logs a field called "timestamp" or "ts")
    if [timestamp] {
      date {
        match => ["timestamp", "ISO8601", "yyyy-MM-dd'T'HH:mm:ss.SSSZ"]
        target => "@timestamp"
      }
      mutate { remove_field => ["timestamp"] }
    }

    # Normalize log level field name
    if [level] {
      mutate {
        rename => { "level" => "log_level" }
        uppercase => [ "log_level" ]
      }
    }

    # Add environment tag based on the path
    if "/var/log/myapp/production" in [log][file][path] {
      mutate { add_field => { "environment" => "production" } }
    } else {
      mutate { add_field => { "environment" => "development" } }
    }

    # Parse the stack trace if present
    if [stack_trace] {
      mutate {
        # Limit stack trace length
        truncate => { "stack_trace" => 2000 }
      }
    }
  }
}

output {
  if "application" in [tags] or "tcp_application" in [tags] {
    elasticsearch {
      hosts => ["https://localhost:9200"]
      user => "elastic"
      password => "your-elasticsearch-password"
      ssl_enabled => true
      ssl_certificate_authorities => ["/etc/elasticsearch/certs/http_ca.crt"]
      index => "app-logs-%{+yyyy.MM}"
    }
  }
}
```

## Pipeline 3: Syslog

```bash
sudo nano /etc/logstash/conf.d/syslog.conf
```

```ruby
# /etc/logstash/conf.d/syslog.conf

input {
  # Listen for syslog messages on UDP and TCP
  syslog {
    port => 5514
    tags => ["syslog"]
    id => "syslog_input"
  }

  # Also read the local syslog file
  file {
    path => ["/var/log/syslog", "/var/log/auth.log"]
    tags => ["local_syslog"]
    start_position => "beginning"
    id => "local_syslog_input"
  }
}

filter {
  if "syslog" in [tags] or "local_syslog" in [tags] {

    # Parse standard syslog format for local files
    if "local_syslog" in [tags] {
      grok {
        match => {
          "message" => "%{SYSLOGTIMESTAMP:syslog_timestamp} %{SYSLOGHOST:syslog_host} %{DATA:syslog_program}(?:\[%{POSINT:syslog_pid}\])?: %{GREEDYDATA:syslog_message}"
        }
      }

      date {
        match => ["syslog_timestamp", "MMM  d HH:mm:ss", "MMM dd HH:mm:ss"]
        target => "@timestamp"
      }
    }

    # Detect failed SSH logins
    if "Failed password" in [syslog_message] or "Failed password" in [message] {
      mutate {
        add_tag => ["ssh_failed_login"]
        add_field => { "alert_type" => "failed_ssh_login" }
      }
    }

    # Detect successful sudo usage
    if "COMMAND=" in [syslog_message] {
      mutate {
        add_tag => ["sudo_command"]
      }
    }
  }
}

output {
  if "syslog" in [tags] or "local_syslog" in [tags] {
    elasticsearch {
      hosts => ["https://localhost:9200"]
      user => "elastic"
      password => "your-elasticsearch-password"
      ssl_enabled => true
      ssl_certificate_authorities => ["/etc/elasticsearch/certs/http_ca.crt"]
      index => "syslog-%{+yyyy.MM.dd}"
    }
  }

  # Send security alerts to a separate index
  if "ssh_failed_login" in [tags] {
    elasticsearch {
      hosts => ["https://localhost:9200"]
      user => "elastic"
      password => "your-elasticsearch-password"
      ssl_enabled => true
      ssl_certificate_authorities => ["/etc/elasticsearch/certs/http_ca.crt"]
      index => "security-alerts-%{+yyyy.MM.dd}"
    }
  }
}
```

## Testing Pipeline Configuration

```bash
# Test configuration syntax without running
sudo -u logstash /usr/share/logstash/bin/logstash \
  --path.settings /etc/logstash \
  -t   # -t = test config and exit

# Run a specific config file manually for testing
echo "test message" | sudo /usr/share/logstash/bin/logstash \
  -e 'input { stdin {} } output { stdout { codec => rubydebug } }'
```

## Viewing Logs and Stats

```bash
# View Logstash logs
sudo tail -f /var/log/logstash/logstash-plain.log

# Check pipeline stats via the monitoring API
curl http://localhost:9600/_node/stats/pipelines | python3 -m json.tool

# Check if Logstash is processing events
curl http://localhost:9600/_node/stats | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print('Events in:', d['events']['in'], 'Events out:', d['events']['out'])"
```

Monitor Logstash's event throughput and error rates with [OneUptime](https://oneuptime.com) to ensure your log pipeline stays healthy and processing events without growing backlogs.
