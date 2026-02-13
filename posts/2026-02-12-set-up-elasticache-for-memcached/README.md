# How to Set Up ElastiCache for Memcached

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ElastiCache, Memcached, Caching

Description: Step-by-step guide to setting up an Amazon ElastiCache for Memcached cluster, covering configuration, connecting from applications, and best practices for production use.

---

Memcached is the original distributed caching system, and it's still the right choice for certain workloads. When you need a simple, horizontally-scalable, multi-threaded cache and don't need persistence, replication, or advanced data structures, Memcached on ElastiCache gives you a managed, production-ready setup in minutes.

Let's walk through setting it up from scratch and connecting your application to it.

## When to Choose Memcached Over Redis

Before diving in, here's a quick decision guide:

**Choose Memcached when:**
- You need multi-threaded performance (Memcached uses all CPU cores)
- Your caching pattern is simple key-value with expiration
- You want easy horizontal scaling by adding nodes
- You don't need data persistence
- You don't need replication or failover

**Choose Redis when:**
- You need data structures beyond simple strings (lists, sets, sorted sets, hashes)
- You need persistence or backup capabilities
- You need replication and automatic failover
- You need pub/sub messaging

For a detailed comparison, check out the guide on [comparing MemoryDB vs ElastiCache](https://oneuptime.com/blog/post/2026-02-12-compare-memorydb-vs-elasticache/view).

## Creating a Memcached Cluster

### Via the AWS Console

1. Open the ElastiCache console
2. Click **Create** and select **Memcached**
3. Choose a cluster name, node type, and number of nodes
4. Configure the subnet group and security group
5. Click **Create**

### Via the AWS CLI

First, create a subnet group if you don't have one:

```bash
# Create a subnet group for ElastiCache
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name my-cache-subnet-group \
  --cache-subnet-group-description "Subnet group for ElastiCache" \
  --subnet-ids subnet-abc123 subnet-def456 subnet-ghi789
```

Now create the Memcached cluster:

```bash
# Create a Memcached cluster with 3 nodes
aws elasticache create-cache-cluster \
  --cache-cluster-id my-memcached-cluster \
  --engine memcached \
  --cache-node-type cache.r6g.large \
  --num-cache-nodes 3 \
  --cache-subnet-group-name my-cache-subnet-group \
  --security-group-ids sg-cache123 \
  --az-mode cross-az \
  --preferred-availability-zones us-east-1a us-east-1b us-east-1c
```

Key parameters explained:

- **cache-node-type**: The instance size. `cache.r6g.large` gives you 13 GB of memory per node
- **num-cache-nodes**: Number of nodes in the cluster (for Memcached, this is how you scale)
- **az-mode cross-az**: Distribute nodes across AZs for better availability
- **preferred-availability-zones**: Which AZs to place the nodes in

Wait for the cluster to become available:

```bash
# Check cluster status
aws elasticache describe-cache-clusters \
  --cache-cluster-id my-memcached-cluster \
  --show-cache-node-info \
  --query 'CacheClusters[0].{Status:CacheClusterStatus,Nodes:CacheNodes[*].{Id:CacheNodeId,AZ:CustomerAvailabilityZone,Endpoint:Endpoint}}'
```

### Via Terraform

Here's the complete Terraform configuration:

```hcl
# ElastiCache subnet group
resource "aws_elasticache_subnet_group" "main" {
  name       = "my-cache-subnet-group"
  subnet_ids = var.private_subnet_ids
}

# Memcached parameter group with custom settings
resource "aws_elasticache_parameter_group" "memcached" {
  name   = "my-memcached-params"
  family = "memcached1.6"

  parameter {
    name  = "max_item_size"
    value = "10485760"  # 10 MB max item size
  }
}

# Memcached cluster
resource "aws_elasticache_cluster" "memcached" {
  cluster_id           = "my-memcached-cluster"
  engine               = "memcached"
  node_type            = "cache.r6g.large"
  num_cache_nodes      = 3
  parameter_group_name = aws_elasticache_parameter_group.memcached.name
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.cache.id]
  az_mode              = "cross-az"

  port = 11211

  tags = {
    Environment = "production"
  }
}
```

## Connecting from Your Application

### Getting the Endpoint Information

Memcached clusters provide two ways to discover nodes: a configuration endpoint (for auto-discovery) and individual node endpoints.

```bash
# Get the configuration endpoint for auto-discovery
aws elasticache describe-cache-clusters \
  --cache-cluster-id my-memcached-cluster \
  --show-cache-node-info \
  --query 'CacheClusters[0].ConfigurationEndpoint'
```

### Python Connection

Using `pymemcache` with auto-discovery:

```python
from pymemcache.client.hash import HashClient

# Connect using individual node endpoints
# Auto-discovery requires a special client library
nodes = [
    ('my-memcached-cluster.abc123.0001.use1.cache.amazonaws.com', 11211),
    ('my-memcached-cluster.abc123.0002.use1.cache.amazonaws.com', 11211),
    ('my-memcached-cluster.abc123.0003.use1.cache.amazonaws.com', 11211),
]

client = HashClient(
    nodes,
    connect_timeout=2,
    timeout=1,
    no_delay=True,
    # Retry on connection failure
    retry_attempts=2,
    retry_timeout=1
)

# Store a value with a 5-minute TTL
client.set('user:12345', '{"name": "Alice", "email": "alice@example.com"}', expire=300)

# Retrieve the value
result = client.get('user:12345')
print(result)  # b'{"name": "Alice", "email": "alice@example.com"}'
```

Using the ElastiCache auto-discovery client (recommended for production):

```python
from elasticache_auto_discovery import AutoDiscovery
from pymemcache.client.hash import HashClient

# Use the configuration endpoint for auto-discovery
config_endpoint = 'my-memcached-cluster.abc123.cfg.use1.cache.amazonaws.com:11211'
nodes = AutoDiscovery(config_endpoint).get_nodes()

# Nodes are automatically discovered and updated
client = HashClient(
    [(n.ip, n.port) for n in nodes],
    connect_timeout=2,
    timeout=1,
    no_delay=True
)
```

### Node.js Connection

```javascript
const Memcached = require('memcached');

// Connect to all Memcached nodes
const memcached = new Memcached([
  'my-memcached-cluster.abc123.0001.use1.cache.amazonaws.com:11211',
  'my-memcached-cluster.abc123.0002.use1.cache.amazonaws.com:11211',
  'my-memcached-cluster.abc123.0003.use1.cache.amazonaws.com:11211'
], {
  retries: 2,
  timeout: 1000,
  retry: 1000,
  poolSize: 10
});

// Store a value
memcached.set('session:abc123', JSON.stringify({
  userId: 42,
  role: 'admin'
}), 3600, (err) => {
  if (err) console.error('Cache set failed:', err);
});

// Retrieve a value
memcached.get('session:abc123', (err, data) => {
  if (err) console.error('Cache get failed:', err);
  else console.log('Session:', JSON.parse(data));
});
```

## Scaling Your Memcached Cluster

### Adding Nodes

Memcached scales horizontally. Adding nodes redistributes the hash space, but some cached data becomes unreachable (the keys now hash to different nodes):

```bash
# Add 2 more nodes to the cluster (going from 3 to 5)
aws elasticache modify-cache-cluster \
  --cache-cluster-id my-memcached-cluster \
  --num-cache-nodes 5 \
  --apply-immediately
```

### Removing Nodes

You can remove specific nodes:

```bash
# Remove a specific node from the cluster
aws elasticache modify-cache-cluster \
  --cache-cluster-id my-memcached-cluster \
  --num-cache-nodes 2 \
  --cache-node-ids-to-remove 0003 \
  --apply-immediately
```

## Monitoring

Set up CloudWatch monitoring for your Memcached cluster:

```bash
# Check cache hit rate
aws cloudwatch get-metric-statistics \
  --namespace AWS/ElastiCache \
  --metric-name GetHits \
  --dimensions Name=CacheClusterId,Value=my-memcached-cluster \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum

# Check evictions (items being removed to make room)
aws cloudwatch get-metric-statistics \
  --namespace AWS/ElastiCache \
  --metric-name Evictions \
  --dimensions Name=CacheClusterId,Value=my-memcached-cluster \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

High evictions mean your cache is too small. Either add more nodes or increase the node size.

## Security Configuration

Make sure your security group only allows traffic from your application:

```bash
# Create a security group for ElastiCache
aws ec2 create-security-group \
  --group-name elasticache-memcached-sg \
  --description "Security group for ElastiCache Memcached" \
  --vpc-id vpc-abc123

# Allow inbound from your application security group
aws ec2 authorize-security-group-ingress \
  --group-id sg-cache123 \
  --protocol tcp \
  --port 11211 \
  --source-group sg-app123
```

## Wrapping Up

ElastiCache for Memcached is the right choice when you need a simple, fast, horizontally-scalable cache without the overhead of Redis's feature set. Set it up with multiple nodes spread across AZs, use auto-discovery in your client library, and monitor cache hit rates and evictions. If you find you need more advanced features like persistence or data structures, check out how to [connect to ElastiCache Redis from an application](https://oneuptime.com/blog/post/2026-02-12-connect-to-elasticache-redis-from-an-application/view).
