# How to Upgrade Redis Without Downtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Upgrade, Zero Downtime, High Availability, Maintenance, Operations

Description: A comprehensive guide to upgrading Redis without downtime, covering rolling upgrades, replication-based upgrades, version compatibility, and best practices for production environments.

---

Upgrading Redis in production requires careful planning to avoid service disruption. Whether you are patching a security vulnerability or moving to a major new version, this guide covers strategies for zero-downtime Redis upgrades.

## Pre-Upgrade Checklist

### 1. Version Compatibility Check

```bash
# Check current version
redis-cli INFO server | grep redis_version

# Review release notes for breaking changes
# https://github.com/redis/redis/releases

# Check client library compatibility
# Most clients support Redis 5.0+
```

### 2. Configuration Compatibility

```bash
# Export current configuration
redis-cli CONFIG GET "*" > current-config.txt

# Test new version with current config
redis-server /path/to/redis.conf --test-memory 256

# Check deprecated directives
redis-server /path/to/redis.conf 2>&1 | grep -i deprecated
```

### 3. Data Compatibility

```bash
# Check RDB version compatibility
redis-cli DEBUG DIGEST

# For major upgrades, backup data
redis-cli BGSAVE
cp /var/lib/redis/dump.rdb /backup/dump.rdb.$(date +%Y%m%d)
```

### 4. Pre-Upgrade Testing

```bash
# Test in staging environment first
# Run integration tests against new version
# Benchmark performance differences

# Compare memory usage
redis-cli --stat -i 1

# Test specific commands your application uses
redis-cli DEBUG SLEEP 0.1  # Verify command behavior
```

## Strategy 1: Replication-Based Upgrade (Recommended)

This is the safest approach for single-instance or master-replica setups.

### Architecture

```mermaid
flowchart LR
    subgraph Before
        A1[Old Master v6.2] <-- B1[Application]
    end
    
    subgraph During
        A2[Old Master v6.2] --> C2[New Replica v7.0]
        B2[Application] --> A2
        B2 --> C2
    end
    
    subgraph After
        C3[New Master v7.0] <-- B3[Application]
    end
```

### Step-by-Step Process

#### Step 1: Set Up New Replica with New Version

```bash
# Install new Redis version on new server
apt-get install redis-server=7.0.0  # or use Docker

# Configure as replica
# /etc/redis/redis.conf
replicaof old-master.example.com 6379
masterauth your-master-password
replica-read-only yes

# Start new replica
systemctl start redis
```

#### Step 2: Verify Replication

```python
import redis
import time

def verify_replication(master_host, replica_host, port=6379):
    """Verify replica is fully synchronized."""
    master = redis.Redis(host=master_host, port=port, decode_responses=True)
    replica = redis.Redis(host=replica_host, port=port, decode_responses=True)

    # Check replication status on replica
    replica_info = replica.info('replication')
    print(f"Role: {replica_info['role']}")
    print(f"Master link status: {replica_info['master_link_status']}")
    print(f"Master last IO seconds ago: {replica_info['master_last_io_seconds_ago']}")

    # Check replication offset
    master_info = master.info('replication')
    master_offset = master_info['master_repl_offset']
    replica_offset = replica_info.get('slave_repl_offset', replica_info.get('master_repl_offset', 0))

    lag = master_offset - replica_offset
    print(f"Replication lag: {lag} bytes")

    # Verify data consistency with test key
    test_key = f"_upgrade_test_{int(time.time())}"
    master.set(test_key, "test_value")
    time.sleep(1)

    replica_value = replica.get(test_key)
    master.delete(test_key)

    if replica_value == "test_value":
        print("Data replication verified successfully")
        return True
    else:
        print("WARNING: Data replication verification failed!")
        return False

# Run verification
verify_replication('old-master', 'new-replica')
```

#### Step 3: Promote New Replica to Master

```bash
# On the new replica (which will become master)
redis-cli REPLICAOF NO ONE

# Verify it's now master
redis-cli INFO replication | grep role
# Should show: role:master
```

#### Step 4: Update Application Configuration

