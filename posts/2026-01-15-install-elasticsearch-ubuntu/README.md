# How to Install Elasticsearch on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Elasticsearch, Search, Database, Observability, Tutorial

Description: Complete guide to installing, configuring, and securing Elasticsearch on Ubuntu for search and analytics use cases.

---

Elasticsearch is a distributed search and analytics engine built on Apache Lucene. It powers search functionality, log analytics, and observability platforms. This guide covers installation, configuration, and security setup on Ubuntu.

## Prerequisites

- Ubuntu 20.04, 22.04, or 24.04
- At least 4GB RAM (8GB+ recommended for production)
- Java 11+ (Elasticsearch bundles its own JDK)
- Root or sudo access

## Installing Elasticsearch

### Add Elasticsearch Repository

```bash
# Import Elasticsearch GPG key
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo gpg --dearmor -o /usr/share/keyrings/elasticsearch-keyring.gpg

# Add repository
echo "deb [signed-by=/usr/share/keyrings/elasticsearch-keyring.gpg] https://artifacts.elastic.co/packages/8.x/apt stable main" | sudo tee /etc/apt/sources.list.d/elastic-8.x.list

# Update package lists
sudo apt update
```

### Install Elasticsearch

```bash
# Install Elasticsearch
sudo apt install elasticsearch -y
```

During installation, note the security information displayed:
- Default password for 'elastic' user
- Enrollment token for Kibana
- Commands to reset password

## Configure Elasticsearch

### Main Configuration File

```bash
# Edit main configuration
sudo nano /etc/elasticsearch/elasticsearch.yml
```

### Single Node Configuration

```yaml
# Cluster name
cluster.name: my-application

# Node name
node.name: node-1

# Data and log paths
path.data: /var/lib/elasticsearch
path.logs: /var/log/elasticsearch

# Network binding
network.host: 0.0.0.0
http.port: 9200

# Discovery settings for single node
discovery.type: single-node

# Disable security for development (NOT for production)
# xpack.security.enabled: false
```

### Production Cluster Configuration

For multi-node clusters:

```yaml
# Cluster name (must be same on all nodes)
cluster.name: production-cluster

# Node name (unique per node)
node.name: es-node-1

# Node roles
node.roles: [master, data]

# Paths
path.data: /var/lib/elasticsearch
path.logs: /var/log/elasticsearch

# Network
network.host: 192.168.1.10
http.port: 9200
transport.port: 9300

# Discovery
discovery.seed_hosts:
  - 192.168.1.10
  - 192.168.1.11
  - 192.168.1.12

cluster.initial_master_nodes:
  - es-node-1
  - es-node-2
  - es-node-3

# Security
xpack.security.enabled: true
xpack.security.transport.ssl.enabled: true
```

## JVM Configuration

### Set Heap Size

```bash
# Edit JVM options
sudo nano /etc/elasticsearch/jvm.options.d/heap.options
```

```
# Set heap to 50% of available RAM (max 31GB)
-Xms4g
-Xmx4g
```

Rule of thumb:
- Set to 50% of available RAM
- Never exceed 31GB (JVM compressed pointers limit)
- Xms and Xmx should be equal

## System Configuration

### Configure System Limits

```bash
# Edit limits configuration
sudo nano /etc/security/limits.conf
```

Add:

```
elasticsearch soft nofile 65535
elasticsearch hard nofile 65535
elasticsearch soft nproc 4096
elasticsearch hard nproc 4096
elasticsearch soft memlock unlimited
elasticsearch hard memlock unlimited
```

### Disable Swapping

```bash
# Disable swap
sudo swapoff -a

# Or configure Elasticsearch to lock memory
# In elasticsearch.yml:
# bootstrap.memory_lock: true
```

### Configure Virtual Memory

```bash
# Increase virtual memory map count
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## Start Elasticsearch

```bash
# Reload systemd
sudo systemctl daemon-reload

# Start Elasticsearch
sudo systemctl start elasticsearch

# Enable on boot
sudo systemctl enable elasticsearch

# Check status
sudo systemctl status elasticsearch
```

## Verify Installation

### Check Cluster Health

```bash
# Without security (development)
curl -X GET "localhost:9200/_cluster/health?pretty"

# With security enabled
curl -X GET "https://localhost:9200/_cluster/health?pretty" \
  -u elastic:your_password \
  --cacert /etc/elasticsearch/certs/http_ca.crt
```

### Check Node Info

```bash
curl -X GET "localhost:9200/_nodes?pretty" -u elastic:password
```

## Security Configuration

### Reset Elastic Password

```bash
# Reset password for elastic user
sudo /usr/share/elasticsearch/bin/elasticsearch-reset-password -u elastic
```

### Create Users

```bash
# Create new user
sudo /usr/share/elasticsearch/bin/elasticsearch-users useradd myuser -r superuser

# Or using API
curl -X POST "localhost:9200/_security/user/myuser" \
  -u elastic:password \
  -H "Content-Type: application/json" \
  -d '{
    "password": "secure_password",
    "roles": ["superuser"],
    "full_name": "My User"
  }'
