# How to Install and Configure ProxySQL for MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, ProxySQL, Database Proxy, Load Balancing, High Availability

Description: Step-by-step guide to installing and configuring ProxySQL as a high-performance MySQL proxy for load balancing and query routing.

---

## What is ProxySQL?

ProxySQL is a high-performance MySQL proxy that sits between your application and MySQL servers. It provides connection pooling, query routing, query caching, failover, and read-write splitting without any changes to application code.

## Installation on Ubuntu/Debian

```bash
# Add ProxySQL repository
curl -fsSL https://repo.proxysql.com/ProxySQL/repo_pub_key | gpg --dearmor -o /usr/share/keyrings/proxysql-archive-keyring.gpg

echo "deb [signed-by=/usr/share/keyrings/proxysql-archive-keyring.gpg] https://repo.proxysql.com/ProxySQL/proxysql-2.6.x/$(lsb_release -sc)/ ./" | tee /etc/apt/sources.list.d/proxysql.list

apt-get update && apt-get install proxysql
```

## Installation on RHEL/CentOS

```bash
cat > /etc/yum.repos.d/proxysql.repo << 'EOF'
[proxysql_repo]
name=ProxySQL repository
baseurl=https://repo.proxysql.com/ProxySQL/proxysql-2.6.x/centos/latest
gpgcheck=1
gpgkey=https://repo.proxysql.com/ProxySQL/repo_pub_key
EOF

yum install proxysql
```

## Starting ProxySQL

```bash
systemctl enable proxysql
systemctl start proxysql
```

ProxySQL listens on two ports by default:
- `6032` - Admin interface (MySQL protocol)
- `6033` - Application traffic port

## Connecting to the Admin Interface

```bash
mysql -u admin -padmin -h 127.0.0.1 -P 6032 --prompt='ProxySQL Admin> '
```

The default admin credentials are `admin/admin`. Change them immediately in production.

## Adding MySQL Backend Servers

```sql
-- Add MySQL servers to the backend pool
INSERT INTO mysql_servers (hostgroup_id, hostname, port, weight) VALUES
  (10, '192.168.1.101', 3306, 100),  -- primary (write group)
  (20, '192.168.1.102', 3306, 100),  -- replica 1 (read group)
  (20, '192.168.1.103', 3306, 100);  -- replica 2 (read group)

LOAD MYSQL SERVERS TO RUNTIME;
SAVE MYSQL SERVERS TO DISK;
```

## Creating a Monitoring User

ProxySQL needs a dedicated MySQL user to monitor backend health:

```sql
-- On each MySQL backend server:
CREATE USER 'proxysql_monitor'@'%' IDENTIFIED BY 'MonitorPass123!';
GRANT USAGE ON *.* TO 'proxysql_monitor'@'%';
```

```sql
-- In ProxySQL admin:
UPDATE global_variables SET variable_value='proxysql_monitor'
  WHERE variable_name='mysql-monitor_username';
UPDATE global_variables SET variable_value='MonitorPass123!'
  WHERE variable_name='mysql-monitor_password';

LOAD MYSQL VARIABLES TO RUNTIME;
SAVE MYSQL VARIABLES TO DISK;
```

## Creating a ProxySQL Application User

```sql
-- On MySQL backend:
CREATE USER 'appuser'@'%' IDENTIFIED BY 'AppPass123!';
GRANT SELECT, INSERT, UPDATE, DELETE ON mydb.* TO 'appuser'@'%';
```

```sql
-- In ProxySQL admin:
INSERT INTO mysql_users (username, password, default_hostgroup) VALUES
  ('appuser', 'AppPass123!', 10);

LOAD MYSQL USERS TO RUNTIME;
SAVE MYSQL USERS TO DISK;
```

## Verifying Backend Health

```sql
SELECT hostname, port, time_start_us, connect_success_time_us, connect_error
FROM monitor.mysql_server_connect_log
ORDER BY time_start_us DESC
LIMIT 10;
```

```sql
SELECT * FROM mysql_servers;
```

## Testing Application Connectivity

```bash
# Connect through ProxySQL (port 6033)
mysql -u appuser -pAppPass123! -h 127.0.0.1 -P 6033 -e "SELECT @@hostname;"
```

## Securing the Admin Interface

```sql
-- Change default admin password
UPDATE global_variables
SET variable_value='admin:newadminpassword'
WHERE variable_name='admin-admin_credentials';

UPDATE global_variables
SET variable_value='radmin:radminpass'
WHERE variable_name='admin-stats_credentials';

LOAD ADMIN VARIABLES TO RUNTIME;
SAVE ADMIN VARIABLES TO DISK;
```

## Summary

ProxySQL is installed via package repositories on Linux systems and exposes a MySQL-compatible admin interface on port 6032. After installation, you add MySQL backend servers to hostgroups, configure a monitoring user for health checks, and create application users. All configuration changes require `LOAD ... TO RUNTIME` and `SAVE ... TO DISK` to take effect and persist across restarts.