```python
# Update application to use new master
# Option 1: Update configuration and restart
# Option 2: Use DNS/load balancer switch
# Option 3: If using Sentinel, trigger failover

# For Sentinel-managed setup
redis-cli -h sentinel-host -p 26379 SENTINEL FAILOVER mymaster
```

#### Step 5: Verify Application Connectivity

```python
def verify_application_connectivity(new_master_host):
    """Verify application can connect to new master."""
    r = redis.Redis(host=new_master_host, port=6379, decode_responses=True)

    # Test write
    r.set('connectivity_test', 'success')

    # Test read
    assert r.get('connectivity_test') == 'success'

    # Test typical operations
    r.hset('test_hash', 'field', 'value')
    r.lpush('test_list', 'item')
    r.sadd('test_set', 'member')

    # Cleanup
    r.delete('connectivity_test', 'test_hash', 'test_list', 'test_set')

    print("Application connectivity verified")

verify_application_connectivity('new-master')
```

#### Step 6: Decommission Old Master

```bash
# Verify no connections to old master
redis-cli -h old-master CLIENT LIST | wc -l

# Stop old master
systemctl stop redis

# Optional: Keep as replica of new master for rollback
redis-cli -h old-master REPLICAOF new-master 6379
```

## Strategy 2: Rolling Upgrade for Redis Cluster

For Redis Cluster, upgrade one node at a time.

### Pre-Upgrade Cluster Check

```bash
# Check cluster health
redis-cli --cluster check cluster-node:6379

# Verify all slots are covered
redis-cli CLUSTER INFO | grep cluster_slots_ok
# Should be: cluster_slots_ok:16384
```

### Rolling Upgrade Process

```python
import redis
from redis.cluster import RedisCluster
import time

class ClusterUpgrader:
    def __init__(self, cluster_nodes):
        self.cluster = RedisCluster(startup_nodes=cluster_nodes)
        self.nodes = cluster_nodes

    def get_cluster_nodes(self):
        """Get all cluster nodes with their roles."""
        nodes = []
        for node in self.cluster.get_nodes():
            info = self.cluster.info(target_nodes=node)
            nodes.append({
                'host': node.host,
                'port': node.port,
                'role': 'master' if 'master' in str(node) else 'replica',
                'version': info.get('redis_version', 'unknown')
            })
        return nodes

    def verify_cluster_health(self):
        """Verify cluster is healthy before/after upgrade."""
        info = self.cluster.cluster_info()

        checks = {
            'state': info.get('cluster_state') == 'ok',
            'slots_ok': info.get('cluster_slots_ok') == 16384,
            'slots_fail': info.get('cluster_slots_fail') == 0,
        }

        all_healthy = all(checks.values())
        print(f"Cluster health: {'OK' if all_healthy else 'ISSUES FOUND'}")
        for check, status in checks.items():
            print(f"  {check}: {'PASS' if status else 'FAIL'}")

        return all_healthy

    def upgrade_node(self, host, port, new_version_command):
        """
        Upgrade a single node.

        For replicas: Just upgrade and restart
        For masters: Failover first, then upgrade
        """
        node_conn = redis.Redis(host=host, port=port, decode_responses=True)
        role = node_conn.info('replication')['role']

        print(f"Upgrading {host}:{port} (role: {role})")

        if role == 'master':
            # Trigger failover to replica first
            print("  Triggering failover...")
            node_conn.execute_command('CLUSTER', 'FAILOVER')
            time.sleep(5)

            # Verify failover completed
            new_role = node_conn.info('replication')['role']
            if new_role != 'slave':
                raise Exception("Failover did not complete!")
            print("  Failover complete, node is now replica")

        # Stop, upgrade, and restart node
        # This would typically be done via your deployment system
        print(f"  Stopping node...")
        # subprocess.run(['systemctl', 'stop', f'redis-{port}'])

        print(f"  Upgrading to new version...")
        # subprocess.run(new_version_command)

        print(f"  Starting node...")
        # subprocess.run(['systemctl', 'start', f'redis-{port}'])

        # Wait for node to rejoin cluster
        time.sleep(10)

        # Verify node rejoined
        try:
            node_conn.ping()
            print(f"  Node {host}:{port} upgraded successfully")
            return True
        except:
            print(f"  WARNING: Node {host}:{port} not responding!")
            return False


# Usage
cluster_nodes = [
    {'host': 'node1', 'port': 6379},
    {'host': 'node2', 'port': 6379},
    {'host': 'node3', 'port': 6379},
]

upgrader = ClusterUpgrader(cluster_nodes)

# Check health before starting
if not upgrader.verify_cluster_health():
    print("Cluster not healthy, aborting upgrade")
    exit(1)

nodes = upgrader.get_cluster_nodes()

# Upgrade replicas first
for node in [n for n in nodes if n['role'] == 'replica']:
    upgrader.upgrade_node(node['host'], node['port'], ['apt', 'upgrade', 'redis'])
    upgrader.verify_cluster_health()
    time.sleep(30)  # Wait between nodes

# Then upgrade masters (they'll become replicas via failover)
for node in [n for n in nodes if n['role'] == 'master']:
    upgrader.upgrade_node(node['host'], node['port'], ['apt', 'upgrade', 'redis'])
    upgrader.verify_cluster_health()
    time.sleep(30)

print("Cluster upgrade complete!")
```

