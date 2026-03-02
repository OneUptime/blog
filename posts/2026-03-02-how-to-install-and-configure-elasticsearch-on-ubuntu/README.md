# How to Install and Configure Elasticsearch on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Elasticsearch, Search, ELK Stack, Database

Description: Install and configure Elasticsearch on Ubuntu with security enabled, covering cluster setup, index management, and integration with Kibana.

---

Elasticsearch is a distributed search and analytics engine based on Apache Lucene. It powers full-text search for applications ranging from e-commerce product search to log analytics in the ELK (Elasticsearch, Logstash, Kibana) stack. At its core, it stores documents as JSON and makes them searchable within milliseconds.

This guide covers installing Elasticsearch 8.x on Ubuntu with the default security configuration enabled, creating and querying indexes, and connecting Kibana.

## Prerequisites

- Ubuntu 22.04 or 24.04
- At least 4 GB RAM (8 GB recommended for production)
- Java is not required separately - Elasticsearch bundles its own JVM
- Root or sudo access

## Installing Elasticsearch

```bash
# Install prerequisites
sudo apt update && sudo apt install -y apt-transport-https curl gnupg

# Add Elasticsearch GPG key
curl -fsSL https://artifacts.elastic.co/GPG-KEY-elasticsearch | \
  sudo gpg --dearmor -o /usr/share/keyrings/elastic-archive-keyring.gpg

# Add the Elasticsearch 8.x repository
echo "deb [signed-by=/usr/share/keyrings/elastic-archive-keyring.gpg] \
  https://artifacts.elastic.co/packages/8.x/apt stable main" | \
  sudo tee /etc/apt/sources.list.d/elastic-8.x.list

# Install Elasticsearch
sudo apt update
sudo apt install -y elasticsearch
```

During installation, the output will display important security information including:
- The auto-configured password for the built-in `elastic` superuser
- An enrollment token for Kibana (valid for 30 minutes)

**Save these values before continuing.**

## Starting Elasticsearch

```bash
# Enable and start the service
sudo systemctl enable elasticsearch.service
sudo systemctl start elasticsearch.service

# Check status (may take 30-60 seconds to start)
sudo systemctl status elasticsearch.service
```

## Verifying the Installation

Elasticsearch 8.x enables security by default with TLS:

```bash
# Test with the elastic superuser and the auto-generated password
curl --cacert /etc/elasticsearch/certs/http_ca.crt \
  -u elastic:YOUR_AUTO_GENERATED_PASSWORD \
  https://localhost:9200

# Expected response:
# {
#   "name" : "your-hostname",
#   "cluster_name" : "elasticsearch",
#   "cluster_uuid" : "...",
#   "version" : { ... },
#   "tagline" : "You Know, for Search"
# }
```

If you didn't save the auto-generated password, reset it:

```bash
sudo /usr/share/elasticsearch/bin/elasticsearch-reset-password -u elastic
```

## Configuration

Edit `/etc/elasticsearch/elasticsearch.yml`:

```bash
sudo nano /etc/elasticsearch/elasticsearch.yml
```

```yaml
# /etc/elasticsearch/elasticsearch.yml

# Cluster name - all nodes must share the same cluster name
cluster.name: my-production-cluster

# Node name - unique per node
node.name: es-node-01

# Data and log paths
path.data: /var/lib/elasticsearch
path.logs: /var/log/elasticsearch

# Memory lock (prevents swapping - requires ulimit configuration)
bootstrap.memory_lock: true

# Network binding
# For single-node: bind to localhost only
# For cluster: bind to the node's IP
network.host: localhost
http.port: 9200

# Discovery configuration (for single-node)
discovery.type: single-node

# For multi-node clusters, use:
# discovery.seed_hosts: ["192.168.1.10", "192.168.1.11", "192.168.1.12"]
# cluster.initial_master_nodes: ["es-node-01", "es-node-02", "es-node-03"]

# Security (enabled by default in 8.x, don't disable this)
xpack.security.enabled: true
xpack.security.enrollment.enabled: true

# TLS for HTTP
xpack.security.http.ssl:
  enabled: true
  keystore.path: certs/http.p12

# TLS for transport (inter-node communication)
xpack.security.transport.ssl:
  enabled: true
  verification_mode: certificate
  keystore.path: certs/transport.p12
  truststore.path: certs/transport.p12
```

### JVM Heap Size

Elasticsearch performs best with the heap set to no more than 50% of available RAM, and no more than 32 GB:

```bash
sudo nano /etc/elasticsearch/jvm.options.d/heap.options
```

```
# Set heap to 4GB (for a server with 8GB RAM)
-Xms4g
-Xmx4g
```

### Memory Lock

Enable memory locking to prevent the heap from being swapped to disk:

