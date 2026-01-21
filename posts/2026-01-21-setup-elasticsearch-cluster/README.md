# How to Set Up an Elasticsearch Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Cluster, DevOps, Search, High Availability, Infrastructure

Description: A comprehensive guide to setting up a multi-node Elasticsearch cluster, covering node roles, network configuration, cluster discovery, and production deployment best practices.

---

Setting up a multi-node Elasticsearch cluster is essential for achieving high availability, scalability, and performance in production environments. This guide walks you through configuring a robust Elasticsearch cluster from scratch, covering node roles, network settings, cluster discovery, and operational best practices.

## Understanding Elasticsearch Cluster Architecture

An Elasticsearch cluster consists of one or more nodes that work together to store data and provide search capabilities. Each node can perform different roles:

- **Master nodes**: Manage cluster-wide operations like creating/deleting indices and tracking cluster members
- **Data nodes**: Store data and execute search and aggregation operations
- **Ingest nodes**: Pre-process documents before indexing
- **Coordinating nodes**: Route requests and reduce results from data nodes
- **Machine learning nodes**: Run machine learning jobs

## Prerequisites

Before setting up your cluster, ensure you have:

- At least 3 servers (for production high availability)
- Ubuntu 22.04 LTS or similar Linux distribution
- Minimum 4GB RAM per node (8GB+ recommended for production)
- Java 11 or later (bundled with Elasticsearch)
- Open ports: 9200 (HTTP), 9300 (transport)

## Installing Elasticsearch on All Nodes

First, install Elasticsearch on each node:

```bash
# Import Elasticsearch GPG key
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo gpg --dearmor -o /usr/share/keyrings/elasticsearch-keyring.gpg

# Add the Elasticsearch repository
echo "deb [signed-by=/usr/share/keyrings/elasticsearch-keyring.gpg] https://artifacts.elastic.co/packages/8.x/apt stable main" | sudo tee /etc/apt/sources.list.d/elastic-8.x.list

# Update and install
sudo apt update
sudo apt install elasticsearch -y
```

## Cluster Configuration

### Node 1: Master-eligible Node (es-master-1)

Edit `/etc/elasticsearch/elasticsearch.yml`:

```yaml
# Cluster name - must be the same across all nodes
cluster.name: production-cluster

# Node name - unique for each node
node.name: es-master-1

# Node roles
node.roles: [master, data]

# Network settings
network.host: 192.168.1.10
http.port: 9200
transport.port: 9300

# Path settings
path.data: /var/lib/elasticsearch
path.logs: /var/log/elasticsearch

# Discovery settings
discovery.seed_hosts:
  - 192.168.1.10:9300
  - 192.168.1.11:9300
  - 192.168.1.12:9300

# Initial master nodes (only used for first cluster bootstrap)
cluster.initial_master_nodes:
  - es-master-1
  - es-master-2
  - es-master-3

# Security settings
xpack.security.enabled: true
xpack.security.enrollment.enabled: true

xpack.security.http.ssl:
  enabled: true
  keystore.path: certs/http.p12

xpack.security.transport.ssl:
  enabled: true
  verification_mode: certificate
  keystore.path: certs/transport.p12
  truststore.path: certs/transport.p12
```

### Node 2: Master-eligible Node (es-master-2)

Edit `/etc/elasticsearch/elasticsearch.yml`:

```yaml
cluster.name: production-cluster
node.name: es-master-2
node.roles: [master, data]

network.host: 192.168.1.11
http.port: 9200
transport.port: 9300

path.data: /var/lib/elasticsearch
path.logs: /var/log/elasticsearch

discovery.seed_hosts:
  - 192.168.1.10:9300
  - 192.168.1.11:9300
  - 192.168.1.12:9300

cluster.initial_master_nodes:
  - es-master-1
  - es-master-2
  - es-master-3

xpack.security.enabled: true
xpack.security.enrollment.enabled: true

xpack.security.http.ssl:
  enabled: true
  keystore.path: certs/http.p12

xpack.security.transport.ssl:
  enabled: true
  verification_mode: certificate
  keystore.path: certs/transport.p12
  truststore.path: certs/transport.p12
```

