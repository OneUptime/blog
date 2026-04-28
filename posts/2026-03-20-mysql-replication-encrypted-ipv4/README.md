# How to Configure MySQL Replication with Encrypted IPv4 Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Replication, SSL, IPv4, Encryption, Database, High Availability

Description: Learn how to set up MySQL primary-replica replication over encrypted TLS connections on an IPv4 network to protect replicated data in transit.

---

MySQL replication over plain TCP exposes your data to network-level interception. Encrypting the replication channel with TLS prevents eavesdropping and ensures data integrity between primary and replica servers.

## Generating Certificates

Use MySQL's built-in SSL generator or openssl:

```bash
# On the primary server - generate CA, server cert, and client cert

mysql_ssl_rsa_setup --uid=mysql

# Or manually with openssl
mkdir -p /etc/mysql/ssl
cd /etc/mysql/ssl

# CA key and certificate
openssl genrsa -out ca-key.pem 2048
openssl req -new -x509 -days 3650 -key ca-key.pem -out ca-cert.pem -subj "/CN=MySQL CA"

# Primary server key and cert
openssl genrsa -out server-key.pem 2048
openssl req -new -key server-key.pem -out server-req.pem -subj "/CN=mysql-primary"
openssl x509 -req -days 3650 -CA ca-cert.pem -CAkey ca-key.pem -set_serial 01 \
  -in server-req.pem -out server-cert.pem

# Replica (client) key and cert
openssl genrsa -out client-key.pem 2048
openssl req -new -key client-key.pem -out client-req.pem -subj "/CN=mysql-replica"
openssl x509 -req -days 3650 -CA ca-cert.pem -CAkey ca-key.pem -set_serial 02 \
  -in client-req.pem -out client-cert.pem
```

## Primary Server Configuration

```ini
# /etc/mysql/mysql.conf.d/mysqld.cnf

[mysqld]
# Bind to a specific IPv4 address
bind-address = 192.168.1.10

# Replication settings
server-id = 1
log-bin = mysql-bin
binlog-format = ROW

# SSL configuration
ssl-ca   = /etc/mysql/ssl/ca-cert.pem
ssl-cert = /etc/mysql/ssl/server-cert.pem
ssl-key  = /etc/mysql/ssl/server-key.pem

# Require SSL for the replication user
require_secure_transport = ON
```

```sql
-- Create the replication user (must connect with SSL)
CREATE USER 'repl'@'192.168.1.11' IDENTIFIED BY 'ReplPass123!' REQUIRE SSL;
GRANT REPLICATION SLAVE ON *.* TO 'repl'@'192.168.1.11';
FLUSH PRIVILEGES;

-- Get the binary log position for the replica
SHOW BINARY LOG STATUS;
```

## Replica Server Configuration

```ini
# /etc/mysql/mysql.conf.d/mysqld.cnf (on the replica)

[mysqld]
bind-address = 192.168.1.11
server-id = 2

ssl-ca   = /etc/mysql/ssl/ca-cert.pem
ssl-cert = /etc/mysql/ssl/client-cert.pem
ssl-key  = /etc/mysql/ssl/client-key.pem
```

```sql
-- Configure the replica to connect to the primary over SSL (MySQL 8.0.23+)
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST='192.168.1.10',
  SOURCE_USER='repl',
  SOURCE_PASSWORD='ReplPass123!',
  SOURCE_LOG_FILE='mysql-bin.000001',
  SOURCE_LOG_POS=4,
  SOURCE_SSL=1,
  SOURCE_SSL_CA='/etc/mysql/ssl/ca-cert.pem',
  SOURCE_SSL_CERT='/etc/mysql/ssl/client-cert.pem',
  SOURCE_SSL_KEY='/etc/mysql/ssl/client-key.pem';

START REPLICA;
```

## Verifying Encrypted Replication

```sql
-- Check replica status; look for Replica_IO_Running: Yes and SSL-related fields
SHOW REPLICA STATUS\G

-- On the primary: verify the replication thread uses SSL
SELECT user, host, ssl_type FROM mysql.user WHERE user='repl';
-- ssl_type should be 'ANY' (set by REQUIRE SSL)
```

## Key Takeaways

- `REQUIRE SSL` in the `CREATE USER` statement enforces TLS for the replication connection.
- Set `ssl-ca`, `ssl-cert`, and `ssl-key` on both primary and replica with matching CA.
- Use `CHANGE REPLICATION SOURCE TO ... SOURCE_SSL=1` and provide the client certificate paths on the replica.
- Verify with `SHOW REPLICA STATUS\G` and check `Source_SSL_Allowed: Yes`.
