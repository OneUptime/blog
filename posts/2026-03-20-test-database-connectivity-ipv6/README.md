# How to Test Database Connectivity over IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Database, Testing, Connectivity, Network

Description: Learn how to systematically test database connectivity over IPv6 for PostgreSQL, MySQL, Redis, MongoDB, and other databases using command-line tools and scripts.

## Basic IPv6 Network Reachability Tests

```bash
# Test ICMP reachability

ping -6 -c 4 2001:db8::10

# Test TCP port reachability with netcat
nc -6 -zv 2001:db8::10 5432   # PostgreSQL
nc -6 -zv 2001:db8::10 3306   # MySQL
nc -6 -zv 2001:db8::10 6379   # Redis
nc -6 -zv 2001:db8::10 27017  # MongoDB
nc -6 -zv 2001:db8::10 9200   # Elasticsearch
nc -6 -zv 2001:db8::10 9042   # Cassandra

# Test with timeout
nc -6 -zv -w 5 2001:db8::10 5432
```

## PostgreSQL IPv6 Connectivity Test

```bash
# Basic connection test
psql -h 2001:db8::10 -p 5432 -U postgres -c "SELECT version();"

# Test with connection string
psql "host=2001:db8::10 port=5432 dbname=postgres user=postgres connect_timeout=10"

# Timing and performance test
time psql -h 2001:db8::10 -U postgres -c "SELECT 1;"

# Test with pg_isready
pg_isready -h 2001:db8::10 -p 5432 -U postgres
# Returns: 2001:db8::10:5432 - accepting connections
```

## MySQL/MariaDB IPv6 Connectivity Test

```bash
# Test connection
mysql -h 2001:db8::10 -P 3306 -u root -p -e "SELECT VERSION();"

# mysqladmin ping
mysqladmin -h 2001:db8::10 -u root -p ping

# Check connection status
mysql -h 2001:db8::10 -u root -p -e "SHOW STATUS LIKE 'Threads_connected';"

# Performance test
time mysql -h 2001:db8::10 -u root -p -e "SELECT 1;"
```

## Redis IPv6 Connectivity Test

```bash
# Test with redis-cli
redis-cli -6 -h 2001:db8::10 -p 6379 ping
# Expected: PONG

# Test with authentication
redis-cli -6 -h 2001:db8::10 -p 6379 -a mypassword ping

# Raw TCP test
printf "PING\r\n" | nc -6 -w 5 2001:db8::10 6379
# Expected: +PONG

# Get server info
redis-cli -6 -h 2001:db8::10 info server | grep tcp_port
```

## MongoDB IPv6 Connectivity Test

```bash
# Test with mongosh
mongosh "mongodb://[2001:db8::10]:27017" --eval "db.runCommand({ ping: 1 })"

# With authentication
mongosh "mongodb://user:password@[2001:db8::10]:27017/mydb" --eval "db.stats()"

# List databases
mongosh "mongodb://[2001:db8::10]:27017" --eval "db.adminCommand({ listDatabases: 1 })"
```

## Automated Test Script

```bash
#!/bin/bash
# test-db-ipv6.sh - Test all database services over IPv6

DB_HOST="2001:db8::10"
PASS_COUNT=0
FAIL_COUNT=0

test_connection() {
    local service=$1
    local port=$2
    if nc -6 -zv -w 5 "$DB_HOST" "$port" 2>/dev/null; then
        echo "PASS: $service ($DB_HOST:$port)"
        ((PASS_COUNT++))
    else
        echo "FAIL: $service ($DB_HOST:$port)"
        ((FAIL_COUNT++))
    fi
}

echo "=== IPv6 Database Connectivity Test ==="
echo "Target host: $DB_HOST"
echo ""

test_connection "PostgreSQL" 5432
test_connection "MySQL/MariaDB" 3306
test_connection "Redis" 6379
test_connection "MongoDB" 27017
test_connection "Elasticsearch" 9200
test_connection "Cassandra" 9042
test_connection "CockroachDB" 26257
test_connection "InfluxDB" 8086

echo ""
echo "Results: $PASS_COUNT passed, $FAIL_COUNT failed"
```

## Python Connectivity Test

```python
import socket
import sys

def test_ipv6_connection(host, port, service_name, timeout=5):
    """Test TCP connection to database over IPv6."""
    try:
        sock = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((host, port, 0, 0))  # (host, port, flowinfo, scope_id)
        sock.close()
        if result == 0:
            print(f"PASS: {service_name} at [{host}]:{port}")
            return True
        else:
            print(f"FAIL: {service_name} at [{host}]:{port} (error code: {result})")
            return False
    except Exception as e:
        print(f"FAIL: {service_name} at [{host}]:{port} ({e})")
        return False

host = "2001:db8::10"
services = [
    (5432, "PostgreSQL"),
    (3306, "MySQL"),
    (6379, "Redis"),
    (27017, "MongoDB"),
    (9200, "Elasticsearch"),
]

for port, name in services:
    test_ipv6_connection(host, port, name)
```

## Summary

Test database IPv6 connectivity with these tools: `ping -6` for ICMP reachability, `nc -6 -zv` for TCP port checks, and database-native clients (`psql -h`, `mysql -h`, `redis-cli -6 -h`, `mongosh`) for application-level tests. Use `pg_isready` for PostgreSQL health checks. Automate with a bash or Python script that checks all services. A successful `nc -6 -zv` but failed client connection often indicates application-layer issues such as authentication, TLS, protocol settings, or database access control rather than basic TCP reachability.
