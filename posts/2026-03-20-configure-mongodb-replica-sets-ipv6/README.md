# How to Configure MongoDB Replica Sets with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, MongoDB, Replica Set, High Availability, Database

Description: Learn how to configure a MongoDB replica set with IPv6 node addresses, including setting up primary and secondary nodes, member configuration, and client connection strings.

## Replica Set Node Configuration

```yaml
# /etc/mongod.conf on each node

net:
  port: 27017
  ipv6: true  # Required: mongod disables IPv6 support by default
  # Each node binds to its own IPv6 address + loopback
  bindIp: "::1,127.0.0.1,2001:db8::node1"  # Adjust per node

replication:
  replSetName: "rs0"

security:
  authorization: enabled
  keyFile: /etc/mongodb/keyfile  # For inter-node auth
```

## Create Authentication Key File

```bash
# Generate a shared key for replica set authentication

openssl rand -base64 756 > /etc/mongodb/keyfile
chmod 400 /etc/mongodb/keyfile
chown mongod:mongod /etc/mongodb/keyfile

# Copy to all nodes
scp /etc/mongodb/keyfile mongod@[2001:db8::node2]:/etc/mongodb/keyfile
scp /etc/mongodb/keyfile mongod@[2001:db8::node3]:/etc/mongodb/keyfile
```

## Initialize the Replica Set

```javascript
// Connect to the first node (primary)
// mongosh --host 2001:db8::node1 --port 27017

// Initialize replica set with IPv6 members
rs.initiate({
    _id: "rs0",
    members: [
        {
            _id: 0,
            host: "[2001:db8::node1]:27017",
            priority: 3  // Preferred primary
        },
        {
            _id: 1,
            host: "[2001:db8::node2]:27017",
            priority: 2
        },
        {
            _id: 2,
            host: "[2001:db8::node3]:27017",
            priority: 1
        }
    ]
})
```

## Verify Replica Set Status

```javascript
// Check replica set status
rs.status()

// Output includes:
// "set" : "rs0"
// "members" : [
//   { "name" : "[2001:db8::node1]:27017", "stateStr" : "PRIMARY" },
//   { "name" : "[2001:db8::node2]:27017", "stateStr" : "SECONDARY" },
//   { "name" : "[2001:db8::node3]:27017", "stateStr" : "SECONDARY" }
// ]

// Check configuration
rs.conf()
```

## Connect Client to IPv6 Replica Set

```bash
# Connect with replica set name (mongosh)
mongosh "mongodb://[2001:db8::node1]:27017,[2001:db8::node2]:27017,[2001:db8::node3]:27017/mydb?replicaSet=rs0"

# With authentication
mongosh "mongodb://appuser:password@[2001:db8::node1]:27017,[2001:db8::node2]:27017,[2001:db8::node3]:27017/mydb?replicaSet=rs0&authSource=admin"
```

```python
# Python with pymongo
from pymongo import MongoClient

client = MongoClient(
    host=[
        "[2001:db8::node1]:27017",
        "[2001:db8::node2]:27017",
        "[2001:db8::node3]:27017",
    ],
    replicaSet="rs0",
    username="appuser",
    password="password",
    authSource="admin"
)

db = client.mydb
```

## Read Preferences for IPv6 Replica Set

```python
# Read from any secondary (distribute read load)
from pymongo import ReadPreference

client = MongoClient(
    "mongodb://[2001:db8::node1]:27017/?replicaSet=rs0",
    read_preference=ReadPreference.SECONDARY_PREFERRED
)
```

## Add/Remove Members

```javascript
// Add a new IPv6 member
rs.add("[2001:db8::node4]:27017")

// Add as arbiter (vote only, no data)
rs.addArb("[2001:db8::arbiter]:27017")

// Remove a member
rs.remove("[2001:db8::node4]:27017")

// Reconfigure member priority
var cfg = rs.conf()
cfg.members[1].priority = 0  // Make secondary non-electable (still votes)
rs.reconfig(cfg)
```

## Summary

Configure MongoDB replica sets with IPv6 by setting `net.bindIp` to include each node's IPv6 address and `replication.replSetName: "rs0"` in `mongod.conf`. Initialize with `rs.initiate()` using `"[IPv6]:PORT"` format for member hosts. Connect clients with the URI format `mongodb://[ipv6-1]:27017,[ipv6-2]:27017,[ipv6-3]:27017/?replicaSet=rs0`. Use a shared key file (`security.keyFile`) for internal authentication between replica set members.
