# Use Spot Workers Safely in Databricks Jobs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Databricks, Spot, Apache Spark, Cost Optimization, Cloud Computing

Description: Reduce Databricks job cost with interruptible workers while protecting the driver, using fallback capacity, idempotent retries, and interruption metrics.

---

For Databricks jobs that use classic compute, Spot and preemptible virtual machines can reduce the cloud infrastructure cost of workers, but the provider can reclaim them. Spark can recover many lost executor tasks, yet repeated worker loss increases runtime and can still fail a task. Losing the Spark driver is much more disruptive because the driver owns the application state and coordinates executors.

A safe pattern uses an on-demand driver, interruptible workers with fallback where supported, bounded job retries, and idempotent data writes. Savings should be evaluated per successful outcome after interruptions, not from the Spot discount alone.

## Keep the driver on demand

Databricks recommends that the driver use an on-demand instance. The driver maintains the Spark context, task scheduling state, and notebook or application state. Worker loss normally causes Spark to recompute lost tasks or shuffle data. Driver loss usually ends the Spark application and requires a task retry.

On AWS, Azure, and Google Cloud, `first_on_demand` in the provider-specific compute attributes counts nodes starting with the driver:

```text
first_on_demand = 1
  -> driver on demand, remaining nodes use the configured availability mode

first_on_demand = 2
  -> driver and one worker on demand, remaining nodes use the configured mode
```

For an AWS compute policy, a baseline guardrail is:

```json
{
  "aws_attributes.availability": {
    "type": "fixed",
    "value": "SPOT_WITH_FALLBACK",
    "hidden": true
  },
  "aws_attributes.first_on_demand": {
    "type": "fixed",
    "value": 1,
    "hidden": true
  }
}
```

Azure uses the analogous `SPOT_WITH_FALLBACK_AZURE` availability value. Google Cloud compute and pool configurations use `PREEMPTIBLE_WITH_FALLBACK_GCP`. Names and supported controls differ by cloud, so use the configuration reference for the workspace's provider rather than copying a cross-cloud cluster specification.

When pools are involved, use a separate on-demand driver pool and interruptible worker pool. Databricks specifically warns against a Spot or preemptible driver pool.

## Understand what fallback does

Fallback addresses capacity acquisition. If interruptible capacity is unavailable, a fallback mode can provision on-demand capacity instead. It does not make a running Spot worker non-interruptible, guarantee that replacement capacity arrives immediately, or make application side effects safe to repeat.

The actual worker mix can therefore change by run and over time. Record both the configured policy and the billed provider purchase option. A job launched mostly on demand during a capacity shortage will not deliver the expected Spot savings.

Cloud behavior also differs:

| Provider | Interruptible product | Relevant Databricks fallback setting |
| --- | --- | --- |
| AWS | EC2 Spot Instance | `SPOT_WITH_FALLBACK` |
| Azure | Azure Spot Virtual Machine | `SPOT_WITH_FALLBACK_AZURE` |
| Google Cloud | Spot or preemptible VM | `PREEMPTIBLE_WITH_FALLBACK_GCP` |

Providers can reclaim capacity with little notice. AWS documents a two-minute Spot interruption notice, while Azure documents best-effort notice up to 30 seconds. Treat notices as operational signals, not enough time to complete an arbitrary Spark stage.

## Design for executor loss

Spark automatically retries failed tasks and can recompute partitions whose executor data was lost. This works best when:

- Input is in durable object storage or a governed table.
- Shuffle can be recomputed without external side effects.
- The cluster has enough remaining capacity to continue.
- Lost workers are replaced before the task or job timeout.
- The job does not depend on executor-local files after a worker disappears.

Large shuffles can be expensive to recompute. If interruption repeatedly destroys shuffle output, the cheaper worker-hour can produce a more expensive run. Keep a small on-demand worker base for strict workloads by setting `first_on_demand` above one, or use all on-demand capacity for the shuffle-heavy phase.

Autoscaling does not remove interruption risk. A cluster can temporarily fall below its configured minimum when a provider terminates instances while Databricks attempts to provision replacements.

## Add task-level retries deliberately

Lakeflow Jobs tasks support `max_retries` and `min_retry_interval_millis`. A retry starts the failed task again, which is a larger recovery boundary than Spark retrying one executor task.

```json
{
  "task_key": "daily_orders",
  "max_retries": 2,
  "min_retry_interval_millis": 300000,
  "retry_on_timeout": false,
  "notebook_task": {
    "notebook_path": "/Workspace/Shared/daily_orders"
  }
}
```

This is an example policy, not a universal retry count. Databricks measures the retry interval from the start of the failed attempt to the start of the retry, so choose it with the failed attempt's runtime in mind; if an attempt already ran longer than the interval, the retry can begin immediately. The task timeout applies separately to each retry, so account for the total worst-case runtime across all attempts and intervals in the completion objective and upstream scheduler.

