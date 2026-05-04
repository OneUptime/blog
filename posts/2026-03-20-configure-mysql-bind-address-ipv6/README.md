# How to Configure MySQL bind-address for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, MySQL, Bind-address, Database Configuration

Description: Learn how to configure MySQL's bind-address parameter to listen on IPv6 interfaces, including specific IPv6 addresses, all interfaces, and dual-stack configurations.

## MySQL bind-address Options

```ini
# /etc/mysql/mysql.conf.d/mysqld.cnf or /etc/my.cnf

[mysqld]

# Default: only localhost (127.0.0.1)

bind-address = 127.0.0.1

# Listen on all IPv4 interfaces only
bind-address = 0.0.0.0

# Listen on all IPv4 and IPv6 interfaces (MySQL 8.0+ default)
bind-address = *

# Listen on the IPv6 wildcard (also accepts IPv4 unless IPV6_V6ONLY is set)
bind-address = ::

# Listen on specific IPv6 address
bind-address = 2001:db8::10

# Listen on IPv6 loopback
bind-address = ::1
```

## MySQL 8.0+ Multiple Bind Addresses

```ini
# MySQL 8.0.13+ supports multiple bind addresses as a comma-separated list.
# Wildcards (*, 0.0.0.0, ::) are NOT allowed inside the list - use specific IPs.
[mysqld]
bind-address = 198.51.100.20,2001:db8::10

# To listen on all IPv4 and IPv6 interfaces, use the wildcard alone:
# bind-address = *
```

## Configure MySQL for Dual-Stack

```ini
# /etc/mysql/mysql.conf.d/mysqld.cnf

[mysqld]
# Listen on all interfaces (IPv4 and IPv6)
bind-address = ::

# Other important settings
port = 3306
```

```bash
# Apply configuration
systemctl restart mysql

# Verify MySQL is listening on IPv6
ss -6 -tlnp | grep mysql
# Expected: tcp  LISTEN  0  80  [::]:3306  [::]:*
```

## Test IPv6 MySQL Connection

```bash
# Connect via IPv6 loopback
mysql -h ::1 -u root -p

# Connect via specific IPv6 address (from another host)
mysql -h 2001:db8::10 -u appuser -p mydb

# Test with connection string
mysql --host=2001:db8::10 --port=3306 --user=appuser --database=mydb

# Force TCP protocol when connecting via IPv6
mysql -h 2001:db8::10 --protocol=TCP -u root -p

# Python example
# import mysql.connector
# conn = mysql.connector.connect(host="2001:db8::10", port=3306, user="appuser", password="pass", database="mydb")
```

## Grant MySQL User Access from IPv6

```sql
-- Create user that can connect from IPv6 subnet
CREATE USER 'appuser'@'2001:db8::%' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON mydb.* TO 'appuser'@'2001:db8::%';

-- Create user for specific IPv6 address
CREATE USER 'appuser'@'2001:db8::10' IDENTIFIED BY 'password';
GRANT SELECT, INSERT, UPDATE ON mydb.* TO 'appuser'@'2001:db8::10';

-- Create user for IPv6 loopback
CREATE USER 'appuser'@'::1' IDENTIFIED BY 'password';
GRANT ALL ON mydb.* TO 'appuser'@'::1';

FLUSH PRIVILEGES;
```

## Verify MySQL IPv6 Configuration

```bash
# Check listening status
ss -tlnp | grep mysql

# Check error log for binding messages
grep -i 'bind\|IPv6\|address' /var/log/mysql/error.log

# Show bound addresses from within MySQL
mysql -u root -p -e "SHOW GLOBAL VARIABLES LIKE 'bind_address';"

# Show all network connections
mysql -u root -p -e "SHOW STATUS LIKE 'Threads_connected';"
```

## Firewall Rules for MySQL IPv6

```bash
# Allow MySQL over IPv6
ip6tables -A INPUT -p tcp --dport 3306 -s 2001:db8:abcd::/48 -j ACCEPT
ip6tables -A INPUT -p tcp --dport 3306 -s ::1 -j ACCEPT
ip6tables -A INPUT -p tcp --dport 3306 -j DROP

# Or with ufw
ufw allow from 2001:db8:abcd::/48 to any port 3306
```

## Summary

Configure MySQL to listen on IPv6 by setting `bind-address = ::` (all interfaces) or `bind-address = 2001:db8::10` (specific address) in `mysqld.cnf`. Restart MySQL after changes. Grant access with `CREATE USER 'user'@'2001:db8::%'` - MySQL uses the host portion of the user account to control access. Verify with `ss -6 -tlnp | grep mysql` and test with `mysql -h 2001:db8::10 -u user -p`.
