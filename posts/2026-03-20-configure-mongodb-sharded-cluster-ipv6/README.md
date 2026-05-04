# How to Configure MongoDB Sharded Cluster with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, IPv6, Sharding, Replica Set, NoSQL, Cluster, Database

Description: Configure a MongoDB sharded cluster with IPv6 bind addresses for config servers, mongos routers, and shard replica sets, enabling horizontal scaling over IPv6 networks.

---

MongoDB sharded clusters consist of config servers, mongos routers, and shard replica sets. Each component needs IPv6 configuration through `mongod.conf` and `mongos.conf` settings.

## MongoDB Sharded Cluster Architecture

```text
Config Servers (CSRS)    Shard 1 (Replica Set)    mongos (Router)
[2001:db8::c1]:27019     [2001:db8::s1]:27018     [2001:db8::r1]:27017
[2001:db8::c2]:27019     [2001:db8::s2]:27018
[2001:db8::c3]:27019     [2001:db8::s3]:27018
```

## Config Server Configuration

```yaml
# /etc/mongod-config.conf (on each config server)

net:
  port: 27019
  # Enable IPv6 support (required; mongod does not accept IPv6 by default)
  ipv6: true
  # Bind to IPv6 address (accepts comma-separated list)
  bindIp: "2001:db8::c1,::1"
  # Or bind to all interfaces:
  # bindIpAll: true

sharding:
  clusterRole: configsvr

replication:
  replSetName: "configReplSet"

storage:
  dbPath: /var/lib/mongodb/config

systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/config.log
```

## Starting Config Server Replica Set

```bash
# Start config servers on each node

mongod --config /etc/mongod-config.conf --fork

# Initialize config server replica set
mongosh --ipv6 --host "[2001:db8::c1]:27019" << 'EOF'
rs.initiate({
  _id: "configReplSet",
  configsvr: true,
  members: [
    { _id: 0, host: "[2001:db8::c1]:27019" },
    { _id: 1, host: "[2001:db8::c2]:27019" },
    { _id: 2, host: "[2001:db8::c3]:27019" }
  ]
})
EOF
```

## Shard Replica Set Configuration

```yaml
# /etc/mongod-shard1.conf

net:
  port: 27018
  ipv6: true
  bindIp: "2001:db8::s1,::1"

sharding:
  clusterRole: shardsvr

replication:
  replSetName: "shard1ReplSet"

storage:
  dbPath: /var/lib/mongodb/shard1
```

```bash
# Start shard instances
mongod --config /etc/mongod-shard1.conf --fork

# Initialize shard replica set
mongosh --ipv6 --host "[2001:db8::s1]:27018" << 'EOF'
rs.initiate({
  _id: "shard1ReplSet",
  members: [
    { _id: 0, host: "[2001:db8::s1]:27018" },
    { _id: 1, host: "[2001:db8::s2]:27018" },
    { _id: 2, host: "[2001:db8::s3]:27018" }
  ]
})
EOF
```

## mongos Router Configuration

```yaml
# /etc/mongos.conf

net:
  port: 27017
  ipv6: true
  bindIp: "2001:db8::r1,::1"

sharding:
  # Config server connection string with IPv6
  configDB: "configReplSet/[2001:db8::c1]:27019,[2001:db8::c2]:27019,[2001:db8::c3]:27019"

systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongos.log
```

```bash
# Start mongos
mongos --config /etc/mongos.conf --fork
```

## Adding Shards and Enabling Sharding

```bash
# Connect to mongos
mongosh --ipv6 --host "[2001:db8::r1]:27017"

# Add shard to cluster
db.adminCommand({
  addShard: "shard1ReplSet/[2001:db8::s1]:27018,[2001:db8::s2]:27018,[2001:db8::s3]:27018",
  name: "shard1"
})

# Enable sharding on a database
db.adminCommand({ enableSharding: "myapp" })

# Shard a collection
db.adminCommand({
  shardCollection: "myapp.users",
  key: { userId: 1 }
})
```

## Connecting Applications to MongoDB over IPv6

```python
# Python pymongo over IPv6
from pymongo import MongoClient

# Connect to mongos (router) over IPv6
client = MongoClient(
    host=['[2001:db8::r1]:27017'],
    serverSelectionTimeoutMS=5000
)

db = client['myapp']
users = db['users']

# Insert and query
users.insert_one({'name': 'Test User', 'userId': 1})
user = users.find_one({'userId': 1})
print(f"Found: {user['name']}")

client.close()
```

## Firewall Rules for MongoDB Sharded IPv6

```bash
# mongos router
sudo ip6tables -A INPUT -p tcp --dport 27017 -j ACCEPT
# Shard nodes
sudo ip6tables -A INPUT -p tcp --dport 27018 -j ACCEPT
# Config servers
sudo ip6tables -A INPUT -p tcp --dport 27019 -j ACCEPT

sudo ip6tables-save > /etc/ip6tables/rules.v6
```

MongoDB sharded clusters with IPv6 bindIp configuration provide the same horizontal scaling capabilities on IPv6 networks as IPv4 deployments, supporting large-scale document storage and query distribution across IPv6 infrastructure.
