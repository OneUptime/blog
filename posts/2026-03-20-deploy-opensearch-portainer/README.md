# How to Deploy OpenSearch via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, OpenSearch, Search, Elasticsearch, Docker

Description: Deploy OpenSearch search and analytics engine using Portainer as an open-source alternative to Elasticsearch.

## Introduction

OpenSearch is an open-source, community-driven fork of Elasticsearch and Kibana. It provides distributed search, analytics, and observability with a permissive Apache 2.0 license. OpenSearch Dashboards (the OpenSearch equivalent of Kibana) provides visualization and exploration.

## Prerequisites

- Portainer installed with Docker
- At least 4 GB RAM (set `vm.max_map_count=262144` on the host)

## Step 1: Set the Required Kernel Parameter

```bash
# Required for OpenSearch/Elasticsearch

sudo sysctl -w vm.max_map_count=262144

# Make it persistent
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
```

## Step 2: Create the Stack in Portainer

Navigate to **Stacks** > **Add Stack**:

```yaml
# docker-compose.yml - OpenSearch + OpenSearch Dashboards
version: "3.8"

services:
  opensearch:
    image: opensearchproject/opensearch:3.6.0
    container_name: opensearch
    restart: unless-stopped
    ports:
      - "9200:9200"
      - "9300:9300"
    volumes:
      - opensearch_data:/usr/share/opensearch/data
    environment:
      - cluster.name=opensearch-cluster
      - node.name=opensearch-node1
      - discovery.type=single-node
      - bootstrap.memory_lock=true
      - OPENSEARCH_JAVA_OPTS=-Xms1g -Xmx1g
      - OPENSEARCH_INITIAL_ADMIN_PASSWORD=${OPENSEARCH_ADMIN_PASSWORD}
      - plugins.security.disabled=false
    ulimits:
      memlock:
        soft: -1
        hard: -1
      nofile:
        soft: 65536
        hard: 65536
    healthcheck:
      test: ["CMD-SHELL", "curl -s -k -u admin:${OPENSEARCH_ADMIN_PASSWORD} https://localhost:9200/_cluster/health | grep -qE 'green|yellow'"]
      interval: 30s
      timeout: 10s
      retries: 5
    networks:
      - opensearch_net

  opensearch-dashboards:
    image: opensearchproject/opensearch-dashboards:3.6.0
    container_name: opensearch_dashboards
    restart: unless-stopped
    ports:
      - "5601:5601"
    environment:
      - OPENSEARCH_HOSTS=["https://opensearch:9200"]
      - OPENSEARCH_SSL_VERIFICATIONMODE=none
      - OPENSEARCH_USERNAME=kibanaserver
      - OPENSEARCH_PASSWORD=kibanaserver
    depends_on:
      opensearch:
        condition: service_healthy
    networks:
      - opensearch_net

volumes:
  opensearch_data:

networks:
  opensearch_net:
    driver: bridge
```

## Step 3: Set Environment Variables in Portainer

```text
OPENSEARCH_ADMIN_PASSWORD=Admin@123Secure!
```

The `OPENSEARCH_INITIAL_ADMIN_PASSWORD` must meet the default security policy (uppercase, lowercase, number, special char, min 8 chars).

## Step 4: Test the Cluster

```bash
# Check cluster health
curl -k -u admin:Admin@123Secure! https://localhost:9200/_cluster/health?pretty

# List indices
curl -k -u admin:Admin@123Secure! https://localhost:9200/_cat/indices?v
```

## Step 5: Index and Search Documents

```bash
# Index a document
curl -k -u admin:Admin@123Secure! \
  -X PUT "https://localhost:9200/my-index/_doc/1" \
  -H 'Content-Type: application/json' \
  -d '{"title": "OpenSearch is great", "timestamp": "2024-01-01T00:00:00Z"}'

# Search
curl -k -u admin:Admin@123Secure! \
  -X GET "https://localhost:9200/my-index/_search" \
  -H 'Content-Type: application/json' \
  -d '{"query": {"match": {"title": "OpenSearch"}}}'
```

## Step 6: Access OpenSearch Dashboards

Open `http://<host>:5601` and log in with username `admin` and your `OPENSEARCH_ADMIN_PASSWORD`.

## Conclusion

OpenSearch uses HTTPS and the security plugin by default. In OpenSearch 2.12 and later, the `OPENSEARCH_INITIAL_ADMIN_PASSWORD` env var is required on first run and sets the demo admin user password. For single-node deployments set `discovery.type=single-node` to avoid cluster bootstrap issues. The `vm.max_map_count=262144` kernel parameter is mandatory - without it, OpenSearch will fail to start.
