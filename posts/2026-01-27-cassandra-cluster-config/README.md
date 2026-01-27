# How to Configure Cassandra Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cassandra, Database, Distributed Systems, NoSQL, DevOps, High Availability

Description: A comprehensive guide to configuring Apache Cassandra clusters, covering cluster topology, cassandra.yaml settings, seed nodes, snitch configuration, replication strategies, and node management.

---

> A Cassandra cluster is only as strong as its configuration. Get the topology wrong and you have a distributed single point of failure. Get it right and you have a database that survives datacenter outages without breaking a sweat.

## Understanding Cluster Topology

Cassandra organizes nodes into a hierarchy of clusters, datacenters, and racks. This topology directly affects data placement, fault tolerance, and query routing.

**Cluster:** The entire Cassandra deployment. All nodes in a cluster share the same schema and participate in the gossip protocol.

**Datacenter:** A logical grouping of nodes, typically corresponding to a physical datacenter or cloud region. Cassandra can replicate data across datacenters for disaster recovery.

**Rack:** A subdivision within a datacenter. Cassandra spreads replicas across racks to survive rack-level failures (power, network switch, etc.).

```
Cluster: production-cassandra
|
+-- Datacenter: us-east
|   +-- Rack: rack1
|   |   +-- node1, node2, node3
|   +-- Rack: rack2
|       +-- node4, node5, node6
|
+-- Datacenter: us-west
    +-- Rack: rack1
    |   +-- node7, node8, node9
    +-- Rack: rack2
        +-- node10, node11, node12
```

Plan your topology before writing any configuration. Changing datacenter or rack assignments later requires careful node migrations.

## Configuring cassandra.yaml

The `cassandra.yaml` file is the heart of Cassandra configuration. Located in `/etc/cassandra/` on most installations, it controls everything from cluster membership to performance tuning.

### Essential Settings

```yaml
# cassandra.yaml - Core cluster configuration

# Unique name for your cluster. All nodes must share this value.
# Changing this after data exists requires a full cluster rebuild.
cluster_name: 'production-cassandra'

# Number of tokens assigned to this node. Higher values improve
# load distribution but increase memory overhead. 256 is the
# recommended default for most deployments.
num_tokens: 256

# Directory where Cassandra stores commit logs. Use a dedicated
# disk separate from data directories for better write performance.
commitlog_directory: /var/lib/cassandra/commitlog

# Directories for SSTable data files. You can specify multiple
# paths to spread I/O across disks.
data_file_directories:
  - /var/lib/cassandra/data

# Directory for saved caches. Can share a disk with data.
saved_caches_directory: /var/lib/cassandra/saved_caches

# Hints directory for storing hints when nodes are down.
hints_directory: /var/lib/cassandra/hints
```

### Network Configuration

```yaml
# Address to bind for client connections (CQL).
# Use 0.0.0.0 to listen on all interfaces, or a specific IP.
listen_address: 192.168.1.10

# Address to broadcast to other nodes. Required when listen_address
# is 0.0.0.0 or when behind NAT.
broadcast_address: 192.168.1.10

# Address for client connections. Often the same as listen_address.
rpc_address: 192.168.1.10

# Port for inter-node communication.
storage_port: 7000

# Port for encrypted inter-node communication (if using TLS).
ssl_storage_port: 7001

# Port for CQL native protocol (client connections).
native_transport_port: 9042
```

### Performance Tuning

```yaml
# Size of the commit log segments. Larger segments reduce
# fsync frequency but increase recovery time after crashes.
commitlog_segment_size: 32MiB

# How often to sync the commit log to disk.
# periodic: sync every commitlog_sync_period_in_ms
# batch: sync on every write (slower but safer)
commitlog_sync: periodic
commitlog_sync_period_in_ms: 10000

# Memory allocated to memtables. Set to 1/4 of heap or less.
# Cassandra flushes to SSTables when this threshold is reached.
memtable_heap_space: 2048MiB
memtable_offheap_space: 2048MiB

# Number of concurrent reads and writes. Tune based on your
# disk I/O capacity. Start conservative and increase if CPUs
# are waiting on I/O.
concurrent_reads: 32
concurrent_writes: 32
concurrent_counter_writes: 32

# Compaction throughput limit in MB/s. Prevents compaction
# from consuming all disk bandwidth. Set to 0 for unlimited.
compaction_throughput_mb_per_sec: 64
```

## Configuring Seed Nodes

Seed nodes are contact points that new nodes use to discover the cluster topology through the gossip protocol. They are not special in terms of data or leadership - they simply help with initial cluster discovery.

### Seed Node Guidelines

