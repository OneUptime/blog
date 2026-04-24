# How to Deploy Elasticsearch Cluster via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Elasticsearch, Cluster, High Availability, Self-Hosted

Description: Deploy a multi-node Elasticsearch cluster via Portainer for high availability and distributed search with automatic shard allocation and replication.

## Introduction

A production Elasticsearch deployment that needs high availability typically uses multiple nodes. This guide deploys a 3-node Elasticsearch cluster using Portainer stacks, providing shard replication and automatic failover.

## Prerequisites

- Docker host with at least 8GB RAM (for 3-node cluster)
- Portainer installed

## System Configuration

```bash
# Required for all nodes - increase VM map count

sudo sysctl -w vm.max_map_count=1048576
echo 'vm.max_map_count=1048576' | sudo tee /etc/sysctl.d/99-elasticsearch.conf
```

## Deploy the Elasticsearch Cluster

In Portainer, create a stack named `elasticsearch-cluster`:

```yaml
version: "2.2"

services:
  setup:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.13.0
    container_name: es-setup
    user: "0"
    environment:
      - ELASTIC_PASSWORD=elastic_cluster_password
      - KIBANA_PASSWORD=kibana_password
    volumes:
      - certs:/usr/share/elasticsearch/config/certs
    command: >
      bash -c '
        if [ ! -f config/certs/elastic-stack-ca.p12 ]; then
          bin/elasticsearch-certutil ca --silent \
            --out config/certs/elastic-stack-ca.p12 \
            --pass "";
        fi;
        if [ ! -f config/certs/elastic-certificates.p12 ]; then
          bin/elasticsearch-certutil cert --silent \
            --ca config/certs/elastic-stack-ca.p12 \
            --ca-pass "" \
            --out config/certs/elastic-certificates.p12 \
            --pass "";
        fi;
        chown -R root:root config/certs;
        find config/certs -type d -exec chmod 750 {} \;;
        find config/certs -type f -exec chmod 640 {} \;;
        until curl -s http://es-node1:9200 | grep -q "missing authentication credentials"; do sleep 10; done;
        until curl -s -X POST -u "elastic:${ELASTIC_PASSWORD}" \
          -H "Content-Type: application/json" \
          http://es-node1:9200/_security/user/kibana_system/_password \
          -d "{\"password\":\"${KIBANA_PASSWORD}\"}" | grep -q "^{}"; do sleep 10; done;
      '
    healthcheck:
      test: ["CMD-SHELL", "[ -f config/certs/elastic-certificates.p12 ]"]
      interval: 5s
      timeout: 5s
      retries: 60

  es-node1:
    depends_on:
      setup:
        condition: service_healthy
    image: docker.elastic.co/elasticsearch/elasticsearch:8.13.0
    container_name: es-node1
    environment:
      - node.name=es-node1
      - cluster.name=production-cluster
      - discovery.seed_hosts=es-node2,es-node3
      # Only needed for the first cluster startup; remove after the cluster forms.
      - cluster.initial_master_nodes=es-node1,es-node2,es-node3
      - xpack.security.enabled=true
      - xpack.security.http.ssl.enabled=false
      - xpack.security.transport.ssl.enabled=true
      - xpack.security.transport.ssl.verification_mode=certificate
      - xpack.security.transport.ssl.keystore.path=certs/elastic-certificates.p12
      - xpack.security.transport.ssl.truststore.path=certs/elastic-certificates.p12
      - ELASTIC_PASSWORD=elastic_cluster_password
      - ES_JAVA_OPTS=-Xms1g -Xmx1g
      - bootstrap.memory_lock=true
    volumes:
      - certs:/usr/share/elasticsearch/config/certs
      - es1_data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"
    ulimits:
      memlock:
        soft: -1
        hard: -1
    healthcheck:
      test:
        [
          "CMD-SHELL",
          "curl -s http://localhost:9200 | grep -q 'missing authentication credentials'",
        ]
      interval: 10s
      timeout: 10s
      retries: 60
    networks:
      - elastic-network
    restart: unless-stopped

  es-node2:
    depends_on:
      setup:
        condition: service_healthy
    image: docker.elastic.co/elasticsearch/elasticsearch:8.13.0
    container_name: es-node2
    environment:
      - node.name=es-node2
      - cluster.name=production-cluster
      - discovery.seed_hosts=es-node1,es-node3
      # Only needed for the first cluster startup; remove after the cluster forms.
      - cluster.initial_master_nodes=es-node1,es-node2,es-node3
      - xpack.security.enabled=true
      - xpack.security.http.ssl.enabled=false
      - xpack.security.transport.ssl.enabled=true
      - xpack.security.transport.ssl.verification_mode=certificate
      - xpack.security.transport.ssl.keystore.path=certs/elastic-certificates.p12
      - xpack.security.transport.ssl.truststore.path=certs/elastic-certificates.p12
      - ELASTIC_PASSWORD=elastic_cluster_password
      - ES_JAVA_OPTS=-Xms1g -Xmx1g
      - bootstrap.memory_lock=true
    volumes:
      - certs:/usr/share/elasticsearch/config/certs
      - es2_data:/usr/share/elasticsearch/data
    ports:
      - "9201:9200"
    ulimits:
      memlock:
        soft: -1
        hard: -1
    healthcheck:
      test:
        [
          "CMD-SHELL",
          "curl -s http://localhost:9200 | grep -q 'missing authentication credentials'",
        ]
      interval: 10s
      timeout: 10s
      retries: 60
    networks:
      - elastic-network
    restart: unless-stopped

  es-node3:
    depends_on:
      setup:
        condition: service_healthy
    image: docker.elastic.co/elasticsearch/elasticsearch:8.13.0
    container_name: es-node3
    environment:
      - node.name=es-node3
      - cluster.name=production-cluster
      - discovery.seed_hosts=es-node1,es-node2
      # Only needed for the first cluster startup; remove after the cluster forms.
      - cluster.initial_master_nodes=es-node1,es-node2,es-node3
      - xpack.security.enabled=true
      - xpack.security.http.ssl.enabled=false
      - xpack.security.transport.ssl.enabled=true
      - xpack.security.transport.ssl.verification_mode=certificate
      - xpack.security.transport.ssl.keystore.path=certs/elastic-certificates.p12
      - xpack.security.transport.ssl.truststore.path=certs/elastic-certificates.p12
      - ELASTIC_PASSWORD=elastic_cluster_password
      - ES_JAVA_OPTS=-Xms1g -Xmx1g
      - bootstrap.memory_lock=true
    volumes:
      - certs:/usr/share/elasticsearch/config/certs
      - es3_data:/usr/share/elasticsearch/data
    ports:
      - "9202:9200"
    ulimits:
      memlock:
        soft: -1
        hard: -1
    healthcheck:
      test:
        [
          "CMD-SHELL",
          "curl -s http://localhost:9200 | grep -q 'missing authentication credentials'",
        ]
      interval: 10s
      timeout: 10s
      retries: 60
    networks:
      - elastic-network
    restart: unless-stopped

  kibana:
    image: docker.elastic.co/kibana/kibana:8.13.0
    container_name: kibana
    environment:
      - ELASTICSEARCH_HOSTS=["http://es-node1:9200","http://es-node2:9200","http://es-node3:9200"]
      - ELASTICSEARCH_USERNAME=kibana_system
      - ELASTICSEARCH_PASSWORD=kibana_password
    ports:
      - "5601:5601"
    networks:
      - elastic-network
    depends_on:
      es-node1:
        condition: service_healthy
      es-node2:
        condition: service_healthy
      es-node3:
        condition: service_healthy
    restart: unless-stopped

networks:
  elastic-network:
    driver: bridge

volumes:
  certs:
  es1_data:
  es2_data:
  es3_data:
```

