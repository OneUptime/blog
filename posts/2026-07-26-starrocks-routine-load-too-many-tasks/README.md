# StarRocks Routine Load Has TOO MANY TASKS: Tune Concurrency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: StarRocks, Kafka, Routine Load, Concurrency, Performance Tuning

Description: Fix Routine Load task saturation by measuring cluster-wide demand, reducing job concurrency, and lengthening useful batches safely.

---

`failed to submit task. error code: TOO MANY TASKS` means Routine Load scheduling demand exceeded the available task capacity. It is not evidence that one Kafka topic needs more parallelism.

The safest first move is to reduce task churn. Increasing a thread or task limit before measuring CPU, memory, transactions, and compaction can turn a rejected task into a cluster-wide ingestion problem.

## Inventory All Jobs, Not Just the Failing One

Each Routine Load job is split into concurrent tasks. A job's actual concurrency is:

```text
min(
  alive BE count,
  consumed Kafka partition count,
  desired_concurrent_number,
  max_routine_load_task_concurrent_num
)
```

Inspect active jobs in every database, repeating this statement for each database that owns Routine Load jobs:

```sql
SHOW ROUTINE LOAD FROM ingestion;
```

For a specific job:

```sql
SHOW ROUTINE LOAD FOR ingestion.kafka_orders\G
SHOW ROUTINE LOAD TASK FROM ingestion
WHERE JobName = 'kafka_orders'\G
```

Record `CurrentTaskNum`, `desired_concurrent_number`, partition count, coordinator `BeId`, task timing, lag, and aborted task count. Sum current and desired tasks across all active jobs. The failing job may be small while dozens of other jobs consume the slots.

## Check the Capacity Controls for Your Version

On current StarRocks releases, inspect:

```sql
ADMIN SHOW FRONTEND CONFIG
LIKE 'max_routine_load_task_concurrent_num';

ADMIN SHOW FRONTEND CONFIG
LIKE 'max_routine_load_task_num_per_be';

ADMIN SHOW FRONTEND CONFIG
LIKE 'routine_load_task_consume_second';

ADMIN SHOW FRONTEND CONFIG
LIKE 'routine_load_task_timeout_second';

ADMIN SHOW FRONTEND CONFIG
LIKE 'max_routine_load_batch_size';
```

`max_routine_load_task_concurrent_num` caps one job. `max_routine_load_task_num_per_be` caps concurrent Routine Load tasks per BE and defaults to `16` in recent documentation.

Older guidance describes capacity as `routine_load_thread_pool_size` multiplied by active BEs. StarRocks deprecated the BE `routine_load_thread_pool_size` control in v3.1; modern scheduling is controlled by the FE parameter `max_routine_load_task_num_per_be`. Always match a tuning guide to the deployed version.

Also verify that the BEs counted as alive are actually healthy and balanced. A nominal slot count does not compensate for one overloaded coordinator, failed disks, or compaction backlog.

## Reduce Concurrency at the Job First

Pause, alter, and resume the noisiest job:

```sql
PAUSE ROUTINE LOAD FOR ingestion.kafka_orders;

ALTER ROUTINE LOAD FOR ingestion.kafka_orders
PROPERTIES (
  'desired_concurrent_number' = '2'
);

RESUME ROUTINE LOAD FOR ingestion.kafka_orders;
```

Reducing the cluster-wide `max_routine_load_task_concurrent_num` is broader and affects the maximum for every job. Prefer per-job `desired_concurrent_number` unless the incident is caused by consistently oversized defaults.

Do not set desired concurrency above the Kafka partition count or alive BE count and expect more throughput. The formula caps it, while excess configuration makes capacity planning harder to read.

## Make Each Task Do More Useful Work

Very short tasks create more scheduling, transaction, publish, and compaction overhead. StarRocks ends a consumption batch when it reaches its byte limit or consume-time limit.

From v3.1, use job-specific controls:

```sql
PAUSE ROUTINE LOAD FOR ingestion.kafka_orders;

ALTER ROUTINE LOAD FOR ingestion.kafka_orders
PROPERTIES (
  'task_consume_second' = '30',
  'task_timeout_second' = '120'
);

RESUME ROUTINE LOAD FOR ingestion.kafka_orders;
```

