# How to Configure MariaDB for IPv6 Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, MariaDB, MySQL, Database, SQL

Description: Learn how to configure MariaDB to accept connections over IPv6 by setting bind-address, creating user accounts with IPv6 hosts, and testing connectivity.

## MariaDB bind-address Configuration

```ini
# /etc/mysql/mariadb.conf.d/50-server.cnf (Debian/Ubuntu)

# /etc/my.cnf.d/server.cnf (RHEL/CentOS)

[mysqld]
# Bind to specific IPv6 address
bind-address = 2001:db8::10

# Bind to all interfaces (IPv4 and IPv6)
bind-address = ::

# Bind to IPv6 loopback
# bind-address = ::1

# Bind to multiple specific addresses (MariaDB 10.11+)
# bind-address = 2001:db8::10,192.0.2.10
```

## Apply Changes

```bash
# Restart MariaDB
systemctl restart mariadb

# Verify listening on IPv6
ss -6 -tlnp | grep -E 'mariadb|mysql'
# Expected: [2001:db8::10]:3306

# Test connection
mysql -h 2001:db8::10 -u root -p
```

## Create IPv6 User Accounts

```sql
-- Connect to MariaDB (as root)

-- Create user allowing connection from specific IPv6 address
CREATE USER 'dbuser'@'2001:db8::20' IDENTIFIED BY 'strongpassword';
GRANT ALL PRIVILEGES ON mydb.* TO 'dbuser'@'2001:db8::20';

-- Create user for entire IPv6 subnet (using LIKE pattern)
CREATE USER 'dbuser'@'2001:db8::%' IDENTIFIED BY 'strongpassword';
GRANT SELECT, INSERT, UPDATE ON mydb.* TO 'dbuser'@'2001:db8::%';

-- Create user for any IPv6 address
CREATE USER 'appuser'@'%' IDENTIFIED BY 'apppassword';
GRANT SELECT ON appdb.* TO 'appuser'@'%';

-- Verify user accounts
SELECT User, Host FROM mysql.user;

FLUSH PRIVILEGES;
```

## Test IPv6 Connectivity

```bash
# Test connection from remote host over IPv6
mysql -h 2001:db8::10 -P 3306 -u dbuser -p mydb

# Test with mysqladmin ping
mysqladmin -h 2001:db8::10 -u root -p ping

# Check process list (shows connection addresses)
mysql -h 2001:db8::10 -u root -p -e "SHOW PROCESSLIST;"

# Check network status
mysql -h 2001:db8::10 -u root -p -e "SHOW STATUS LIKE 'Connections';"
```

## MariaDB Galera Cluster with IPv6

```ini
# /etc/mysql/conf.d/galera.cnf

[mysqld]
bind-address = 2001:db8::10

# Galera Provider Configuration
wsrep_on = ON
wsrep_provider = /usr/lib/galera/libgalera_smm.so

# Cluster Configuration
wsrep_cluster_name = "my_cluster"
wsrep_cluster_address = "gcomm://[2001:db8::10],[2001:db8::11],[2001:db8::12]"

# Node Configuration
wsrep_node_address = "2001:db8::10"
wsrep_node_name = "node1"

# SST Configuration
wsrep_sst_method = rsync
```

## Python Client over IPv6

```python
import pymysql

# Connect to MariaDB via IPv6
conn = pymysql.connect(
    host="2001:db8::10",
    port=3306,
    user="dbuser",
    password="strongpassword",
    database="mydb",
    charset="utf8mb4"
)

cursor = conn.cursor()

# Execute query
cursor.execute("SELECT VERSION()")
version = cursor.fetchone()
print(f"MariaDB Version: {version[0]}")

# Insert data
cursor.execute(
    "INSERT INTO logs (timestamp, message) VALUES (NOW(), %s)",
    ("Test message over IPv6",)
)
conn.commit()

cursor.close()
conn.close()
```

## Firewall Rules for IPv6

```bash
# Allow MariaDB port over IPv6 (firewalld)
firewall-cmd --zone=public --add-rich-rule='rule family="ipv6" port port="3306" protocol="tcp" accept' --permanent
firewall-cmd --reload

# Using ip6tables directly
ip6tables -A INPUT -p tcp --dport 3306 -j ACCEPT
ip6tables-save > /etc/iptables/rules.v6
```

## Summary

Configure MariaDB for IPv6 by setting `bind-address = 2001:db8::10` (or `bind-address = ::` for all interfaces) in the `[mysqld]` section of `50-server.cnf` or `server.cnf`. Create user accounts with IPv6 host patterns: `CREATE USER 'user'@'2001:db8::20'` for specific hosts or `'user'@'%'` for any host. Restart with `systemctl restart mariadb`. Test with `mysql -h 2001:db8::10 -u user -p`. For Galera clusters, use bracket notation in `wsrep_cluster_address`.
