# How to Configure Elasticsearch Memory and JVM Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, JVM, Memory, Performance, Tuning, DevOps

Description: A comprehensive guide to configuring Elasticsearch memory settings and JVM options, covering heap size optimization, garbage collection tuning, and memory troubleshooting for optimal performance.

---

Proper memory configuration is critical for Elasticsearch performance and stability. Incorrect settings can lead to out-of-memory errors, excessive garbage collection pauses, or underutilized resources. This guide covers everything you need to know about configuring Elasticsearch memory and JVM settings for optimal performance.

## Understanding Elasticsearch Memory Usage

Elasticsearch uses memory in several ways:

1. **JVM Heap**: Used for field data, node queries, caches, and Lucene segments
2. **Off-heap (Direct Memory)**: Used by Lucene for file system cache and memory-mapped files
3. **Operating System Cache**: Linux file system cache for recently accessed data

The balance between these is crucial for performance.

## Configuring JVM Heap Size

### The 50% Rule

The most important rule for Elasticsearch memory configuration:

**Set the heap size to no more than 50% of available RAM, with a maximum of 31GB.**

This leaves the other 50% for the operating system cache, which Lucene uses extensively.

### Setting Heap Size

Edit the JVM options file at `/etc/elasticsearch/jvm.options.d/heap.options`:

```bash
# Create a custom heap configuration file
sudo nano /etc/elasticsearch/jvm.options.d/heap.options
```

Add the following content:

```
# Set minimum and maximum heap size to the same value
-Xms16g
-Xmx16g
```

For environments where heap size varies, you can use environment variables. Edit `/etc/default/elasticsearch`:

```bash
ES_JAVA_OPTS="-Xms16g -Xmx16g"
```

### Heap Size Guidelines by Server RAM

| Server RAM | Recommended Heap | Reason |
|------------|------------------|--------|
| 8 GB       | 4 GB            | Leave 4 GB for OS cache |
| 16 GB      | 8 GB            | Balanced approach |
| 32 GB      | 16 GB           | Optimal for most workloads |
| 64 GB      | 31 GB           | Maximum recommended heap |
| 128 GB     | 31 GB           | Extra RAM for OS cache |

### The 31GB Limit Explained

Elasticsearch recommends not exceeding 31GB heap size because:

1. **Compressed OOPs**: Below ~32GB, the JVM uses compressed ordinary object pointers (OOPs), reducing memory overhead
2. **GC efficiency**: Smaller heaps have faster garbage collection cycles
3. **OS cache benefits**: Additional RAM benefits Lucene file system operations

Check if compressed OOPs are enabled:

```bash
curl -s -u elastic:password "https://localhost:9200/_nodes/jvm?pretty" | grep compressed
```

## Garbage Collection Configuration

### G1GC (Recommended for Elasticsearch 8.x)

Elasticsearch 8.x uses G1GC by default. Configure it in `/etc/elasticsearch/jvm.options.d/gc.options`:

```
# Use G1 Garbage Collector
-XX:+UseG1GC

# Set maximum pause time target
-XX:MaxGCPauseMillis=200

# Set region size (for heaps > 8GB)
-XX:G1HeapRegionSize=16m

# Reserve memory for promotions
-XX:G1ReservePercent=25

# Initiating heap occupancy percent
-XX:InitiatingHeapOccupancyPercent=30

# Enable GC logging
-Xlog:gc*:file=/var/log/elasticsearch/gc.log:time,tags:filecount=10,filesize=50m
```

### Understanding G1GC Parameters

- **MaxGCPauseMillis**: Target maximum pause time (200ms is a good balance)
- **G1HeapRegionSize**: Size of G1 regions (larger for bigger heaps)
- **G1ReservePercent**: Memory reserved for promotions during GC
- **InitiatingHeapOccupancyPercent**: When to start concurrent marking cycle

### Monitoring GC Performance

Check GC metrics via API:

```bash
curl -s -u elastic:password "https://localhost:9200/_nodes/stats/jvm?pretty" | jq '.nodes[].jvm.gc'
```

Example response:

```json
{
  "collectors": {
    "young": {
      "collection_count": 1523,
      "collection_time_in_millis": 15420
    },
    "old": {
      "collection_count": 12,
      "collection_time_in_millis": 3240
    }
  }
}
```

