# How to Install and Configure Memcached on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Memcached, Caching, Performance

Description: Install and configure Memcached on Ubuntu for high-performance in-memory caching. Covers installation, configuration options, security, and integration with applications.

---

Memcached is a distributed, in-memory key-value cache that dramatically reduces database load for read-heavy applications. It stores frequently accessed data in RAM so your application can retrieve it in microseconds instead of milliseconds. Twitter, Facebook, and Wikipedia have all used Memcached at scale.

## Installing Memcached

Ubuntu includes Memcached in its standard repositories.

```bash
# Update package list and install
sudo apt update
sudo apt install memcached libmemcached-tools -y

# The libmemcached-tools package provides useful command-line tools
# like memcstat, memccat, memcflush

# Verify installation
memcached --version
# Memcached 1.6.x

# Check service status
sudo systemctl status memcached
```

## Basic Configuration

The main configuration file is `/etc/memcached.conf`.

```bash
sudo nano /etc/memcached.conf
```

Key settings to understand:

```ini
# Run as a daemon
-d

# Log file location
logfile /var/log/memcached.log

# Memory allocation in megabytes (default 64MB, increase for production)
-m 512

# TCP port (default 11211)
-p 11211

# Listen on localhost only (change to 0.0.0.0 only if needed)
-l 127.0.0.1

# Number of parallel connections
-c 1024

# Run as this user
-u memcache

# Maximum item size (default 1MB, increase if caching large objects)
-I 2m

# Number of threads (match to CPU cores)
-t 4

# Disable UDP (UDP is enabled by default but rarely needed)
-U 0
```

After changing the configuration:

```bash
sudo systemctl restart memcached
sudo systemctl enable memcached
```

## Verifying Memcached Is Running

```bash
# Check that Memcached is listening
ss -tlnp | grep 11211

# Use telnet to interact directly
telnet 127.0.0.1 11211

# In the telnet session, test basic operations:
# Set a value
set mykey 0 60 5
hello
# Stored

# Get the value
get mykey
# VALUE mykey 0 5
# hello
# END

# Quit
quit
```

## Checking Stats

```bash
# View all Memcached statistics
memcstat --servers=127.0.0.1

# Key stats to watch:
# curr_items - number of items currently stored
# bytes - total bytes in use
# get_hits / get_misses - cache hit rate
# evictions - items evicted due to memory pressure

# Calculate hit rate
memcstat --servers=127.0.0.1 | grep -E 'get_hits|get_misses'
# hit_rate = get_hits / (get_hits + get_misses)
```

## Securing Memcached

By default, Memcached has no authentication. Anyone who can reach the port can read and write all data. Proper network security is critical.

### Bind to Localhost Only

```ini
# In /etc/memcached.conf - already the default
-l 127.0.0.1
```

### Use SASL Authentication (for network-accessible instances)

SASL support requires a Memcached build with SASL enabled.

```bash
# Check if SASL support is compiled in
memcached -help 2>&1 | grep -i sasl

# Install SASL dependencies
sudo apt install libsasl2-modules -y

# Enable SASL in /etc/memcached.conf
echo "-S" | sudo tee -a /etc/memcached.conf

# Create SASL password database
sudo mkdir -p /etc/sasl2
cat > /etc/sasl2/memcached.conf << 'EOF'
mech_list: plain
log_level: 5
sasldb_path: /etc/sasl2/memcached.db
EOF

# Create a user
sudo saslpasswd2 -f /etc/sasl2/memcached.db -c memcache_user
# Enter password twice

sudo systemctl restart memcached
```

### Firewall Rules

If Memcached must listen on a network interface, restrict access by IP.

```bash
# Allow only your application server to access Memcached
sudo ufw allow from 10.0.0.5 to any port 11211

# Block all other access to port 11211
sudo ufw deny 11211
```

## Using Memcached from Python

```python
from pymemcache.client.base import Client
from pymemcache.client.retrying import RetryingClient
import json

# Basic client setup
client = Client(('127.0.0.1', 11211))

# Store a string value (TTL of 300 seconds)
client.set('greeting', 'Hello, World!', expire=300)

# Retrieve it
value = client.get('greeting')
print(value)  # b'Hello, World!'

# Store complex data as JSON
user_data = {'id': 123, 'name': 'Alice', 'email': 'alice@example.com'}
client.set('user:123', json.dumps(user_data), expire=600)

# Retrieve and deserialize
cached = client.get('user:123')
if cached:
    user = json.loads(cached)
    print(user['name'])  # Alice

# Delete a key
client.delete('user:123')

# Increment a counter (atomic operation)
client.set('page_views', 0)
client.incr('page_views', 1)
client.incr('page_views', 1)
count = client.get('page_views')
print(count)  # b'2'

# Get multiple keys in one round trip
client.set('key1', 'value1')
client.set('key2', 'value2')
results = client.get_many(['key1', 'key2', 'key3'])
print(results)  # {'key1': b'value1', 'key2': b'value2'}
# key3 is not in results since it doesn't exist
```

