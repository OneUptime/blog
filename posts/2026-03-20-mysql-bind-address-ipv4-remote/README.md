# How to Configure MySQL bind-address for Remote IPv4 Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, IPv4, Bind-address, Remote Connections, Configuration, Database

Description: Configure MySQL's bind-address in my.cnf to accept remote connections from specific IPv4 addresses, and create user grants to allow remote access.

## Introduction

By default, MySQL binds to `127.0.0.1` and only accepts local connections. To allow remote clients to connect, you must change `bind-address` to your server's public IPv4 address or `0.0.0.0`, and grant the MySQL user access from the client's IP.

## Changing bind-address

```bash
# /etc/mysql/mysql.conf.d/mysqld.cnf (Ubuntu/Debian)

# or /etc/my.cnf (RHEL/CentOS)

[mysqld]
# Listen on specific IPv4 address
bind-address = 203.0.113.10

# Or listen on all IPv4 interfaces
# bind-address = 0.0.0.0

# Disable IPv6 binding
# bind-address with IPv4 automatically excludes IPv6
```

```bash
# Restart MySQL to apply
sudo systemctl restart mysql

# Verify MySQL is listening on the new address
sudo ss -tlnp | grep mysql
# Expected: LISTEN 0 ... 203.0.113.10:3306
```

## Granting Remote User Access

```bash
# Connect to MySQL
sudo mysql -u root -p

-- Grant access from specific IP (MySQL 8.0+ requires CREATE USER first)
CREATE USER 'appuser'@'10.0.0.5' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON mydb.* TO 'appuser'@'10.0.0.5';

-- Grant access from a subnet
CREATE USER 'appuser'@'10.0.0.%' IDENTIFIED BY 'password';
GRANT SELECT, INSERT, UPDATE, DELETE ON mydb.* TO 'appuser'@'10.0.0.%';

-- Grant read-only from specific IP
CREATE USER 'readuser'@'203.0.113.20' IDENTIFIED BY 'readpass';
GRANT SELECT ON mydb.* TO 'readuser'@'203.0.113.20';

-- Apply privilege changes
FLUSH PRIVILEGES;

-- Verify grants
SHOW GRANTS FOR 'appuser'@'10.0.0.5';
```

## Firewall Rules

```bash
# Open MySQL port for remote access
sudo ufw allow from 10.0.0.0/24 to any port 3306

# iptables
sudo iptables -A INPUT -p tcp --dport 3306 -s 10.0.0.0/24 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 3306 -j DROP  # Block all others
```

## Testing Remote Connection

```bash
# From the client machine (10.0.0.5):
mysql -h 203.0.113.10 -u appuser -p mydb

# With verbose connection info
mysql -h 203.0.113.10 -u appuser -p --verbose

# Test connectivity before authentication
nc -zv 203.0.113.10 3306
# Expected: Connection to 203.0.113.10 3306 port [tcp/mysql] succeeded!

# Test with mysqladmin
mysqladmin -h 203.0.113.10 -u appuser -p ping
# Expected: mysqld is alive
```

## Conclusion

To enable remote MySQL connections: set `bind-address` to the server's IPv4 address or `0.0.0.0` in `mysqld.cnf`, restart MySQL, grant the user access from the client IP with `GRANT ... TO 'user'@'client_ip'`, open port 3306 in the firewall, and verify with `nc -zv server:3306` before attempting a client connection.