When only one is configured, StarRocks derives the other with a 4:1 timeout-to-consume-time relationship. Setting both makes the operational intent clear.

The byte cap `max_routine_load_batch_size` is an FE dynamic parameter shared by the cluster:

```sql
ADMIN SHOW FRONTEND CONFIG LIKE 'max_routine_load_batch_size';
```

The current documented default is 4 GiB. Older FAQ advice to increase batch size above 1 GiB should not be applied blindly to a release that already has a larger default.

Use the coordinator BE's `be.INFO` log to determine which boundary ends consumption. A `consumer group done` record includes `left_time` and `left_bytes`:

- `left_bytes <= 0` indicates the byte limit was reached. A larger byte cap might allow a larger batch, if memory and transaction size remain safe.
- `left_bytes > 0` indicates the byte limit was not reached. Check `left_time` and `eos`: `left_time <= 0` means consume time ended first, while `eos: 1` can mean the consumer queue ended. A longer consume duration may reduce task QPS when time is the boundary.

Larger batches reduce scheduling and tablet-version pressure, but increase end-to-end latency, memory use, transaction size, and recovery work after failure. Change one dimension at a time.

## Estimate Task Churn

The Routine Load FAQ suggests approximating cluster task QPS as:

```text
cluster Routine Load task count / routine_load_task_consume_second
```

Treat this as a planning approximation. Per-job consume durations, empty partitions, failures, and scheduling intervals change observed behavior.

Measure over a representative window:

- new tasks per second
- task duration
- rows and bytes per committed task
- Kafka offset lag
- transaction publish time
- compaction score and tablet versions
- BE CPU and memory

The FAQ recommends keeping cluster Routine Load QPS below 10. Validate that conservative target against the exact release and workload rather than treating it as a universal throughput ceiling.

## Increase Capacity Only with Headroom

If jobs are efficiently batched, their concurrency is justified by lag, and BEs have headroom, an administrator can raise a mutable FE limit:

```sql
ADMIN SET FRONTEND CONFIG (
  'max_routine_load_task_num_per_be' = '20'
);
```

The dynamic change is lost after an FE restart unless it is also persisted in `fe.conf`. Roll out and observe it gradually.

Before raising it, require:

1. Spare BE CPU and memory.
2. No compaction backlog or excessive tablet versions.
3. Healthy transaction publish latency.
4. Even task distribution across BEs.
5. Sufficient network throughput to Kafka and storage.
6. A rollback value and alert thresholds.

Adding BEs can expand task capacity and execution resources, but only if the new nodes are healthy and the workload can distribute across them.

## Verify the Repair

After each change:

```sql
SHOW ROUTINE LOAD FOR ingestion.kafka_orders\G
SHOW ROUTINE LOAD TASK FROM ingestion
WHERE JobName = 'kafka_orders'\G
```

Success means more than the error disappearing:

- the job remains `RUNNING`
- task rejection and abort counts stop rising
- offset lag meets its SLO
- bytes and rows per task increase as intended
- load latency remains acceptable
- compaction and tablet versions remain healthy
- dashboard queries do not regress

The durable tuning target is the lowest concurrency and task QPS that keep up with Kafka. Parallelism is useful only until coordination and storage overhead consume the gain.

## Official Documentation

- [Routine Load FAQ](https://docs.starrocks.io/docs/faq/loading/Routine_load_faq/)
- [Load data using Routine Load](https://docs.starrocks.io/docs/loading/RoutineLoad/)
- [CREATE ROUTINE LOAD](https://docs.starrocks.io/docs/sql-reference/sql-statements/loading_unloading/routine_load/CREATE_ROUTINE_LOAD/)
- [SHOW ROUTINE LOAD TASK](https://docs.starrocks.io/docs/sql-reference/sql-statements/loading_unloading/routine_load/SHOW_ROUTINE_LOAD_TASK/)
- [FE query and loading configuration](https://docs.starrocks.io/docs/administration/management/FE_parameters/user_query_loading/)
- [StarRocks 3.1 release notes](https://docs.starrocks.io/releasenotes/release-3.1/)
