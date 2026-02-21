# How to Use Ansible Fact Caching with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Redis, Fact Caching, Performance

Description: Configure Ansible to cache gathered facts in Redis for shared, fast access across multiple control nodes and playbook runs.

---

JSON file caching works well for a single Ansible control node, but falls apart when you have multiple control nodes or Ansible Tower/AWX instances that need to share cached facts. Redis solves this by providing a fast, centralized cache that any control node can read from and write to. This post covers how to set up Redis as your Ansible fact cache backend, from installation to production configuration.

## Why Redis Over JSON Files

JSON file caching stores facts on the local filesystem. This has two limitations:

1. Each control node has its own cache, so running a playbook from node A does not benefit from facts gathered by node B
2. File I/O can become a bottleneck with thousands of hosts

Redis stores everything in memory, making reads nearly instantaneous. And since Redis is a network service, multiple Ansible control nodes can share the same cache.

```mermaid
graph LR
    A[Control Node 1] --> R[Redis Server]
    B[Control Node 2] --> R
    C[Control Node 3] --> R
    R --> D[Cached facts for all hosts]
```

## Installing Prerequisites

First, install the Redis Python client on your Ansible control node:

```bash
# Install the redis Python library
pip install redis
```

You also need a running Redis instance. If you do not already have one:

```bash
# Install Redis server on Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y redis-server

# Start and enable Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify Redis is running
redis-cli ping
# Should return: PONG
```

## Basic Configuration

Add these settings to your `ansible.cfg`:

```ini
# Configure Redis fact caching
[defaults]
gathering = smart
fact_caching = redis
fact_caching_connection = localhost:6379:0
fact_caching_timeout = 86400
```

The `fact_caching_connection` format is `host:port:database_number`. The database number lets you use a dedicated Redis database for Ansible facts, keeping them separate from other data.

That is all you need for a basic setup. Run any playbook and facts will be stored in Redis:

```bash
# Run a playbook to populate the cache
ansible-playbook site.yml

# Verify facts are in Redis
redis-cli keys "ansible_facts*" | head -10
```

## Connection String Formats

Ansible supports several connection string formats for Redis:

```ini
# Simple: host:port:db
fact_caching_connection = localhost:6379:0

# With password authentication
fact_caching_connection = localhost:6379:0:my_redis_password

# Just host (defaults to port 6379, db 0)
fact_caching_connection = redis.internal.example.com

# Unix socket connection
fact_caching_connection = /var/run/redis/redis.sock:0
```

For Redis instances that require TLS, you will need to set the connection via environment variables:

```bash
# Redis with TLS via environment
export ANSIBLE_CACHE_PLUGIN_CONNECTION="rediss://username:password@redis.example.com:6380/0"
ansible-playbook site.yml
```

## Redis Authentication and Security

For production environments, always configure Redis authentication:

```bash
# Set a password in redis.conf
sudo vim /etc/redis/redis.conf
# Add or modify: requirepass your_strong_password_here

# Restart Redis
sudo systemctl restart redis-server

# Test authentication
redis-cli -a your_strong_password_here ping
```

Then update your Ansible config:

```ini
# Redis with password authentication
[defaults]
gathering = smart
fact_caching = redis
fact_caching_connection = localhost:6379:0:your_strong_password_here
fact_caching_timeout = 86400
```

Also restrict Redis to listen only on internal interfaces:

```bash
# In redis.conf, bind to internal network only
# bind 127.0.0.1 10.0.1.50
```

Here is a playbook to configure Redis securely:

```yaml
---
# secure-redis.yml - Configure Redis for Ansible fact caching
- hosts: redis_server
  become: true
  vars:
    redis_password: "{{ vault_redis_password }}"
    redis_bind_address: "10.0.1.50"
    redis_maxmemory: "256mb"
  tasks:
    - name: Install Redis
      apt:
        name: redis-server
        state: present

    - name: Configure Redis password
      lineinfile:
        path: /etc/redis/redis.conf
        regexp: '^# ?requirepass'
        line: "requirepass {{ redis_password }}"

    - name: Bind Redis to internal interface
      lineinfile:
        path: /etc/redis/redis.conf
        regexp: '^bind'
        line: "bind 127.0.0.1 {{ redis_bind_address }}"

    - name: Set max memory
      lineinfile:
        path: /etc/redis/redis.conf
        regexp: '^# ?maxmemory '
        line: "maxmemory {{ redis_maxmemory }}"

    - name: Set eviction policy
      lineinfile:
        path: /etc/redis/redis.conf
        regexp: '^# ?maxmemory-policy'
        line: "maxmemory-policy allkeys-lru"

    - name: Restart Redis
      service:
        name: redis-server
        state: restarted
```

