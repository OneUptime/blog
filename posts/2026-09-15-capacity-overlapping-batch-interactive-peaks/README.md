# How to Budget Capacity for Overlapping Batch and Interactive Peaks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Capacity Planning, Performance, Resource Management, Load Testing, SRE

Description: Budget shared CPU, connections, and I/O for coincident batch and interactive demand, then enforce batch admission against both latency and deadline objectives.

---

Moving a batch job to midnight does not guarantee isolation. Customer traffic spans time zones, retries delay earlier jobs, and maintenance can extend the batch window into the morning peak. A shared service must survive the actual overlap or prevent it through admission and scheduling controls.

Use aligned demand curves and explicit completion deadlines to decide how much batch work can run beside interactive traffic.

## Build one timeline for every resource

Measure interactive demand, batch demand, and background activity over the same timestamps. Keep separate series for CPU, connection occupancy, IOPS, throughput, and memory. Label major phases such as reading input, transforming data, checkpointing, and uploading results.

Do not add a noon interactive peak to a midnight batch peak unless that combination is a scenario you intend to support. Equally, do not average them over a day and discard the 20 minutes when both are busy. Preserve time zone and calendar behavior for month-end and delayed-start scenarios.

Google SRE describes managing load using resource-aware controls and priorities. A useful implication for this plan is to define which work receives capacity first before contention begins. [Google SRE Workbook: managing load](https://sre.google/workbook/managing-load/)

## Calculate the residual resource envelope

Assume a service has these illustrative, measured safe budgets:

| Resource | Tested safe budget | Interactive peak plus background | Residual for batch |
| --- | ---: | ---: | ---: |
| CPU consumption | 14 core-seconds/second | 10 | 4 |
| Active database connections | 160 | 120 | 40 |
| Storage throughput | 240 MiB/s | 160 MiB/s | 80 MiB/s |

These are already safe operating budgets, not raw hardware maxima. Do not apply the same headroom reduction again. Assume each active batch worker consumes 0.5 CPU cores, at most two active connections, and 12 MiB/s at its busiest relevant phase.

```python
from math import floor
residual = {'cpu': 4, 'connections': 40, 'mib_per_second': 80}
per_worker = {'cpu': 0.5, 'connections': 2, 'mib_per_second': 12}
limits = {k: floor(residual[k] / per_worker[k]) for k in residual}
workers = min(limits.values())
print(limits, workers)  # {'cpu': 8, 'connections': 20, 'mib_per_second': 6} 6
```

Storage constrains this example to six workers. Choosing eight workers from the CPU graph alone violates the modeled I/O budget. Recalculate for each batch phase and for cache-cold or failure conditions. Correlated per-worker peaks deserve a synchronized phase test.

## Check that the batch still finishes

Suppose a job contains 180,000 independent items and each worker completes a measured 20 items per second under the overlap conditions. Six workers complete the nominal workload in:

```text
180,000 / (6 * 20) = 1,500 seconds = 25 minutes
```

A 30-minute deadline leaves five minutes for startup, retries, stragglers, and checkpointing. A 20-minute deadline is infeasible under these assumptions; priority labels cannot change that arithmetic.

For changing capacity, sum useful completions across intervals. Four workers for ten minutes and six for fifteen minutes produce `4*20*600 + 6*20*900 = 156,000` completions, leaving 24,000 items. Use useful completion rate after retries rather than counting every attempted item as progress.

## Turn the envelope into an admission rule

Limit simultaneous workers, database pool growth, and resource-intensive batch phases. An admitted worker should have enough allowance to finish or checkpoint its current unit. If interactive demand rises, first stop admitting new batch work, then use an application-supported pause or checkpoint mechanism for existing work.

A CPU limit alone cannot prevent a batch query from saturating database I/O. Separate connection pools help contain concurrency, but the pools still contend for the same database capacity. Controls must exist at the bottleneck measured in the model.

Overload controls also need bounded queues and bounded retries; holding unlimited work until capacity returns can create a recovery spike. [Google SRE Book: handling overload](https://sre.google/sre-book/handling-overload/)

Choose high and low thresholds with a minimum dwell time so a noisy metric does not repeatedly start and stop workers. Make data freshness part of the policy. If capacity telemetry disappears, use a conservative documented worker ceiling rather than treating missing measurements as zero interactive demand.

## Rehearse the overlap that can actually happen

Run the normal timeline, a delayed batch start, a slow dependency, cold caches, a required node or zone failure, and backlog recovery after a pause. Preserve realistic data sizes and query plans. Compare interactive latency and errors with the same workload without batch activity.

For batch work, measure deadline attainment, checkpoint age, useful items per second, duplicate attempts, and the longest-running items. Average throughput can look healthy while a few partitions miss the deadline.

If no tested concurrency satisfies both objectives, change the plan: move work earlier, reserve a separate resource pool, optimize the expensive phase, add bottleneck capacity, or revise an explicitly negotiable deadline. Record the owner of that decision. A schedule becomes a capacity control only when delayed jobs and unexpected traffic still follow a defined admission policy.
