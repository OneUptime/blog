# How to Install and Configure OpenSearch on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, OpenSearch, Search, ELK Stack, Database

Description: Learn how to install and configure OpenSearch on Ubuntu, the open-source Elasticsearch fork, including security setup, index creation, and OpenSearch Dashboards.

---

OpenSearch is an open-source, community-driven fork of Elasticsearch and Kibana, maintained by Amazon and a growing community of contributors. It was created after Elastic changed the Elasticsearch license to a non-open-source license in 2021. OpenSearch remains under the Apache 2.0 license and is fully API-compatible with Elasticsearch 7.10.

If you're looking for an Elasticsearch-compatible search engine without license restrictions, OpenSearch is the answer.

## OpenSearch vs Elasticsearch

The core functionality is essentially the same - both use Lucene under the hood and have nearly identical REST APIs. Key differences:

- OpenSearch is Apache 2.0 licensed
- OpenSearch includes security (authentication, encryption, access control) for free without a paid tier
- OpenSearch has a growing plugin ecosystem independent of Elastic's commercial offerings
- AWS OpenSearch Service is based on OpenSearch

## Prerequisites

- Ubuntu 22.04 or 24.04
- At least 4 GB RAM
- Root or sudo access

## Preparing the System

OpenSearch requires some OS-level tuning before installation:

```bash
# Increase virtual memory map areas (required for Lucene)
sudo tee -a /etc/sysctl.conf << 'EOF'
# OpenSearch requirement
vm.max_map_count = 262144
EOF
sudo sysctl -p

# Verify
sysctl vm.max_map_count

# Disable swap (recommended for OpenSearch)
sudo swapoff -a
sudo sed -i '/\bswap\b/ s/^/#/' /etc/fstab
```

## Installing OpenSearch

```bash
# Add OpenSearch repository
curl -fsSL https://artifacts.opensearch.org/publickeys/opensearch.pgp | \
  sudo gpg --dearmor -o /usr/share/keyrings/opensearch-keyring.gpg

echo "deb [signed-by=/usr/share/keyrings/opensearch-keyring.gpg] \
  https://artifacts.opensearch.org/releases/bundle/opensearch/2.x/apt stable main" | \
  sudo tee /etc/apt/sources.list.d/opensearch-2.x.list

sudo apt update

# Install OpenSearch
# The OPENSEARCH_INITIAL_ADMIN_PASSWORD env variable sets the initial admin password
sudo OPENSEARCH_INITIAL_ADMIN_PASSWORD=YourStrongPassword123! \
  apt install -y opensearch
```

Enable and start the service:

```bash
sudo systemctl enable opensearch
sudo systemctl start opensearch

# Check status
sudo systemctl status opensearch
```

## Verifying the Installation

```bash
# Test with TLS (security is enabled by default)
curl -k -u admin:YourStrongPassword123! https://localhost:9200

# -k flag skips certificate verification (OK for testing, not for production)
# Use the actual CA cert for production:
# curl --cacert /etc/opensearch/root-ca.pem -u admin:password https://localhost:9200
```

## Configuration

```bash
sudo nano /etc/opensearch/opensearch.yml
```

```yaml
# /etc/opensearch/opensearch.yml

# Cluster name
cluster.name: my-opensearch-cluster

# Node name
node.name: os-node-01

# Data paths
path.data: /var/lib/opensearch
path.logs: /var/log/opensearch

# Network settings
network.host: 0.0.0.0
http.port: 9200

# Single-node discovery (for development/single server)
discovery.type: single-node

# For multi-node cluster:
# discovery.seed_hosts: ["192.168.1.10", "192.168.1.11"]
# cluster.initial_cluster_manager_nodes: ["os-node-01", "os-node-02"]

# Security plugin configuration
plugins.security.ssl.transport.pemcert_filepath: certs/node.pem
plugins.security.ssl.transport.pemkey_filepath: certs/node-key.pem
plugins.security.ssl.transport.pemtrustedcas_filepath: certs/root-ca.pem
plugins.security.ssl.transport.enforce_hostname_verification: false

plugins.security.ssl.http.enabled: true
plugins.security.ssl.http.pemcert_filepath: certs/node.pem
plugins.security.ssl.http.pemkey_filepath: certs/node-key.pem
plugins.security.ssl.http.pemtrustedcas_filepath: certs/root-ca.pem

plugins.security.allow_default_init_securityindex: true
plugins.security.authcz.admin_dn:
  - 'CN=A,OU=UNIT,O=ORG,L=TORONTO,ST=ONTARIO,C=CA'

plugins.security.nodes_dn:
  - 'CN=node.example.com,OU=UNIT,O=ORG,L=TORONTO,ST=ONTARIO,C=CA'

plugins.security.audit.type: internal_opensearch
plugins.security.enable_snapshot_restore_privilege: true
plugins.security.check_snapshot_restore_write_privileges: true
plugins.security.restapi.roles_enabled: ["all_access", "security_rest_api_access"]
```

### JVM Heap Configuration