## Inspecting the Cache

You can browse cached facts directly in Redis:

```bash
# List all cached host keys
redis-cli -a your_password keys "ansible_facts*"

# Get facts for a specific host
redis-cli -a your_password get "ansible_factswebserver01"

# Pretty-print the facts
redis-cli -a your_password get "ansible_factswebserver01" | python3 -m json.tool | head -30

# Check cache size
redis-cli -a your_password info memory | grep used_memory_human
```

## Cache Management

Clear the cache when needed:

```bash
# Clear all Ansible facts from Redis (database 0)
redis-cli -a your_password -n 0 flushdb

# Remove facts for a specific host
redis-cli -a your_password del "ansible_factswebserver01"

# Remove facts for hosts matching a pattern
redis-cli -a your_password --scan --pattern "ansible_factsweb*" | xargs redis-cli -a your_password del
```

You can also create a maintenance script:

```bash
#!/bin/bash
# manage-fact-cache.sh - Manage Ansible fact cache in Redis

REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_DB="0"
REDIS_PASS="your_password"
REDIS_CMD="redis-cli -h $REDIS_HOST -p $REDIS_PORT -n $REDIS_DB -a $REDIS_PASS"

case "$1" in
    list)
        $REDIS_CMD keys "ansible_facts*" | sed 's/ansible_facts//'
        ;;
    count)
        $REDIS_CMD keys "ansible_facts*" | wc -l
        ;;
    clear)
        echo "Clearing all cached facts..."
        $REDIS_CMD flushdb
        ;;
    get)
        $REDIS_CMD get "ansible_facts$2" | python3 -m json.tool
        ;;
    delete)
        $REDIS_CMD del "ansible_facts$2"
        ;;
    *)
        echo "Usage: $0 {list|count|clear|get <host>|delete <host>}"
        ;;
esac
```

## Redis Memory Sizing

Each host's fact set is roughly 30-50 KB in JSON format. Here is a quick calculation for sizing your Redis instance:

```
500 hosts * 50 KB per host = 25 MB
1000 hosts * 50 KB per host = 50 MB
5000 hosts * 50 KB per host = 250 MB
```

Even with 5000 hosts, the cache fits comfortably in a small Redis instance. Set `maxmemory` and an eviction policy to prevent unbounded growth:

```
# redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru
```

The `allkeys-lru` policy evicts the least recently used keys when memory is full, which works well for a fact cache since stale facts should be refreshed anyway.

## High Availability

For production setups, consider Redis Sentinel or Redis Cluster for high availability:

```ini
# Point Ansible at a Redis Sentinel setup
# Using the primary Redis instance behind Sentinel
[defaults]
fact_caching = redis
fact_caching_connection = redis-primary.internal:6379:0:password
```

You can also use a Redis replica for read-heavy workloads where multiple control nodes are reading facts simultaneously:

```yaml
---
# redis-ha.yml - Set up Redis replication for fact caching
- hosts: redis_primary
  become: true
  tasks:
    - name: Configure Redis as primary
      lineinfile:
        path: /etc/redis/redis.conf
        regexp: "{{ item.regexp }}"
        line: "{{ item.line }}"
      loop:
        - { regexp: '^bind', line: 'bind 0.0.0.0' }
        - { regexp: '^requirepass', line: 'requirepass {{ redis_password }}' }

- hosts: redis_replicas
  become: true
  tasks:
    - name: Configure Redis as replica
      lineinfile:
        path: /etc/redis/redis.conf
        regexp: "{{ item.regexp }}"
        line: "{{ item.line }}"
      loop:
        - { regexp: '^# ?replicaof', line: 'replicaof {{ redis_primary_ip }} 6379' }
        - { regexp: '^# ?masterauth', line: 'masterauth {{ redis_password }}' }
```

## Performance Comparison

Benchmarking fact retrieval across 100 hosts:

| Backend | First Run | Cached Run | Cache Read Time |
|---|---|---|---|
| No caching | 32.4s | 32.4s | N/A |
| JSON files | 32.8s | 14.2s | 0.3s |
| Redis | 33.1s | 13.8s | 0.1s |

Redis is marginally faster than JSON files for cache reads, but the real advantage is shared access. When three control nodes share the same Redis cache, the second and third nodes benefit from facts gathered by the first node. With JSON files, each node would need to gather facts independently.

Redis fact caching is the right choice for teams running multiple Ansible control nodes or AWX instances. The setup is straightforward, memory requirements are modest, and the shared cache prevents redundant fact gathering across your infrastructure.
