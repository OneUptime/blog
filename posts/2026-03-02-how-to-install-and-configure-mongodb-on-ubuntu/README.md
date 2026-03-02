# How to Install and Configure MongoDB on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, MongoDB, Database, NoSQL, DevOps

Description: Step-by-step guide to installing MongoDB on Ubuntu, covering authentication setup, configuration tuning, replica sets, and backup strategies.

---

MongoDB is the most widely-used document database. Its flexible schema makes it a natural fit for applications where data structures evolve quickly or where the data doesn't fit neatly into rows and columns. This guide covers installing MongoDB 7.0 on Ubuntu, configuring authentication, setting up a replica set for high availability, and establishing a backup routine.

## Prerequisites

- Ubuntu 22.04 or 24.04
- At least 2 GB RAM (4 GB or more recommended for production)
- Root or sudo access

## Installing MongoDB

Use MongoDB's official repository to get the current version:

```bash
# Install prerequisites
sudo apt update && sudo apt install -y gnupg curl

# Add MongoDB's GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] \
  https://repo.mongodb.org/apt/ubuntu \
  $(lsb_release -cs)/mongodb-org/7.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install MongoDB
sudo apt update
sudo apt install -y mongodb-org

# Pin the version to prevent accidental upgrades
echo "mongodb-org hold" | sudo dpkg --set-selections
echo "mongodb-org-database hold" | sudo dpkg --set-selections
echo "mongodb-org-server hold" | sudo dpkg --set-selections
echo "mongodb-mongosh hold" | sudo dpkg --set-selections
echo "mongodb-org-mongos hold" | sudo dpkg --set-selections
echo "mongodb-org-tools hold" | sudo dpkg --set-selections
```

Enable and start MongoDB:

```bash
sudo systemctl enable mongod
sudo systemctl start mongod
sudo systemctl status mongod
```

Verify it's running:

```bash
mongosh --eval "db.runCommand({ connectionStatus: 1 })"
```

## Configuration File Overview

MongoDB's configuration is at `/etc/mongod.conf`. Let's go through the important sections:

```bash
sudo nano /etc/mongod.conf
```

```yaml
# /etc/mongod.conf

# Storage engine configuration
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true
  engine: wiredTiger
  wiredTiger:
    engineConfig:
      # Cache size: default is 50% of RAM minus 1GB
      # For a 4GB server, set to about 1.5GB
      cacheSizeGB: 1.5

# System logging
systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log
  verbosity: 0

# Network settings
net:
  port: 27017
  # Bind to localhost only by default (add your app server IP if needed)
  bindIp: 127.0.0.1
  # Uncomment to enable TLS
  # tls:
  #   mode: requireTLS
  #   certificateKeyFile: /etc/ssl/mongodb/mongodb.pem
  #   CAFile: /etc/ssl/mongodb/ca.pem

# Process management
processManagement:
  timeZoneInfo: /usr/share/zoneinfo

# Security
security:
  authorization: enabled

# Operation profiling (for query analysis)
operationProfiling:
  # Log operations slower than 100ms
  slowOpThresholdMs: 100
  # 0=off, 1=slow only, 2=all
  mode: slowOp
```

After editing, restart MongoDB:

```bash
sudo systemctl restart mongod
```

## Setting Up Authentication

Before enabling authentication (which we already set in the config), create the admin user:

```bash
# Connect to MongoDB (auth not required yet if just installed)
mongosh
```

```javascript
// Switch to the admin database
use admin

// Create the root admin user
db.createUser({
  user: "mongoadmin",
  pwd: passwordPrompt(),  // Will prompt securely for password
  roles: [
    { role: "userAdminAnyDatabase", db: "admin" },
    { role: "readWriteAnyDatabase", db: "admin" },
    { role: "dbAdminAnyDatabase", db: "admin" },
    "clusterAdmin"
  ]
})

// Exit
exit
```

Now test authentication:

```bash
# Connect with credentials
mongosh --username mongoadmin --password --authenticationDatabase admin

# Or as a connection string
mongosh "mongodb://mongoadmin:YourPassword@localhost:27017/admin"
```

