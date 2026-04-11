# How to Migrate Redis Between Cloud Providers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cloud, Migration, AWS, GCP

Description: Learn how to migrate Redis data between cloud providers using RDB transfer or live cross-cloud replication, with network setup and validation steps.

---

Moving Redis from one cloud provider to another - for example from AWS ElastiCache to Google Cloud Memorystore - requires network connectivity between clouds, a migration strategy, and a cutover plan. This guide covers the two main approaches.

## Assess Your Migration Scope

```bash
# Check current dataset size
redis-cli INFO memory | grep used_memory_human
redis-cli DBSIZE

# Check Redis version on source
redis-cli INFO server | grep redis_version

# List key types distribution
redis-cli --scan | head -100 | while read key; do
  redis-cli TYPE "$key"
done | sort | uniq -c
```

## Option 1: RDB File Transfer

Best for smaller datasets or when a maintenance window is acceptable.

**Step 1: Export RDB from source cloud**

```bash
# AWS ElastiCache: use AWS CLI to export snapshot to S3
aws elasticache create-snapshot \
  --replication-group-id my-cluster \
  --snapshot-name cloud-migration

# Self-managed Redis: trigger RDB save
redis-cli BGSAVE
redis-cli CONFIG GET dir  # find the dump.rdb path
```

**Step 2: Transfer the RDB file**

```bash
# If using S3 as intermediary, upload and download via gsutil (GCP)
gsutil cp s3://my-bucket/dump.rdb gs://my-gcs-bucket/dump.rdb

# Or use scp/rsync between VMs with a VPN tunnel
rsync -avz -e "ssh -i key.pem" \
  ubuntu@aws-host:/var/lib/redis/dump.rdb \
  user@gcp-host:/tmp/dump.rdb
```

**Step 3: Load into target Redis**

```bash
# Stop target Redis, copy RDB, restart
sudo systemctl stop redis
sudo cp /tmp/dump.rdb /var/lib/redis/dump.rdb
sudo chown redis:redis /var/lib/redis/dump.rdb
sudo systemctl start redis

redis-cli DBSIZE  # verify
```

## Option 2: Live Cross-Cloud Replication

For near-zero downtime, set up the target Redis as a replica of the source over an encrypted tunnel.

**Step 1: Establish network connectivity**

```bash
# Option A: VPN between clouds using WireGuard
# On source cloud VM (AWS)
sudo apt install wireguard
wg genkey | tee privatekey | wg pubkey > publickey

# On target cloud VM (GCP)
sudo apt install wireguard
wg genkey | tee privatekey | wg pubkey > publickey
```

```text
# WireGuard config on source (AWS side)
[Interface]
PrivateKey = <source-private-key>
Address = 10.100.0.1/24
ListenPort = 51820

[Peer]
PublicKey = <target-public-key>
AllowedIPs = 10.100.0.2/32
Endpoint = <gcp-public-ip>:51820
```

**Step 2: Configure target Redis as replica**

```bash
# On GCP Redis instance, configure replication over the tunnel
redis-cli REPLICAOF 10.100.0.1 6379

# Monitor sync progress
redis-cli INFO replication | grep -E "master_sync|master_link_status|master_repl_offset"
```

**Step 3: Monitor and promote**

```bash
# Compare offsets - wait until they match
redis-cli -h aws-tunnel-ip INFO replication | grep master_repl_offset
redis-cli -h gcp-host INFO replication | grep master_repl_offset

# Promote GCP Redis to primary
redis-cli -h gcp-host REPLICAOF NO ONE
```

## Using redis-shake for Cross-Cloud Migration

redis-shake is a tool designed specifically for Redis data migration across instances:

```bash
# Install redis-shake
wget https://github.com/alibaba/RedisShake/releases/latest/download/redis-shake.tar.gz
tar xzf redis-shake.tar.gz

# Configure redis-shake.toml
cat > redis-shake.toml << 'EOF'
[source]
type = "standalone"
address = "aws-redis-host:6379"
password = "source-password"

[target]
type = "standalone"
address = "gcp-redis-host:6379"
password = "target-password"
EOF

./redis-shake redis-shake.toml
```

## Validate the Migration

```bash
# Key count comparison
redis-cli -h aws-redis-host DBSIZE
redis-cli -h gcp-redis-host DBSIZE

# Spot check values
for key in $(redis-cli -h gcp-redis-host --scan --count 10 | head -5); do
  echo "Key: $key"
  redis-cli -h gcp-redis-host TYPE "$key"
done

# Test latency on new host
redis-cli -h gcp-redis-host --latency -i 1
```

## Update Application Configuration

```python
import redis

# Update environment variables for new cloud endpoint
r = redis.Redis(
    host="new-cloud-redis-host",
    port=6379,
    password="new-password",
    ssl=True,
    decode_responses=True
)
r.ping()
print("Connected to new cloud Redis")
```

## Summary

Cross-cloud Redis migration works best with live replication over a VPN tunnel for minimal downtime, or RDB file transfer for smaller datasets with a brief maintenance window. Tools like redis-shake simplify the process. Always validate key counts and data integrity after migration before shutting down the source cluster.
