# How to Configure ScyllaDB with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ScyllaDB, IPv6, Cassandra-compatible, NoSQL, High Performance, Cluster

Description: Configure ScyllaDB - the high-performance Cassandra-compatible database - to operate over IPv6 for cluster communication, native client connections, and monitoring.

---

ScyllaDB is a Cassandra-compatible, high-performance NoSQL database written in C++. Its IPv6 configuration is similar to Cassandra but with some ScyllaDB-specific considerations for the `scylla.yaml` configuration file.

## Installing ScyllaDB

```bash
# Ubuntu/Debian

sudo apt install curl
curl -sSf https://downloads.scylladb.com/stable/ubuntu/scylladb-apt.gpg \
  | sudo apt-key add -
sudo apt update && sudo apt install scylla -y

# RHEL/CentOS
sudo yum install epel-release
sudo yum install https://dl.scylladb.com/rpm/scylla/rhel/scylladb.noarch.rpm
sudo yum install scylla
```

## Configuring scylla.yaml for IPv6

```yaml
# /etc/scylla/scylla.yaml

# Cluster name
cluster_name: 'ScyllaDB IPv6 Cluster'

# Listen on IPv6 for inter-node communication
listen_address: 2001:db8::1

# Broadcast this IPv6 address to peers
broadcast_address: 2001:db8::1

# RPC address for CQL clients
# :: means all interfaces (IPv4 and IPv6)
rpc_address: ::

# Broadcast to clients
broadcast_rpc_address: 2001:db8::1

# Seeds for cluster discovery
seed_provider:
  - class_name: org.apache.cassandra.locator.SimpleSeedProvider
    parameters:
      - seeds: "2001:db8::1,2001:db8::2,2001:db8::3"

# Native transport (CQL) port
native_transport_port: 9042

# Storage port for inter-node
storage_port: 7000

# API port for ScyllaDB REST API
api_port: 10000
api_address: 2001:db8::1
```

## ScyllaDB System Configuration for IPv6

```bash
# Configure ScyllaDB system settings
sudo scylla_setup \
  --no-raid-setup \
  --no-coredump-setup \
  --no-sysconfig-setup

# Verify /etc/scylla.d/ for additional configs
ls /etc/scylla.d/

# Check if IPv6 is enabled in network config
cat /proc/sys/net/ipv6/conf/all/disable_ipv6
# Should be 0
```

## Starting and Verifying ScyllaDB IPv6

```bash
# Start ScyllaDB
sudo systemctl start scylla-server

# Check startup logs for IPv6 binding
sudo journalctl -u scylla-server | grep -i "listen\|ipv6\|address"

# Verify listening addresses
ss -tlnp | grep "9042\|7000\|10000"

# Check node status
nodetool status
# Should show IPv6 addresses

# Check ScyllaDB REST API
curl http://[2001:db8::1]:10000/
```

## Connecting via CQL over IPv6

```bash
# Connect with cqlsh
cqlsh 2001:db8::1

# Or using the Python driver
```

```python
# Python driver for ScyllaDB over IPv6
from cassandra.cluster import Cluster
from cassandra.auth import PlainTextAuthProvider

# ScyllaDB accepts same CQL protocol as Cassandra
cluster = Cluster(
    contact_points=['2001:db8::1', '2001:db8::2'],
    port=9042
)

session = cluster.connect()

# Create a keyspace
session.execute("""
    CREATE KEYSPACE IF NOT EXISTS myapp
    WITH replication = {
        'class': 'NetworkTopologyStrategy',
        'datacenter1': 3
    }
""")

session.set_keyspace('myapp')
print("Connected to ScyllaDB over IPv6")
cluster.shutdown()
```

## ScyllaDB Monitoring with IPv6

```yaml
# /etc/scylla.d/prometheus.yaml
# Prometheus metrics endpoint on IPv6
prometheus_address: 2001:db8::1
prometheus_port: 9180
```

```yaml
# Prometheus scrape config for ScyllaDB
# prometheus.yml
scrape_configs:
  - job_name: 'scylladb'
    static_configs:
      - targets:
          - '[2001:db8::1]:9180'
          - '[2001:db8::2]:9180'
          - '[2001:db8::3]:9180'
```

## Multi-Datacenter ScyllaDB with IPv6

```yaml
# scylla.yaml for multi-DC setup
endpoint_snitch: GossipingPropertyFileSnitch

# Each DC can have different IPv6 subnets
# DC1 nodes: 2001:db8:dc1::/48
# DC2 nodes: 2001:db8:dc2::/48
```

```bash
# /etc/scylla/cassandra-rackdc.properties
dc=datacenter1
rack=rack1
```

## Firewall Configuration for ScyllaDB IPv6

```bash
# Open all ScyllaDB ports for IPv6
sudo ip6tables -A INPUT -p tcp --dport 7000 -j ACCEPT   # Gossip
sudo ip6tables -A INPUT -p tcp --dport 9042 -j ACCEPT   # CQL
sudo ip6tables -A INPUT -p tcp --dport 9180 -j ACCEPT   # Prometheus
sudo ip6tables -A INPUT -p tcp --dport 10000 -j ACCEPT  # REST API

sudo ip6tables-save > /etc/iptables/rules.v6
```

ScyllaDB's Cassandra-compatible IPv6 configuration enables deploying this high-performance NoSQL database on IPv6 networks with minimal configuration changes compared to its IPv4 setup.
