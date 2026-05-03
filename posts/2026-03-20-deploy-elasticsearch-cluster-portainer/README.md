# How to Deploy Elasticsearch Cluster via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Elasticsearch, Cluster, High Availability, Docker

Description: Learn how to deploy a multi-node Elasticsearch cluster via Portainer for high availability, replication, and distributed search across multiple data nodes.

## Cluster Architecture

```text
Client → Elasticsearch (coordinating) → Data Node 1
                                       → Data Node 2
                                       → Data Node 3
```

A 3-node cluster allows for 1 node failure while maintaining quorum.

## 3-Node Elasticsearch Cluster Stack

**Stacks → Add Stack → elasticsearch-cluster**

```yaml
version: "3.8"

services:
  es01:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.12.0
    restart: unless-stopped
    hostname: es01
    environment:
      - node.name=es01
      - cluster.name=es-docker-cluster
      - discovery.seed_hosts=es02,es03
      - cluster.initial_master_nodes=es01,es02,es03
      - bootstrap.memory_lock=true
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms1g -Xmx1g"
    ulimits:
      memlock:
        soft: -1
        hard: -1
    volumes:
      - es01_data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"
    networks:
      - elastic

  es02:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.12.0
    restart: unless-stopped
    hostname: es02
    environment:
      - node.name=es02
      - cluster.name=es-docker-cluster
      - discovery.seed_hosts=es01,es03
      - cluster.initial_master_nodes=es01,es02,es03
      - bootstrap.memory_lock=true
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms1g -Xmx1g"
    ulimits:
      memlock:
        soft: -1
        hard: -1
    volumes:
      - es02_data:/usr/share/elasticsearch/data
    networks:
      - elastic

  es03:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.12.0
    restart: unless-stopped
    hostname: es03
    environment:
      - node.name=es03
      - cluster.name=es-docker-cluster
      - discovery.seed_hosts=es01,es02
      - cluster.initial_master_nodes=es01,es02,es03
      - bootstrap.memory_lock=true
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms1g -Xmx1g"
    ulimits:
      memlock:
        soft: -1
        hard: -1
    volumes:
      - es03_data:/usr/share/elasticsearch/data
    networks:
      - elastic

  kibana:
    image: docker.elastic.co/kibana/kibana:8.12.0
    restart: unless-stopped
    environment:
      - ELASTICSEARCH_HOSTS=http://es01:9200
    ports:
      - "5601:5601"
    networks:
      - elastic

volumes:
  es01_data:
  es02_data:
  es03_data:

networks:
  elastic:
    name: elastic
```

## Verify Cluster Formation

```bash
# Check cluster health

curl http://localhost:9200/_cluster/health?pretty

# Healthy cluster output:
# "cluster_name": "es-docker-cluster",
# "status": "green",
# "number_of_nodes": 3,
# "number_of_data_nodes": 3

# List nodes
curl http://localhost:9200/_cat/nodes?v
```

## Index with Replication

```bash
# Create an index with 3 primary shards and 1 replica each (6 shards total, distributed across nodes)
curl -X PUT "http://localhost:9200/my-logs" \
  -H "Content-Type: application/json" \
  -d '{
    "settings": {
      "number_of_shards": 3,
      "number_of_replicas": 1
    }
  }'

# Check shard allocation
curl http://localhost:9200/_cat/shards/my-logs?v
```

## Scaling: Adding a 4th Node

Update the stack to add es04:

```yaml
  es04:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.12.0
    environment:
      - node.name=es04
      - cluster.name=es-docker-cluster
      - discovery.seed_hosts=es01,es02,es03
      # Note: do NOT include es04 in initial_master_nodes after cluster forms
      - "ES_JAVA_OPTS=-Xms1g -Xmx1g"
    # ... same settings
```

The new node automatically joins and receives shard allocations.

## Conclusion

A 3-node Elasticsearch cluster via Portainer provides production-grade resilience with automatic shard replication and failover. Each node sees the same data through shard replication, and master election ensures the cluster remains operational if one node fails. Update the stack through Portainer to add nodes as search volume grows.
