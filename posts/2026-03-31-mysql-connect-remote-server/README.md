# How to Connect to a Remote MySQL Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Connection, Remote, Administration, Security

Description: Connect to a remote MySQL server from the command line by configuring bind-address, creating a remote user, opening firewall ports, and using SSL/TLS encryption.

---

## How It Works

By default, most Linux distribution packages configure MySQL to listen only on `127.0.0.1` (localhost). To accept remote connections, you must configure `bind-address`, create a MySQL user with a remote host in their account definition, open the firewall port, and optionally enforce SSL/TLS.

```mermaid
flowchart LR
    A[Client machine] --> B[TCP port 3306 through firewall]
    B --> C[MySQL server]
    C --> D{Authentication}
    D --> E[User@remote_ip with password]
    E --> F[Privileges checked]
    F --> G[Connection established]
```

## Step 1 - Configure bind-address on the Server

Most Linux distribution packages set `bind-address` to `127.0.0.1`. Edit `my.cnf` to listen on the server's private IP or all interfaces.

```bash
# Ubuntu / Debian
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf

# RHEL-based
sudo nano /etc/my.cnf
```

To listen on a specific IP (recommended):

```ini
[mysqld]
bind-address = 10.0.1.10
```

To listen on all interfaces (less secure, use with firewall rules):

```ini
[mysqld]
bind-address = 0.0.0.0
```

Restart MySQL.

```bash
# Ubuntu / Debian
sudo systemctl restart mysql

# RHEL-based
sudo systemctl restart mysqld
```

Verify the server is listening on the new address.

```bash
sudo ss -tlnp | grep 3306
```

```text
LISTEN   0   151   10.0.1.10:3306   0.0.0.0:*   users:(("mysqld",...))
```

## Step 2 - Create a Remote MySQL User

Connect to MySQL on the server as root.

```bash
sudo mysql
```

Create a user that can connect from a specific IP address.

```sql
CREATE USER 'appuser'@'10.0.1.20' IDENTIFIED BY 'SecurePassword1!';
GRANT ALL PRIVILEGES ON myapp.* TO 'appuser'@'10.0.1.20';
FLUSH PRIVILEGES;
```

To allow connections from any IP (not recommended for production):

```sql
CREATE USER 'appuser'@'%' IDENTIFIED BY 'SecurePassword1!';
GRANT SELECT, INSERT, UPDATE, DELETE ON myapp.* TO 'appuser'@'%';
FLUSH PRIVILEGES;
```

To allow a subnet:

```sql
CREATE USER 'appuser'@'10.0.1.%' IDENTIFIED BY 'SecurePassword1!';
GRANT ALL PRIVILEGES ON myapp.* TO 'appuser'@'10.0.1.%';
FLUSH PRIVILEGES;
```

Verify the user was created.

```sql
SELECT user, host, plugin FROM mysql.user WHERE user = 'appuser';
```

```text
+---------+-----------+-----------------------+
| user    | host      | plugin                |
+---------+-----------+-----------------------+
| appuser | 10.0.1.20 | caching_sha2_password |
+---------+-----------+-----------------------+
```

## Step 3 - Open the Firewall Port

### UFW (Ubuntu / Debian)

```bash
sudo ufw allow from 10.0.1.20 to any port 3306
sudo ufw reload
```

### firewalld (RHEL-based)

```bash
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="10.0.1.20/32" port port="3306" protocol="tcp" accept'
sudo firewall-cmd --reload
```

### AWS Security Group

```bash
aws ec2 authorize-security-group-ingress \
  --group-id sg-0123456789abcdef0 \
  --protocol tcp \
  --port 3306 \
  --cidr 10.0.1.20/32
```

## Step 4 - Connect from the Client Machine

From the remote client, use the `mysql` CLI with the server IP.

```bash
mysql -h 10.0.1.10 -P 3306 -u appuser -p myapp
```

Or use the full form:

```bash
mysql --host=10.0.1.10 --port=3306 --user=appuser --password --database=myapp
```

After entering the password, you see the MySQL prompt connected to the remote server.

```text
Welcome to the MySQL monitor.
...
mysql>
```

Verify the connection details.

```sql
SELECT @@hostname, USER(), DATABASE();
```

```text
+------------+--------------------+-----------+
| @@hostname | USER()             | DATABASE() |
+------------+--------------------+-----------+
| db-server  | appuser@10.0.1.20  | myapp     |
+------------+--------------------+-----------+
```

## Step 5 - Connect via SSL/TLS (Recommended)

For connections over the public internet, require SSL.

On the server, verify SSL is enabled.

```sql
SHOW VARIABLES LIKE 'have_ssl';
SHOW VARIABLES LIKE 'ssl_cert';
```

Require SSL for the user.

```sql
ALTER USER 'appuser'@'10.0.1.20' REQUIRE SSL;
```

Connect from the client with SSL verification.

```bash
mysql -h 10.0.1.10 -u appuser -p \
  --ssl-ca=/path/to/ca.pem \
  --ssl-cert=/path/to/client-cert.pem \
  --ssl-key=/path/to/client-key.pem
```

## Connecting Through an SSH Tunnel

If MySQL is not exposed directly to the network, use an SSH tunnel.

```bash
ssh -L 3307:127.0.0.1:3306 ubuntu@10.0.1.10 -N &
mysql -h 127.0.0.1 -P 3307 -u appuser -p myapp
```

The SSH tunnel forwards local port 3307 to port 3306 on the remote server. MySQL sees the connection coming from `127.0.0.1`, so the user must be `appuser@localhost`.

## Storing Connection Credentials

Create `~/.my.cnf` on the client machine to avoid typing credentials every time.

```ini
[client]
host     = 10.0.1.10
port     = 3306
user     = appuser
password = SecurePassword1!
database = myapp
```

Set restrictive permissions.

```bash
chmod 600 ~/.my.cnf
```

Now connect with just:

```bash
mysql
```

## Troubleshooting Connection Failures

| Error | Common Cause |
|---|---|
| `Can't connect to MySQL server on 'x.x.x.x'` | bind-address not set, firewall blocking |
| `Access denied for user 'u'@'x.x.x.x'` | User not created for that host |
| `Host 'x.x.x.x' is blocked` | Too many failed logins - run `TRUNCATE TABLE performance_schema.host_cache` |
| `SSL connection error` | SSL required but not configured on client |

## Summary

Connecting to a remote MySQL server requires three server-side changes: updating `bind-address` in `my.cnf` to listen on a non-loopback address, creating a MySQL user account with the client IP in the host field, and opening TCP port 3306 in the firewall. On the client, use `mysql -h <server-ip> -u <user> -p`. For production environments, enforce SSL with `REQUIRE SSL` and consider using an SSH tunnel to avoid exposing MySQL to public networks entirely.