1. **Use 2-3 seeds per datacenter.** More seeds increase gossip traffic without improving reliability.
2. **Distribute seeds across racks.** If all seeds are in one rack, a rack failure prevents new nodes from joining.
3. **Seeds should be stable nodes.** Pick nodes that are unlikely to be decommissioned or moved.
4. **Every node needs the same seed list.** Inconsistent seed lists cause split-brain scenarios.

```yaml
# cassandra.yaml - Seed provider configuration

seed_provider:
  - class_name: org.apache.cassandra.locator.SimpleSeedProvider
    parameters:
      # Comma-separated list of seed node IP addresses.
      # Include seeds from each datacenter for multi-DC clusters.
      - seeds: "192.168.1.10,192.168.1.11,192.168.2.10"
```

### Common Seed Mistakes

**Mistake 1:** Making all nodes seeds. This creates excessive gossip traffic and defeats the purpose.

**Mistake 2:** Using only one seed. If that node is down, new nodes cannot join the cluster.

**Mistake 3:** Forgetting to update seeds when decommissioning. Old seed addresses cause connection failures.

## Snitch Configuration

The snitch tells Cassandra about your network topology - which nodes are in which datacenters and racks. This information is critical for replica placement and query routing.

### Available Snitches

```yaml
# cassandra.yaml - Snitch configuration

# SimpleSnitch: Single datacenter deployments only. Treats all
# nodes as being in the same datacenter and rack.
endpoint_snitch: SimpleSnitch

# GossipingPropertyFileSnitch: Recommended for production. Reads
# topology from cassandra-rackdc.properties and propagates via gossip.
endpoint_snitch: GossipingPropertyFileSnitch

# PropertyFileSnitch: Reads topology from cassandra-topology.properties.
# Requires manual updates on all nodes. Use GossipingPropertyFileSnitch instead.
endpoint_snitch: PropertyFileSnitch

# Cloud-specific snitches for automatic topology detection:
# - Ec2Snitch / Ec2MultiRegionSnitch (AWS)
# - GoogleCloudSnitch (GCP)
# - AzureSnitch (Azure)
endpoint_snitch: Ec2MultiRegionSnitch
```

### GossipingPropertyFileSnitch Setup

Create `/etc/cassandra/cassandra-rackdc.properties` on each node:

```properties
# cassandra-rackdc.properties
# Define this node's datacenter and rack assignment.

# Datacenter name. Use descriptive names like region identifiers.
dc=us-east

# Rack name. Use descriptive names like availability zones.
rack=rack1

# Optional: Prefer local datacenter for reads. Reduces cross-DC
# traffic but may return stale data if local replicas are behind.
# prefer_local=true
```

### Cloud Snitch Examples

For AWS with multiple regions:

```yaml
# cassandra.yaml for AWS multi-region
endpoint_snitch: Ec2MultiRegionSnitch

# Required for cross-region communication. Set to the public IP.
broadcast_address: <public-ip>

# Listen on private IP within the VPC.
listen_address: <private-ip>
```

The Ec2MultiRegionSnitch automatically detects:
- Datacenter = EC2 region (e.g., us-east-1)
- Rack = Availability zone (e.g., us-east-1a)

## Replication Strategies

Replication strategies determine how Cassandra places replicas across your topology. You configure this per keyspace, not globally.

### SimpleStrategy

Use only for single-datacenter deployments or development environments.

```cql
-- SimpleStrategy: Places replicas on consecutive nodes in the ring.
-- Not rack-aware. Not recommended for production multi-DC setups.

CREATE KEYSPACE my_keyspace WITH replication = {
  'class': 'SimpleStrategy',
  'replication_factor': 3
};
```

### NetworkTopologyStrategy

Use for all production deployments. Provides rack awareness and per-datacenter replication control.

```cql
-- NetworkTopologyStrategy: Specify replication factor per datacenter.
-- Cassandra spreads replicas across racks within each DC.

CREATE KEYSPACE my_keyspace WITH replication = {
  'class': 'NetworkTopologyStrategy',
  'us-east': 3,    -- 3 replicas in us-east datacenter
  'us-west': 3     -- 3 replicas in us-west datacenter
};
```

### Choosing Replication Factors

| Scenario | Replication Factor | Rationale |
| --- | --- | --- |
| Development | 1 | Single node, no redundancy needed |
| Production (single DC) | 3 | Survives 1 node failure with quorum reads/writes |
| Production (multi DC) | 3 per DC | Survives DC failure, maintains quorum in surviving DC |
| High durability | 5 per DC | Survives 2 node failures with quorum |

### Altering Replication

```cql
-- Change replication settings for an existing keyspace.
-- Run nodetool repair after changing to ensure consistency.

ALTER KEYSPACE my_keyspace WITH replication = {
  'class': 'NetworkTopologyStrategy',
  'us-east': 3,
  'us-west': 3,
  'eu-west': 2  -- Add new datacenter with 2 replicas
};
```

