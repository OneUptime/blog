# How to Install Elasticsearch on Ubuntu Server

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Elasticsearch, Search, Database, ELK Stack

Description: Install and configure Elasticsearch on Ubuntu Server with proper JVM tuning, security settings, and system configuration for production use.

---

Elasticsearch is a distributed search and analytics engine built on Apache Lucene. It stores data as JSON documents and provides near-real-time search across massive datasets. Getting Elasticsearch running on Ubuntu requires careful attention to JVM memory settings, file descriptor limits, and network configuration. This guide covers a production-ready installation.

## System Requirements

Before installing, ensure your server meets minimum requirements:

- RAM: 4GB minimum, 16GB+ for production
- Disk: Fast SSDs strongly recommended (spinning disks create significant latency)
- CPU: 2+ cores
- Java: Elasticsearch bundles its own JDK, but you can use a system JVM

Check available resources:

```bash
# Check available memory
free -h

# Check disk space
df -h

# Check CPU cores
nproc

# Check kernel version (need 3.10+ for Elasticsearch 8.x)
uname -r
```

## Installing Elasticsearch

```bash
# Import the Elasticsearch GPG key
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch \
  | sudo gpg --dearmor -o /usr/share/keyrings/elasticsearch-keyring.gpg

# Install required package
sudo apt install apt-transport-https

# Add the Elasticsearch repository
echo "deb [signed-by=/usr/share/keyrings/elasticsearch-keyring.gpg] \
  https://artifacts.elastic.co/packages/8.x/apt stable main" \
  | sudo tee /etc/apt/sources.list.d/elastic-8.x.list

# Update and install
sudo apt update
sudo apt install elasticsearch
```

During installation, the output includes the auto-generated password for the `elastic` superuser. Save this somewhere secure - you will need it.

## Core Configuration

The main configuration file is `/etc/elasticsearch/elasticsearch.yml`:

```bash
sudo nano /etc/elasticsearch/elasticsearch.yml
```

```yaml
# Cluster name - all nodes in a cluster must share this name
cluster.name: my-production-cluster

# Node name - must be unique per node
node.name: node-1

# Data and logs paths
path.data: /var/lib/elasticsearch
path.logs: /var/log/elasticsearch

# Network settings
# For single-server: bind to localhost
# For a cluster: bind to the server's IP
network.host: localhost
# For remote access:
# network.host: 0.0.0.0

# HTTP port (REST API)
http.port: 9200

# Transport port (inter-node communication)
transport.port: 9300

# For a single-node setup (no clustering)
discovery.type: single-node

# For a multi-node cluster:
# discovery.seed_hosts: ["10.0.0.10", "10.0.0.11", "10.0.0.12"]
# cluster.initial_master_nodes: ["node-1", "node-2", "node-3"]

# Security is enabled by default in Elasticsearch 8.x
xpack.security.enabled: true
xpack.security.enrollment.enabled: true

# HTTP TLS configuration (auto-configured in 8.x)
xpack.security.http.ssl:
  enabled: true
  keystore.path: certs/http.p12

# Transport TLS configuration
xpack.security.transport.ssl:
  enabled: true
  verification_mode: certificate
  keystore.path: certs/transport.p12
  truststore.path: certs/transport.p12
```

## JVM Memory Configuration

Elasticsearch's JVM memory settings are in `/etc/elasticsearch/jvm.options.d/`. Create a custom file:

```bash
sudo nano /etc/elasticsearch/jvm.options.d/custom.options
```

```text
# Set heap size to approximately half of available RAM
# Do NOT exceed 31GB (avoids compressed ordinary object pointer issues)
# Minimum: do not go below 2GB for production
-Xms4g
-Xmx4g

# Enable G1 GC (recommended for Elasticsearch 8.x)
-XX:+UseG1GC

# G1GC tuning
-XX:MaxGCPauseMillis=50
-XX:InitiatingHeapOccupancyPercent=75
```

The rule of thumb: set heap to 50% of available RAM, up to a maximum of 31GB. Leave the other 50% for the OS page cache, which Elasticsearch uses heavily for Lucene index access.

```bash
# For a server with 16GB RAM, use 8GB heap:
echo "-Xms8g" | sudo tee /etc/elasticsearch/jvm.options.d/heap.options
echo "-Xmx8g" | sudo tee -a /etc/elasticsearch/jvm.options.d/heap.options
```

## System Tuning

Elasticsearch needs several kernel parameters adjusted:

```bash
# Increase virtual memory limit (required by Elasticsearch)
sudo sysctl -w vm.max_map_count=262144
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf

# Disable swap (Elasticsearch performs poorly with swap)
sudo swapoff -a
# Comment out swap in /etc/fstab to make permanent:
sudo sed -i '/ swap / s/^/#/' /etc/fstab

# Apply sysctl changes
sudo sysctl -p
```

