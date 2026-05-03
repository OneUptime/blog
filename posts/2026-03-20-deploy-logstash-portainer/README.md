# How to Deploy Logstash via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Logstash, ELK, Log Pipeline, Docker

Description: Learn how to deploy Logstash via Portainer to build log collection pipelines that receive data from various sources and forward it to Elasticsearch.

## Logstash via Portainer Stack

**Stacks → Add Stack → logstash**

```yaml
version: "3.8"

services:
  logstash:
    image: docker.elastic.co/logstash/logstash:8.12.0
    restart: unless-stopped
    environment:
      - "LS_JAVA_OPTS=-Xms512m -Xmx512m"
      - ELASTIC_PASSWORD=${ELASTIC_PASSWORD}
    volumes:
      - ./logstash-pipeline:/usr/share/logstash/pipeline:ro
      - ./logstash-config/logstash.yml:/usr/share/logstash/config/logstash.yml:ro
      - logstash_data:/usr/share/logstash/data
    ports:
      - "5000:5000/tcp"     # TCP JSON input
      - "5000:5000/udp"     # UDP JSON input
      - "5044:5044"         # Beats input (Filebeat)
      - "12201:12201/udp"   # GELF input
      - "9600:9600"         # Logstash monitoring API
    networks:
      - elastic

volumes:
  logstash_data:

networks:
  elastic:
    external: true
```

## Logstash Pipeline Configuration

Create `logstash-pipeline/main.conf`:

```javascript
# Receive logs from Filebeat or Beats agents

input {
  beats {
    port => 5044
  }

  # Accept JSON over TCP/UDP
  tcp {
    port => 5000
    codec => json_lines
  }

  udp {
    port => 5000
    codec => json
  }

  # Receive GELF logs (e.g. from Docker's gelf logging driver)
  gelf {
    port => 12201
  }
}

# Transform and enrich the data
filter {
  # Parse Nginx access logs
  if [fields][service] == "nginx" {
    grok {
      match => {
        "message" => '%{IPORHOST:client_ip} - %{DATA:user_name} \[%{HTTPDATE:access_time}\] "%{WORD:http_method} %{DATA:url} HTTP/%{NUMBER:http_version}" %{NUMBER:response_code} %{NUMBER:body_sent_bytes}'
      }
    }
    date {
      match => ["access_time", "dd/MMM/yyyy:HH:mm:ss Z"]
    }
  }

  # Add geolocation
  if [client_ip] {
    geoip {
      source => "client_ip"
    }
  }

  # Drop health check requests
  if [url] == "/health" {
    drop {}
  }
}

# Send to Elasticsearch
output {
  elasticsearch {
    hosts => ["http://elasticsearch:9200"]
    user => "elastic"
    password => "${ELASTIC_PASSWORD}"
    index => "logs-%{[fields][service]}-%{+YYYY.MM.dd}"
  }

  # Optional: copy to stdout for debugging
  stdout {
    codec => rubydebug
  }
}
```

## Logstash Settings

Create `logstash-config/logstash.yml`:

```yaml
http.host: "0.0.0.0"
monitoring.enabled: false    # Disable legacy X-Pack monitoring collection
path.config: /usr/share/logstash/pipeline
```

## Sending Logs from Applications

```yaml
# Application container sends logs to Logstash
services:
  app:
    image: myapp:latest
    logging:
      driver: "gelf"
      options:
        gelf-address: "udp://logstash:12201"
        tag: "myapp"
```

Or use Docker's Filebeat agent to collect container logs.

## Verifying Logstash

```bash
# Check Logstash API
curl http://localhost:9600/

# Check pipeline stats
curl http://localhost:9600/_node/stats/pipelines?pretty

# Check if events are flowing
curl http://localhost:9600/_node/stats/events?pretty
# Look for: "events_in" and "events_out" counters incrementing
```

## Logstash Performance

```yaml
environment:
  # Adjust heap based on pipeline complexity
  - "LS_JAVA_OPTS=-Xms1g -Xmx1g"

# In logstash.yml
pipeline.workers: 2          # Set to number of CPU cores
pipeline.batch.size: 125     # Events per batch
pipeline.batch.delay: 50     # Max wait time (ms)
```

## Conclusion

Logstash deployed via Portainer is the most flexible log processing component in the ELK stack. Its pipeline configuration (input → filter → output) handles log normalization, enrichment, and routing. For most use cases, pair Logstash with Filebeat agents on your application hosts and Elasticsearch/Kibana in the same Portainer stack.
