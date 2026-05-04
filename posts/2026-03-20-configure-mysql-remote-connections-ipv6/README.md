# How to Configure MySQL Remote Connections over IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, MySQL, Remote Connections, Database, Network Configuration

Description: Learn how to configure MySQL for remote connections over IPv6, covering bind-address configuration, user account creation, firewall rules, and SSL/TLS setup.

## Step 1: Configure MySQL to Listen on IPv6

```ini
# /etc/mysql/mysql.conf.d/mysqld.cnf

[mysqld]
# Listen on all interfaces (required for remote connections)

bind-address = ::

# Or listen on specific IPv6 address
# bind-address = 2001:db8::10

port = 3306
```

```bash
# Restart MySQL
systemctl restart mysql

# Verify listening
ss -6 -tlnp | grep mysql
# tcp6  LISTEN  0  80  [::]:3306  [::]:*  users:(("mysqld"...))
```

## Step 2: Create Remote IPv6 User

```sql
-- Connect locally as root
mysql -u root -p

-- Create user for remote IPv6 access
CREATE USER 'remote_app'@'2001:db8::abcd' IDENTIFIED BY 'SecurePass123!';
GRANT SELECT, INSERT, UPDATE ON production_db.* TO 'remote_app'@'2001:db8::abcd';

-- Or allow from all clients (use with firewall control)
CREATE USER 'remote_app'@'%' IDENTIFIED BY 'SecurePass123!';
GRANT SELECT, INSERT ON production_db.* TO 'remote_app'@'%';

FLUSH PRIVILEGES;
```

## Step 3: Configure Firewall for IPv6 MySQL

```bash
# Allow MySQL from specific IPv6 subnet
ip6tables -A INPUT -p tcp --dport 3306 \
    -s 2001:db8:abcd::/48 -j ACCEPT

# Block MySQL from all other IPv6 addresses
ip6tables -A INPUT -p tcp --dport 3306 -j DROP

# Save rules
ip6tables-save > /etc/iptables/rules.v6

# With ufw (Ubuntu/Debian)
ufw allow from 2001:db8:abcd::/48 to any port 3306 proto tcp
ufw deny 3306
```

## Step 4: Configure SSL/TLS for Remote IPv6

```ini
# /etc/mysql/mysql.conf.d/mysqld.cnf

[mysqld]
bind-address = ::

# SSL/TLS configuration
ssl-ca = /etc/mysql/ssl/ca.pem
ssl-cert = /etc/mysql/ssl/server-cert.pem
ssl-key = /etc/mysql/ssl/server-key.pem

# Require SSL for all connections (optional)
# require_secure_transport = ON
```

```sql
-- Require SSL for remote user
ALTER USER 'remote_app'@'%' REQUIRE SSL;

-- Or require X.509 client certificate
ALTER USER 'remote_app'@'%' REQUIRE X509;
```

## Test Remote IPv6 Connection

```bash
# Test basic connection
mysql -h 2001:db8::10 -P 3306 -u remote_app -p production_db

# Test with SSL
mysql -h 2001:db8::10 -u remote_app -p \
    --ssl-ca=/etc/mysql/ssl/ca.pem \
    --ssl-cert=/etc/mysql/ssl/client-cert.pem \
    --ssl-key=/etc/mysql/ssl/client-key.pem

# Verify SSL is being used
mysql -h 2001:db8::10 -u remote_app -p \
    -e "SHOW STATUS LIKE 'Ssl_cipher';"

# Test connectivity (without authentication)
nc -zv 2001:db8::10 3306
```

## Troubleshoot Remote IPv6 Connection Failures

```bash
# Check MySQL error log
tail -f /var/log/mysql/error.log

# Check if MySQL is listening
ss -6 -tlnp | grep :3306

# Verify user exists with correct host
mysql -u root -p -e "SELECT user, host FROM mysql.user WHERE user='remote_app';"

# Check firewall is not blocking
ip6tables -L INPUT -n | grep 3306

# Test with verbose mysql client
mysql -h 2001:db8::10 -u remote_app -p -v
```

## Summary

Configure MySQL for remote IPv6 connections: (1) set `bind-address = ::` in `mysqld.cnf`, (2) create user with `CREATE USER 'user'@'2001:db8::abcd'`, (3) configure firewall with `ip6tables -A INPUT -p tcp --dport 3306 -s 2001:db8:abcd::/48 -j ACCEPT`, (4) optionally require SSL with `ALTER USER 'user'@'%' REQUIRE SSL`. Test with `mysql -h 2001:db8::10 -u user -p`. Restart MySQL after `bind-address` changes.
