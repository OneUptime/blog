# How to Install and Configure MySQL Router

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, MySQL Router, Installation, Configuration

Description: Learn how to install MySQL Router, configure it manually or via bootstrap, and set it up as a system service for production use.

---

## What Is MySQL Router

MySQL Router is an open-source middleware component that provides transparent routing between your application and any backend MySQL server or cluster. It supports:

- Routing to InnoDB Cluster or MySQL Replication setups
- Read/write splitting
- Connection sharing (reuse of idle server connections, available since 8.0.33)
- Automatic failover detection

## Installing MySQL Router

### On Ubuntu/Debian

```bash
sudo apt-get update
sudo apt-get install mysql-router
```

Or from the MySQL APT repository:

```bash
wget https://dev.mysql.com/get/mysql-apt-config_0.8.29-1_all.deb
sudo dpkg -i mysql-apt-config_0.8.29-1_all.deb
sudo apt-get update
sudo apt-get install mysql-router
```

### On RHEL/CentOS/Rocky Linux

```bash
sudo yum install https://dev.mysql.com/get/mysql80-community-release-el8-9.noarch.rpm
sudo yum install mysql-router-community
```

### Verify Installation

```bash
mysqlrouter --version
```

```text
MySQL Router  Ver 8.0.36 for Linux on x86_64
```

## Method 1 - Bootstrap Configuration (Recommended for InnoDB Cluster)

Bootstrap auto-generates the configuration by querying cluster metadata:

```bash
sudo mysqlrouter --bootstrap clusteradmin@node1:3306 \
  --directory /etc/mysqlrouter/production \
  --user=mysqlrouter
```

This creates a ready-to-run configuration directory.

## Method 2 - Manual Configuration

Create the configuration file manually for a simple primary/replica setup:

```ini
# /etc/mysqlrouter/mysqlrouter.conf
[DEFAULT]
logging_folder = /var/log/mysqlrouter
runtime_folder = /var/run/mysqlrouter
data_folder     = /var/lib/mysqlrouter
user            = mysqlrouter

[logger]
level = INFO

[routing:primary]
bind_address  = 0.0.0.0
bind_port     = 6446
destinations  = node1:3306,node2:3306,node3:3306
routing_strategy = first-available
protocol      = classic

[routing:replicas]
bind_address  = 0.0.0.0
bind_port     = 6447
destinations  = node2:3306,node3:3306
routing_strategy = round-robin
protocol      = classic
```

## Starting MySQL Router

```bash
# Start directly
mysqlrouter --config /etc/mysqlrouter/mysqlrouter.conf

# Start as a background process
mysqlrouter --config /etc/mysqlrouter/mysqlrouter.conf &
```

## Configuring as a Systemd Service

Create a service file:

```bash
sudo tee /etc/systemd/system/mysqlrouter.service > /dev/null <<'EOF'
[Unit]
Description=MySQL Router
After=network.target

[Service]
Type=simple
User=mysqlrouter
ExecStart=/usr/bin/mysqlrouter --config /etc/mysqlrouter/mysqlrouter.conf
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
EOF
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable mysqlrouter
sudo systemctl start mysqlrouter
sudo systemctl status mysqlrouter
```

## Verifying Router Is Running

```bash
# Check listening ports
ss -tlnp | grep mysqlrouter

# Test connectivity through Router
mysql -h 127.0.0.1 -P 6446 -u appuser -p -e "SELECT @@hostname"
```

## Log Locations

```bash
# Default log file
tail -f /var/log/mysqlrouter/mysqlrouter.log

# Increase log verbosity
sed -i 's/level = INFO/level = DEBUG/' /etc/mysqlrouter/mysqlrouter.conf
sudo systemctl restart mysqlrouter
```

## Summary

MySQL Router can be installed from the MySQL APT/YUM repository and configured either via bootstrap (for InnoDB Cluster) or manually (for replication setups). After configuration, run it as a systemd service with auto-restart for production reliability. Applications connect to Router ports (6446 for writes, 6447 for reads) instead of MySQL nodes directly.