### Cluster Upgrade Order

1. **Upgrade replicas first**: They don't handle writes
2. **One node at a time**: Maintain quorum
3. **Wait between nodes**: Allow replication to catch up
4. **Verify after each node**: Check cluster health

```bash
# Recommended order for 3-master, 3-replica cluster:
# 1. Replica of Master 1
# 2. Replica of Master 2
# 3. Replica of Master 3
# 4. Master 1 (after failover to replica)
# 5. Master 2 (after failover to replica)
# 6. Master 3 (after failover to replica)
```

## Strategy 3: Sentinel-Managed Upgrade

For Sentinel setups, use Sentinel to orchestrate the upgrade.

```python
import redis
from redis.sentinel import Sentinel
import time

class SentinelUpgrader:
    def __init__(self, sentinel_hosts, master_name):
        self.sentinel = Sentinel(sentinel_hosts, socket_timeout=0.1)
        self.master_name = master_name

    def get_topology(self):
        """Get current master/replica topology."""
        master_addr = self.sentinel.discover_master(self.master_name)
        replica_addrs = self.sentinel.discover_slaves(self.master_name)

        print(f"Master: {master_addr}")
        print(f"Replicas: {replica_addrs}")

        return master_addr, replica_addrs

    def trigger_failover(self):
        """Trigger failover via Sentinel."""
        # Connect to a sentinel
        for sentinel in self.sentinel.sentinels:
            try:
                sentinel.execute_command('SENTINEL', 'FAILOVER', self.master_name)
                print("Failover initiated")
                return True
            except Exception as e:
                print(f"Failover failed on sentinel: {e}")
                continue
        return False

    def wait_for_failover(self, old_master, timeout=60):
        """Wait for failover to complete."""
        start = time.time()
        while time.time() - start < timeout:
            current_master = self.sentinel.discover_master(self.master_name)
            if current_master != old_master:
                print(f"Failover complete. New master: {current_master}")
                return True
            time.sleep(1)
        print("Failover timeout!")
        return False

    def upgrade_with_sentinel(self):
        """Upgrade Redis with Sentinel managing failover."""
        master_addr, replica_addrs = self.get_topology()

        # Step 1: Upgrade all replicas first
        print("\n=== Upgrading Replicas ===")
        for replica in replica_addrs:
            print(f"\nUpgrading replica {replica}")
            # Your upgrade process here
            # - Stop Redis on replica
            # - Upgrade Redis package
            # - Start Redis
            # - Verify it reconnects to master
            time.sleep(10)

        # Step 2: Failover to upgraded replica
        print("\n=== Failing over to upgraded replica ===")
        self.trigger_failover()
        self.wait_for_failover(master_addr)

        # Step 3: Upgrade old master (now replica)
        print(f"\n=== Upgrading old master {master_addr} ===")
        # Your upgrade process here

        print("\n=== Upgrade complete ===")
        self.get_topology()


# Usage
sentinel_hosts = [
    ('sentinel1', 26379),
    ('sentinel2', 26379),
    ('sentinel3', 26379),
]

upgrader = SentinelUpgrader(sentinel_hosts, 'mymaster')
upgrader.upgrade_with_sentinel()
```