### Node 3: Master-eligible Node (es-master-3)

Edit `/etc/elasticsearch/elasticsearch.yml`:

```yaml
cluster.name: production-cluster
node.name: es-master-3
node.roles: [master, data]

network.host: 192.168.1.12
http.port: 9200
transport.port: 9300

path.data: /var/lib/elasticsearch
path.logs: /var/log/elasticsearch

discovery.seed_hosts:
  - 192.168.1.10:9300
  - 192.168.1.11:9300
  - 192.168.1.12:9300

cluster.initial_master_nodes:
  - es-master-1
  - es-master-2
  - es-master-3

xpack.security.enabled: true
xpack.security.enrollment.enabled: true

xpack.security.http.ssl:
  enabled: true
  keystore.path: certs/http.p12

xpack.security.transport.ssl:
  enabled: true
  verification_mode: certificate
  keystore.path: certs/transport.p12
  truststore.path: certs/transport.p12
```

## Setting Up Security Certificates

Elasticsearch 8.x enables security by default. Generate certificates for secure communication:

### On the First Node (es-master-1)

```bash
# Create a certificate authority
sudo /usr/share/elasticsearch/bin/elasticsearch-certutil ca --out /etc/elasticsearch/certs/elastic-stack-ca.p12 --pass ""

# Generate certificates for all nodes
sudo /usr/share/elasticsearch/bin/elasticsearch-certutil cert \
  --ca /etc/elasticsearch/certs/elastic-stack-ca.p12 \
  --ca-pass "" \
  --out /etc/elasticsearch/certs/elastic-certificates.p12 \
  --pass ""

# Generate HTTP certificates
sudo /usr/share/elasticsearch/bin/elasticsearch-certutil http
```

When running the HTTP certificate utility, you will be prompted for configuration. Use these settings:

```
Generate a CSR? [y/N] n
Use an existing CA? [y/N] y
CA Path: /etc/elasticsearch/certs/elastic-stack-ca.p12
Password for elastic-stack-ca.p12: (empty)
Validity (days): 365
Generate a certificate per node? [y/N] y
```

For each node, provide the following:
- Node name (es-master-1, es-master-2, es-master-3)
- Hostname
- IP address

### Copy Certificates to All Nodes

```bash
# Create certs directory on all nodes
sudo mkdir -p /etc/elasticsearch/certs

# Copy certificates (from first node to others)
scp /etc/elasticsearch/certs/*.p12 user@192.168.1.11:/tmp/
scp /etc/elasticsearch/certs/*.p12 user@192.168.1.12:/tmp/

# On each receiving node, move certs to the proper location
sudo mv /tmp/*.p12 /etc/elasticsearch/certs/
sudo chown -R elasticsearch:elasticsearch /etc/elasticsearch/certs/
sudo chmod 660 /etc/elasticsearch/certs/*
```

## Starting the Cluster

### Start Elasticsearch on All Nodes

Start the first node first, then the others:

```bash
# On each node
sudo systemctl daemon-reload
sudo systemctl enable elasticsearch
sudo systemctl start elasticsearch
```

### Reset the Elastic User Password

On the first node:

```bash
sudo /usr/share/elasticsearch/bin/elasticsearch-reset-password -u elastic -i
```

## Verifying Cluster Health

### Check Cluster Status

```bash
# Using curl with the elastic user
curl -k -u elastic:your_password "https://192.168.1.10:9200/_cluster/health?pretty"
```

Expected output:

```json
{
  "cluster_name": "production-cluster",
  "status": "green",
  "timed_out": false,
  "number_of_nodes": 3,
  "number_of_data_nodes": 3,
  "active_primary_shards": 1,
  "active_shards": 2,
  "relocating_shards": 0,
  "initializing_shards": 0,
  "unassigned_shards": 0,
  "delayed_unassigned_shards": 0,
  "number_of_pending_tasks": 0,
  "number_of_in_flight_fetch": 0,
  "task_max_waiting_in_queue_millis": 0,
  "active_shards_percent_as_number": 100.0
}
```

