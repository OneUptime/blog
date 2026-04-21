# How to Troubleshoot Database IPv6 Connection Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Database, Troubleshooting, Networking, Connectivity

Description: A systematic guide to diagnosing and resolving IPv6 connectivity issues with databases including PostgreSQL, MySQL, MongoDB, Redis, and others.

## Common IPv6 Database Connection Errors

```text
# PostgreSQL

psql: error: connection to server at "2001:db8::10" (2001:db8::10), port 5432 failed:
Connection refused

# MySQL/MariaDB
ERROR 2003 (HY000): Can't connect to MySQL server on '2001:db8::10' (111)

# Redis
Could not connect to Redis at 2001:db8::10:6379: Connection refused

# MongoDB
MongoServerSelectionError: connect ECONNREFUSED [2001:db8::10]:27017
```

## Step 1: Verify Database is Listening

```bash
# Check all databases listening on IPv6
ss -6 -tlnp

# Filter by specific port
ss -6 -tlnp | grep ':5432'   # PostgreSQL/TimescaleDB
ss -6 -tlnp | grep ':3306'   # MySQL/MariaDB
ss -6 -tlnp | grep ':6379'   # Redis
ss -6 -tlnp | grep ':27017'  # MongoDB
ss -6 -tlnp | grep ':9200'   # Elasticsearch
ss -6 -tlnp | grep ':9042'   # Cassandra

# If not listed, database is not bound to IPv6
# Check current bind addresses
ss -tlnp | grep ':5432'  # Shows both IPv4 and IPv6
```

## Step 2: Verify IPv6 Connectivity

```bash
# Check if host has IPv6 address
ip -6 addr show

# Ping the database server over IPv6
ping -6 2001:db8::10

# Test port reachability
nc -6 -zv 2001:db8::10 5432

# Traceroute over IPv6
traceroute -6 2001:db8::10

# Or using mtr
mtr -6 2001:db8::10
```

## Step 3: Check Firewall Rules

```bash
# List IPv6 firewall rules (ip6tables)
ip6tables -L -n -v

# Check firewalld
firewall-cmd --list-all --zone=public

# Check if port is blocked
ip6tables -L INPUT -n | grep 5432

# Temporarily allow for testing
ip6tables -I INPUT -p tcp --dport 5432 -j ACCEPT

# UFW (Ubuntu)
ufw status
ufw allow 5432/tcp
```

## Step 4: Verify Database Configuration

```bash
# PostgreSQL - check listen_addresses
grep -i listen_addresses /etc/postgresql/*/main/postgresql.conf

# MySQL/MariaDB - check bind-address
grep -Ei 'bind[-_]address' /etc/mysql/mysql.conf.d/*.cnf /etc/mysql/mariadb.conf.d/*.cnf /etc/mysql/my.cnf /etc/my.cnf /etc/my.cnf.d/*.cnf 2>/dev/null

# Redis - check bind
grep -i "^bind" /etc/redis/redis.conf

# MongoDB - check bindIp and IPv6 support
grep -Ei "bindIp|ipv6" /etc/mongod.conf

# After finding the issue, edit the config and restart
systemctl restart postgresql
systemctl restart mariadb
systemctl restart redis
systemctl restart mongod
```

## Step 5: Check Authentication / Access Control

```bash
# PostgreSQL - check pg_hba.conf for IPv6 entries
grep -E "^host.*::" /etc/postgresql/*/main/pg_hba.conf

# If missing, add IPv6 entry
echo "host all all 2001:db8::/32 scram-sha-256" >> /etc/postgresql/15/main/pg_hba.conf
systemctl reload postgresql

# MySQL/MariaDB - check user grants
mysql -u root -p -e "SELECT User, Host FROM mysql.user WHERE Host LIKE '%:%';"

# Redis - check requirepass and bind in config
grep -E "^(requirepass|bind|protected-mode)" /etc/redis/redis.conf
```

## Step 6: Test with Verbose Output

```bash
# PostgreSQL with verbose logging
PGSSLMODE=disable psql "host=2001:db8::10 port=5432 user=postgres dbname=postgres" -v ON_ERROR_STOP=1

# MySQL with verbose output
mysql -h 2001:db8::10 -u root -p --verbose

# Redis with netcat
printf "PING\r\n" | nc -6 -w 2 2001:db8::10 6379

# MongoDB with mongosh verbose
mongosh "mongodb://[2001:db8::10]:27017" --verbose
```

## Common Fixes Summary

```bash
# Fix 1: Database not listening on IPv6
# → Update bind-address / listen_addresses to IPv6 address or ::
# For MongoDB, also enable net.ipv6: true and set net.bindIp/net.bindIpAll

# Fix 2: Firewall blocking
ip6tables -A INPUT -p tcp --dport 5432 -j ACCEPT

# Fix 3: PostgreSQL pg_hba.conf missing IPv6 entry
echo "host all all ::/0 scram-sha-256" >> /etc/postgresql/15/main/pg_hba.conf
systemctl reload postgresql

# Fix 4: DNS resolving to IPv4 instead of IPv6
# Force IPv6 resolution explicitly using the IPv6 address directly

# Fix 5: Application connecting to hostname that resolves to IPv4
# Use an IPv6 address literal directly; in URI-style connection strings, wrap it in brackets: [2001:db8::10]
```

## Summary

Troubleshoot database IPv6 connectivity systematically: (1) verify the database is listening on IPv6 with `ss -6 -tlnp`; (2) test network reachability with `ping -6` and `nc -6 -zv`; (3) check firewall rules with `ip6tables -L`; (4) verify database bind address in config files; (5) check access control (pg_hba.conf, MySQL user host grants, Redis bind); (6) test with verbose clients. Most issues are bind address misconfiguration or missing firewall rules.
