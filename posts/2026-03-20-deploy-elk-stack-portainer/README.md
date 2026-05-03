# How to Deploy the ELK Stack via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, ELK Stack, Elasticsearch, Logstash, Kibana

Description: Learn how to deploy the complete ELK Stack (Elasticsearch, Logstash, Kibana) as a single Portainer stack for centralized log collection, processing, and visualization.

## ELK Stack Architecture

```text
Application Logs
    ↓
Logstash (collect + transform)
    ↓
Elasticsearch (index + store)
    ↓
Kibana (query + visualize)
```

## Complete ELK Stack in Portainer

**Stacks → Add Stack → elk-stack**

```yaml
version: "3.8"

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.12.0
    container_name: elasticsearch
    restart: unless-stopped
    environment:
      - node.name=elasticsearch
      - cluster.name=elk-docker
      - discovery.type=single-node
      - ELASTIC_PASSWORD=${ELASTIC_PASSWORD}
      - xpack.security.enabled=true
      - xpack.security.http.ssl.enabled=false
      - "ES_JAVA_OPTS=-Xms1g -Xmx1g"
    ulimits:
      memlock:
        soft: -1
        hard: -1
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    healthcheck:
      test: ["CMD-SHELL", "curl -s -u elastic:${ELASTIC_PASSWORD} http://localhost:9200/_cluster/health | grep -qE 'green|yellow'"]
      interval: 20s
      retries: 10

  logstash:
    image: docker.elastic.co/logstash/logstash:8.12.0
    restart: unless-stopped
    environment:
      - "LS_JAVA_OPTS=-Xms512m -Xmx512m"
      - ELASTIC_PASSWORD=${ELASTIC_PASSWORD}
    volumes:
      - ./logstash-pipeline:/usr/share/logstash/pipeline:ro
    ports:
      - "5044:5044"     # Filebeat input
      - "5000:5000/udp" # GELF input
    depends_on:
      elasticsearch:
        condition: service_healthy

  kibana:
    image: docker.elastic.co/kibana/kibana:8.12.0
    restart: unless-stopped
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
      - ELASTICSEARCH_USERNAME=kibana_system
      - ELASTICSEARCH_PASSWORD=${KIBANA_PASSWORD}
    volumes:
      - kibana_data:/usr/share/kibana/data
    depends_on:
      elasticsearch:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "curl -s http://localhost:5601/api/status | grep -q available"]
      interval: 30s
      retries: 10

volumes:
  elasticsearch_data:
  kibana_data:
```

## Logstash Pipeline for Docker Logs

```javascript
# logstash-pipeline/docker-logs.conf

input {
  beats {
    port => 5044
  }
  gelf {
    port => 5000
  }
}

filter {
  json {
    source => "message"
    target => "log_data"
    skip_on_invalid_json => true
  }

  mutate {
    add_field => { "environment" => "production" }
  }
}

output {
  elasticsearch {
    hosts => ["http://elasticsearch:9200"]
    user => "elastic"
    password => "${ELASTIC_PASSWORD}"
    ilm_enabled => true
    ilm_rollover_alias => "docker-logs"
    ilm_policy => "7-days-default"
  }
}
```

## Post-Deployment Setup

```bash
# 1. Set Kibana system password
docker exec elasticsearch curl -u elastic:${ELASTIC_PASSWORD} \
  -X POST "http://localhost:9200/_security/user/kibana_system/_password" \
  -H "Content-Type: application/json" \
  -d "{\"password\": \"${KIBANA_PASSWORD}\"}"

# 2. Create ILM policy for log rotation
curl -u elastic:${ELASTIC_PASSWORD} \
  -X PUT "http://localhost:9200/_ilm/policy/7-days-default" \
  -H "Content-Type: application/json" \
  -d '{
    "policy": {
      "phases": {
        "hot": {"min_age": "0ms", "actions": {"rollover": {"max_age": "1d"}}},
        "delete": {"min_age": "7d", "actions": {"delete": {}}}
      }
    }
  }'
```

## Hardware Requirements

| Component | Min RAM | Recommended RAM |
|-----------|---------|----------------|
| Elasticsearch | 2GB | 4GB |
| Logstash | 1GB | 2GB |
| Kibana | 1GB | 2GB |
| **Total** | **4GB** | **8GB** |

## Sending Logs from Other Portainer Stacks

Configure other stacks to send logs to Logstash:

```yaml
services:
  nginx:
    image: nginx:alpine
    logging:
      driver: "gelf"
      options:
        gelf-address: "udp://logstash:5000"
        tag: "nginx"
```

## Conclusion

The ELK Stack as a single Portainer stack gives you centralized logging for your entire Docker environment. Once deployed, configure other stacks to send logs to Logstash, and use Kibana's Discover and Dashboard features to monitor application behavior, detect errors, and create operational dashboards. The `depends_on` chain with healthchecks ensures proper startup order.