```bash
sudo mkdir -p /etc/systemd/system/elasticsearch.service.d/

sudo tee /etc/systemd/system/elasticsearch.service.d/override.conf << 'EOF'
[Service]
LimitMEMLOCK=infinity
EOF

sudo systemctl daemon-reload
sudo systemctl restart elasticsearch.service
```

## Working with Elasticsearch

### Creating an Index

```bash
# Create an index with custom mappings
curl --cacert /etc/elasticsearch/certs/http_ca.crt \
  -u elastic:YOUR_PASSWORD \
  -X PUT https://localhost:9200/products \
  -H "Content-Type: application/json" \
  -d '{
    "settings": {
      "number_of_shards": 1,
      "number_of_replicas": 0,
      "analysis": {
        "analyzer": {
          "product_analyzer": {
            "type": "standard",
            "stopwords": "_english_"
          }
        }
      }
    },
    "mappings": {
      "properties": {
        "name": {
          "type": "text",
          "analyzer": "product_analyzer",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "description": { "type": "text" },
        "price": { "type": "double" },
        "category": { "type": "keyword" },
        "in_stock": { "type": "boolean" },
        "tags": { "type": "keyword" },
        "created_at": { "type": "date" }
      }
    }
  }'
```

### Indexing Documents

```bash
# Index a document with auto-generated ID
curl --cacert /etc/elasticsearch/certs/http_ca.crt \
  -u elastic:YOUR_PASSWORD \
  -X POST https://localhost:9200/products/_doc \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mechanical Keyboard",
    "description": "Full-size mechanical keyboard with Cherry MX Blue switches",
    "price": 129.99,
    "category": "electronics",
    "in_stock": true,
    "tags": ["keyboard", "mechanical", "peripherals"],
    "created_at": "2024-03-02T10:00:00"
  }'

# Index with a specific ID
curl --cacert /etc/elasticsearch/certs/http_ca.crt \
  -u elastic:YOUR_PASSWORD \
  -X PUT https://localhost:9200/products/_doc/prod_001 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Wireless Mouse",
    "description": "Ergonomic wireless mouse with long battery life",
    "price": 49.99,
    "category": "electronics",
    "in_stock": true,
    "tags": ["mouse", "wireless", "peripherals"],
    "created_at": "2024-03-02T10:05:00"
  }'
```

### Searching

```bash
# Full-text search
curl --cacert /etc/elasticsearch/certs/http_ca.crt \
  -u elastic:YOUR_PASSWORD \
  -X GET https://localhost:9200/products/_search \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "multi_match": {
        "query": "mechanical keyboard",
        "fields": ["name^2", "description"],  // ^2 = boost name field
        "type": "best_fields"
      }
    },
    "highlight": {
      "fields": {
        "name": {},
        "description": {}
      }
    },
    "_source": ["name", "price", "category"],
    "size": 10
  }'

# Boolean query with filters
curl --cacert /etc/elasticsearch/certs/http_ca.crt \
  -u elastic:YOUR_PASSWORD \
  -X GET https://localhost:9200/products/_search \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "bool": {
        "must": [
          { "match": { "description": "wireless" } }
        ],
        "filter": [
          { "term": { "category": "electronics" } },
          { "term": { "in_stock": true } },
          { "range": { "price": { "lte": 100 } } }
        ]
      }
    },
    "sort": [
      { "price": { "order": "asc" } }
    ]
  }'

# Aggregations - average price per category
curl --cacert /etc/elasticsearch/certs/http_ca.crt \
  -u elastic:YOUR_PASSWORD \
  -X GET https://localhost:9200/products/_search \
  -H "Content-Type: application/json" \
  -d '{
    "size": 0,
    "aggs": {
      "by_category": {
        "terms": { "field": "category" },
        "aggs": {
          "avg_price": { "avg": { "field": "price" } },
          "max_price": { "max": { "field": "price" } }
        }
      }
    }
  }'
```

## Installing Kibana

```bash
sudo apt install -y kibana

sudo systemctl enable kibana
sudo systemctl start kibana
```

Configure Kibana to connect to Elasticsearch:

```bash
sudo nano /etc/kibana/kibana.yml
```

```yaml
server.port: 5601
server.host: "0.0.0.0"

# Elasticsearch connection
elasticsearch.hosts: ["https://localhost:9200"]
elasticsearch.ssl.certificateAuthorities: ["/etc/elasticsearch/certs/http_ca.crt"]
```

Generate an enrollment token for Kibana:

```bash
sudo /usr/share/elasticsearch/bin/elasticsearch-create-enrollment-token -s kibana
```

Open `http://your-server:5601` in a browser and paste the enrollment token when prompted.

Monitor your Elasticsearch cluster's health and index performance with [OneUptime](https://oneuptime.com) to ensure your search infrastructure remains available.
