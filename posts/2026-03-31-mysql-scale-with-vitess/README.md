# How to Scale MySQL with Vitess

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Vitess, Sharding, Scaling, Kubernetes

Description: Learn how Vitess scales MySQL horizontally by managing sharding, connection pooling, and query routing transparently across multiple MySQL instances.

---

## What Is Vitess?

Vitess is an open-source database clustering system for MySQL developed at YouTube to handle massive scale. It wraps MySQL with a sharding layer, connection pooling, and a unified query interface, making horizontal scaling transparent to applications. Vitess is used in production by Slack, GitHub, PlanetScale, and many others.

Vitess components include:
- **vtgate** - stateless proxy that routes queries to the correct shard
- **vttablet** - agent running alongside each MySQL instance
- **vtctld** - control plane for cluster management
- **topo server** - stores cluster topology (ZooKeeper, etcd, or Consul)

## Installing Vitess with the Operator on Kubernetes

The recommended production deployment is via the Vitess Operator:

```bash
kubectl apply -f https://github.com/planetscale/vitess-operator/releases/latest/download/operator.yaml
```

Create a VitessCluster resource:

```yaml
apiVersion: planetscale.com/v2
kind: VitessCluster
metadata:
  name: mydb
spec:
  images:
    vtgate: vitess/lite:latest
    vttablet: vitess/lite:latest
  cells:
    - name: zone1
      gateway:
        replicas: 2
        resources:
          requests:
            cpu: "1"
            memory: 512Mi
  keyspaces:
    - name: commerce
      durabilityPolicy: semi_sync
      partitionings:
        - equal:
            parts: 2
            shardTemplate:
              databaseInitScriptSecret:
                name: init-script
                key: init.sql
              replication:
                enforceSemiSync: true
              tabletPools:
                - cell: zone1
                  type: replica
                  replicas: 2
```

```bash
kubectl apply -f vitesscluster.yaml
```

## Connecting to Vitess via vtgate

Applications connect to vtgate on port 3306 using the standard MySQL protocol - no driver changes required:

```bash
mysql -h vtgate.default.svc.cluster.local -P 3306 -u app -psecret commerce
```

## Defining a Vindex (Shard Key)

A Vindex maps column values to shards. Define a hash vindex on `user_id`:

```json
{
  "sharded": true,
  "vindexes": {
    "user_id_vdx": {
      "type": "hash"
    }
  },
  "tables": {
    "orders": {
      "column_vindexes": [
        {
          "column": "user_id",
          "name": "user_id_vdx"
        }
      ]
    }
  }
}
```

With this VSchema, Vitess automatically routes any query containing `WHERE user_id = ?` to the correct shard.

## Resharding with Vitess

Adding shards without downtime is one of Vitess's key features. Use vtctldclient to initiate a reshard:

```bash
vtctldclient Reshard --target-keyspace commerce --workflow expand_shards \
  create --source-shards '0' --target-shards '-80,80-'
```

Vitess copies data, keeps both shard sets in sync, then switches traffic with a single atomic cutover.

## Monitoring Vitess

Vitess exports Prometheus metrics from vtgate and vttablet. Check query routing statistics:

```bash
curl http://vtgate:15001/debug/vars | jq '.QPS'
```

Or use the Vitess UI accessible at port 15000 on vtctld for cluster topology and health status.

## Summary

Vitess scales MySQL horizontally by adding a transparent sharding and routing layer. Deploy via the Vitess Operator on Kubernetes, define VSchema Vindexes to map shard keys, and connect applications to vtgate using standard MySQL drivers. Vitess handles resharding, connection pooling, and failover automatically, making it the most complete solution for MySQL horizontal scaling at large scale.
