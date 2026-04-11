# How to Implement Redis Auto-Tiering (Flash Memory)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Auto-Tiering, Flash Memory, Performance, Storage

Description: Learn how to implement Redis auto-tiering with flash memory to store cold data on SSD while keeping hot data in RAM, reducing costs without sacrificing performance.

---

## What Is Redis Auto-Tiering

Redis Auto-Tiering (formerly Redis on Flash) is a feature available in Redis Enterprise that allows Redis to use both RAM and flash (SSD) storage. Hot, frequently accessed data remains in RAM while cold data is automatically moved to flash storage. This lets you operate much larger datasets at a fraction of the cost of all-RAM deployments.

Auto-tiering is not available in open-source Redis. It is a Redis Enterprise feature. However, you can simulate tiered access patterns with careful architecture in open-source Redis using separate instances or external caching layers.

## How Auto-Tiering Works

Redis Enterprise monitors access patterns and classifies keys as hot or cold. Hot keys stay in RAM for low-latency access. Cold keys are moved to the flash tier. When a cold key is accessed, it is fetched from flash into RAM. This process is transparent to the application.

The key components are:

- RAM tier - holds hot keys, index metadata, and dictionary entries
- Flash tier - holds value data for cold keys on NVMe SSD
- Eviction policy - controls which keys are promoted or demoted between tiers

## Setting Up Redis Enterprise with Auto-Tiering

### 1. Provision a Redis Enterprise Cluster

On your servers, download and install Redis Enterprise. Get the download link for your OS from the Redis Enterprise downloads page:

```bash
# Download the Redis Enterprise package (get the URL from https://redis.io/downloads)
wget https://s3.amazonaws.com/redis-enterprise-software-downloads/7.8.2/redislabs-7.8.2-58-focal-amd64.tar
tar -xvf redislabs-*.tar
sudo ./install.sh
```

Start the cluster setup:

```bash
sudo /opt/redislabs/bin/rladmin cluster create name mycluster.local username admin@example.com password AdminPass123
```

### 2. Identify Flash Storage Devices

List available NVMe or SSD devices:

```bash
lsblk -o NAME,TYPE,SIZE,MOUNTPOINT
nvme list
```

Format and mount the flash device:

```bash
sudo mkfs.ext4 /dev/nvme0n1
sudo mkdir -p /var/opt/redislabs/flash
sudo mount /dev/nvme0n1 /var/opt/redislabs/flash
echo "/dev/nvme0n1 /var/opt/redislabs/flash ext4 defaults 0 0" | sudo tee -a /etc/fstab
```

### 3. Create a Database with Auto-Tiering Enabled

Use the Redis Enterprise REST API or the admin UI to create a database with flash enabled:

```bash
curl -k -u admin@example.com:AdminPass123 \
  -X POST https://localhost:9443/v1/bdbs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "tiered-db",
    "memory_size": 10737418240,
    "bigstore": true,
    "bigstore_ram_size": 2147483648,
    "replication": false,
    "port": 6379
  }'
```

In this configuration:
- `memory_size` is the total dataset size (10 GB)
- `bigstore_ram_size` is the RAM allocation (2 GB)
- The remaining 8 GB resides on flash

### 4. Verify the Database Configuration

```bash
curl -k -u admin@example.com:AdminPass123 \
  https://localhost:9443/v1/bdbs \
  | python3 -m json.tool | grep -E "(name|bigstore|memory)"
```

## Tuning Auto-Tiering Behavior

### Flash Write Queue Size

The flash write queue buffers writes before persisting to SSD. Larger queues reduce flash wear but increase memory use:

```bash
# Check current flash configuration via rladmin
sudo /opt/redislabs/bin/rladmin info cluster | grep flash
```

### RAM-to-Flash Ratio

A good starting point is a 20-30% RAM ratio for workloads with typical Zipfian access distributions. Highly skewed workloads (small hot set) can use as little as 10% RAM.

```text
Total dataset: 100 GB
RAM allocation: 20 GB (20%)
Flash allocation: 80 GB (80%)
```

Monitor the hit ratio to validate the ratio is correct. If flash reads are too frequent, increase the RAM allocation.

### Eviction and Access Patterns

Auto-tiering uses an internal LRU-like mechanism. You can influence behavior by controlling TTLs. Keys with short TTLs that are accessed frequently stay warm. Keys that are written once and rarely read become cold candidates.

```bash
# Set TTL appropriately for warm keys
redis-cli SET user:session:12345 "active" EX 3600

# Cold reference data with no TTL may be pushed to flash
redis-cli SET ref:country:US "United States"
```

## Monitoring Auto-Tiering Performance

### Using Redis Enterprise Metrics

```bash
curl -k -u admin@example.com:AdminPass123 \
  https://localhost:9443/v1/bdbs/1/stats/last \
  | python3 -m json.tool | grep -E "(flash|bigstore|ram)"
```

Key metrics to watch:

- `bigstore_reads` - reads served from flash
- `bigstore_writes` - writes going to flash
- `bigstore_io_read_bytes` - flash read I/O volume
- `bigstore_objs_ram` - number of keys in RAM
- `bigstore_objs_flash` - number of keys on flash

### Grafana Dashboard Query (Prometheus)

```text
# Flash read ratio (proportion of reads served from flash - lower is better)
bdb_bigstore_io_read_bytes / (bdb_bigstore_io_read_bytes + bdb_read_hits)
```

## Simulating Tiering in Open-Source Redis

If you are running open-source Redis, you can approximate tiering by using two Redis instances with different memory limits and migrating cold keys:

```python
import redis

hot_redis = redis.Redis(host='localhost', port=6379)  # RAM-only
cold_redis = redis.Redis(host='localhost', port=6380)  # larger, disk-backed

def smart_get(key):
    value = hot_redis.get(key)
    if value:
        return value
    # Check cold tier
    value = cold_redis.get(key)
    if value:
        # Promote to hot tier
        hot_redis.set(key, value, ex=3600)
    return value
```

## Summary

Redis Auto-Tiering extends your dataset capacity by storing cold data on fast NVMe SSDs while keeping hot data in RAM. To implement it, deploy Redis Enterprise, configure flash storage mounts, and create databases with bigstore enabled, then tune the RAM-to-flash ratio based on your access patterns. Monitor flash read/write metrics to validate that your hot data fits in RAM and adjust allocations accordingly.