## Docker/Kubernetes Upgrades

### Docker Compose Rolling Update

```yaml
# docker-compose.yml
version: '3.8'
services:
  redis:
    image: redis:7.0
    deploy:
      replicas: 1
      update_config:
        parallelism: 1
        delay: 10s
        order: start-first  # Start new before stopping old
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 3
```

```bash
# Upgrade with docker-compose
docker-compose pull redis
docker-compose up -d --no-deps redis
```

### Kubernetes Rolling Update

```yaml
# redis-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
spec:
  replicas: 3
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      partition: 0  # Update all pods
  template:
    spec:
      containers:
        - name: redis
          image: redis:7.0  # Update this
          readinessProbe:
            exec:
              command: ["redis-cli", "ping"]
            initialDelaySeconds: 5
            periodSeconds: 5
          livenessProbe:
            exec:
              command: ["redis-cli", "ping"]
            initialDelaySeconds: 30
            periodSeconds: 10
```

```bash
# Trigger rolling update
kubectl set image statefulset/redis redis=redis:7.0

# Monitor rollout
kubectl rollout status statefulset/redis

# Rollback if needed
kubectl rollout undo statefulset/redis
```

## Rollback Plan

Always have a rollback plan ready:

```bash
#!/bin/bash
# rollback-redis.sh

OLD_VERSION="6.2.7"
NEW_VERSION="7.0.0"

echo "Rolling back Redis from $NEW_VERSION to $OLD_VERSION"

# Stop current Redis
systemctl stop redis

# Downgrade package
apt-get install redis-server=$OLD_VERSION

# Restore configuration backup
cp /backup/redis.conf.pre-upgrade /etc/redis/redis.conf

# Restore data if needed
cp /backup/dump.rdb.pre-upgrade /var/lib/redis/dump.rdb

# Start Redis
systemctl start redis

# Verify
redis-cli INFO server | grep redis_version
redis-cli PING
```

## Version-Specific Considerations

### Redis 6.x to 7.x

```bash
# Key changes:
# - RESP3 protocol improvements
# - New ACL features
# - Functions replace Lua script caching

# Check for deprecated commands
redis-cli DEBUG SET-ACTIVE-EXPIRE 1  # May behave differently

# Review ACL changes if using
redis-cli ACL LIST
```

### Redis 5.x to 6.x

```bash
# Key changes:
# - ACL system introduced
# - SSL/TLS support improved
# - Streams enhancements

# If you don't use ACL, default user works
# but consider setting up ACLs for security
```

## Best Practices

### 1. Always Test First

```bash
# Create staging environment with production data sample
# Run full test suite against new version
# Benchmark critical operations
```

### 2. Monitor During Upgrade

```bash
# Watch key metrics
watch -n 1 'redis-cli INFO | grep -E "connected_clients|used_memory|master_link_status"'
```

### 3. Gradual Rollout

```python
# For applications with multiple Redis instances
# Upgrade one at a time and monitor

upgrade_order = ['redis-cache-1', 'redis-cache-2', 'redis-session-1']
for instance in upgrade_order:
    upgrade_instance(instance)
    monitor_for_errors(duration=300)
    if errors_detected():
        rollback_instance(instance)
        alert_team()
        break
```

### 4. Communication

```markdown
## Upgrade Communication Template

**What**: Redis upgrade from 6.2.7 to 7.0.0
**When**: 2024-01-15 02:00 UTC (maintenance window)
**Duration**: Estimated 30 minutes
**Impact**: No user-facing impact expected
**Rollback**: Automated rollback if health checks fail

**Timeline**:
- 02:00 - Begin replica upgrades
- 02:15 - Failover to upgraded replica
- 02:20 - Upgrade old master
- 02:25 - Verify all components
- 02:30 - Declare complete
```

## Conclusion

Zero-downtime Redis upgrades require:

1. **Proper planning**: Check compatibility and test thoroughly
2. **Right strategy**: Use replication-based upgrades when possible
3. **Careful execution**: One node at a time, verify after each
4. **Monitoring**: Watch metrics throughout the process
5. **Rollback readiness**: Always have a tested rollback plan

With these strategies, you can confidently upgrade Redis while maintaining service availability.
