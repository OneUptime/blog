# How to Install Elasticsearch 8 on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Elasticsearch, ELK Stack, Linux

Description: Learn how to install Elasticsearch 8 on RHEL 9 with step-by-step instructions, configuration examples, and best practices.

---

Elasticsearch 8 is a distributed search and analytics engine that forms the core of the Elastic Stack. It provides full-text search, structured search, and analytics capabilities with automatic security features enabled by default.

## Prerequisites

- RHEL 9
- At least 4 GB RAM
- Root or sudo access

## Step 1: Import the Elasticsearch GPG Key

```bash
sudo rpm --import https://artifacts.elastic.co/GPG-KEY-elasticsearch
```

## Step 2: Add the Repository

```bash
sudo vi /etc/yum.repos.d/elasticsearch.repo
```

```ini
[elasticsearch]
name=Elasticsearch repository for 8.x packages
baseurl=https://artifacts.elastic.co/packages/8.x/yum
gpgcheck=1
gpgkey=https://artifacts.elastic.co/GPG-KEY-elasticsearch
enabled=1
autorefresh=1
type=rpm-md
```

## Step 3: Install Elasticsearch

```bash
sudo dnf install -y elasticsearch
```

The installation prints an auto-generated password for the elastic user. Save it.

## Step 4: Configure Elasticsearch

```bash
sudo vi /etc/elasticsearch/elasticsearch.yml
```

```yaml
cluster.name: my-cluster
node.name: node-1
path.data: /var/lib/elasticsearch
path.logs: /var/log/elasticsearch
network.host: 0.0.0.0
discovery.type: single-node
xpack.security.enabled: true
```

## Step 5: Configure JVM Heap

```bash
sudo vi /etc/elasticsearch/jvm.options.d/heap.options
```

```bash
-Xms2g
-Xmx2g
```

Set heap to 50% of available RAM, but no more than 31 GB.

## Step 6: Start and Enable

```bash
sudo systemctl enable --now elasticsearch
```

## Step 7: Verify

```bash
curl -k -u elastic:YOUR_PASSWORD https://localhost:9200
```

## Step 8: Reset Password (if needed)

```bash
sudo /usr/share/elasticsearch/bin/elasticsearch-reset-password -u elastic
```

## Step 9: Configure Firewall

```bash
sudo firewall-cmd --permanent --add-port=9200/tcp
sudo firewall-cmd --reload
```

## Conclusion

Elasticsearch 8 on RHEL 9 provides a powerful search and analytics engine with security enabled by default. Its single-node mode is suitable for development, while cluster mode handles production workloads at scale.