### List Cluster Nodes

```bash
curl -k -u elastic:your_password "https://192.168.1.10:9200/_cat/nodes?v"
```

Expected output:

```
ip           heap.percent ram.percent cpu load_1m load_5m load_15m node.role master name
192.168.1.10           45          72   3    0.12    0.08     0.05 dm        *      es-master-1
192.168.1.11           38          68   2    0.08    0.06     0.04 dm        -      es-master-2
192.168.1.12           42          70   2    0.10    0.07     0.05 dm        -      es-master-3
```

## Adding Dedicated Data Nodes

For larger clusters, add dedicated data nodes:

### Data Node Configuration

```yaml
# /etc/elasticsearch/elasticsearch.yml for data node
cluster.name: production-cluster
node.name: es-data-1
node.roles: [data]

network.host: 192.168.1.20
http.port: 9200
transport.port: 9300

path.data: /var/lib/elasticsearch
path.logs: /var/log/elasticsearch

discovery.seed_hosts:
  - 192.168.1.10:9300
  - 192.168.1.11:9300
  - 192.168.1.12:9300

# Note: Do NOT include cluster.initial_master_nodes for nodes joining existing cluster

xpack.security.enabled: true

xpack.security.http.ssl:
  enabled: true
  keystore.path: certs/http.p12

xpack.security.transport.ssl:
  enabled: true
  verification_mode: certificate
  keystore.path: certs/transport.p12
  truststore.path: certs/transport.p12
```

### Enrolling New Nodes

On an existing cluster node, generate an enrollment token:

```bash
sudo /usr/share/elasticsearch/bin/elasticsearch-create-enrollment-token -s node
```

On the new node, use the token to join:

```bash
sudo /usr/share/elasticsearch/bin/elasticsearch-reconfigure-node --enrollment-token <enrollment-token>
```

## Adding Coordinating-Only Nodes

For high query loads, add coordinating-only nodes:

```yaml
cluster.name: production-cluster
node.name: es-coord-1
node.roles: []  # Empty roles makes it a coordinating-only node

network.host: 192.168.1.30
http.port: 9200
transport.port: 9300

path.data: /var/lib/elasticsearch
path.logs: /var/log/elasticsearch

discovery.seed_hosts:
  - 192.168.1.10:9300
  - 192.168.1.11:9300
  - 192.168.1.12:9300

xpack.security.enabled: true

xpack.security.http.ssl:
  enabled: true
  keystore.path: certs/http.p12

xpack.security.transport.ssl:
  enabled: true
  verification_mode: certificate
  keystore.path: certs/transport.p12
  truststore.path: certs/transport.p12
```

## Configuring Shard Allocation

### Set Default Number of Replicas

```bash
curl -k -u elastic:your_password -X PUT "https://192.168.1.10:9200/_cluster/settings" \
  -H "Content-Type: application/json" \
  -d '{
    "persistent": {
      "cluster.routing.allocation.node_concurrent_recoveries": 4,
      "cluster.routing.allocation.node_initial_primaries_recoveries": 8
    }
  }'
```

### Configure Shard Awareness for Rack/Zone Distribution

```yaml
# On nodes in rack1
node.attr.rack: rack1

# On nodes in rack2
node.attr.rack: rack2
```

Enable awareness in cluster settings:

```bash
curl -k -u elastic:your_password -X PUT "https://192.168.1.10:9200/_cluster/settings" \
  -H "Content-Type: application/json" \
  -d '{
    "persistent": {
      "cluster.routing.allocation.awareness.attributes": "rack"
    }
  }'
```

## Load Balancing with HAProxy

Configure HAProxy to distribute requests across nodes:

