# How to Use Zero-Copy Replication in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Replication, Zero-Copy, S3, Object Storage

Description: Learn how ClickHouse's zero-copy replication eliminates redundant data transfers by having replicas share data directly from object storage instead of copying between nodes.

---

> **Warning:** Zero-copy replication is an experimental feature and is not recommended for production use. It was disabled by default starting in ClickHouse 22.8. The ClickHouse team explicitly states this feature is not ready for production. Use it for testing and evaluation only.

Traditional ClickHouse replication sends data over the network from one replica to another, doubling network bandwidth usage when adding a second replica. Zero-copy replication changes this model: instead of transferring data, replicas simply register a pointer to the same object storage file, so data is written once and read by all replicas directly from S3 or similar storage.

## How Zero-Copy Replication Works

When a replica needs a part that another replica already wrote to S3, it records the part metadata in ZooKeeper (or ClickHouse Keeper) without downloading the actual data. Both replicas then read the same S3 object independently. This is safe because object storage files are immutable once written - ClickHouse never modifies a part in place.

## Enabling Zero-Copy Replication

Zero-copy is configured at the disk level in your storage configuration:

```xml
<storage_configuration>
  <disks>
    <s3_disk>
      <type>s3</type>
      <endpoint>https://s3.amazonaws.com/mybucket/clickhouse/</endpoint>
      <access_key_id>ACCESS_KEY</access_key_id>
      <secret_access_key>SECRET_KEY</secret_access_key>
    </s3_disk>
  </disks>
</storage_configuration>
```

Also set the MergeTree-level flag in your `config.xml`:

```xml
<merge_tree>
  <allow_remote_fs_zero_copy_replication>1</allow_remote_fs_zero_copy_replication>
</merge_tree>
```

## Verifying Zero-Copy is Active

After inserting data on one replica, check that the other replica picks up the part without a network transfer:

```sql
-- On replica 1, insert some data
INSERT INTO my_table SELECT number FROM numbers(1000000);

-- On replica 2, check that the part exists without fetching
SELECT
    name,
    path,
    disk_name
FROM system.parts
WHERE table = 'my_table' AND active = 1;
```

Check replication queue activity:

```sql
SELECT
    table,
    type,
    new_part_name,
    is_currently_executing
FROM system.replication_queue
WHERE database = 'mydb';
```

With zero-copy, `GET_PART` entries are still present in the queue, but they are fulfilled by registering metadata in ZooKeeper/Keeper rather than transferring data over the network.

## Monitoring Zero-Copy Activity

```sql
SELECT event, value
FROM system.events
WHERE event LIKE '%S3%' OR event LIKE '%ZeroCopy%';
```

Watch for S3-related events such as `DiskS3GetObject` and `DiskS3CopyObject` to understand object storage activity. You can also monitor the `system.replication_queue` to observe how parts are being replicated across nodes.

## Distributed Lock Considerations

Zero-copy replication uses a distributed lock in ClickHouse Keeper to prevent two nodes from deleting a shared part simultaneously. High lock contention can slow down merges. You can tune the minimum part size threshold at which the lock sleep mechanism activates:

```xml
<merge_tree>
  <zero_copy_merge_mutation_min_parts_size_sleep_before_lock>
    1073741824
  </zero_copy_merge_mutation_min_parts_size_sleep_before_lock>
</merge_tree>
```

## Limitations

Zero-copy replication requires all replicas to have direct access to the same object storage bucket. It is not suitable for cross-region replication where replicas cannot share a single bucket. Also, mutations and merges still require reading the data locally, so zero-copy savings apply specifically to part fetching during replication, not to all operations.

## Summary

Zero-copy replication in ClickHouse dramatically reduces network usage and speeds up replica synchronization by sharing object storage references instead of transferring data. Enable it with `allow_remote_fs_zero_copy_replication`, ensure all replicas access the same S3 bucket, and monitor ZeroCopy events to confirm the feature is working and identify any lock contention issues.