## Memory Lock Configuration

Prevent Elasticsearch memory from being swapped to disk:

### Enable Memory Lock

Edit `/etc/elasticsearch/elasticsearch.yml`:

```yaml
bootstrap.memory_lock: true
```

### Configure System Limits

Edit `/etc/security/limits.conf`:

```
elasticsearch soft memlock unlimited
elasticsearch hard memlock unlimited
elasticsearch soft nofile 65535
elasticsearch hard nofile 65535
elasticsearch soft nproc 4096
elasticsearch hard nproc 4096
```

### Configure Systemd Service

Create or edit `/etc/systemd/system/elasticsearch.service.d/override.conf`:

```ini
[Service]
LimitMEMLOCK=infinity
LimitNOFILE=65535
LimitNPROC=4096
```

Apply changes:

```bash
sudo systemctl daemon-reload
sudo systemctl restart elasticsearch
```

### Verify Memory Lock

```bash
curl -s -u elastic:password "https://localhost:9200/_nodes?filter_path=**.mlockall&pretty"
```

Expected output:

```json
{
  "nodes": {
    "node_id": {
      "process": {
        "mlockall": true
      }
    }
  }
}
```

## Disable Swap

For production environments, disable swap entirely:

```bash
# Temporarily disable swap
sudo swapoff -a

# Permanently disable swap (comment out swap entries)
sudo nano /etc/fstab
# Comment out any swap lines

# Or set swappiness to 1
echo "vm.swappiness=1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## Field Data Circuit Breaker

Configure circuit breakers to prevent out-of-memory errors:

Edit `/etc/elasticsearch/elasticsearch.yml`:

```yaml
# Field data circuit breaker (default: 40% of JVM heap)
indices.breaker.fielddata.limit: 40%
indices.breaker.fielddata.overhead: 1.03

# Request circuit breaker (default: 60% of JVM heap)
indices.breaker.request.limit: 60%
indices.breaker.request.overhead: 1

# Total circuit breaker (default: 70% of JVM heap)
indices.breaker.total.limit: 70%

# In-flight requests circuit breaker
network.breaker.inflight_requests.limit: 100%
network.breaker.inflight_requests.overhead: 2
```

Check circuit breaker status:

```bash
curl -s -u elastic:password "https://localhost:9200/_nodes/stats/breaker?pretty"
```

## Index Buffer Configuration

Configure index buffer for write-heavy workloads:

```yaml
# Index buffer size (default: 10% of heap)
indices.memory.index_buffer_size: 15%

# Minimum index buffer size per shard
indices.memory.min_index_buffer_size: 96mb

# Maximum index buffer size per shard
indices.memory.max_index_buffer_size: 512mb
```

## Thread Pool Configuration

Optimize thread pools based on your workload:

```yaml
# Search thread pool
thread_pool.search.size: 25
thread_pool.search.queue_size: 1000

# Write thread pool
thread_pool.write.size: 10
thread_pool.write.queue_size: 10000

# Get thread pool
thread_pool.get.size: 5
thread_pool.get.queue_size: 1000
```

Monitor thread pool usage:

```bash
curl -s -u elastic:password "https://localhost:9200/_cat/thread_pool?v&h=name,active,rejected,completed"
```

## Memory Monitoring

### Real-time Memory Stats

```bash
curl -s -u elastic:password "https://localhost:9200/_nodes/stats/jvm?pretty"
```

Key metrics to monitor:

```json
{
  "nodes": {
    "node_id": {
      "jvm": {
        "mem": {
          "heap_used_in_bytes": 8589934592,
          "heap_used_percent": 53,
          "heap_committed_in_bytes": 16106127360,
          "heap_max_in_bytes": 16106127360,
          "non_heap_used_in_bytes": 234881024,
          "non_heap_committed_in_bytes": 262144000
        },
        "gc": {
          "collectors": {
            "young": {
              "collection_count": 1523,
              "collection_time_in_millis": 15420
            },
            "old": {
              "collection_count": 12,
              "collection_time_in_millis": 3240
            }
          }
        }
      }
    }
  }
}
```

### Create a Monitoring Script

```bash
#!/bin/bash
# monitor-es-memory.sh

