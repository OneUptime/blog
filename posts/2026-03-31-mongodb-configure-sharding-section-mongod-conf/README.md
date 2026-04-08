# How to Configure the sharding Section in mongod.conf

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Sharding, Configuration, Cluster, mongod

Description: Learn how to configure the sharding section in mongod.conf to declare config server and shard roles, enabling MongoDB sharded cluster deployments.

---

The `sharding` section in `mongod.conf` is small but critical. It tells a `mongod` process what role it plays in a sharded cluster: config server replica set member or shard server. Without this section, the instance runs as a standalone or replica set member and cannot participate in sharding.

## Sharded Cluster Components

A MongoDB sharded cluster has three types of processes:
- Config servers (CSRS) - store cluster metadata
- Shard servers (shardsvr) - store the actual data
- `mongos` routers - route client queries to the right shard

Each component has a distinct `mongod.conf`.

## Config Server Configuration

Config servers run as a dedicated replica set. Set `clusterRole: configsvr` on each config server member.

```yaml
sharding:
  clusterRole: configsvr

replication:
  replSetName: configReplSet

storage:
  dbPath: /data/configdb

net:
  port: 27019
```

Initialize the config server replica set from one member.

```javascript
rs.initiate({
  _id: "configReplSet",
  configsvr: true,
  members: [
    { _id: 0, host: "cfg1:27019" },
    { _id: 1, host: "cfg2:27019" },
    { _id: 2, host: "cfg3:27019" }
  ]
});
```

## Shard Server Configuration

Each shard is a replica set. Set `clusterRole: shardsvr` on every shard member.

```yaml
sharding:
  clusterRole: shardsvr

replication:
  replSetName: shard1

storage:
  dbPath: /data/shard1

net:
  port: 27018
```

## Adding a Shard to the Cluster

After starting all shard members and initializing their replica set, connect to `mongos` and add the shard.

```javascript
sh.addShard("shard1/shard1a:27018,shard1b:27018,shard1c:27018");
```

## mongos Configuration

The `mongos` router is not a `mongod` process and does not use `clusterRole`. Instead, its `sharding` section contains a `configDB` setting that points to the config server replica set.

```yaml
sharding:
  configDB: configReplSet/cfg1:27019,cfg2:27019,cfg3:27019
```

## Verifying the Sharding Role

Check the cluster role on a running instance.

```javascript
db.adminCommand({ getCmdLineOpts: 1 }).parsed.sharding
db.adminCommand({ serverStatus: 1 }).sharding
```

## Summary

The `sharding` section in `mongod.conf` sets `clusterRole` to either `configsvr` or `shardsvr`. Config servers use port 27019 by convention and run as a dedicated replica set. Shard servers use port 27018 and each run as their own replica set. The `mongos` router connects the cluster using the `configDB` string. Always initialize config server and shard replica sets before adding shards via `mongos`.
