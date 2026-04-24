# How to Deploy Logstash via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Logstash, ELK Stack, Log Processing, Self-Hosted

Description: Deploy Logstash via Portainer as a data processing pipeline that ingests logs from multiple sources, transforms them, and sends them to Elasticsearch.

## Introduction

Logstash is the data processing pipeline of the Elastic Stack. It ingests data from multiple input sources, applies filters and transformations, and outputs to Elasticsearch or other destinations. This guide deploys Logstash via Portainer with common pipeline configurations.

## Deploy as a Stack

```yaml
version: "3.8"

services:
  logstash:
    image: docker.elastic.co/logstash/logstash:9.3.3
    container_name: logstash
    environment:
      - LS_JAVA_OPTS=-Xmx512m -Xms512m
      - ELASTICSEARCH_HOST=http://elasticsearch:9200
      - ELASTICSEARCH_USER=elastic
      - ELASTICSEARCH_PASSWORD=elastic_password
    volumes:
      # Pipeline configuration files
      - ./pipeline:/usr/share/logstash/pipeline:ro
      # Main Logstash settings
      - ./logstash.yml:/usr/share/logstash/config/logstash.yml:ro
      # Multiple pipeline definitions
      - ./pipelines.yml:/usr/share/logstash/config/pipelines.yml:ro
      # Optional custom patterns for grok filters
      - ./patterns:/usr/share/logstash/patterns:ro
    ports:
      - "5044:5044"    # Beats input
      - "5000:5000/tcp" # Syslog input (TCP)
      - "5000:5000/udp" # Syslog input (UDP)
      - "5001:5001"    # JSON application logs
      - "9600:9600"    # Logstash monitoring API
    networks:
      - elastic-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "curl -s http://localhost:9600/_node/stats | grep -q '\"status\":\"green\"'"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s

networks:
  elastic-network:
    external: true

volumes:
  logstash_data:
```

## Logstash Configuration

Create `logstash.yml`:

```yaml
# logstash.yml

api.http.host: "0.0.0.0"
xpack.monitoring.enabled: false
pipeline.workers: 2
pipeline.batch.size: 125
```

Create `pipelines.yml` so Logstash runs each `.conf` file as a separate pipeline:

```yaml
- pipeline.id: beats
  path.config: "/usr/share/logstash/pipeline/beats.conf"

- pipeline.id: syslog
  path.config: "/usr/share/logstash/pipeline/syslog.conf"

- pipeline.id: json-logs
  path.config: "/usr/share/logstash/pipeline/json-logs.conf"
```

## Pipeline Configurations

### Beats Input Pipeline

Create `pipeline/beats.conf`:

```ruby
# Input: Accept data from Filebeat/Metricbeat
input {
  beats {
    port => 5044
    ssl_enabled => false
  }
}

# Filter: Process nginx access logs
filter {
  if [fields][log_type] == "nginx_access" {
    grok {
      patterns_dir => ["/usr/share/logstash/patterns"]
      match => {
        "message" => '%{COMBINEDAPACHELOG}'
      }
    }
    
    date {
      match => ["timestamp", "dd/MMM/yyyy:HH:mm:ss Z"]
      target => "@timestamp"
    }
    
    mutate {
      convert => { "bytes" => "integer" }
      convert => { "response" => "integer" }
    }
    
    geoip {
      source => "clientip"
      target => "geoip"
    }
  }
}

# Output: Send to Elasticsearch
output {
  elasticsearch {
    hosts => ["${ELASTICSEARCH_HOST}"]
    user => "${ELASTICSEARCH_USER}"
    password => "${ELASTICSEARCH_PASSWORD}"
    index => "nginx-logs-%{+YYYY.MM.dd}"
    ilm_enabled => false
  }
}
```

### Syslog Pipeline

Create `pipeline/syslog.conf`:

```ruby
input {
  syslog {
    port => 5000
    type => "syslog"
  }
}

filter {
  if [type] == "syslog" {
    mutate {
      add_field => { "received_at" => "%{@timestamp}" }
    }
  }
}

output {
  elasticsearch {
    hosts => ["${ELASTICSEARCH_HOST}"]
    user => "${ELASTICSEARCH_USER}"
    password => "${ELASTICSEARCH_PASSWORD}"
    index => "syslog-%{+YYYY.MM.dd}"
    ilm_enabled => false
  }
}
```

### JSON Application Log Pipeline

Create `pipeline/json-logs.conf`:

```ruby
input {
  tcp {
    port => 5001
    codec => json_lines
  }
}

filter {
  # Add processing metadata
  mutate {
    add_field => {
      "[@metadata][index_prefix]" => "app-logs"
    }
  }
  
  # Remove unwanted fields
  mutate {
    remove_field => ["host", "port"]
  }
}

output {
  elasticsearch {
    hosts => ["${ELASTICSEARCH_HOST}"]
    user => "${ELASTICSEARCH_USER}"
    password => "${ELASTICSEARCH_PASSWORD}"
    index => "%{[@metadata][index_prefix]}-%{+YYYY.MM.dd}"
    ilm_enabled => false
  }
  
  # Also log to stdout for debugging
  if [log_level] == "ERROR" {
    stdout {
      codec => rubydebug
    }
  }
}
```

## Monitoring Logstash

```bash
# Check pipeline stats
curl http://localhost:9600/_node/stats/pipelines?pretty

# Check hot threads
curl http://localhost:9600/_node/hot_threads

# Check plugins
curl http://localhost:9600/_node/plugins
```

## Conclusion

Logstash deployed via Portainer provides a flexible data processing pipeline for transforming and routing logs from diverse sources to Elasticsearch. The pipeline-as-configuration approach makes it easy to add new input sources and transformations by updating configuration files without rebuilding the container. The monitoring API provides insight into pipeline performance and throughput.