## Creating Application Databases and Users

Follow the principle of least privilege - give each application its own database and user:

```javascript
// Connect as admin first
use myapp

// Create the application user with restricted permissions
db.createUser({
  user: "myapp_user",
  pwd: "AppUserPassword123!",
  roles: [
    { role: "readWrite", db: "myapp" }
  ]
})

// Test with the app user
// mongosh "mongodb://myapp_user:AppUserPassword123!@localhost:27017/myapp"
```

## Enabling Connections from Application Servers

If your application runs on a different server, update the bind address:

```bash
sudo nano /etc/mongod.conf
```

```yaml
net:
  port: 27017
  # Add your application server's IP
  bindIp: 127.0.0.1,192.168.1.100
```

Also update your firewall:

```bash
# Allow MongoDB from your app server only
sudo ufw allow from 192.168.1.100 to any port 27017
sudo ufw reload
```

## Setting Up a Replica Set

A replica set provides automatic failover and data redundancy. For production, you need at minimum 3 nodes (1 primary, 2 secondaries, or 2 data nodes + 1 arbiter).

On each node, configure the replica set name:

```yaml
# /etc/mongod.conf on each replica set member
replication:
  replSetName: "rs0"

net:
  port: 27017
  # Bind to accept connections from other replica set members
  bindIp: 0.0.0.0
```

Restart MongoDB on all nodes:

```bash
sudo systemctl restart mongod
```

Initialize the replica set from the primary node:

```javascript
// Connect to the first node (future primary)
mongosh --host 192.168.1.10

// Initialize the replica set
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "192.168.1.10:27017", priority: 2 },  // Primary preference
    { _id: 1, host: "192.168.1.11:27017", priority: 1 },
    { _id: 2, host: "192.168.1.12:27017", priority: 1 }
  ]
})

// Check replica set status
rs.status()
```

## Performance Tuning

### Indexes

Indexes are the most impactful performance lever. Create them on fields used in queries:

```javascript
// Create a single field index
db.users.createIndex({ email: 1 })  // 1 = ascending

// Create a compound index
db.orders.createIndex({ user_id: 1, created_at: -1 })

// Create a unique index
db.users.createIndex({ email: 1 }, { unique: true })

// Explain a query to see if it uses an index
db.users.find({ email: "user@example.com" }).explain("executionStats")
```

### System-Level Tuning

```bash
# Disable Transparent Huge Pages (MongoDB recommends this)
sudo nano /etc/systemd/system/disable-thp.service
```

```ini
[Unit]
Description=Disable Transparent Huge Pages
DefaultDependencies=no
After=sysinit.target local-fs.target

[Service]
Type=oneshot
ExecStart=/bin/sh -c 'echo never | tee /sys/kernel/mm/transparent_hugepage/enabled > /dev/null'

[Install]
WantedBy=basic.target
```

```bash
sudo systemctl enable disable-thp
sudo systemctl start disable-thp
```

## Backup with mongodump

```bash
# Backup all databases
mongodump \
  --uri="mongodb://mongoadmin:YourPassword@localhost:27017/admin" \
  --out /var/backups/mongodb/$(date +%Y%m%d)

# Backup a specific database
mongodump \
  --uri="mongodb://myapp_user:AppUserPassword123!@localhost:27017/myapp" \
  --out /var/backups/mongodb/myapp_$(date +%Y%m%d)

# Restore
mongorestore \
  --uri="mongodb://mongoadmin:YourPassword@localhost:27017" \
  /var/backups/mongodb/20240302/
```

Create an automated backup cron job:

```bash
sudo crontab -e
# Add:
0 3 * * * mongodump --uri="mongodb://mongoadmin:password@localhost:27017/admin" --out /var/backups/mongodb/$(date +\%Y\%m\%d) --gzip >> /var/log/mongodb-backup.log 2>&1
```

Monitor your MongoDB instance's health and query performance with [OneUptime](https://oneuptime.com) to catch slow queries or availability issues before they affect your application.
