# How to Reduce ClickHouse Network Transfer Costs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Network Cost, Cost Optimization, Compression, Data Transfer

Description: Reduce ClickHouse network transfer costs by enabling response compression, optimizing distributed queries, and minimizing cross-region data movement.

---

## Where Network Costs Come From

In ClickHouse deployments, network transfer costs arise from three sources: client-to-server query results, inter-shard communication in distributed clusters, and replication traffic. Each can be tuned to reduce costs significantly.

## Enable HTTP Compression for Client Responses

When applications fetch large result sets over HTTP, enable response compression:

```bash
# Enable gzip compression on the client request
curl -sS "http://localhost:8123/?enable_http_compression=1" \
  -H "Accept-Encoding: gzip" --compressed \
  --data-binary "SELECT * FROM events LIMIT 100000 FORMAT JSONCompact"
```

In application code with the ClickHouse Python client:

```python
import clickhouse_connect

client = clickhouse_connect.get_client(
    host='localhost',
    compress=True,  # enables compression (zstd for responses, lz4 for inserts)
)

result = client.query("SELECT user_id, count() FROM events GROUP BY user_id")
```

LZ4 compression typically reduces result payload size by 5-10x for string-heavy data.

## Reduce Columns Returned

Never SELECT * in production queries. Fetch only needed columns:

```sql
-- Instead of this:
SELECT * FROM events WHERE date = today();

-- Do this:
SELECT user_id, event_type, event_time FROM events WHERE date = today();
```

For wide tables with 50+ columns, this can reduce network transfer by 90%.

## Aggregate at the Source

Push aggregation close to the data, especially in distributed setups:

```sql
-- Push aggregation to shards before merging
SELECT user_id, sum(revenue)
FROM distributed_orders
GROUP BY user_id
SETTINGS distributed_group_by_no_merge = 0;  -- default, ensures merge happens at initiator
```

Use `REMOTE()` functions carefully since they transfer raw data across the network before aggregation happens locally.

## Optimize Distributed Query Fan-Out

Check how many shards are involved in queries:

```sql
SELECT
    query,
    ProfileEvents['NetworkSendBytes'] AS bytes_sent,
    ProfileEvents['NetworkReceiveBytes'] AS bytes_received
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query LIKE '%Distributed%'
ORDER BY bytes_received DESC
LIMIT 10;
```

## Use Columnar Formats for Bulk Transfers

When exporting or importing large datasets between regions, use native ClickHouse binary format:

```bash
# Export as Native format (efficient for ClickHouse-to-ClickHouse transfers)
clickhouse-client --query "SELECT * FROM events" --format Native > events.native

# Re-import on destination
clickhouse-client --query "INSERT INTO events FORMAT Native" < events.native
```

Native format avoids serialization overhead and is roughly 1.5-2x smaller than CSV. For maximum compression, Parquet with its built-in encoding may produce similar or smaller files, but Native format requires the least processing on both the sending and receiving ClickHouse servers.

## Co-locate Compute and Storage

For ClickHouse Cloud, ensure your service region matches where data consumers run. Cross-region data transfer is billed at egress rates and adds latency.

```bash
# Check current service region
curl "https://api.clickhouse.cloud/v1/organizations/{org_id}/services/{service_id}" \
  -H "Authorization: Bearer $API_KEY" | jq '.service.provider.region'
```

## Summary

The biggest wins for reducing ClickHouse network transfer costs are enabling LZ4/gzip compression on client connections, selecting only needed columns, aggregating data at the source before returning results, and using native binary format for bulk data movement. For cloud deployments, co-locating compute with data consumers eliminates expensive cross-region egress.