```
# /etc/haproxy/haproxy.cfg
frontend elasticsearch_frontend
    bind *:9200
    default_backend elasticsearch_backend

backend elasticsearch_backend
    balance roundrobin
    option httpchk GET /_cluster/health
    http-check expect status 200
    server es-master-1 192.168.1.10:9200 check ssl verify none
    server es-master-2 192.168.1.11:9200 check ssl verify none
    server es-master-3 192.168.1.12:9200 check ssl verify none
```

## Index Management

### Creating an Index with Proper Settings

```bash
curl -k -u elastic:your_password -X PUT "https://192.168.1.10:9200/my-index" \
  -H "Content-Type: application/json" \
  -d '{
    "settings": {
      "number_of_shards": 3,
      "number_of_replicas": 1,
      "refresh_interval": "5s"
    },
    "mappings": {
      "properties": {
        "title": { "type": "text" },
        "content": { "type": "text" },
        "created_at": { "type": "date" },
        "views": { "type": "integer" }
      }
    }
  }'
```

### Indexing Documents

```bash
curl -k -u elastic:your_password -X POST "https://192.168.1.10:9200/my-index/_doc" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Getting Started with Elasticsearch",
    "content": "Elasticsearch is a distributed search engine...",
    "created_at": "2024-01-15T10:30:00",
    "views": 100
  }'
```

### Searching Documents

```bash
curl -k -u elastic:your_password -X GET "https://192.168.1.10:9200/my-index/_search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "match": {
        "title": "Elasticsearch"
      }
    }
  }'
```

## Monitoring Cluster Health

### Check Shard Allocation

```bash
curl -k -u elastic:your_password "https://192.168.1.10:9200/_cat/shards?v"
```

### View Pending Tasks

```bash
curl -k -u elastic:your_password "https://192.168.1.10:9200/_cat/pending_tasks?v"
```

### Check Cluster Statistics

```bash
curl -k -u elastic:your_password "https://192.168.1.10:9200/_cluster/stats?pretty"
```

## Troubleshooting Common Issues

### Cluster Status Yellow or Red

Check unassigned shards:

```bash
curl -k -u elastic:your_password "https://192.168.1.10:9200/_cat/shards?v&h=index,shard,prirep,state,unassigned.reason"
```

Get allocation explanation:

```bash
curl -k -u elastic:your_password "https://192.168.1.10:9200/_cluster/allocation/explain?pretty"
```

### Node Not Joining Cluster

1. Verify cluster name matches on all nodes
2. Check discovery settings
3. Ensure ports 9200 and 9300 are open
4. Verify certificate trust

```bash
# Check if transport port is accessible
telnet 192.168.1.10 9300

# Check Elasticsearch logs
sudo journalctl -u elasticsearch -f
```

### Split Brain Prevention

Elasticsearch 7.x and later prevent split brain automatically. Ensure you have:
- An odd number of master-eligible nodes (3, 5, 7)
- Proper discovery configuration

## Production Best Practices

1. **Use dedicated master nodes**: In large clusters, separate master and data roles
2. **Configure heap size**: Set to 50% of available RAM, max 31GB
3. **Use SSDs**: For best indexing and search performance
4. **Enable slow query logging**: For performance monitoring
5. **Set up regular snapshots**: For backup and disaster recovery
6. **Monitor cluster metrics**: Use Kibana or Prometheus/Grafana
7. **Plan for capacity**: Monitor disk usage and add nodes before reaching limits

## Conclusion

Setting up an Elasticsearch cluster requires careful planning of node roles, network configuration, and security settings. A properly configured cluster provides:

- High availability through data replication
- Horizontal scalability for both storage and query capacity
- Fault tolerance against node failures

Key takeaways:
- Use at least 3 master-eligible nodes for production
- Configure proper security with TLS and authentication
- Monitor cluster health continuously
- Plan shard allocation for your workload patterns
- Implement load balancing for client connections

With this foundation, you can scale your cluster to handle growing data volumes and query loads while maintaining reliability and performance.
