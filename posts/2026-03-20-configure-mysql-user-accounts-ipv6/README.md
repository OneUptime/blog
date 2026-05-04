# How to Configure MySQL User Accounts for IPv6 Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, MySQL, User Management, Database Security, Authentication

Description: Learn how to create and manage MySQL user accounts that allow connections from IPv6 addresses and subnets, including wildcards, specific hosts, and authentication methods.

## MySQL User Account Format for IPv6

```sql
-- MySQL user accounts: 'username'@'host'
-- For IPv6, the host part is the IPv6 address or wildcard

-- Specific IPv6 address
CREATE USER 'app'@'2001:db8::10' IDENTIFIED BY 'password';

-- IPv6 loopback
CREATE USER 'admin'@'::1' IDENTIFIED BY 'password';

-- IPv6 wildcard (% = any characters)
-- Note: MySQL doesn't support CIDR notation for user hosts
-- % wildcard covers any address
CREATE USER 'app'@'%' IDENTIFIED BY 'password';
```

## Creating Users for IPv6 Access

```sql
-- Create user accessible from specific IPv6 address
CREATE USER 'webapp'@'2001:db8::20' IDENTIFIED BY 'SecurePass123!';

-- Grant database access
GRANT SELECT, INSERT, UPDATE, DELETE ON webapp_db.* TO 'webapp'@'2001:db8::20';

-- Create user accessible from IPv6 addresses starting with 2001:db8::
-- MySQL doesn't support CIDR for IPv6, so use % wildcard for string matching
-- Note: this is a literal string match against the canonical IPv6 form,
-- not a true /48 subnet match (e.g. 2001:db8:0:1::1 would not match):
CREATE USER 'webapp'@'2001:db8::%' IDENTIFIED BY 'SecurePass123!';
GRANT ALL ON webapp_db.* TO 'webapp'@'2001:db8::%';

-- Apply changes
FLUSH PRIVILEGES;
```

## Note on MySQL IPv6 Wildcard Matching

MySQL's host wildcard matching for IPv6 is limited:

```sql
-- '2001:db8::%' matches addresses starting with 2001:db8::
-- But MySQL treats IPv6 addresses as strings, not CIDR networks

-- Create user for all connections (IPv4 and IPv6)
CREATE USER 'appuser'@'%' IDENTIFIED BY 'password';

-- This is often the practical choice for IPv6 access
-- Combined with firewall rules for network-level access control
```

## Dual Users (IPv4 and IPv6)

```sql
-- Create separate accounts for IPv4 and IPv6 connections
CREATE USER 'app'@'192.168.1.10' IDENTIFIED BY 'password';
CREATE USER 'app'@'2001:db8::10' IDENTIFIED BY 'password';

-- Grant same privileges to both
GRANT ALL ON mydb.* TO 'app'@'192.168.1.10';
GRANT ALL ON mydb.* TO 'app'@'2001:db8::10';

FLUSH PRIVILEGES;
```

## View and Manage IPv6 Users

```sql
-- View all users and their host restrictions
SELECT user, host, plugin FROM mysql.user WHERE host LIKE '%:%';

-- View privileges for an IPv6 user
SHOW GRANTS FOR 'app'@'2001:db8::10';

-- Change user's IPv6 host
RENAME USER 'app'@'2001:db8::10' TO 'app'@'2001:db8::20';

-- Drop IPv6 user
DROP USER 'app'@'2001:db8::10';
```

## Update User Password

```sql
-- Update password for IPv6 user
ALTER USER 'app'@'2001:db8::10' IDENTIFIED BY 'NewPassword456!';

-- Or
SET PASSWORD FOR 'app'@'2001:db8::10' = 'NewPassword456!';

FLUSH PRIVILEGES;
```

## Test IPv6 User Login

```bash
# Test connection from IPv6 client

mysql -h 2001:db8::10 -u webapp -p webapp_db

# Show current connections
mysql -u root -p -e "SELECT user, host FROM information_schema.processlist;"

# Test from specific IPv6 source address
# mysql -h [db-server] -u user -p
```

## Summary

Create MySQL user accounts for IPv6 with `CREATE USER 'user'@'2001:db8::10'` for specific addresses or `'user'@'2001:db8::%'` for a prefix (wildcard). MySQL uses string matching for the host portion, so use `%` wildcard for prefix-based matching. Grant permissions with `GRANT ... TO 'user'@'host'`. For robust access control, use specific host accounts combined with network firewall rules. View existing IPv6 users with `SELECT user, host FROM mysql.user WHERE host LIKE '%:%'`.
