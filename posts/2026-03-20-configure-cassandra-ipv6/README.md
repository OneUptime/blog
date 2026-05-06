# How to Configure Cassandra with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Cassandra, Database, NoSQL, Distributed

Description: Learn how to configure Apache Cassandra to use IPv6 addresses for native transport, inter-node communication, and client connections.

## Cassandra cassandra.yaml IPv6 Settings

```yaml
# /etc/cassandra/cassandra.yaml

# Address for inter-node communication (seeds, gossip)
# Use either listen_address or listen_interface, not both.
# If you use an interface name, prefer the IPv6 address on that interface.
# listen_interface: eth0
# listen_interface_prefer_ipv6: true

# Or specify IPv6 address directly
listen_address: "2001:db8::10"

# RPC/Native transport (client connections)
# Use either rpc_address or rpc_interface, not both.
# rpc_interface: eth0
# rpc_interface_prefer_ipv6: true
rpc_address: "2001:db8::10"

# Broadcast address (what other nodes see as your address)
broadcast_address: "2001:db8::10"
broadcast_rpc_address: "2001:db8::10"

# Seeds for initial discovery
seed_provider:
  - class_name: org.apache.cassandra.locator.SimpleSeedProvider
    parameters:
      - seeds: "2001:db8::10,2001:db8::11,2001:db8::12"
```

## JVM IPv6 Configuration for Cassandra

```bash
# Cassandra runs on JVM - configure it to prefer IPv6
# /etc/cassandra/jvm-server.options
# For older installs or dynamically computed JVM flags, use /etc/cassandra/cassandra-env.sh

# Add to JVM options:
-Djava.net.preferIPv6Addresses=true

# Or set in environment:
echo 'JVM_OPTS="$JVM_OPTS -Djava.net.preferIPv6Addresses=true"' >> /etc/cassandra/cassandra-env.sh
```

## Three-Node IPv6 Cluster Configuration

```yaml
# Node 1 (/etc/cassandra/cassandra.yaml)
cluster_name: 'MyIPv6Cluster'
listen_address: 2001:db8::10
broadcast_address: 2001:db8::10
rpc_address: 2001:db8::10
broadcast_rpc_address: 2001:db8::10

seed_provider:
  - class_name: org.apache.cassandra.locator.SimpleSeedProvider
    parameters:
      - seeds: "2001:db8::10,2001:db8::11"

# Snitch configuration for network topology
endpoint_snitch: GossipingPropertyFileSnitch
```

## Start and Verify

```bash
# Restart Cassandra after changing config
systemctl restart cassandra

# Verify listening on IPv6
ss -6 -tln | grep -E ':(7000|7199|9042)[[:space:]]'
# Port 9042 = native transport (clients)
# Port 7000 = inter-node
# Port 7199 = JMX

# Check node status
nodetool status
# Should show IPv6 addresses for each node
```

## Connect cqlsh over IPv6

```bash
# Connect to Cassandra via IPv6
cqlsh 2001:db8::10 9042

# With username/password
cqlsh --username cassandra --password cassandra 2001:db8::10 9042

# Test CQL query
cqlsh 2001:db8::10 9042 -e "SELECT release_version FROM system.local;"
```

## Python Cassandra Driver with IPv6

```python
from cassandra.cluster import Cluster

# Connect with IPv6 contact points
cluster = Cluster(
    contact_points=['2001:db8::10', '2001:db8::11', '2001:db8::12'],
    port=9042
)

session = cluster.connect()
row = session.execute("SELECT release_version FROM system.local").one()
print(f"Cassandra version: {row.release_version}")
cluster.shutdown()
```

## Summary

Configure Cassandra for IPv6 by setting `listen_address`, `broadcast_address`, `rpc_address`, and `broadcast_rpc_address` to the node's IPv6 address in `cassandra.yaml`, or by using `listen_interface` and `rpc_interface` with the IPv6 preference flags. List IPv6 addresses in `seeds`. Add `-Djava.net.preferIPv6Addresses=true` to JVM options. Restart with `systemctl restart cassandra`. Check cluster status with `nodetool status`. Connect with `cqlsh 2001:db8::10 9042`.
