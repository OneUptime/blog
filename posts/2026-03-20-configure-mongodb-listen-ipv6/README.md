# How to Configure MongoDB to Listen on IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, MongoDB, Database, Net.bindIp, Network Configuration

Description: Learn how to configure MongoDB to listen on IPv6 addresses by updating the net.bindIp configuration, enabling dual-stack support, and verifying IPv6 connectivity.

## MongoDB net.bindIp Configuration

```yaml
# /etc/mongod.conf

net:
  port: 27017
  # Required: enable IPv6 support (default: false)
  ipv6: true
  # Default: bindIp: 127.0.0.1 (only localhost)

  # Listen on all interfaces (IPv4 and IPv6)
  bindIp: "0.0.0.0,::"

  # Listen on specific IPv6 address and localhost
  bindIp: "127.0.0.1,::1,2001:db8::10"

  # IPv6 and IPv4 loopback only
  bindIp: "::1,127.0.0.1"

  # All interfaces (alternative notation)
  bindIpAll: true
```

## Configure MongoDB for Remote IPv6 Access

```yaml
# /etc/mongod.conf

net:
  port: 27017
  ipv6: true
  bindIp: "127.0.0.1,::1,2001:db8::10"

  # TLS/SSL settings (recommended for remote access)
  tls:
    mode: requireTLS
    certificateKeyFile: /etc/ssl/mongodb/server.pem
    CAFile: /etc/ssl/mongodb/ca.pem

security:
  authorization: enabled
```

```bash
# Restart MongoDB after configuration change

systemctl restart mongod

# Verify listening
ss -6 -tlnp | grep mongod
# tcp6  LISTEN  0  128  [::]:27017  [::]:*  (mongod)

ss -tlnp | grep mongod
# Both IPv4 and IPv6 should be shown
```

## Test IPv6 MongoDB Connection

```bash
# Connect via IPv6 loopback
mongosh --host ::1 --port 27017

# Connect via specific IPv6 address
mongosh --host 2001:db8::10 --port 27017

# Connect with authentication
mongosh "mongodb://admin:password@[2001:db8::10]:27017/admin"

# Connect with TLS
mongosh "mongodb://[2001:db8::10]:27017/mydb" \
    --tls \
    --tlsCAFile /etc/ssl/mongodb/ca.pem
```

## Create MongoDB User for IPv6 Access

```javascript
// Connect to MongoDB admin database
use admin

// Create admin user
db.createUser({
    user: "admin",
    pwd: "SecurePassword123!",
    roles: [{ role: "userAdminAnyDatabase", db: "admin" }]
})

// Create application user
use myapp_db
db.createUser({
    user: "appuser",
    pwd: "AppPassword456!",
    roles: [{ role: "readWrite", db: "myapp_db" }]
})
```

## IPv6 Connection String Format

```text
# MongoDB connection string with IPv6 address (brackets required)
mongodb://[2001:db8::10]:27017

# With authentication
mongodb://user:password@[2001:db8::10]:27017/mydb

# With multiple IPv6 hosts (replica set)
mongodb://[2001:db8::10]:27017,[2001:db8::11]:27017,[2001:db8::12]:27017/mydb?replicaSet=rs0
```

## Firewall Rules for MongoDB IPv6

```bash
# Allow MongoDB from specific IPv6 subnet
ip6tables -A INPUT -p tcp --dport 27017 \
    -s 2001:db8:app::/48 -j ACCEPT
ip6tables -A INPUT -p tcp --dport 27017 -j DROP

# With ufw
ufw allow from 2001:db8:app::/48 to any port 27017 proto tcp
```

## Summary

Configure MongoDB to listen on IPv6 by enabling `net.ipv6: true` (required, default is `false`) and setting `net.bindIp: "127.0.0.1,::1,2001:db8::10"` in `/etc/mongod.conf` or use `net.bindIpAll: true` for all interfaces. Restart MongoDB with `systemctl restart mongod`. Verify with `ss -6 -tlnp | grep mongod`. In MongoDB connection strings, IPv6 addresses must be in brackets: `mongodb://[2001:db8::10]:27017`. Enable authentication with `security.authorization: enabled` and TLS with `net.tls.mode: requireTLS` for secure remote access.
