# How to Install and Configure Memcached on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Memcached, Caching, Performance, Memory, Tutorial

Description: Learn how to install, configure, and optimize Memcached for high-performance distributed memory caching on Ubuntu.

---

Memcached is a high-performance, distributed memory caching system that speeds up dynamic web applications by reducing database load. It stores data in RAM for fast retrieval, making it ideal for session storage, query caching, and API response caching.

## Prerequisites

- Ubuntu 20.04, 22.04, or 24.04
- Root or sudo access
- Sufficient RAM for caching

## Installing Memcached

```bash
# Update package lists
sudo apt update

# Install Memcached server and tools
sudo apt install memcached libmemcached-tools -y

# Verify installation
memcached -h | head -5

# Check service status
sudo systemctl status memcached
```

## Basic Configuration

### Main Configuration File

```bash
# Edit Memcached configuration
sudo nano /etc/memcached.conf
```

Default configuration with explanations:

```bash
# Run as daemon
-d

# Log to syslog
logfile /var/log/memcached.log

# Verbose logging (for debugging)
# -v

# Memory allocation in megabytes
-m 64

# Listening port
-p 11211

# Run as memcache user
-u memcache

# Listen on localhost only (secure)
-l 127.0.0.1

# Maximum connections
-c 1024

# Lock memory (prevents swapping - recommended for production)
# -k

# Disable CAS (check-and-set) - saves 8 bytes per item
# -C

# Maximum object size (default 1MB)
# -I 1m
```

### Apply Configuration Changes

```bash
# Restart Memcached
sudo systemctl restart memcached

# Verify it's running
sudo systemctl status memcached

# Check listening port
ss -tlnp | grep 11211
```

## Memory Configuration

### Calculate Memory Allocation

Rule of thumb:
- Use 25-50% of available RAM for caching
- Leave enough for OS and applications
- Consider slab allocation overhead (~10%)

```bash
# Check available memory
free -h

# Set memory based on available RAM
# For 4GB server, allocate 1-2GB to Memcached
sudo sed -i 's/-m 64/-m 1024/' /etc/memcached.conf
sudo systemctl restart memcached
```

### Tune Maximum Object Size

```bash
# Allow larger objects (up to 10MB)
echo "-I 10m" | sudo tee -a /etc/memcached.conf
sudo systemctl restart memcached
```

## Network Configuration

### Listen on Specific IP (For Remote Access)

```bash
sudo nano /etc/memcached.conf
```

Change:
```bash
# Listen on all interfaces (not recommended for production)
-l 0.0.0.0

# Or specific IP
-l 192.168.1.100
```

### Enable Multiple Ports

```bash
# Listen on multiple ports
-p 11211
-p 11212
```

### UDP Support

```bash
# Enable UDP (disabled by default in newer versions)
-U 11211
```

## Security Configuration

### Firewall Rules

```bash
# Allow Memcached port from specific IPs only
sudo ufw allow from 192.168.1.0/24 to any port 11211

# Or deny external access (if localhost only)
sudo ufw deny 11211
```

### SASL Authentication

Enable authentication for remote access:

```bash
# Install SASL support
sudo apt install libsasl2-2 sasl2-bin libsasl2-modules -y

# Create SASL configuration directory
sudo mkdir -p /etc/sasl2

# Create Memcached SASL config
sudo nano /etc/sasl2/memcached.conf
```

```
mech_list: plain
log_level: 5
sasldb_path: /etc/sasl2/memcached-sasldb2
```

```bash
# Create user
sudo saslpasswd2 -a memcached -c -f /etc/sasl2/memcached-sasldb2 cache_user

# Set permissions
sudo chown memcache:memcache /etc/sasl2/memcached-sasldb2

# Enable SASL in Memcached config
echo "-S" | sudo tee -a /etc/memcached.conf

# Restart Memcached
sudo systemctl restart memcached
```

## Testing Memcached

### Using telnet

```bash
# Connect to Memcached
telnet localhost 11211
```

Test commands:
```
# Store a value
set mykey 0 900 5
hello
STORED

# Retrieve value
get mykey
VALUE mykey 0 5
hello
END

# Delete value
delete mykey
DELETED

# View statistics
stats

# Quit
quit
```

### Using nc (netcat)

```bash
# Set value
echo -e "set testkey 0 60 5\r\nhello\r" | nc localhost 11211

# Get value
echo -e "get testkey\r" | nc localhost 11211

# Get statistics
echo "stats" | nc localhost 11211
```

### Using memcstat

```bash
# View general statistics
memcstat --servers=localhost

# View specific stats
memcstat --servers=localhost --stat-args=items
memcstat --servers=localhost --stat-args=slabs
```

## PHP Integration

### Install PHP Memcached Extension

```bash
# Install PHP Memcached extension
sudo apt install php-memcached -y

# Restart PHP-FPM
sudo systemctl restart php8.3-fpm

# Verify extension is loaded
php -m | grep memcached
```

### PHP Usage Example

