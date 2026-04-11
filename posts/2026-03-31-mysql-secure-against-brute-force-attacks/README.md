# How to Secure MySQL Against Brute Force Attacks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Security, Brute Force, Authentication, Hardening

Description: Learn how to protect MySQL from brute force login attacks using connection limits, account lockouts, firewall rules, and login failure policies.

---

## Why MySQL Is a Brute Force Target

MySQL's default configuration accepts connections on port 3306 from any host that can route to it. Attackers scan for open MySQL ports and attempt password guessing using common credentials. Without rate limiting or lockout mechanisms, these attacks can run indefinitely.

## Setting max_connect_errors

MySQL blocks a host after it exceeds `max_connect_errors` consecutive protocol-level connection errors (such as interrupted handshakes), not failed authentication attempts. Once blocked, the host sees `ERROR 1129 (HY000): Host is blocked`. Note that wrong-password attempts do not increment this counter — use the Connection Control plugin or account lockout policies (described below) for authentication-based brute force protection.

```ini
[mysqld]
max_connect_errors = 5
```

To unblock a host manually after investigating:

```sql
TRUNCATE TABLE performance_schema.host_cache;
```

Note: The older `FLUSH HOSTS` command also works but is deprecated as of MySQL 8.0.23.

To check currently blocked hosts:

```sql
SELECT * FROM performance_schema.host_cache WHERE SUM_CONNECT_ERRORS > 0;
```

## Using the Connection Control Plugin (MySQL 8.0+)

The `CONNECTION_CONTROL` plugin adds progressive delays after failed login attempts:

```sql
INSTALL PLUGIN CONNECTION_CONTROL SONAME 'connection_control.so';
INSTALL PLUGIN CONNECTION_CONTROL_FAILED_LOGIN_ATTEMPTS SONAME 'connection_control.so';
```

Configure it in `mysqld.cnf`:

```ini
[mysqld]
plugin-load-add = connection_control.so
connection_control_failed_connections_threshold = 3
connection_control_min_connection_delay = 1000
connection_control_max_connection_delay = 2000000
```

After 3 failed attempts, MySQL introduces delays of up to 2000 seconds between each subsequent attempt, making brute force impractical.

Check the plugin status:

```sql
SELECT * FROM information_schema.CONNECTION_CONTROL_FAILED_LOGIN_ATTEMPTS;
```

## Account Lockout Policies (MySQL 8.0.19+)

MySQL 8.0.19 introduced declarative account lockout:

```sql
-- Lock after 5 failed attempts, unlock after 1 day
ALTER USER 'appuser'@'%'
  FAILED_LOGIN_ATTEMPTS 5
  PASSWORD_LOCK_TIME 1;
```

To unlock a locked account:

```sql
ALTER USER 'appuser'@'%' ACCOUNT UNLOCK;
```

## Firewall Rules to Limit Port Exposure

Never expose MySQL on port 3306 to the public internet. Use `ufw` to restrict access:

```bash
# Allow MySQL only from application server
sudo ufw allow from 10.0.1.50 to any port 3306

# Deny all other access to 3306
sudo ufw deny 3306

sudo ufw reload
sudo ufw status
```

## Binding MySQL to a Private Interface

In `mysqld.cnf`, bind MySQL to a private or loopback address:

```ini
[mysqld]
bind-address = 10.0.1.10
```

Restart MySQL after the change:

```bash
sudo systemctl restart mysql
```

## Monitoring Failed Login Attempts

Query the performance schema for failed logins per host:

```sql
SELECT
  IP,
  HOST,
  COUNT_AUTHENTICATION_ERRORS,
  COUNT_HANDSHAKE_ERRORS,
  SUM_CONNECT_ERRORS
FROM performance_schema.host_cache
WHERE COUNT_AUTHENTICATION_ERRORS > 0
ORDER BY COUNT_AUTHENTICATION_ERRORS DESC;
```

Or use the error log directly:

```bash
sudo grep "Access denied" /var/log/mysql/error.log | tail -20
```

## Summary

Protecting MySQL from brute force attacks requires multiple layers: setting low thresholds for `max_connect_errors`, enabling the `CONNECTION_CONTROL` plugin for progressive delays, using account lockout policies, and restricting network access via firewall rules. Binding MySQL to a private interface ensures the database port is never reachable from the public internet in the first place.
