# How to Deploy Elasticsearch via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Elasticsearch, Search, Analytics, Self-Hosted

Description: Deploy Elasticsearch via Portainer as a powerful full-text search and analytics engine with persistent storage, security enabled, and proper JVM configuration.

## Introduction

Elasticsearch is a distributed, RESTful search and analytics engine used for log analysis, full-text search, and real-time monitoring. Deploying it via Portainer with security enabled and proper JVM settings gives you a practical self-hosted search engine.

## Prerequisites

- Docker host with at least 4GB RAM (Elasticsearch is memory-intensive)
- Portainer installed

## System Prerequisites

Before deploying, configure the Docker host for Elasticsearch:

```bash
# Increase virtual memory limits (required for Elasticsearch)

sudo sysctl -w vm.max_map_count=1048576

# Make persistent
echo 'vm.max_map_count=1048576' | sudo tee /etc/sysctl.d/99-elasticsearch.conf
sudo sysctl --system
```

## Deploy as a Stack

In Portainer, create a stack named `elasticsearch`:

```yaml
version: "3.8"

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:9.3.3
    container_name: elasticsearch
    environment:
      # Single-node cluster
      - discovery.type=single-node
      # Node name
      - node.name=es-node-1
      # Cluster name
      - cluster.name=my-cluster
      # Security
      - xpack.security.enabled=true
      - xpack.security.http.ssl.enabled=false   # Disable SSL for simplicity
      # JVM heap size (set to 50% of available RAM)
      - ES_JAVA_OPTS=-Xms2g -Xmx2g
      # Disable memory locking (for Docker)
      - bootstrap.memory_lock=false
      # Built-in password
      - ELASTIC_PASSWORD=change_this_password
    volumes:
      # Persistent data storage
      - elasticsearch_data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"     # REST API
      - "9300:9300"     # Internal cluster communication
    ulimits:
      memlock:
        soft: -1
        hard: -1
      nofile:
        soft: 65535
        hard: 65535
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "curl -s http://localhost:9200 -u elastic:change_this_password | grep -q 'tagline'"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s

  # Kibana - Elasticsearch visualization
  kibana:
    image: docker.elastic.co/kibana/kibana:9.3.3
    container_name: kibana
    environment:
      - 'ELASTICSEARCH_HOSTS=["http://elasticsearch:9200"]'
      - ELASTICSEARCH_USERNAME=kibana_system
      - ELASTICSEARCH_PASSWORD=kibana_password
    ports:
      - "5601:5601"
    depends_on:
      elasticsearch:
        condition: service_healthy
    restart: unless-stopped

volumes:
  elasticsearch_data:
```

## Post-Deployment Setup

After deployment, reset the Kibana system user password:

```bash
# Access Elasticsearch container
docker exec -it elasticsearch bash

# Reset kibana_system user password
/usr/share/elasticsearch/bin/elasticsearch-reset-password -i -u kibana_system
# Enter: kibana_password (must match ELASTICSEARCH_PASSWORD in Kibana service)
```

## Creating an Index

```bash
# Create an index with mapping
curl -X PUT "http://localhost:9200/products" \
  -u elastic:change_this_password \
  -H "Content-Type: application/json" \
  -d '{
    "mappings": {
      "properties": {
        "name": { "type": "text" },
        "price": { "type": "float" },
        "category": { "type": "keyword" },
        "created_at": { "type": "date" }
      }
    },
    "settings": {
      "number_of_shards": 1,
      "number_of_replicas": 0
    }
  }'
```

## Indexing and Searching Documents

```bash
# Index a document
curl -X POST "http://localhost:9200/products/_doc" \
  -u elastic:change_this_password \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Wireless Headphones",
    "price": 79.99,
    "category": "electronics",
    "created_at": "2026-03-20"
  }'

# Search
curl -X GET "http://localhost:9200/products/_search" \
  -u elastic:change_this_password \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "match": {
        "name": "wireless"
      }
    }
  }'
```

## Monitoring Cluster Health

```bash
# Check cluster health
curl -s "http://localhost:9200/_cluster/health" \
  -u elastic:change_this_password | python3 -m json.tool

# Check indices
curl -s "http://localhost:9200/_cat/indices?v" \
  -u elastic:change_this_password
```

## Conclusion

Elasticsearch deployed via Portainer provides a powerful search and analytics engine with Kibana for visualization. Security is enabled by default in current Elasticsearch releases, and persistent volumes ensure your indexed data survives container restarts and updates. For internet-exposed or production deployments, enable HTTPS for the Elasticsearch and Kibana HTTP layer before going live.
