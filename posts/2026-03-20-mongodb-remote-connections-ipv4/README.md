# How to Enable MongoDB Remote Connections on IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, IPv4, Remote Connections, Authentication, Security, Database

Description: Enable and secure MongoDB remote connections on IPv4 by configuring bindIp, enabling authentication, creating users, and adding firewall rules.

## Introduction

Enabling MongoDB remote access requires three steps: update `bindIp` to include the server's IP, enable authentication (`security.authorization`), and create user accounts with appropriate roles. Without authentication, any client that can reach the port has full database access.

## Step 1: Configure bindIp

```yaml
# /etc/mongod.conf

net:
  port: 27017
  bindIp: 127.0.0.1,10.0.0.5   # Add server's IPv4
  ipv6: false
```

## Step 2: Enable Authentication

```yaml
# /etc/mongod.conf

security:
  authorization: enabled
```

## Step 3: Create Users (Before Enabling Auth)

```bash
# First, connect without auth to create admin user:

sudo systemctl stop mongod

# Start without auth temporarily
mongod --dbpath /var/lib/mongodb --port 27017 --bind_ip 127.0.0.1

# In another terminal:
mongosh

use admin
db.createUser({
  user: "siteAdmin",
  pwd: passwordPrompt(),
  roles: [
    { role: "userAdminAnyDatabase", db: "admin" },
    "readWriteAnyDatabase",
    "dbAdminAnyDatabase"
  ]
})

# Create app-specific user
use myapp
db.createUser({
  user: "appuser",
  pwd: passwordPrompt(),
  roles: [ { role: "readWrite", db: "myapp" } ]
})

# Exit and restart with auth
mongod --shutdown --dbpath /var/lib/mongodb
sudo systemctl start mongod
```

## Step 4: Firewall Configuration

```bash
# Allow MongoDB only from app servers
sudo ufw allow from 10.0.0.10 to any port 27017 comment "App Server 1"
sudo ufw allow from 10.0.0.11 to any port 27017 comment "App Server 2"
sudo ufw deny 27017

# Apply
sudo ufw reload

# Verify
sudo ufw status numbered | grep 27017
```

## Testing Remote Connection

```bash
# Test from app server (10.0.0.10):
mongosh "mongodb://appuser:AppPassword@10.0.0.5:27017/myapp"

# With URI options:
mongosh "mongodb://appuser:AppPassword@10.0.0.5:27017/myapp?authSource=myapp"

# Test connectivity without MongoDB client:
nc -zv 10.0.0.5 27017

# Check authentication is required:
mongosh "mongodb://10.0.0.5:27017"
# Should fail: command listDatabases requires authentication
```

## Connection String for Applications

```bash
# Application connection strings:

# Python (pymongo):
from pymongo import MongoClient
client = MongoClient("mongodb://appuser:AppPassword@10.0.0.5:27017/myapp")

# Node.js (mongoose):
mongoose.connect("mongodb://appuser:AppPassword@10.0.0.5:27017/myapp");

# Java:
MongoClient client = MongoClients.create(
  "mongodb://appuser:AppPassword@10.0.0.5:27017/myapp"
);
```

## Conclusion

MongoDB remote access requires `bindIp`, `security.authorization: enabled`, user accounts with appropriate roles, and firewall rules. Always create users before enabling authorization (you'll be locked out if you enable auth without an admin user). Use specific role grants (readWrite on specific DB) rather than cluster-wide admin roles for application accounts.
