# How to Deploy the ELK Stack via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, ELK Stack, Elasticsearch, Logstash, Kibana, Logging, Self-Hosted

Description: Deploy the complete ELK Stack (Elasticsearch, Logstash, and Kibana) via Portainer as a unified log management and analytics platform.

## Introduction

The ELK Stack (Elasticsearch + Logstash + Kibana) is the most popular open-source log management platform. Deploying all three components as a single Portainer stack gives you centralized log ingestion, storage, and visualization in one coherent deployment.

## Prerequisites

- Docker host with at least 6GB RAM
- Portainer installed
- vm.max_map_count set to 1048576

## System Configuration

```bash
sudo sysctl -w vm.max_map_count=1048576
echo 'vm.max_map_count=1048576' | sudo tee /etc/sysctl.d/99-elastic.conf
```

## Deploy the Complete ELK Stack

Before deploying the stack, create the `/opt/elk/logstash/pipeline` directory on the Docker host and save the `main.conf` file from the next section there.

In Portainer, create a stack named `elk-stack`:

```yaml
version: "3.8"

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:9.3.3
    container_name: elasticsearch
    environment:
      - discovery.type=single-node
      - node.name=elasticsearch
      - cluster.name=elk-cluster
      - xpack.security.enabled=true
      - xpack.security.http.ssl.enabled=false
      - ELASTIC_PASSWORD=elastic_password
      - ES_JAVA_OPTS=-Xms1g -Xmx1g
      - bootstrap.memory_lock=false
    volumes:
      - es_data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"
    ulimits:
      memlock:
        soft: -1
        hard: -1
    networks:
      - elk-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "curl -s -u elastic:elastic_password http://localhost:9200 | grep -q cluster_name"]
      interval: 20s
      timeout: 10s
      retries: 10
      start_period: 60s

  logstash:
    image: docker.elastic.co/logstash/logstash:9.3.3
    container_name: logstash
    environment:
      - LS_JAVA_OPTS=-Xmx512m -Xms512m
    volumes:
      - /opt/elk/logstash/pipeline:/usr/share/logstash/pipeline:ro
    ports:
      - "5044:5044"
      - "5000:5000/udp"
      - "9600:9600"
    networks:
      - elk-network
    depends_on:
      elasticsearch:
        condition: service_healthy
    restart: unless-stopped

  kibana:
    image: docker.elastic.co/kibana/kibana:9.3.3
    container_name: kibana
    environment:
      ELASTICSEARCH_HOSTS: '["http://elasticsearch:9200"]'
      ELASTICSEARCH_USERNAME: kibana_system
      ELASTICSEARCH_PASSWORD: kibana_system_password
    volumes:
      - kibana_data:/usr/share/kibana/data
    ports:
      - "5601:5601"
    networks:
      - elk-network
    depends_on:
      elasticsearch:
        condition: service_healthy
    restart: unless-stopped

networks:
  elk-network:
    driver: bridge

volumes:
  es_data:
  kibana_data:
```

## Logstash Pipeline

Create `/opt/elk/logstash/pipeline/main.conf` on the Docker host:

```ruby
input {
  # Accept Beats input (Filebeat, Metricbeat)
  beats {
    port => 5044
  }
  
  # Accept syslog
  udp {
    port => 5000
    codec => plain
    type => "syslog"
  }
}

filter {
  # Parse syslog format
  if [type] == "syslog" {
    grok {
      match => { "message" => "%{SYSLOGTIMESTAMP:syslog_timestamp} %{SYSLOGHOST:host} %{DATA:program}: %{GREEDYDATA:message}" }
      overwrite => ["message"]
    }
    date {
      match => ["syslog_timestamp", "MMM  d HH:mm:ss", "MMM dd HH:mm:ss"]
    }
  }
  
  # Add environment tag
  mutate {
    add_field => { "environment" => "production" }
  }

  if [@metadata][beat] and [@metadata][version] {
    mutate {
      add_field => { "[@metadata][target_index]" => "%{[@metadata][beat]}-%{[@metadata][version]}-%{+YYYY.MM.dd}" }
    }
  } else if [type] == "syslog" {
    mutate {
      add_field => { "[@metadata][target_index]" => "syslog-%{+YYYY.MM.dd}" }
    }
  } else {
    mutate {
      add_field => { "[@metadata][target_index]" => "logstash-%{+YYYY.MM.dd}" }
    }
  }
}

output {
  elasticsearch {
    hosts => ["http://elasticsearch:9200"]
    user => "elastic"
    password => "elastic_password"
    index => "%{[@metadata][target_index]}"
    ilm_enabled => false
  }
}
```

## Post-Deployment Setup

```bash
# Set kibana_system password

curl -X POST \
  -u elastic:elastic_password \
  -H "Content-Type: application/json" \
  "http://localhost:9200/_security/user/kibana_system/_password" \
  -d '{"password": "kibana_system_password"}'

# Verify all services
curl -s -u elastic:elastic_password "http://localhost:9200/_cluster/health?pretty"
curl -s "http://localhost:9600/_node/stats?pretty" | head -20
curl -s -u elastic:elastic_password "http://localhost:5601/api/status" | python3 -m json.tool
```

## Sending Logs to the ELK Stack

Install Filebeat on a host to ship logs:

```yaml
# filebeat.yml
filebeat.inputs:
  - type: filestream
    id: nginx-access
    enabled: true
    paths:
      - /var/log/nginx/access.log
    fields:
      log_type: nginx_access

output.logstash:
  hosts: ["<elk-host>:5044"]
```

## ELK Stack Resource Summary

| Component | Min RAM | Recommended |
|-----------|---------|-------------|
| Elasticsearch | 1GB heap | 2GB heap |
| Logstash | 512MB heap | 1GB heap |
| Kibana | 512MB | 1GB |
| **Total** | **~2.5GB** | **~5GB** |

## Conclusion

The ELK Stack deployed via Portainer provides a complete log management solution. Elasticsearch stores and indexes logs, Logstash processes and enriches them, and Kibana provides interactive visualization. Portainer's stack management makes it easy to update all components together during new Elastic Stack releases.
