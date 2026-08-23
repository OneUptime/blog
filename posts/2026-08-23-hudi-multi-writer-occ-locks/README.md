# Configure Hudi Multi-Writer OCC with External Locks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Hudi, Optimistic Concurrency Control, Distributed Locks, Multi-Writer, Spark

Description: Configure Hudi optimistic concurrency control with a shared distributed lock, lazy cleanup, retries, and conflict monitoring.

---

Apache Hudi's default `SINGLE_WRITER` mode assumes only one process modifies a table. Two ingestion jobs, or one ingestion job plus a separate clustering or compaction job, form a multi-writer deployment. They need optimistic concurrency control and a distributed lock provider shared by every process.

OCC does not hold a table lock for the full Spark job. Writers work optimistically, then Hudi locks short critical sections and checks for overlapping file-group changes. Non-overlapping writes can both commit. When writers touch the same file group, one succeeds and the other must abort and retry.

This guide targets Apache Hudi 1.2.x and uses the DynamoDB lock provider as a concrete AWS example.

## Inventory every timeline writer

List all processes that can create Hudi timeline actions:

- Batch or streaming ingestion.
- Backfills.
- Separate compaction and clustering jobs.
- Cleaning or indexing jobs run outside the ingestion process.
- Administrative repair or rollback tools.

Async table services inside one writer process are coordinated by Hudi's single-process MVCC model and do not automatically require external infrastructure. Moving the service into a separate Spark application changes the deployment to multi-writer.

Do not enable OCC on only the two obvious ingestion jobs while leaving a scheduled clustering job in single-writer mode.

## Apply the required OCC settings

Every process needs:

```text
hoodie.write.concurrency.mode=optimistic_concurrency_control
hoodie.write.lock.provider=<provider-class>
hoodie.cleaner.policy.failed.writes=LAZY
```

`LAZY` failed-write cleaning is required for multi-writer mode. Eager cleanup could remove files belonging to another writer that is still active.

For DynamoDB:

```python
occ_options = {
    "hoodie.write.concurrency.mode": "optimistic_concurrency_control",
    "hoodie.write.lock.provider":
        "org.apache.hudi.aws.transaction.lock.DynamoDBBasedLockProvider",
    "hoodie.cleaner.policy.failed.writes": "LAZY",
    "hoodie.write.lock.dynamodb.table": "hudi_locks",
    "hoodie.write.lock.dynamodb.partition_key":
        "s3://company-lake/orders",
    "hoodie.write.lock.dynamodb.region": "eu-west-2",
}
```

All writers for this Hudi table must use the same lock table and partition-key value. Give different Hudi tables different values so unrelated workloads do not share one logical lock.

Hudi can auto-create the DynamoDB table. If you provision it separately, the documented partition-key attribute name is `key`. Use `PAY_PER_REQUEST` or size provisioned capacity from actual lock traffic.

## Supply the correct bundle and IAM

The DynamoDB provider class is in Hudi's AWS integration. Keep the matching `hudi-aws-bundle` and Hudi Spark bundle on the classpath. A mixed Hudi release can fail before acquiring a lock or serialize incompatible timeline metadata.

Prefer the AWS default credential provider chain through the Spark job role. Grant the documented DynamoDB actions on only the lock table, including item read/write/update and table describe. Grant `CreateTable` only if the job is supposed to create it.

Do not put long-lived AWS keys directly in Hudi options. If explicit credentials appear in logs or Spark UI configuration, they become an incident of their own.

Hudi 1.2 also documents a `StorageBasedLockProvider` for S3, GCS, and Azure using conditional storage writes, plus ZooKeeper and Hive-Metastore providers. Select one provider supported by every environment and test failure recovery. The older `FileSystemBasedLockProvider` is explicitly not for production or cloud object storage.

## Reduce avoidable conflicts

OCC permits concurrency; it does not make overlapping work cheap. A writer that loses conflict resolution discards compute and retries.

Partition workloads by disjoint table partitions or key ranges when possible. Do not run a broad backfill across the same recent partitions as a continuous CDC writer. Schedule clustering on closed partitions and limit compaction plans when separate services are unavoidable.

Index choice and file size influence conflict probability. Many unrelated keys can map to the same file group, so two logically disjoint batches can still conflict at file-group granularity.

Hudi supports early conflict detection through `hoodie.write.concurrency.early.conflict.detection.enable=true`, but the current documentation labels it experimental. Test it before relying on it; the normal end-of-write conflict check remains the correctness boundary.

## Implement bounded retries

Treat an OCC conflict as a retryable transaction failure, not a partial success. Retry the whole failed Hudi write with the same source checkpoint and deterministic input.

Use exponential backoff with jitter and a maximum attempt count. Retrying both conflicting writers immediately can produce a live collision loop. Keep source offsets or batch IDs unchanged until one target commit succeeds.

Lock-acquisition failure is different from a file-group conflict. Monitor DynamoDB throttling, network errors, IAM denial, and `hoodie.write.lock.wait_time_ms` timeouts separately. Increasing lock wait hides capacity problems if the provider cannot make progress.

## Verify before enabling production traffic

Run two test jobs:

1. Write disjoint partitions concurrently. Both should commit.
2. Update keys in the same file group. One should commit, and the other should fail cleanly or retry.
3. Kill a writer during its write and after lock acquisition.
4. Restart it with the same input.
5. Run cleaning and verify abandoned files are removed only after heartbeat timeout.

Query the final snapshot for duplicate keys and expected winners. Inspect requested, inflight, completed, rollback, and failed timeline actions rather than checking only job exit codes.

Hudi notes that concurrent `insert` and `bulk_insert` writers can still create duplicates because they create new file groups. Use upsert for overlapping key domains, or make insert domains provably disjoint.

## Monitor the system

Alert on:

- Lock acquisition latency and timeout rate.
- OCC conflicts and retry success.
- Old requested or inflight instants.
- Failed-write cleanup lag.
- Commit duration and wasted retry compute.
- Duplicate key checks.

Record writer identity and source checkpoint in Hudi commit metadata. That makes it possible to connect a timeline action with its Spark application and upstream batch during an incident.

Do not delete lock records or timeline files manually while writers run. Quiesce writers, determine ownership and heartbeat state, and use documented recovery commands.

## Official Documentation

- [Apache Hudi concurrency control](https://hudi.apache.org/docs/concurrency_control/)
- [Apache Hudi lock configurations](https://hudi.apache.org/docs/configurations/)
- [Apache Hudi technical specification](https://hudi.apache.org/learn/tech-specs/)
- [Apache Hudi table services](https://hudi.apache.org/docs/hudi_stack/)

## Conclusion

Configure OCC, one shared distributed lock, and lazy failed-write cleaning on every process that modifies the table. Minimize file-group overlap, retry conflicts from the same source checkpoint, test crash recovery, and monitor locks and timeline state as part of the write service.