ES_HOST="localhost:9200"
ES_USER="elastic"
ES_PASS="your_password"

while true; do
  echo "=== $(date) ==="
  curl -s -k -u "$ES_USER:$ES_PASS" "https://$ES_HOST/_nodes/stats/jvm" | \
    jq -r '.nodes | to_entries[] |
      "\(.value.name): Heap \(.value.jvm.mem.heap_used_percent)% (\(.value.jvm.mem.heap_used_in_bytes / 1073741824 | floor)GB/\(.value.jvm.mem.heap_max_in_bytes / 1073741824 | floor)GB)"'
  sleep 10
done
```

## Performance Tuning by Workload

### Search-Heavy Workloads

```yaml
# Increase field data cache
indices.fielddata.cache.size: 40%

# Enable request cache
indices.requests.cache.size: 2%

# Optimize search thread pool
thread_pool.search.size: 50
thread_pool.search.queue_size: 2000
```

### Write-Heavy Workloads

```yaml
# Increase index buffer
indices.memory.index_buffer_size: 20%

# Increase write thread pool
thread_pool.write.size: 20
thread_pool.write.queue_size: 20000

# Reduce refresh interval
index.refresh_interval: 30s
```

### Mixed Workloads

```yaml
# Balanced configuration
indices.fielddata.cache.size: 30%
indices.memory.index_buffer_size: 15%
indices.requests.cache.size: 2%

thread_pool.search.size: 25
thread_pool.write.size: 10
```

## Troubleshooting Memory Issues

### High Heap Usage

1. Check field data usage:

```bash
curl -s -u elastic:password "https://localhost:9200/_cat/fielddata?v&s=size:desc"
```

2. Check segment memory:

```bash
curl -s -u elastic:password "https://localhost:9200/_cat/segments?v&s=size:desc"
```

3. Identify large indices:

```bash
curl -s -u elastic:password "https://localhost:9200/_cat/indices?v&s=store.size:desc"
```

### Out of Memory Errors

If you see OOM errors in logs:

1. Check if heap is correctly set:

```bash
curl -s -u elastic:password "https://localhost:9200/_nodes/jvm?pretty" | grep heap_max
```

2. Review GC logs:

```bash
tail -f /var/log/elasticsearch/gc.log
```

3. Check for memory leaks:

```bash
# Create heap dump for analysis
jmap -dump:format=b,file=/tmp/heap.hprof $(pgrep -f elasticsearch)
```

### Circuit Breaker Trips

When circuit breakers trip:

```bash
# Check which breaker tripped
curl -s -u elastic:password "https://localhost:9200/_nodes/stats/breaker?pretty"

# Clear field data cache if needed
curl -s -u elastic:password -X POST "https://localhost:9200/_cache/clear?fielddata=true"
```

## JVM Options Reference

Complete recommended JVM options for production:

```
# /etc/elasticsearch/jvm.options.d/production.options

# Heap size (set to 50% of RAM, max 31g)
-Xms16g
-Xmx16g

# G1GC settings
-XX:+UseG1GC
-XX:MaxGCPauseMillis=200
-XX:G1HeapRegionSize=16m
-XX:G1ReservePercent=25
-XX:InitiatingHeapOccupancyPercent=30

# GC logging
-Xlog:gc*:file=/var/log/elasticsearch/gc.log:time,tags:filecount=10,filesize=50m

# Performance optimizations
-XX:+AlwaysPreTouch
-XX:-UseBiasedLocking

# Error handling
-XX:+HeapDumpOnOutOfMemoryError
-XX:HeapDumpPath=/var/lib/elasticsearch
-XX:ErrorFile=/var/log/elasticsearch/hs_err_pid%p.log

# Disable JVM info output
-XX:-OmitStackTraceInFastThrow
```

## Conclusion

Proper memory and JVM configuration is essential for Elasticsearch performance. Key takeaways:

1. **Set heap to 50% of RAM**, maximum 31GB
2. **Enable memory lock** to prevent swapping
3. **Configure circuit breakers** to prevent OOM errors
4. **Monitor memory usage** continuously
5. **Tune for your workload** (search-heavy vs write-heavy)
6. **Use G1GC** with appropriate settings

Regular monitoring and adjustment based on actual usage patterns will help maintain optimal performance as your cluster grows.