Do not use infinite retries for a production batch task without an external deadline and alert. A deterministic code or data error will consume capacity indefinitely.

## Make writes safe to repeat

Retries are only safe when the task is idempotent. Delta Lake provides atomic table transactions, but it cannot automatically make an external API call, message publication, or duplicate append idempotent.

Useful patterns include:

- Partition replacement for a deterministic processing date
- `MERGE` on stable business keys instead of blind append
- A staging table keyed by job run and task execution
- A commit table that records completed business partitions
- Idempotency keys for external APIs that support them
- Publishing downstream events only after the table transaction succeeds

For example, stage a retryable result under a run identifier, then merge it into the target by a stable order key:

```sql
MERGE INTO main.sales.orders AS target
USING main.staging.orders_for_run AS source
ON target.order_id = source.order_id
WHEN MATCHED THEN UPDATE SET *
WHEN NOT MATCHED THEN INSERT *;
```

Because this example uses `UPDATE SET *` and `INSERT *`, the source must provide corresponding columns for every target column. It must also contain one deterministic row per target key. Multiple ambiguous source matches or non-deterministic transformations can still make a retry fail or produce a different result.

For streaming or incremental jobs, keep checkpoints in durable supported storage, not executor-local disk. Test whether the exact trigger and compute product support the workload. Continuous stateful workloads with strict availability are usually poor candidates for an interruptible fleet.

## Choose the Spot fraction by workload

| Workload characteristic | Starting posture |
| --- | --- |
| Stateless, partitioned batch with a wide completion window | On-demand driver, mostly Spot workers, fallback enabled |
| Large shuffle with expensive recomputation | On-demand driver plus an on-demand worker base |
| Short task with a strict deadline | All on demand or a small tested Spot fraction |
| Non-idempotent external side effects | Fix idempotency before enabling Spot |
| Stateful continuous stream | Prefer stable capacity unless recovery is proven |
| Development or replay workload | High Spot fraction can be reasonable |

Avoid rare instance families with poor Spot capacity simply because their current price is low. On AWS, Databricks fleet instance types can improve access to compatible capacity for eligible workloads. On every cloud, validate availability in the required region and zone.

## Measure expected cost, not headline discount

Use this comparison:

```text
expected cost per success
  = cloud cost for all attempts
  + Databricks usage for all attempts
  + cost of fallback on-demand workers
  + cost of missed completion objectives
```

Track at least:

- Percentage of worker time billed as Spot or preemptible
- Spot termination and capacity-unavailable events
- Lost executors and failed Spark tasks
- Task retries, repairs, and final success rate
- Setup, execution, and end-to-end duration
- Databricks DBUs and provider VM cost per successful business output
- P50 and P95 completion time

Databricks cluster event logs can identify Spot termination events for classic compute. Provider billing exports show whether fallback changed the purchase option. Correlate both with the job run ID and business invocation ID.

## Roll out safely

1. Make the task idempotent and test a manual rerun.
2. Protect the driver with an on-demand policy.
3. Enable fallback and a small Spot worker fraction.
4. Simulate worker loss in a non-production environment where practical.
5. Verify output correctness, retry behavior, and alerts.
6. Increase the Spot fraction only while tail latency and success rate remain acceptable.
7. Keep a policy or deployment switch that restores all on-demand capacity quickly.

Prices, capacity, interruption rates, and supported settings change by cloud, region, instance family, and time. Reassess the mix regularly instead of treating the first benchmark as permanent.

## Official Documentation

- [Databricks compute configuration reference on AWS](https://docs.databricks.com/aws/en/compute/configure)
- [Databricks compute policy reference on AWS](https://docs.databricks.com/aws/en/admin/clusters/policy-definition)
- [Azure Databricks compute policy reference](https://learn.microsoft.com/en-us/azure/databricks/admin/clusters/policy-definition)
- [Databricks compute configuration on Google Cloud](https://docs.databricks.com/gcp/en/compute/configure)
- [Pool best practices](https://docs.databricks.com/aws/en/compute/pool-best-practices)
- [Jobs API retry fields](https://docs.databricks.com/api/workspace/jobs/create)
- [Amazon EC2 Spot Instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-spot-instances.html)
- [Azure Spot Virtual Machines](https://learn.microsoft.com/en-us/azure/virtual-machines/spot-vms)
- [Google Cloud Spot VMs](https://cloud.google.com/compute/docs/instances/spot)

## Conclusion

Spot workers are safe only when interruption is an explicit application fault model. Keep the driver on demand, use provider-appropriate fallback, make every retried write idempotent, and set bounded task retries. Then compare total cost and tail latency per successful outcome, including fallback and failed attempts, before increasing the interruptible share.