After altering replication, run repair to stream data to new replicas:

```bash
# Run repair on all nodes to ensure data is properly replicated
nodetool repair -full my_keyspace
```

## Adding and Removing Nodes

Cassandra makes it straightforward to scale horizontally by adding nodes to an existing cluster.

### Adding a New Node

1. **Install Cassandra** with the same version as existing nodes.

2. **Configure cassandra.yaml** with matching cluster settings:

```yaml
# New node cassandra.yaml
cluster_name: 'production-cassandra'
num_tokens: 256

# Set to the new node's IP address
listen_address: 192.168.1.20
broadcast_address: 192.168.1.20
rpc_address: 192.168.1.20

# Use the same seed list as other nodes
seed_provider:
  - class_name: org.apache.cassandra.locator.SimpleSeedProvider
    parameters:
      - seeds: "192.168.1.10,192.168.1.11,192.168.2.10"

# Match the snitch configuration
endpoint_snitch: GossipingPropertyFileSnitch
```

3. **Configure rack and datacenter** in cassandra-rackdc.properties:

```properties
dc=us-east
rack=rack2
```

4. **Clear data directories** if the node was previously used:

```bash
# Remove any existing data from previous cluster membership
rm -rf /var/lib/cassandra/data/*
rm -rf /var/lib/cassandra/commitlog/*
rm -rf /var/lib/cassandra/saved_caches/*
rm -rf /var/lib/cassandra/hints/*
```

5. **Start the node:**

```bash
# Start Cassandra. The node will bootstrap and stream data.
sudo systemctl start cassandra

# Monitor bootstrap progress
nodetool netstats
```

6. **Verify cluster membership:**

```bash
# Check that the new node appears in the ring
nodetool status

# Expected output shows the new node as UN (Up, Normal)
# Datacenter: us-east
# ====================
# Status=Up/Down
# |/ State=Normal/Leaving/Joining/Moving
# --  Address       Load       Tokens  Owns   Host ID                               Rack
# UN  192.168.1.10  256.12 GiB  256    25.0%  a1b2c3d4-...  rack1
# UN  192.168.1.20  0 bytes     256    0.0%   e5f6g7h8-...  rack2  <-- New node
```

### Removing a Node

**Graceful removal (node is up):**

```bash
# Run on the node being removed. Streams data to other nodes first.
nodetool decommission

# Monitor progress
nodetool netstats
```

**Forced removal (node is permanently down):**

```bash
# Run on any surviving node. Use the Host ID from nodetool status.
nodetool removenode <host-id>

# If removenode hangs, force it (last resort - may lose data)
nodetool assassinate <ip-address>
```

### Replacing a Dead Node

When a node dies and you want to replace it with new hardware:

```bash
# On the replacement node, set this JVM option before starting
# Replace <dead-node-ip> with the IP of the failed node
JVM_OPTS="$JVM_OPTS -Dcassandra.replace_address_first_boot=<dead-node-ip>"

# Start Cassandra
sudo systemctl start cassandra
```

The replacement node assumes the dead node's token ranges and streams data from replicas.

## Best Practices Summary

**Topology Planning**
- Design your datacenter and rack layout before deployment
- Use NetworkTopologyStrategy and GossipingPropertyFileSnitch for production
- Distribute seed nodes across racks (2-3 per datacenter)

**Configuration Management**
- Version control your cassandra.yaml and cassandra-rackdc.properties
- Use configuration management (Ansible, Chef, Puppet) for consistency
- Document any deviations from defaults with comments

**Performance**
- Separate commit log and data directories onto different disks
- Set num_tokens to 256 for even data distribution
- Tune concurrent_reads/writes based on your I/O subsystem
- Monitor and adjust compaction_throughput_mb_per_sec

**High Availability**
- Use replication factor of 3 or higher in production
- Spread replicas across racks and datacenters
- Test failure scenarios regularly (node down, rack down, DC down)

**Operations**
- Run nodetool repair weekly to maintain consistency
- Monitor cluster health with nodetool status and nodetool tpstats
- Keep Cassandra versions consistent across the cluster
- Plan maintenance windows for major version upgrades

**Security**
- Enable client-to-node and node-to-node encryption in production
- Use authentication and role-based access control
- Restrict network access to Cassandra ports (7000, 7001, 9042)

---

Properly configured, a Cassandra cluster provides linear scalability and high availability that few databases can match. The key is understanding how topology, replication, and node management work together. Start with a solid foundation and your cluster will handle whatever traffic growth throws at it.

Monitor your Cassandra cluster health alongside your applications with [OneUptime](https://oneuptime.com). Track query latencies, node status, and replication lag in one unified dashboard to catch issues before they become outages.
