# How to Set Up an SSH Tunnel for IPv4 Database Access (MySQL/PostgreSQL)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSH, Tunneling, MySQL, PostgreSQL, IPv4, Database, Security

Description: Create SSH tunnels to securely access MySQL and PostgreSQL databases on private IPv4 networks without exposing database ports to the internet.

## Introduction

Database servers should never have their ports (3306, 5432) exposed to the internet. SSH tunneling provides encrypted, authenticated access from your machine to a bastion host, which can then reach databases on private IPv4 networks. If the database runs on a separate host from the bastion, use database-native TLS when you also need encryption on the bastion-to-database hop.

## MySQL Access Through SSH Tunnel

```bash
# Create SSH tunnel: local port 3307 → MySQL on remote network

ssh -4 -fN \
  -L 127.0.0.1:3307:192.168.1.50:3306 \
  user@bastion.example.com

# Connect MySQL client through the tunnel
mysql -h 127.0.0.1 -P 3307 -u appuser -p mydatabase

# MySQL Workbench: either configure "Standard TCP/IP over SSH" to use the bastion
# or choose "Standard TCP/IP" and connect to 127.0.0.1:3307 with this tunnel running
```

## PostgreSQL Access Through SSH Tunnel

```bash
# Create SSH tunnel: local port 5433 → PostgreSQL on remote network
ssh -4 -fN \
  -L 127.0.0.1:5433:192.168.1.51:5432 \
  admin@bastion.example.com

# Connect psql through the tunnel
psql -h 127.0.0.1 -p 5433 -U dbadmin -d production

# Use pgAdmin: create server with host=127.0.0.1 port=5433
```

## Persistent Database Tunnels with systemd

```ini
# /etc/systemd/system/tunnel-mysql.service

[Unit]
Description=SSH Tunnel to MySQL Production Database
Wants=network-online.target
After=network-online.target

[Service]
User=devuser
ExecStart=/usr/bin/autossh -M 0 -4 -N \
    -o "ServerAliveInterval=30" \
    -o "ServerAliveCountMax=3" \
    -o "ExitOnForwardFailure=yes" \
    -i /home/devuser/.ssh/bastion_key \
    -L 127.0.0.1:3307:db-prod.internal:3306 \
    tunnel@bastion.example.com

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## SSH Config for Multiple Database Tunnels

```bash
# ~/.ssh/config

Host db-tunnels
    HostName bastion.example.com
    User admin
    AddressFamily inet
    IdentityFile ~/.ssh/bastion_key

    # Production database tunnels
    LocalForward 127.0.0.1:3307 mysql-prod.internal:3306
    LocalForward 127.0.0.1:5433 pg-prod.internal:5432
    LocalForward 127.0.0.1:6380 redis-prod.internal:6379

    # Staging database tunnels
    LocalForward 127.0.0.1:3308 mysql-staging.internal:3306
    LocalForward 127.0.0.1:5434 pg-staging.internal:5432

    ServerAliveInterval 30
    ExitOnForwardFailure yes
```

```bash
# Start all database tunnels
ssh -fN db-tunnels

# Connect to production MySQL
mysql -h 127.0.0.1 -P 3307 -u user -p proddb

# Connect to staging PostgreSQL
psql -h 127.0.0.1 -p 5434 -U user stagingdb
```

## Application Configuration with SSH Tunnel

Configure your application to connect through the local tunnel port:

```yaml
# config/database.yml (Rails example)
production:
  adapter: postgresql
  host: 127.0.0.1     # Tunnel is on localhost
  port: 5433          # Tunnel local port
  database: production_db
  username: app_user
```

```python
# Python SQLAlchemy through tunnel
import sqlalchemy

# Connect to local tunnel port
engine = sqlalchemy.create_engine(
    "postgresql://app_user:password@127.0.0.1:5433/production_db"
)
```

## Verifying Database Tunnels

```bash
# Check tunnel ports are listening
ss -tlnp | grep -E "3307|5433|6380"

# Test MySQL connectivity through tunnel
mysqladmin -h 127.0.0.1 -P 3307 -u user -p ping

# Test PostgreSQL connectivity through tunnel
pg_isready -h 127.0.0.1 -p 5433

# Test Redis
redis-cli -h 127.0.0.1 -p 6380 ping
```

## Conclusion

SSH tunnels provide secure database access by mapping remote database ports to local ports. Use `127.0.0.1` as the bind address to limit access to your machine only, run tunnels as systemd services with `autossh` for persistence, and configure your applications to connect to `127.0.0.1:<tunnel-port>`. This approach avoids exposing database ports publicly; SSH encrypts the client-to-bastion connection, and database-native TLS is still needed if the bastion-to-database hop also needs encryption.
