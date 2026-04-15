# How to Handle Partial Results from Failed Shards in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Distributed Table, Shard, Fault Tolerance, Reliability

Description: Learn how to configure ClickHouse to handle partial query results when one or more shards fail in a distributed cluster.

---

## The Problem with Failed Shards

In a distributed ClickHouse cluster, a query against a Distributed table reaches all configured shards. If any shard is unavailable, the query fails by default - even if 9 out of 10 shards are healthy. For analytics workloads, returning partial results from available shards is often preferable to failing entirely.

## Default Behavior

By default, ClickHouse throws an error if any shard in the cluster is unreachable:

```text
Code: 279. DB::Exception: All connection tries failed.
```

## Enabling Skip of Unavailable Shards

Set skip_unavailable_shards = 1 to allow queries to proceed with available shards:

```sql
SELECT count()
FROM distributed_http_logs
SETTINGS skip_unavailable_shards = 1;
```

Or configure it globally in users.xml:

```xml
<profiles>
  <default>
    <skip_unavailable_shards>1</skip_unavailable_shards>
  </default>
</profiles>
```

## Detecting Partial Results

Add application-level checks by querying system.clusters before running analytics queries:

```sql
SELECT
    shard_num,
    replica_num,
    host_name,
    errors_count,
    estimated_recovery_time
FROM system.clusters
WHERE cluster = 'production_cluster'
ORDER BY shard_num, replica_num;
```

If estimated_recovery_time > 0, that replica has recently experienced errors and ClickHouse has not yet reset its error counter — treat it as potentially degraded.

## Querying with Shard Awareness

For critical queries where partial results would be misleading, check shard health first:

```sql
SELECT count() AS unhealthy_shards
FROM system.clusters
WHERE cluster = 'production_cluster'
  AND is_local = 0
  AND errors_count > 0;
```

If the result is greater than zero, alert operators rather than proceeding with a partial query.

## Using Replicas to Avoid Partial Results

Configure replicas so that if one replica of a shard fails, another handles the request:

```xml
<remote_servers>
  <production_cluster>
    <shard>
      <replica>
        <host>ch-shard1-replica1</host>
        <port>9000</port>
      </replica>
      <replica>
        <host>ch-shard1-replica2</host>
        <port>9000</port>
      </replica>
    </shard>
  </production_cluster>
</remote_servers>
```

With replicas, a shard is only unavailable when all its replicas are down.

## Timeout Configuration

Reduce the time spent waiting for unresponsive shards:

```sql
SELECT count()
FROM distributed_http_logs
SETTINGS
    connect_timeout = 1,
    receive_timeout = 5,
    skip_unavailable_shards = 1;
```

## Summary

ClickHouse's skip_unavailable_shards setting allows distributed queries to return partial results when shards are unavailable, improving availability at the cost of result completeness. Combine this with replica configuration, health checks on system.clusters, and application-level partial-result detection to build resilient analytics pipelines that degrade gracefully rather than failing completely.
