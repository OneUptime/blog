# How to Deploy Memcached via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Memcached, Caching, Docker, Performance

Description: Deploy Memcached distributed memory caching system using Portainer for high-performance application caching.

## Introduction

Memcached is a high-performance, distributed in-memory key-value store designed for caching database query results, session data, and computed values. This guide deploys Memcached as a Portainer Stack and shows how to connect applications to it.

## Prerequisites

- Portainer installed with Docker
- At least 256 MB RAM available for Memcached
- Application that needs caching (optional)

## Step 1: Create the Stack in Portainer

Navigate to **Stacks** > **Add Stack** and use the following configuration:

```yaml
# docker-compose.yml - Memcached

version: "3.8"

services:
  memcached:
    image: memcached:1.6-alpine
    container_name: memcached
    restart: unless-stopped
    ports:
      - "11211:11211"    # Memcached default port
    command: >
      memcached
      -m 512
      -c 1024
      -t 4
    healthcheck:
      test: ["CMD", "sh", "-c", "echo stats | nc localhost 11211 | grep -q uptime"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - cache_net

  # Optional: Memcached Prometheus exporter
  memcached_exporter:
    image: prom/memcached-exporter:latest
    container_name: memcached_exporter
    restart: unless-stopped
    ports:
      - "9150:9150"
    command:
      - "--memcached.address=memcached:11211"
    depends_on:
      - memcached
    networks:
      - cache_net

networks:
  cache_net:
    driver: bridge
```

Command flags explained:
- `-m 512` - allocate 512 MB of memory for caching
- `-c 1024` - allow up to 1024 simultaneous connections
- `-t 4` - use 4 threads

## Step 2: Test Connectivity

```bash
# Test Memcached from the host using netcat
echo "stats" | nc localhost 11211

# Or from inside a container on the same network
docker run --rm --network cache_net alpine sh -c \
  "apk add --no-cache netcat-openbsd && echo 'stats' | nc memcached 11211"

# Expected output shows STAT fields including version, uptime, bytes, curr_items
```

## Step 3: Python Application Integration

```python
# pip install pymemcache
from pymemcache.client.base import Client

client = Client(('localhost', 11211))

# Set a value (expires in 300 seconds)
client.set('user:1000', '{"name": "Alice", "email": "alice@example.com"}', expire=300)

# Get a value
value = client.get('user:1000')
print(value.decode())  # {"name": "Alice", "email": "alice@example.com"}

# Delete a value
client.delete('user:1000')

# Increment/decrement counters
client.set('page_views', b'0')
client.incr('page_views', 1)
count = client.get('page_views')
```

## Step 4: PHP Application Integration

```php
// Using the Memcached PHP extension
$memcached = new Memcached();
$memcached->addServer('memcached', 11211);

// Cache a database result for 10 minutes
$key = 'product_' . $product_id;
$product = $memcached->get($key);

if ($product === false) {
    // Cache miss - fetch from database
    $product = $db->fetchProduct($product_id);
    $memcached->set($key, $product, 600);  // Cache for 600 seconds
}
```

## Step 5: Monitor with Prometheus

Configure Prometheus to scrape the Memcached exporter:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'memcached'
    static_configs:
      - targets: ['memcached_exporter:9150']
```

Key metrics to watch:
- `memcached_current_bytes` - bytes currently used
- `memcached_limit_bytes` - total cache size
- `memcached_items_evicted_total` - evictions (increase memory if high)
- `memcached_commands_total{command="get",status="hit"}` and `{status="miss"}` - compute hit rate as `hits / (hits + misses)` (target > 90%)

## Step 6: Production Configuration

For production, never expose port 11211 publicly. Memcached has no authentication:

```yaml
services:
  memcached:
    image: memcached:1.6-alpine
    restart: unless-stopped
    # Do NOT expose port 11211 externally in production
    # Only accessible within the Docker network
    command: >
      memcached
      -m 2048
      -c 4096
      -t 8
      -l 0.0.0.0
    deploy:
      resources:
        limits:
          memory: 2.5G
        reservations:
          memory: 2G
    networks:
      - cache_net
```

## Conclusion

Memcached is ideal for simple key-value caching with very high throughput requirements. It does not support persistence, replication, or authentication - keep it on an internal Docker network. For cache invalidation, use key prefixes with version numbers (e.g., `v2:user:1000`) to invalidate entire groups of keys by changing the prefix. Monitor evictions - if evictions are high, either increase the memory allocation or review your caching strategy.
