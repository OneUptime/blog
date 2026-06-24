# How to Configure Apache Cassandra Cluster with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cassandra, IPv6, Distributed Database, NoSQL, Cluster, Gossip Protocol

Description: Configure an Apache Cassandra cluster to use IPv6 addresses for gossip communication, native transport, and RPC, enabling NoSQL database clustering over IPv6 networks.

---

Apache Cassandra uses a gossip protocol for cluster communication. Configuring it for IPv6 requires updating `cassandra.yaml` with IPv6 listen and broadcast addresses for both gossip and native transport communication.

## Cassandra IPv6 Key Configuration Parameters

```yaml
# Critical parameters in cassandra.yaml for IPv6:

# listen_address - What address Cassandra uses for inter-node communication
# broadcast_address - What address other nodes use to reach this node
# rpc_address - What address the native transport server binds to
# broadcast_rpc_address - What drivers are told to connect to
```

## Configuring cassandra.yaml for IPv6

```yaml
# /etc/cassandra/cassandra.yaml

# Cluster name
cluster_name: 'IPv6 Cluster'

# Listen on IPv6 address for inter-node communication
listen_address: 2001:db8::1
# NOT listen_interface when using explicit address

# Broadcast this IPv6 address to other nodes
broadcast_address: 2001:db8::1

# Native transport address for client connections
rpc_address: 2001:db8::1

# Broadcast RPC address to drivers
broadcast_rpc_address: 2001:db8::1

# Seeds - nodes to contact for cluster discovery
seed_provider:
  - class_name: org.apache.cassandra.locator.SimpleSeedProvider
    parameters:
      - seeds: "2001:db8::1,2001:db8::2"

# Ports remain the same as IPv4
storage_port: 7000
# Legacy encrypted internode port (deprecated in Cassandra 4.0+)
ssl_storage_port: 7001
native_transport_port: 9042

# Enable IPv6 support in the JVM
# Comment out -Djava.net.preferIPv4Stack=true in jvm-server.options
```

## JVM Options for IPv6

```bash
# /etc/cassandra/jvm-server.options
# Comment out the default IPv4-only preference to enable IPv6 support
# -Djava.net.preferIPv4Stack=true
```

## Starting Cassandra on IPv6

```bash
# Start Cassandra
sudo systemctl start cassandra

# Verify it's listening on IPv6
ss -tlnp | grep "9042\|7000"
# Should show [2001:db8::1]:9042 for native transport
# And [2001:db8::1]:7000 for storage

# Check Cassandra status
nodetool status
# Should show IPv6 address in the output

# Check gossip information
nodetool gossipinfo | head -20
```

## Connecting to Cassandra over IPv6

```bash
# Use cqlsh with IPv6 address
cqlsh 2001:db8::1

# Or with explicit port
cqlsh 2001:db8::1 9042

# Test connection
cqlsh -e "SELECT cluster_name FROM system.local;" 2001:db8::1
```

```python
# Python driver connection over IPv6
from cassandra.cluster import Cluster

# Connect to Cassandra cluster via IPv6
cluster = Cluster(
    contact_points=['2001:db8::1', '2001:db8::2'],
    port=9042
)

session = cluster.connect()
row = session.execute("SELECT cluster_name FROM system.local").one()
print(f"Connected to cluster: {row.cluster_name}")

cluster.shutdown()
```

## Multi-Node Cluster Configuration

For a 3-node cluster, configure each node differently:

```bash
# Node 1: listen_address: 2001:db8::1
# Node 2: listen_address: 2001:db8::2
# Node 3: listen_address: 2001:db8::3

# All nodes share the same seed list:
# seeds: "2001:db8::1,2001:db8::2"

# Bootstrap node 2 and 3 AFTER node 1 is running
sudo systemctl start cassandra  # On node 2 after node 1 is up
```

## Firewall Rules for Cassandra IPv6

```bash
# Allow Cassandra ports for IPv6
sudo ip6tables -A INPUT -p tcp -s 2001:db8::/48 --dport 7000 -j ACCEPT   # Storage/gossip
sudo ip6tables -A INPUT -p tcp -s 2001:db8::/48 --dport 7001 -j ACCEPT   # Legacy SSL storage
sudo ip6tables -A INPUT -p tcp --dport 9042 -j ACCEPT                    # Native transport
sudo ip6tables -A INPUT -p tcp -s 2001:db8::/48 --dport 7199 -j ACCEPT   # JMX, if remote JMX is enabled

sudo ip6tables-save | sudo tee /etc/ip6tables/rules.v6 > /dev/null
```

Apache Cassandra's IPv6 support through configurable listen and broadcast addresses enables building geographically distributed NoSQL clusters on modern IPv6 infrastructure with the same scalability characteristics as IPv4 deployments.