```

### Configure TLS

For production, enable TLS:

```yaml
# In elasticsearch.yml
xpack.security.enabled: true

xpack.security.http.ssl:
  enabled: true
  keystore.path: /etc/elasticsearch/certs/http.p12

xpack.security.transport.ssl:
  enabled: true
  verification_mode: certificate
  keystore.path: /etc/elasticsearch/certs/transport.p12
  truststore.path: /etc/elasticsearch/certs/transport.p12
```

Generate certificates:

```bash
# Generate CA
sudo /usr/share/elasticsearch/bin/elasticsearch-certutil ca

# Generate node certificates
sudo /usr/share/elasticsearch/bin/elasticsearch-certutil cert --ca elastic-stack-ca.p12
```

## Basic Operations

### Create Index

```bash
# Create an index
curl -X PUT "localhost:9200/my-index" \
  -u elastic:password \
  -H "Content-Type: application/json" \
  -d '{
    "settings": {
      "number_of_shards": 1,
      "number_of_replicas": 0
    }
  }'
```

### Index a Document

```bash
# Add a document
curl -X POST "localhost:9200/my-index/_doc" \
  -u elastic:password \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Document",
    "content": "This is a test document",
    "timestamp": "2026-01-15T10:00:00"
  }'
```

### Search Documents

```bash
# Simple search
curl -X GET "localhost:9200/my-index/_search?q=test" -u elastic:password

# Query DSL search
curl -X GET "localhost:9200/my-index/_search" \
  -u elastic:password \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "match": {
        "content": "test"
      }
    }
  }'
```

### Delete Index

```bash
curl -X DELETE "localhost:9200/my-index" -u elastic:password
```

## Index Lifecycle Management

### Create ILM Policy

```bash
curl -X PUT "localhost:9200/_ilm/policy/logs-policy" \
  -u elastic:password \
  -H "Content-Type: application/json" \
  -d '{
    "policy": {
      "phases": {
        "hot": {
          "min_age": "0ms",
          "actions": {
            "rollover": {
              "max_size": "50gb",
              "max_age": "1d"
            }
          }
        },
        "warm": {
          "min_age": "7d",
          "actions": {
            "shrink": {
              "number_of_shards": 1
            },
            "forcemerge": {
              "max_num_segments": 1
            }
          }
        },
        "delete": {
          "min_age": "30d",
          "actions": {
            "delete": {}
          }
        }
      }
    }
  }'
```

## Monitoring

### Cluster Health

```bash
# Detailed cluster health
curl -X GET "localhost:9200/_cluster/health?pretty" -u elastic:password

# Node statistics
curl -X GET "localhost:9200/_nodes/stats?pretty" -u elastic:password

# Index statistics
curl -X GET "localhost:9200/_stats?pretty" -u elastic:password
```

### View Logs

```bash
# Elasticsearch logs
sudo tail -f /var/log/elasticsearch/my-application.log

# Or with journalctl
sudo journalctl -u elasticsearch -f
```

## Troubleshooting

### Elasticsearch Won't Start

```bash
# Check logs for errors
sudo journalctl -u elasticsearch -n 100

# Verify configuration syntax
sudo /usr/share/elasticsearch/bin/elasticsearch -d

# Check permissions
ls -la /var/lib/elasticsearch
ls -la /var/log/elasticsearch
```

### Out of Memory

Increase heap size or add more RAM:

```bash
sudo nano /etc/elasticsearch/jvm.options.d/heap.options
# Adjust -Xms and -Xmx values
```

### Max Virtual Memory Too Low

```bash
sudo sysctl -w vm.max_map_count=262144
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
```

### Cluster Yellow/Red Status

```bash
# Check unassigned shards
curl -X GET "localhost:9200/_cat/shards?v&h=index,shard,prirep,state,unassigned.reason" \
  -u elastic:password

# Force shard allocation
curl -X POST "localhost:9200/_cluster/reroute?retry_failed=true" -u elastic:password
```

## Backup and Restore

### Register Snapshot Repository

```bash
# Create backup directory
sudo mkdir -p /var/backups/elasticsearch
sudo chown elasticsearch:elasticsearch /var/backups/elasticsearch

# Add to elasticsearch.yml
# path.repo: ["/var/backups/elasticsearch"]

# Register repository
curl -X PUT "localhost:9200/_snapshot/my_backup" \
  -u elastic:password \
  -H "Content-Type: application/json" \
  -d '{
    "type": "fs",
    "settings": {
      "location": "/var/backups/elasticsearch"
    }
  }'
```

### Create Snapshot

```bash
curl -X PUT "localhost:9200/_snapshot/my_backup/snapshot_1" -u elastic:password
```

### Restore Snapshot

```bash
curl -X POST "localhost:9200/_snapshot/my_backup/snapshot_1/_restore" -u elastic:password
```

---

Elasticsearch is a powerful search and analytics engine that forms the backbone of many observability stacks. For production deployments, always enable security features, configure proper backups, and monitor cluster health. Consider using the Elastic Cloud or managed services for easier operations at scale.
