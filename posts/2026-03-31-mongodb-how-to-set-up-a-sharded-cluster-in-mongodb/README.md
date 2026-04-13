# How to Set Up a Sharded Cluster in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Sharding, Cluster, Operation, Scalability

Description: Set up a MongoDB sharded cluster from scratch with config servers, shard replica sets, and mongos routers for horizontal scaling.

---

## Architecture Overview

A MongoDB sharded cluster has three components:
- **Config servers**: A replica set that stores cluster metadata and shard key ranges
- **Shards**: Replica sets that store the actual data
- **mongos routers**: Stateless query routers that clients connect to

## Step 1: Start Config Server Replica Set

```bash
# Start 3 config server nodes
mongod --configsvr --replSet configRS \
  --dbpath /data/configdb \
  --port 27019 \
  --bind_ip localhost,192.168.1.20 \
  --logpath /var/log/mongodb/config.log \
  --fork
```

Initialize the config server replica set:

```javascript
// Connect to one config server
mongosh --host 192.168.1.20 --port 27019

rs.initiate({
  _id: "configRS",
  configsvr: true,
  members: [
    { _id: 0, host: "192.168.1.20:27019" },
    { _id: 1, host: "192.168.1.21:27019" },
    { _id: 2, host: "192.168.1.22:27019" }
  ]
});
```

## Step 2: Start Shard Replica Sets

Start each shard as a standard replica set. Here we create two shards.

```bash
# Shard 1 - Node 1
mongod --shardsvr --replSet shard1RS \
  --dbpath /data/shard1 \
  --port 27018 \
  --bind_ip localhost,192.168.1.30 \
  --logpath /var/log/mongodb/shard1.log \
  --fork
```

Initialize shard replica sets:

```javascript
// Connect to shard 1 primary
mongosh --host 192.168.1.30 --port 27018

rs.initiate({
  _id: "shard1RS",
  members: [
    { _id: 0, host: "192.168.1.30:27018" },
    { _id: 1, host: "192.168.1.31:27018" },
    { _id: 2, host: "192.168.1.32:27018" }
  ]
});
```

## Step 3: Start mongos Routers

```bash
mongos --configdb configRS/192.168.1.20:27019,192.168.1.21:27019,192.168.1.22:27019 \
  --port 27017 \
  --bind_ip localhost,192.168.1.10 \
  --logpath /var/log/mongodb/mongos.log \
  --fork
```

## Step 4: Add Shards to the Cluster

Connect to `mongos` and add each shard:

```javascript
mongosh --host 192.168.1.10 --port 27017

sh.addShard("shard1RS/192.168.1.30:27018,192.168.1.31:27018,192.168.1.32:27018");
sh.addShard("shard2RS/192.168.1.40:27018,192.168.1.41:27018,192.168.1.42:27018");
```

## Step 5: Enable Sharding on a Database and Collection

```javascript
sh.shardCollection("myapp.events", { userId: "hashed" });
```

## Verify the Cluster

```javascript
sh.status()
```

## Summary

A MongoDB sharded cluster requires config servers (metadata), shard replica sets (data), and mongos routers (query routing). Initialize config servers first, then shard replica sets, then start mongos and add shards with `sh.addShard()`. Applications connect only to `mongos` - shards are transparent to drivers.
