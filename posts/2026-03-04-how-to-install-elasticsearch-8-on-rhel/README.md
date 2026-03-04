# How to Install Elasticsearch 8 on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Elasticsearch, Search Engine, ELK Stack, Full-Text Search

Description: Learn how to install and configure Elasticsearch 8 on RHEL with security features enabled by default.

---

Elasticsearch 8 enables security (TLS and authentication) by default. This guide walks through installation, configuration, and verification on RHEL.

## Adding the Elasticsearch Repository

```bash
# Import the Elasticsearch GPG key
sudo rpm --import https://artifacts.elastic.co/GPG-KEY-elasticsearch

# Add the repository
cat << 'REPO' | sudo tee /etc/yum.repos.d/elasticsearch.repo
[elasticsearch]
name=Elasticsearch repository for 8.x packages
baseurl=https://artifacts.elastic.co/packages/8.x/yum
gpgcheck=1
gpgkey=https://artifacts.elastic.co/GPG-KEY-elasticsearch
enabled=1
autorefresh=1
type=rpm-md
REPO
```

## Installing Elasticsearch

```bash
# Install Elasticsearch
sudo dnf install -y elasticsearch

# IMPORTANT: The installation outputs the elastic user password
# and enrollment token. Save these values!
```

## Configuration

```yaml
# /etc/elasticsearch/elasticsearch.yml

# Cluster and node names
cluster.name: my-cluster
node.name: node-1

# Network settings
network.host: 0.0.0.0
http.port: 9200

# Discovery (single node)
discovery.type: single-node

# Memory settings
# Set both to the same value, no more than 50% of system RAM
```

## JVM Heap Configuration

```bash
# Edit /etc/elasticsearch/jvm.options.d/heap.options
cat << 'JVM' | sudo tee /etc/elasticsearch/jvm.options.d/heap.options
-Xms2g
-Xmx2g
JVM
```

## Starting Elasticsearch

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now elasticsearch

# Check if Elasticsearch is running
# Use the password from the installation output
curl -k -u elastic:YOUR_PASSWORD https://localhost:9200
```

## Resetting the elastic Password

```bash
# Reset the built-in elastic user password
sudo /usr/share/elasticsearch/bin/elasticsearch-reset-password -u elastic

# Or set a specific password
sudo /usr/share/elasticsearch/bin/elasticsearch-reset-password -u elastic -i
```

## Firewall Configuration

```bash
sudo firewall-cmd --add-port=9200/tcp --permanent
sudo firewall-cmd --add-port=9300/tcp --permanent
sudo firewall-cmd --reload
```

## System Tuning

```bash
# Increase virtual memory map count (required by Elasticsearch)
echo "vm.max_map_count = 262144" | sudo tee /etc/sysctl.d/99-elasticsearch.conf
sudo sysctl -p /etc/sysctl.d/99-elasticsearch.conf

# Increase file descriptors
# Already handled by the RPM package in /etc/security/limits.d/
```

## Verifying the Installation

```bash
# Check cluster health
curl -k -u elastic:YOUR_PASSWORD https://localhost:9200/_cluster/health?pretty

# Create a test index
curl -k -u elastic:YOUR_PASSWORD -X PUT \
  "https://localhost:9200/test-index" \
  -H 'Content-Type: application/json' \
  -d '{"settings": {"number_of_shards": 1, "number_of_replicas": 0}}'

# Index a document
curl -k -u elastic:YOUR_PASSWORD -X POST \
  "https://localhost:9200/test-index/_doc" \
  -H 'Content-Type: application/json' \
  -d '{"message": "Elasticsearch 8 on RHEL", "timestamp": "2026-03-04T00:00:00"}'

# Search
curl -k -u elastic:YOUR_PASSWORD \
  "https://localhost:9200/test-index/_search?pretty"
```

Elasticsearch 8 enables TLS by default for both HTTP and transport layers. The `-k` flag in curl skips certificate verification for self-signed certificates. For production, configure proper certificates.