## Verify Cluster Health

After deployment (allow 2-3 minutes for certificate generation, password setup, and full initialization):

```bash
# Check cluster health (should show: green, 3 nodes)
curl -s "http://localhost:9200/_cluster/health?pretty" \
  -u elastic:elastic_cluster_password

# Check nodes
curl -s "http://localhost:9200/_cat/nodes?v" \
  -u elastic:elastic_cluster_password
```

## Create a Replicated Index

```bash
# Create an index with 3 primary shards and 1 replica per shard
curl -X PUT "http://localhost:9200/logs" \
  -u elastic:elastic_cluster_password \
  -H "Content-Type: application/json" \
  -d '{
    "settings": {
      "number_of_shards": 3,
      "number_of_replicas": 1
    }
  }'
```

## Simulate Node Failure

```bash
# Stop one node to test failover
docker stop es-node3

# Check cluster status (it may briefly turn yellow while shards are promoted and reallocated)
curl -s "http://localhost:9200/_cluster/health?pretty" \
  -u elastic:elastic_cluster_password

# Restart node
docker start es-node3

# Cluster should return to green after the node rejoins and replica allocation completes
curl -s "http://localhost:9200/_cluster/health?pretty" \
  -u elastic:elastic_cluster_password
```

## Conclusion

A 3-node Elasticsearch cluster via Portainer provides high availability and distributed search at the cost of higher resource requirements. The cluster automatically handles shard allocation and replication, and recovers from node failures with minimal downtime. Portainer's stack management keeps the cluster definition in one place, but upgrades should still be performed one node at a time.