```bash
sudo nano /etc/opensearch/jvm.options
```

Set the heap to half of available RAM, max 32 GB:

```
# For an 8GB server
-Xms4g
-Xmx4g
```

Restart after configuration changes:

```bash
sudo systemctl restart opensearch
```

## Creating and Managing Indexes

```bash
# Create an index with mappings
curl -k -u admin:YourStrongPassword123! \
  -X PUT https://localhost:9200/blog-posts \
  -H "Content-Type: application/json" \
  -d '{
    "settings": {
      "number_of_shards": 1,
      "number_of_replicas": 0,
      "index": {
        "analysis": {
          "filter": {
            "english_stop": {
              "type": "stop",
              "stopwords": "_english_"
            }
          }
        }
      }
    },
    "mappings": {
      "properties": {
        "title": {
          "type": "text",
          "fields": {
            "keyword": { "type": "keyword" }
          }
        },
        "content": { "type": "text" },
        "author": { "type": "keyword" },
        "tags": { "type": "keyword" },
        "published_at": { "type": "date" },
        "view_count": { "type": "long" },
        "is_published": { "type": "boolean" }
      }
    }
  }'

# Verify the index was created
curl -k -u admin:YourStrongPassword123! https://localhost:9200/_cat/indices?v
```

## Index Templates

Index templates let you define mappings and settings for indexes that match a naming pattern:

```bash
curl -k -u admin:YourStrongPassword123! \
  -X PUT https://localhost:9200/_index_template/logs-template \
  -H "Content-Type: application/json" \
  -d '{
    "index_patterns": ["logs-*"],
    "priority": 100,
    "template": {
      "settings": {
        "number_of_shards": 1,
        "number_of_replicas": 1,
        "index.lifecycle.name": "logs-policy"
      },
      "mappings": {
        "properties": {
          "@timestamp": { "type": "date" },
          "level": { "type": "keyword" },
          "service": { "type": "keyword" },
          "message": { "type": "text" },
          "trace_id": { "type": "keyword" },
          "host": { "type": "keyword" }
        }
      }
    }
  }'
```

## Searching Documents

```bash
# Index some test documents
for i in 1 2 3; do
curl -k -u admin:YourStrongPassword123! \
  -X POST https://localhost:9200/blog-posts/_doc \
  -H "Content-Type: application/json" \
  -d "{\"title\": \"Test Post $i\", \"content\": \"Content for post $i about OpenSearch\", \"author\": \"admin\", \"published_at\": \"2024-03-02\", \"is_published\": true}"
done

# Full-text search
curl -k -u admin:YourStrongPassword123! \
  -X GET https://localhost:9200/blog-posts/_search \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "match": {
        "content": "OpenSearch"
      }
    }
  }'

# Range query for recent posts
curl -k -u admin:YourStrongPassword123! \
  -X GET https://localhost:9200/blog-posts/_search \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "range": {
        "published_at": {
          "gte": "2024-01-01",
          "lte": "now"
        }
      }
    },
    "sort": [{ "published_at": { "order": "desc" } }],
    "size": 10
  }'
```

## Installing OpenSearch Dashboards

OpenSearch Dashboards is the equivalent of Kibana:

```bash
# Add OpenSearch Dashboards repository (same key as OpenSearch)
echo "deb [signed-by=/usr/share/keyrings/opensearch-keyring.gpg] \
  https://artifacts.opensearch.org/releases/bundle/opensearch-dashboards/2.x/apt stable main" | \
  sudo tee /etc/apt/sources.list.d/opensearch-dashboards-2.x.list

sudo apt update
sudo apt install -y opensearch-dashboards

sudo systemctl enable opensearch-dashboards
sudo systemctl start opensearch-dashboards
```

Configure it:

```bash
sudo nano /etc/opensearch-dashboards/opensearch_dashboards.yml
```

```yaml
server.host: "0.0.0.0"
opensearch.hosts: ["https://localhost:9200"]
opensearch.ssl.verificationMode: none
opensearch.username: "kibanaserver"
opensearch.password: "YourStrongPassword123!"
```

Access OpenSearch Dashboards at `http://your-server:5601`.

## Index Lifecycle Management

Set up automatic index rotation and deletion:

```bash
# Create an ISM (Index State Management) policy
curl -k -u admin:YourStrongPassword123! \
  -X PUT https://localhost:9200/_plugins/_ism/policies/logs-policy \
  -H "Content-Type: application/json" \
  -d '{
    "policy": {
      "description": "Rotate and delete old log indexes",
      "default_state": "hot",
      "states": [
        {
          "name": "hot",
          "actions": [],
          "transitions": [{
            "state_name": "delete",
            "conditions": { "min_index_age": "30d" }
          }]
        },
        {
          "name": "delete",
          "actions": [{ "delete": {} }],
          "transitions": []
        }
      ]
    }
  }'
```

Monitor your OpenSearch cluster's health and query performance with [OneUptime](https://oneuptime.com) to ensure your search infrastructure stays operational.
