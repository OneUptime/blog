# How to Configure maxIncomingConnections in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Configuration, Connection, Tuning, Operation

Description: Learn how to configure maxIncomingConnections in MongoDB to control the connection limit, prevent resource exhaustion, and tune for your workload.

---

## Overview

MongoDB limits the number of simultaneous client connections via the `maxIncomingConnections` setting. Setting this appropriately prevents a single mongod instance from being overwhelmed by connection storms while ensuring your application has enough connections to operate normally.

## Default Behavior

By default, MongoDB sets `maxIncomingConnections` to 65536. The operating system's open file descriptor limit may cap it lower. The practical maximum depends on `ulimit -n`.

Check the current setting.

```javascript
db.adminCommand({ getCmdLineOpts: 1 })
```

## Setting in mongod.conf

Add or update the `net` section in your configuration file.

```yaml
net:
  maxIncomingConnections: 200
  port: 27017
  bindIp: 0.0.0.0
```

Restart mongod to apply.

```bash
sudo systemctl restart mongod
```

## Setting at Runtime

You can change the limit without a restart using `setParameter`.

```javascript
db.adminCommand({
  setParameter: 1,
  maxIncomingConnections: 500
});
```

Verify the change.

```javascript
db.adminCommand({ getParameter: 1, maxIncomingConnections: 1 });
```

## Checking Current Connection Count

```javascript
db.serverStatus().connections
```

Key fields:
- `current` - active connections right now
- `available` - remaining connections before the limit is hit
- `totalCreated` - total connections since startup

## Configuring ulimit

The OS file descriptor limit must be higher than `maxIncomingConnections`. Each connection uses at least one file descriptor.

```bash
# Check current limit
ulimit -n

# Set temporarily
ulimit -n 65535

# Set permanently in /etc/security/limits.conf
mongod soft nofile 64000
mongod hard nofile 64000
```

## Recommended Values by Deployment Size

| Deployment | Recommended Value |
|------------|------------------|
| Development | 100 |
| Small production | 200-500 |
| Medium production | 500-2000 |
| Large production | 2000-5000 |

Always test with your actual connection pool size and leave headroom for monitoring tools and admin connections.

## Connection Pool Interaction

Each application instance holds a pool of connections. Calculate your expected total.

```text
maxIncomingConnections >= (app_instances x pool_size_per_instance) + monitoring_connections + admin_buffer
```

If you have 10 app servers each with a pool of 20, that is 200 connections minimum plus overhead.

## Summary

Configure `maxIncomingConnections` in `mongod.conf` or at runtime via `setParameter`. Ensure the OS `ulimit` for file descriptors exceeds this value. Monitor `db.serverStatus().connections.available` and alert when it drops below a safe threshold to prevent connection exhaustion.