## Cache-Aside Pattern Implementation

The most common caching pattern is cache-aside (lazy loading): check the cache first, fall back to the database on a miss, then populate the cache.

```python
import sqlite3
from pymemcache.client.base import Client
import json

mc = Client(('127.0.0.1', 11211))

def get_user(user_id):
    cache_key = f'user:{user_id}'

    # Try cache first
    cached = mc.get(cache_key)
    if cached:
        return json.loads(cached)

    # Cache miss - query database
    conn = sqlite3.connect('/data/myapp.db')
    conn.row_factory = sqlite3.Row
    row = conn.execute(
        'SELECT * FROM users WHERE id = ?', (user_id,)
    ).fetchone()
    conn.close()

    if row is None:
        return None

    user = dict(row)

    # Populate cache with 10-minute TTL
    mc.set(cache_key, json.dumps(user), expire=600)

    return user

def update_user(user_id, data):
    conn = sqlite3.connect('/data/myapp.db')
    conn.execute(
        'UPDATE users SET name=?, email=? WHERE id=?',
        (data['name'], data['email'], user_id)
    )
    conn.commit()
    conn.close()

    # Invalidate cache after update
    mc.delete(f'user:{user_id}')
```

## Tuning Memory Allocation

Memcached uses a slab allocator to manage memory efficiently.

```bash
# View slab statistics
memcstat --servers=127.0.0.1 | grep -E 'STAT items|STAT slabs'

# Useful slab-related stats
# cmd_get / cmd_set ratio shows read/write balance
# evictions > 0 means you're running out of memory
# If evictions are high, increase -m in memcached.conf

# Example: allocate 1GB of RAM
sudo sed -i 's/^-m .*/# -m 64\n-m 1024/' /etc/memcached.conf
sudo systemctl restart memcached
```

## Multi-Server Setup

For high availability, run Memcached on multiple servers and use consistent hashing.

```python
from pymemcache.client.hash import HashClient

# Connect to multiple Memcached servers
servers = [
    ('10.0.0.1', 11211),
    ('10.0.0.2', 11211),
    ('10.0.0.3', 11211),
]

client = HashClient(servers)

# Keys are distributed across servers using consistent hashing
client.set('user:1', 'alice_data')
client.set('user:2', 'bob_data')
client.set('user:3', 'carol_data')
```

Consistent hashing minimizes cache misses when adding or removing servers, since only a fraction of keys need to be redistributed.

## Monitoring Memcached

Set up basic monitoring to track cache health.

```bash
#!/bin/bash
# /usr/local/bin/check-memcached.sh
# Print key Memcached metrics

STATS=$(memcstat --servers=127.0.0.1)

HITS=$(echo "$STATS" | grep 'get_hits' | awk '{print $2}')
MISSES=$(echo "$STATS" | grep 'get_misses' | awk '{print $2}')
EVICTIONS=$(echo "$STATS" | grep '^STAT evictions' | awk '{print $2}')
CURR_ITEMS=$(echo "$STATS" | grep 'curr_items' | awk '{print $2}')
BYTES_USED=$(echo "$STATS" | grep '^STAT bytes ' | awk '{print $2}')
BYTES_LIMIT=$(echo "$STATS" | grep 'limit_maxbytes' | awk '{print $2}')

TOTAL=$((HITS + MISSES))
if [ "$TOTAL" -gt 0 ]; then
    HIT_RATE=$(echo "scale=2; $HITS * 100 / $TOTAL" | bc)
else
    HIT_RATE="N/A"
fi

USAGE=$(echo "scale=2; $BYTES_USED * 100 / $BYTES_LIMIT" | bc)

echo "Cache hit rate:  ${HIT_RATE}%"
echo "Memory usage:    ${USAGE}%"
echo "Current items:   $CURR_ITEMS"
echo "Evictions:       $EVICTIONS"
```

A healthy Memcached instance should show a hit rate above 80% and evictions near zero. If evictions are climbing, it is time to increase the memory allocation or evaluate which data is worth caching.
