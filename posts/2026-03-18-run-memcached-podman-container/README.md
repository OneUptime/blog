# How to Run Memcached in a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Memcached, Cache, In-Memory

Description: Learn how to run Memcached in a Podman container with custom memory settings, connection tuning, and monitoring.

---

> Memcached in Podman gives you a high-performance, distributed memory caching system in a lightweight, rootless container.

Memcached is a general-purpose distributed memory caching system used to speed up dynamic web applications by caching data and objects in RAM. Running it in a Podman container provides clean isolation, easy resource management, and quick deployment. This guide covers basic setup, memory configuration, connection tuning, and monitoring your Memcached instance.

---

## Pulling the Memcached Image

Download the official Memcached image.

```bash
# Pull the latest Memcached image

podman pull docker.io/library/memcached:latest

# Verify the image
podman images | grep memcached
```

## Running a Basic Memcached Container

Start Memcached with default settings.

```bash
# Run Memcached in detached mode on port 11211
podman run -d \
  --name my-memcached \
  -p 11211:11211 \
  memcached:latest

# Confirm the container is running
podman ps

# Test the connection using netcat
echo "stats" | nc localhost 11211
```

## Configuring Memory Limits

Set the maximum memory Memcached can use for caching.

```bash
# Run Memcached with 256MB of memory and verbose logging
podman run -d \
  --name memcached-256m \
  -p 11212:11211 \
  memcached:latest memcached -m 256 -v

# Verify the memory setting via stats
echo "stats" | nc localhost 11212 | grep limit_maxbytes
```

## Tuning Connection Settings

Adjust the maximum number of connections and thread count.

```bash
# Run Memcached with custom connection and thread settings
podman run -d \
  --name memcached-tuned \
  -p 11213:11211 \
  memcached:latest memcached \
    -m 512 \
    -c 2048 \
    -t 4 \
    -v

# -m 512: 512MB memory limit
# -c 2048: maximum 2048 simultaneous connections
# -t 4: use 4 threads
# -v: verbose logging

# Check the settings to verify configuration
echo "stats settings" | nc localhost 11213 | grep -E "maxbytes|maxconns|num_threads"
```

## Working with Memcached Data

Store and retrieve data using the Memcached protocol.

```bash
# Store a value (set command: set <key> <flags> <exptime> <bytes>)
printf "set mykey 0 3600 11\r\nhello world\r\n" | nc localhost 11211

# Retrieve the value
printf "get mykey\r\n" | nc localhost 11211

# Store another value with a 60-second TTL
printf "set session:abc 0 60 15\r\nuser_id=1234567\r\n" | nc localhost 11211

# Retrieve it
printf "get session:abc\r\n" | nc localhost 11211

# Delete a key
printf "delete mykey\r\n" | nc localhost 11211

# Increment a counter
printf "set counter 0 0 1\r\n0\r\n" | nc localhost 11211
printf "incr counter 1\r\n" | nc localhost 11211
printf "incr counter 5\r\n" | nc localhost 11211
printf "get counter\r\n" | nc localhost 11211
```

## Monitoring Memcached

Check the health and performance of your Memcached instance.

```bash
# Get full stats
echo "stats" | nc localhost 11211

# Get slab allocation stats
echo "stats slabs" | nc localhost 11211

# Get item stats
echo "stats items" | nc localhost 11211

# Key metrics to monitor:
# - get_hits / get_misses: cache hit ratio
# - curr_items: number of items stored
# - bytes: current memory usage
# - evictions: number of items evicted due to memory pressure

# Calculate hit ratio from stats output
echo "stats" | nc localhost 11211 | grep -E "get_hits|get_misses"
```

## Running Memcached with Resource Limits

Constrain the container's CPU and memory at the Podman level.

```bash
# Run Memcached with container-level resource limits
podman run -d \
  --name memcached-limited \
  -p 11214:11211 \
  --memory 512m \
  --cpus 1.0 \
  memcached:latest memcached -m 384 -c 1024

# Verify the container resource limits
podman inspect memcached-limited --format '{{.HostConfig.Memory}} {{.HostConfig.NanoCpus}}'
```

## Using Memcached with Applications

Connect to Memcached from a Python application.

```bash
# Install the Python memcached client
pip install pymemcache

# Create a simple test script
cat > ~/test-memcached.py <<'EOF'
from pymemcache.client.base import Client

# Connect to Memcached running in Podman
client = Client(('localhost', 11211))

# Set a value with a 300-second TTL
client.set('greeting', 'Hello from Podman Memcached!', expire=300)

# Retrieve the value
result = client.get('greeting')
print(f"Retrieved: {result.decode('utf-8')}")

# Get stats
stats = client.stats()
print(f"Current items: {stats[b'curr_items']}")
print(f"Total memory: {stats[b'limit_maxbytes']} bytes")
EOF

# Run the test
python3 ~/test-memcached.py
```

## Managing the Container

Routine management commands.

```bash
# View Memcached logs
podman logs my-memcached

# Flush all cached data
echo "flush_all" | nc localhost 11211

# Stop and start
podman stop my-memcached
podman start my-memcached

# Remove all Memcached containers
podman rm -f my-memcached memcached-256m memcached-tuned memcached-limited
```

## Summary

Running Memcached in a Podman container provides a lightweight, high-performance caching layer with minimal setup. Command-line flags give you control over memory limits, connection counts, and thread allocation. The simple text protocol makes it easy to test and interact with your cache directly. Podman's rootless containers add security, and container-level resource limits let you control exactly how much CPU and memory Memcached consumes. This setup is ideal for application caching, session storage, and reducing database load.