Increase file descriptor limits:

```bash
# Edit the systemd service override
sudo systemctl edit elasticsearch
```

```ini
[Service]
LimitNOFILE=65535
LimitNPROC=4096
LimitAS=infinity
LimitFSIZE=infinity
```

Or edit `/etc/security/limits.conf`:

```text
elasticsearch soft nofile 65535
elasticsearch hard nofile 65535
elasticsearch soft nproc 4096
elasticsearch hard nproc 4096
```

## Starting Elasticsearch

```bash
# Enable and start Elasticsearch
sudo systemctl daemon-reload
sudo systemctl enable elasticsearch
sudo systemctl start elasticsearch

# Check status
sudo systemctl status elasticsearch

# Watch the startup logs
sudo journalctl -u elasticsearch -f
```

Elasticsearch takes 30-60 seconds to start. Check the logs for the "started" message.

## Retrieving Security Credentials

In Elasticsearch 8.x, security is enabled by default. The `elastic` user password was shown during installation. If you missed it:

```bash
# Reset the elastic user password
sudo /usr/share/elasticsearch/bin/elasticsearch-reset-password -u elastic

# Generate an enrollment token for Kibana
sudo /usr/share/elasticsearch/bin/elasticsearch-create-enrollment-token -s kibana
```

## Testing the Installation

```bash
# Test with the auto-generated CA certificate
curl --cacert /etc/elasticsearch/certs/http_ca.crt \
  -u "elastic:your_password_here" \
  https://localhost:9200

# Expected JSON response showing cluster info

# Check cluster health
curl --cacert /etc/elasticsearch/certs/http_ca.crt \
  -u "elastic:your_password_here" \
  https://localhost:9200/_cluster/health?pretty

# List indices
curl --cacert /etc/elasticsearch/certs/http_ca.crt \
  -u "elastic:your_password_here" \
  https://localhost:9200/_cat/indices?v
```

## Creating an Index and Adding Data

```bash
# Create an index with custom settings
curl --cacert /etc/elasticsearch/certs/http_ca.crt \
  -u "elastic:your_password_here" \
  -X PUT https://localhost:9200/products \
  -H "Content-Type: application/json" \
  -d '{
    "settings": {
      "number_of_shards": 1,
      "number_of_replicas": 0
    },
    "mappings": {
      "properties": {
        "name": {"type": "text"},
        "price": {"type": "float"},
        "category": {"type": "keyword"},
        "created_at": {"type": "date"}
      }
    }
  }'

# Add a document
curl --cacert /etc/elasticsearch/certs/http_ca.crt \
  -u "elastic:your_password_here" \
  -X POST https://localhost:9200/products/_doc \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Laptop Pro 15",
    "price": 1299.99,
    "category": "electronics",
    "created_at": "2026-03-01"
  }'

# Search for documents
curl --cacert /etc/elasticsearch/certs/http_ca.crt \
  -u "elastic:your_password_here" \
  "https://localhost:9200/products/_search?q=laptop&pretty"
```

## Configuring a Non-SSL Setup (Development Only)

For development or internal-only access, disable security:

```bash
sudo nano /etc/elasticsearch/elasticsearch.yml
```

```yaml
# WARNING: Only for development/testing
xpack.security.enabled: false
xpack.security.enrollment.enabled: false
xpack.security.http.ssl.enabled: false
xpack.security.transport.ssl.enabled: false
network.host: localhost
discovery.type: single-node
```

```bash
sudo systemctl restart elasticsearch

# Test without authentication
curl http://localhost:9200
```

## Monitoring Elasticsearch

```bash
# Cluster health
curl -u elastic:password http://localhost:9200/_cluster/health?pretty

# Node stats (JVM, memory, disk)
curl -u elastic:password http://localhost:9200/_nodes/stats?pretty

# Index statistics
curl -u elastic:password http://localhost:9200/_stats?pretty

# Pending tasks
curl -u elastic:password http://localhost:9200/_cluster/pending_tasks

# Hot threads (useful for debugging high CPU)
curl -u elastic:password http://localhost:9200/_nodes/hot_threads
```

## Log Files

```bash
# View main log
sudo tail -f /var/log/elasticsearch/my-production-cluster.log

# Slow query log (set threshold in elasticsearch.yml)
sudo tail -f /var/log/elasticsearch/my-production-cluster_index_search_slowlog.log

# GC log
sudo ls /var/log/elasticsearch/
```

Elasticsearch is powerful but resource-intensive. Getting the JVM heap sizing right and ensuring swap is disabled are the two most important factors for stable production operation.