```php
<?php
// Create Memcached instance
$memcached = new Memcached();

// Add server(s)
$memcached->addServer('localhost', 11211);

// Store data (key, value, expiration in seconds)
$memcached->set('user_123', ['name' => 'John', 'email' => 'john@example.com'], 3600);

// Retrieve data
$user = $memcached->get('user_123');
if ($user !== false) {
    print_r($user);
} else {
    echo "Cache miss or error";
}

// Check for errors
$resultCode = $memcached->getResultCode();
if ($resultCode !== Memcached::RES_SUCCESS) {
    echo "Error: " . $memcached->getResultMessage();
}

// Delete data
$memcached->delete('user_123');

// Flush all data (use with caution!)
// $memcached->flush();
?>
```

### PHP Session Storage

```bash
# Edit PHP configuration
sudo nano /etc/php/8.3/fpm/php.ini
```

```ini
session.save_handler = memcached
session.save_path = "localhost:11211"
```

Or in your application:
```php
ini_set('session.save_handler', 'memcached');
ini_set('session.save_path', 'localhost:11211');
```

## Python Integration

```bash
# Install Python Memcached client
pip install python-memcached
# Or pymemcache (faster)
pip install pymemcache
```

```python
# Using pymemcache
from pymemcache.client import base

# Connect to Memcached
client = base.Client(('localhost', 11211))

# Set value
client.set('mykey', 'myvalue', expire=3600)

# Get value
value = client.get('mykey')
print(value)  # b'myvalue' (bytes)

# Delete value
client.delete('mykey')
```

## Monitoring

### Built-in Statistics

```bash
# General statistics
echo "stats" | nc localhost 11211

# Item statistics
echo "stats items" | nc localhost 11211

# Slab statistics
echo "stats slabs" | nc localhost 11211

# Connection statistics
echo "stats conns" | nc localhost 11211
```

### Key Metrics to Monitor

| Metric | Description | Concern Level |
|--------|-------------|---------------|
| `get_hits` / `get_misses` | Cache hit ratio | Low ratio = cache not effective |
| `curr_connections` | Current connections | Near max = need more connections |
| `bytes` | Used memory | Near limit = may evict data |
| `evictions` | Items removed for space | High = need more memory |
| `curr_items` | Items in cache | Track over time |

### Calculate Hit Ratio

```bash
# Get hits and misses
STATS=$(echo "stats" | nc localhost 11211)
HITS=$(echo "$STATS" | grep "STAT get_hits" | awk '{print $3}')
MISSES=$(echo "$STATS" | grep "STAT get_misses" | awk '{print $3}')

# Calculate ratio
RATIO=$(echo "scale=2; $HITS / ($HITS + $MISSES) * 100" | bc)
echo "Cache hit ratio: $RATIO%"
```

### Prometheus Metrics

```bash
# Install Memcached exporter
wget https://github.com/prometheus/memcached_exporter/releases/download/v0.14.0/memcached_exporter-0.14.0.linux-amd64.tar.gz
tar xzf memcached_exporter-0.14.0.linux-amd64.tar.gz
sudo mv memcached_exporter-0.14.0.linux-amd64/memcached_exporter /usr/local/bin/

# Run exporter
memcached_exporter --memcached.address=localhost:11211

# Metrics available at http://localhost:9150/metrics
```

## High Availability Setup

### Multiple Servers (Client-Side)

Memcached doesn't have built-in clustering; clients distribute keys:

```php
$memcached = new Memcached();
$memcached->addServers([
    ['192.168.1.10', 11211, 33],  // weight 33
    ['192.168.1.11', 11211, 33],
    ['192.168.1.12', 11211, 34],
]);

// Enable consistent hashing
$memcached->setOption(Memcached::OPT_DISTRIBUTION, Memcached::DISTRIBUTION_CONSISTENT);
$memcached->setOption(Memcached::OPT_LIBKETAMA_COMPATIBLE, true);
```

### Replication with Repcached

For data replication (master-slave):

```bash
# Install repcached (requires compilation)
# Note: Limited support, consider Redis for replication needs
```

## Performance Tuning

### Connection Limits

```bash
# Increase max connections
sudo sed -i 's/-c 1024/-c 4096/' /etc/memcached.conf
sudo systemctl restart memcached
```

### Thread Configuration

```bash
# Add threads (default is 4)
echo "-t 8" | sudo tee -a /etc/memcached.conf
sudo systemctl restart memcached
```

### Disable CAS (Save Memory)

```bash
# Disable CAS if not needed (saves 8 bytes per item)
echo "-C" | sudo tee -a /etc/memcached.conf
sudo systemctl restart memcached
```

## Troubleshooting

### Memcached Won't Start

```bash
# Check logs
sudo journalctl -u memcached -n 50

# Test configuration
memcached -v -m 64 -p 11211 -u memcache

# Check permissions
ls -la /var/run/memcached/
```

### High Eviction Rate

```bash
# Check evictions
echo "stats" | nc localhost 11211 | grep evictions

# Increase memory
sudo sed -i 's/-m [0-9]*/-m 2048/' /etc/memcached.conf
sudo systemctl restart memcached
```

### Connection Issues

```bash
# Check listening
ss -tlnp | grep memcached

# Test connectivity
nc -zv localhost 11211

# Check firewall
sudo ufw status
```

### Memory Issues

```bash
# Check actual memory usage
ps aux | grep memcached

# View slab allocation
echo "stats slabs" | nc localhost 11211
```

---

Memcached is excellent for simple key-value caching with high performance. For more complex caching needs like persistence, replication, or data structures beyond strings, consider Redis. Monitor your hit ratio and eviction rate to ensure your cache is sized appropriately for your workload.
