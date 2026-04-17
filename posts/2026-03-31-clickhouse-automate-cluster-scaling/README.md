# How to Automate ClickHouse Cluster Scaling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Cluster Scaling, Automation, Sharding, Replication

Description: Automate ClickHouse cluster scaling by scripting shard and replica additions so you can grow capacity without manual reconfiguration.

---

## The Challenge of Manual Scaling

ClickHouse clusters grow as data volumes increase. Adding shards or replicas by hand is tedious and risks misconfiguration. Automation reduces human error and lets you scale on demand or on a schedule.

## Cluster Layout Review

ClickHouse distributes data across shards. Each shard can have multiple replicas for high availability. The cluster topology is defined in `config.xml` under the `remote_servers` section.

```xml
<remote_servers>
  <analytics_cluster>
    <shard>
      <replica><host>ch1.internal</host><port>9000</port></replica>
      <replica><host>ch2.internal</host><port>9000</port></replica>
    </shard>
    <shard>
      <replica><host>ch3.internal</host><port>9000</port></replica>
      <replica><host>ch4.internal</host><port>9000</port></replica>
    </shard>
  </analytics_cluster>
</remote_servers>
```

## Automating Config Updates with Ansible

Use Ansible to push updated cluster config to all nodes when a new shard is provisioned:

```bash
# group_vars/clickhouse.yml
clickhouse_shards:
  - hosts: [ch1.internal, ch2.internal]
  - hosts: [ch3.internal, ch4.internal]
  - hosts: [ch5.internal, ch6.internal]  # new shard
```

The Ansible role renders the `remote_servers` XML from the variable list and reloads config without a full restart.

## Creating Distributed Tables After Scaling

After adding a shard, create or recreate the distributed table to include the new shard:

```sql
CREATE TABLE IF NOT EXISTS events_dist ON CLUSTER analytics_cluster
AS events_local
ENGINE = Distributed(analytics_cluster, default, events_local, rand());
```

The `rand()` sharding key distributes new inserts uniformly across all shards including the new one.

## Rebalancing Data to New Shards

ClickHouse does not automatically rebalance existing data. Use a script to move older partitions onto the new shard. Place the partition files in the table's `detached/` directory first, then attach:

```bash
#!/bin/bash
PARTITION=$1
# Files have already been copied into
# /var/lib/clickhouse/data/default/events_local/detached/ on ch5.internal
clickhouse-client --host ch5.internal --query \
  "ALTER TABLE events_local ATTACH PARTITION '${PARTITION}'"
```

For replicated tables you can also use `ALTER TABLE ... FETCH PARTITION ... FROM '<zk_path>'` to pull data directly from another replica before attaching. For larger migrations use `remote()`/`remoteSecure()` with `INSERT ... SELECT`, or `SELECT ... INTO OUTFILE`.

## Monitoring Shard Balance

Check row counts per shard to verify even distribution:

```sql
SELECT _shard_num, count() AS rows
FROM events_dist
GROUP BY _shard_num
ORDER BY _shard_num;
```

## Auto-Scaling Triggers

Integrate scaling with a monitoring tool like OneUptime. When a disk usage alert fires, trigger an Ansible playbook via a webhook to provision a new node and update the cluster config automatically.

```bash
curl -X POST https://oneuptime.example.com/api/webhook/scale-clickhouse \
  -H "Content-Type: application/json" \
  -d '{"action": "add_shard", "cluster": "analytics_cluster"}'
```

## Summary

Automating ClickHouse cluster scaling with Ansible, templated configs, and post-scale SQL scripts lets you expand capacity reliably and keeps your distributed tables consistent across all shards.
