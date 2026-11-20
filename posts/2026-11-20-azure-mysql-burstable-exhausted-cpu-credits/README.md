# Diagnose Azure MySQL Slowdowns from Exhausted CPU Credits

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, MySQL, Performance, Troubleshooting

Description: Identify Burstable CPU-credit exhaustion with Azure MySQL metrics, separate it from other bottlenecks, and choose a recovery plan that does not amplify overload.

A development database runs comfortably in the morning, then becomes painfully slow during an import. Requests time out, connection retries increase, and CPU usage does not necessarily remain at 100%. Adding more application workers makes things worse.

On Azure Database for MySQL's Burstable tier, this pattern can mean that the server has exhausted its CPU credits. Diagnose it by lining up credit balance, workload, and latency over time. A single CPU percentage is not enough.

## Understand the capacity you actually bought

Burstable compute has a baseline CPU capacity. When demand stays below that baseline, credits accumulate; demand above it spends credits. After credits run out, capacity falls back to the baseline. The database can experience severe delays, connection timeouts, and even delayed management operations. Microsoft describes this behavior in the [MySQL service-tier guide](https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-service-tiers-storage).

Think of the credit balance as a reserve for short periods of extra work. It does not turn an intermittently busy server into a sustained high-throughput server. The [B-series credit model](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/b-series-cpu-credit-model) explains the underlying accumulation and consumption rules. Use that document for the model, but use the MySQL resource's metrics for your database investigation.

Start by confirming the server's current tier and size. Also record whether a resize, restart, import, test run, or deployment occurred near the incident. Do not apply another B-series size's baseline or credit allowance to your server.

## Build a timeline with the right metrics

Open the server's Azure Monitor metrics and inspect a window that begins before the slowdown. Compare:

| Evidence | What it helps answer |
|---|---|
| `cpu_credits_remaining` | Was the reserve falling toward zero? |
| `cpu_credits_consumed` | Was the workload spending burst capacity? |
| `cpu_percent` | How did observed CPU usage change before and after depletion? |
| Application latency and throughput | Did user-visible performance change at the same time? |
| Memory, I/O, and connection metrics | Is another bottleneck present as well? |

The MySQL credit metrics are counts, not percentages. The current reference lists 15-minute and coarser intervals for credit metrics, while host CPU supports one-minute intervals. Supported aggregations include Average, Minimum, and Maximum. Check your resource's metric definitions instead of requesting an unsupported resolution. See the [MySQL monitoring reference](https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-monitor-mysql-reference).

Inspect both average and minimum credit balance. A broad average can hide a low point. Do not add together credit-balance samples as if they were independent credits earned. Missing values are unknown observations, not zeros.

A typical exhaustion sequence is: sustained demand, a declining balance, a balance at or near zero, and worsening latency or throughput. CPU may then settle below full utilization because the server is limited to baseline capacity. This is why “CPU is only moderately busy now” does not rule out earlier exhaustion.

```mermaid
flowchart LR
    A[Sustained work above baseline] --> B[Credit balance falls]
    B --> C[Credits exhausted]
    C --> D[Baseline CPU capacity]
    D --> E[Queries and requests queue]
    E --> F[Unbounded retries add work]
    F --> E
```

The retry loop is something you can influence immediately, even before changing the server size.

## Collect an inspectable metric snapshot

These read-only commands are source-reviewed for **Azure CLI 2.80.0**. Use an authenticated account allowed to read the server and its metrics. Replace the resource names, and confirm the active subscription before running them.

```bash
set -euo pipefail
umask 077

MYSQL_RG='REPLACE_RESOURCE_GROUP'
MYSQL_SERVER='REPLACE_SERVER'

MYSQL_RESOURCE_ID=$(az mysql flexible-server show \
  --resource-group "$MYSQL_RG" --name "$MYSQL_SERVER" \
  --query id --output tsv)
test -n "$MYSQL_RESOURCE_ID"

az monitor metrics list-definitions \
  --resource "$MYSQL_RESOURCE_ID" \
  --output json > mysql-metric-definitions.json

az monitor metrics list \
  --resource "$MYSQL_RESOURCE_ID" \
  --metrics cpu_credits_remaining cpu_credits_consumed cpu_percent \
  --aggregation Average Minimum Maximum \
  --interval 15m --offset 6h \
  --output json > mysql-credit-window.json
```

