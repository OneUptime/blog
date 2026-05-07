# How to Run Elasticsearch in a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Elasticsearch, Search Engine, ELK Stack

Description: Learn how to run Elasticsearch in a Podman container with proper memory settings, persistent indices, and cluster configuration.

---

> Elasticsearch in Podman gives you a powerful full-text search engine in an isolated container with tunable memory and persistent indices.

Elasticsearch is a distributed, RESTful search and analytics engine built on Apache Lucene. Running it in a Podman container simplifies deployment, lets you control resource allocation precisely, and keeps your host system clean. This guide covers single-node setup, memory tuning, persistent storage, and indexing operations.

---

## Pulling the Elasticsearch Image

Download the official Elasticsearch image.

```bash
# Pull the Elasticsearch 8.x image

podman pull docker.elastic.co/elasticsearch/elasticsearch:8.12.0

# Verify the image
podman images | grep elasticsearch
```

## Running a Single-Node Elasticsearch Container

Start Elasticsearch in single-node mode for development.

```bash
# Run Elasticsearch as a single-node cluster with security disabled for dev
podman run -d \
  --name my-elasticsearch \
  -p 9200:9200 \
  -p 9300:9300 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  -e "ES_JAVA_OPTS=-Xms512m -Xmx512m" \
  docker.elastic.co/elasticsearch/elasticsearch:8.12.0

# Wait for Elasticsearch to start
sleep 15

# Verify it is running
curl -s http://localhost:9200 | head -20
```

## Persistent Index Storage

Use a named volume to preserve your indices across container restarts.

```bash
# Create a volume for Elasticsearch data
podman volume create es-data

# Run Elasticsearch with persistent storage
podman run -d \
  --name es-persistent \
  -p 9201:9200 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  -e "ES_JAVA_OPTS=-Xms1g -Xmx1g" \
  -v es-data:/usr/share/elasticsearch/data:Z \
  docker.elastic.co/elasticsearch/elasticsearch:8.12.0

# Verify the volume is attached
podman volume inspect es-data
```

## Custom Elasticsearch Configuration

Mount a custom configuration file for advanced settings.

```bash
# Create a config directory
mkdir -p ~/es-config

# Write a custom elasticsearch.yml
cat > ~/es-config/elasticsearch.yml <<'EOF'
# Cluster name
cluster.name: podman-cluster

# Node name
node.name: node-1

# Network settings
network.host: 0.0.0.0

# Discovery for single-node
discovery.type: single-node

# Disable security for development
xpack.security.enabled: false

# Index settings
action.auto_create_index: true

# Path settings
path.data: /usr/share/elasticsearch/data
path.logs: /usr/share/elasticsearch/logs
EOF

# Create a separate volume for the custom node
podman volume create es-custom-data

# Run with custom config
podman run -d \
  --name es-custom \
  -p 9202:9200 \
  -e "ES_JAVA_OPTS=-Xms1g -Xmx1g" \
  -v ~/es-config/elasticsearch.yml:/usr/share/elasticsearch/config/elasticsearch.yml:Z \
  -v es-custom-data:/usr/share/elasticsearch/data:Z \
  docker.elastic.co/elasticsearch/elasticsearch:8.12.0
```

## Indexing and Searching Documents

Perform basic CRUD operations on your Elasticsearch instance.

```bash
# Create an index
curl -X PUT "http://localhost:9200/products" -H 'Content-Type: application/json' -d '{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 0
  },
  "mappings": {
    "properties": {
      "name": { "type": "text" },
      "price": { "type": "float" },
      "category": { "type": "keyword" }
    }
  }
}'

# Index a document
curl -X POST "http://localhost:9200/products/_doc/1" -H 'Content-Type: application/json' -d '{
  "name": "Wireless Keyboard",
  "price": 49.99,
  "category": "electronics"
}'

# Index another document
curl -X POST "http://localhost:9200/products/_doc/2" -H 'Content-Type: application/json' -d '{
  "name": "Mechanical Keyboard",
  "price": 129.99,
  "category": "electronics"
}'

# Search for documents
curl -s "http://localhost:9200/products/_search?q=keyboard" | python3 -m json.tool

# Check cluster health
curl -s "http://localhost:9200/_cluster/health" | python3 -m json.tool

# List all indices
curl -s "http://localhost:9200/_cat/indices?v"
```

## Setting System Requirements

Elasticsearch requires specific system settings for optimal performance.

```bash
# Increase the vm.max_map_count on the host (required for Elasticsearch)
# This may require root access
sudo sysctl -w vm.max_map_count=262144

# Make the change permanent
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
```

## Managing the Container

Common management operations.

```bash
# View Elasticsearch logs
podman logs my-elasticsearch

# Check resource usage
podman stats my-elasticsearch --no-stream

# Stop and start
podman stop my-elasticsearch
podman start my-elasticsearch

# Remove containers and volumes
podman rm -f my-elasticsearch es-persistent es-custom
podman volume rm es-data es-custom-data
```

## Summary

Running Elasticsearch in a Podman container provides a self-contained search engine with predictable resource usage and easy configuration. Single-node mode is perfect for development, while custom configuration files let you set up cluster names, node names, and index settings. Named volumes preserve your indices across restarts, and JVM heap settings give you direct control over memory allocation. Podman's rootless execution adds security, making this setup ideal for development, testing, and small-scale deployments.