Review the definitions before interpreting the second file. The example asks for the preceding six hours in 15-minute buckets so the three series share an interval. Adjust the incident window explicitly if it happened earlier. The flags and aggregation choices are documented in the [Azure Monitor metrics CLI reference](https://learn.microsoft.com/en-us/cli/azure/monitor/metrics?view=azure-cli-latest).

Keep timestamps and metric names with the results. Empty time series, absent measurements, permission failures, and wrong-resource queries require investigation; none establishes that credits are healthy or exhausted.

For a rough planning estimate, suppose comparable balance observations fall from 180 to 90 credits over 30 minutes. The observed net decline is three credits per minute, suggesting about 30 minutes of reserve at the same rate. That is an illustrative estimate, not a service guarantee. Demand can change, the server can reach its credit cap, and bucket aggregation can hide variation. Use a trend across several observations before acting on an estimate.

## Find the work consuming the reserve

A recurring batch can explain the incident even if daily average traffic looks small. Check imports, index changes, report jobs, connection churn, and a recent increase in parallel workers. Microsoft's [high-CPU troubleshooting guide](https://learn.microsoft.com/en-us/azure/mysql/flexible-server/how-to-troubleshoot-high-cpu-utilization) recommends combining platform metrics with inspection of the current workload and query plans.

For MySQL **8.0.46**, the following read-only query lists statement groups with high accumulated elapsed time. It requires Performance Schema statement-digest collection and permission to read the table:

```sql
SELECT SCHEMA_NAME,
       DIGEST_TEXT,
       COUNT_STAR AS executions,
       ROUND(SUM_TIMER_WAIT / 1000000000000, 3) AS elapsed_seconds,
       SUM_ROWS_EXAMINED AS rows_examined
FROM performance_schema.events_statements_summary_by_digest
WHERE SCHEMA_NAME IS NOT NULL
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 10;
```

A digest groups similar statements rather than showing every execution separately. The timer is accumulated statement elapsed time, including waiting; it is **not CPU time**. The counters cover their collection lifetime, not automatically the six-hour Azure metric window. Compare snapshots over a known interval, account for resets, and avoid truncating shared diagnostic tables. Column definitions are in [MySQL statement summary tables](https://dev.mysql.com/doc/refman/8.0/en/performance-schema-statement-summary-tables.html).

Use these results to choose queries for plan review in a suitable environment. A high historical total is a lead, not proof that a statement caused this incident. If the server cannot respond promptly, use already collected metrics and application telemetry rather than adding expensive diagnostic work.

## Separate exhaustion from other failures

Credit depletion can coexist with inefficient queries, memory pressure, lock waits, or storage limits. Compare the sequence rather than forcing every symptom into one explanation.

If latency rises while credits remain comfortably available, investigate those other limits. If credits reach zero but latency remains acceptable, the baseline may still serve the current workload. If latency worsens as credits disappear and improves after reducing demand, the evidence for credit-related throttling becomes stronger.

Do not assume a flat or falling CPU chart proves recovery. Require throughput and latency to improve at a known request rate, with connection errors and queue depth falling too.

## Recover without amplifying the incident

Pause nonessential batch work through its owning application, reduce worker concurrency, and bound connection retries. Coordinate cancellation of any in-flight work with its owner; a long-running write can have rollback consequences. Watch whether the balance stabilizes and then replenishes under reduced demand.

Avoid repeated restarts as a credit-refill technique. A restart interrupts clients and does not fix a workload whose sustained demand exceeds its baseline. During heavy exhaustion, management actions can also be delayed; repeatedly submitting a resize or restart obscures what is already in progress.

For recurring sustained load, evaluate General Purpose or another suitable tier. A larger Burstable size might change the baseline and reserve, but still uses the credit model. Compute changes involve a restart, so plan client reconnection and verify the new configuration afterward. The [service-tier documentation](https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-service-tiers-storage) describes these scaling characteristics.

Finally, alert before depletion using a workload-specific low-balance threshold and a supported evaluation window. Include missing telemetry as a separate failure condition. Rehearse the response with a safe staging workload, recording the credit trend, latency, and mitigation result. The useful outcome is enough warning to reduce demand or change capacity before users encounter the next exhausted reserve.
