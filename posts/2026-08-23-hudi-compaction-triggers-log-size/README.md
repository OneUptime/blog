# Tune Hudi Compaction with Commit and Log-Size Controls

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Hudi, Compaction, Merge-on-Read, Performance Tuning, Data Lakehouse

Description: Tune Hudi compaction by separating scheduling triggers from log-size planning and measuring backlog against read and write SLAs.

---

Apache Hudi compaction tuning has two separate decisions: when to schedule a compaction and which Merge-on-Read file groups to include. Delta-commit or time thresholds answer the first question. A log-size-based compaction strategy answers the second.

Calling both of them triggers hides this distinction and often produces disappointing results. Reaching ten delta commits can create a compaction request, but that plan can still select only the file groups whose accumulated logs satisfy the configured strategy and I/O budget.

This guide targets Apache Hudi 1.2.x. Compaction applies to Merge-on-Read tables, not Copy-on-Write tables.

## Understand the two control layers

The scheduling layer uses `hoodie.compact.inline.trigger.strategy`. Current Hudi documents these strategies:

- `NUM_COMMITS` schedules after a configured number of delta commits since the last completed compaction.
- `NUM_COMMITS_AFTER_LAST_REQUEST` counts after the last completed or requested compaction.
- `TIME_ELAPSED` uses elapsed seconds.
- `NUM_AND_TIME` requires both thresholds.
- `NUM_OR_TIME` schedules when either threshold is met.

For count-based strategies, `hoodie.compact.inline.max.delta.commits` supplies the delta-commit threshold. Time-aware strategies also use a configured elapsed-time threshold from the compaction configuration supported by your Hudi version.

The planning layer uses `hoodie.compaction.strategy`. The Hudi 1.2 documentation lists `LogFileSizeBasedCompactionStrategy` as the default. It orders file groups by accumulated log size, filters candidates according to its threshold, and limits planned work by the configured I/O bound. Other strategies prioritize log-file count, partitions, or a bounded amount of I/O.

The practical rule is:

```text
trigger strategy -> should Hudi make a plan now?
compaction strategy -> which file groups belong in that plan?
```

## Establish measurable service objectives

Do not start by copying a commit threshold. Define:

- Maximum snapshot-read latency.
- Maximum acceptable read-optimized freshness lag.
- Maximum age and bytes of unmerged log data.
- Maximum compaction runtime and storage bandwidth.
- Maximum ingestion latency during compaction.

For a stream that commits every 30 seconds, a ten-commit threshold attempts scheduling after roughly five minutes of sustained non-empty commits. It does not guarantee completion within five minutes. Planning delay, executor availability, skew, and the amount of data selected all add time.

A time-based trigger can better express a freshness SLA when traffic is bursty. `NUM_OR_TIME` is useful when high traffic should trigger early but quiet periods must still be compacted. `NUM_AND_TIME` deliberately delays until both conditions hold and should not be used when either threshold represents a hard maximum.

## Configure a count-based starting point

For a Spark writer running async compaction:

```python
options = {
    "hoodie.table.name": "orders_mor",
    "hoodie.datasource.write.table.type": "MERGE_ON_READ",
    "hoodie.datasource.compaction.async.enable": "true",
    "hoodie.compact.inline.trigger.strategy": "NUM_COMMITS",
    "hoodie.compact.inline.max.delta.commits": "10",
    "hoodie.compaction.strategy":
        "org.apache.hudi.table.action.compact.strategy."
        "LogFileSizeBasedCompactionStrategy",
}
```

The fully qualified strategy class is intentionally explicit. Confirm class names and applicable options in the documentation for the exact Hudi bundle deployed by the job.

Lowering the delta-commit count reduces the time updates remain only in logs, but compacts smaller batches and can increase rewrite amplification. Raising it amortizes base-file rewrites over more changes, but snapshot readers merge more log data and read-optimized consumers wait longer.

## Tune from log distribution

Table-wide averages are misleading. A hot file group may accumulate gigabytes of logs while most groups remain untouched. Capture percentiles for:

- Log bytes per active file group.
- Log file and log block count per file slice.
- Time since each file group's last completed compaction.
- Snapshot merge time for hot and typical partitions.
- Bytes read and written per compaction operation.

If a few hot groups dominate, a log-size-based strategy is useful because it prioritizes the largest unmerged work. If many tiny log files cause overhead even when total bytes are modest, test `LogFileNumBasedCompactionStrategy`. Hudi also has log compaction, a different minor service that stitches small log blocks without producing a new base file; do not confuse it with regular compaction.

Log compaction can reduce read-side block overhead but retains superseded blocks until full compaction and cleaning. It is not a substitute for a major compaction policy.

## Bound each compaction wave

An unbounded plan can consume the cluster and destabilize ingestion. Hudi provides bounded-I/O strategies and related compaction configuration so a run selects only work within an operating budget.

Choose the budget from measured throughput:

```text
safe bytes per run =
  sustainable compaction bytes per second
  * allowed service duration
```

Leave headroom for regular writes, metadata-table maintenance, and object-store variability. A plan that is always smaller than incoming log growth will never catch up, so compare the long-run arrival rate with the drain rate.

Partition-aware strategies are appropriate when recent date partitions have the tightest freshness SLA. Document the fact that older partitions can wait longer, and schedule a periodic sweep so cold data does not remain permanently uncompact.

## Verify changes one variable at a time

After changing a trigger or planning strategy, run for several complete cycles and record:

1. Delta commits between completed compactions.
2. Requested-to-inflight and inflight-to-completed duration.
3. Selected file-group count and total I/O.
4. Snapshot latency before and after completion.
5. Streaming batch latency while compaction runs.
6. Remaining log bytes and age.

Use the Spark SQL procedure to inspect compaction state:

```sql
CALL show_compaction(table => 'orders_mor');
```

If requests accumulate, execution is failing or undersized. If compactions complete but snapshot latency keeps rising, the plan is selecting too little work, hot groups are growing faster than they are compacted, or query latency comes from a different source such as small files.

## Avoid common mistakes

Setting only `hoodie.compact.inline.max.delta.commits` does not define a log-size threshold. Likewise, choosing a log-size strategy does not establish wall-clock scheduling. Keep both decisions in the runbook.

Do not enable synchronous inline compaction to fix an async backlog without accepting extra write latency. Do not run an external compactor beside a writer without the required concurrency and external lock configuration. Do not manually delete pending compaction instants.

Finally, keep data-table and metadata-table compaction settings separate. Hudi 1.2 has dedicated metadata-table trigger properties; tuning those does not tune the user table.

## Official Documentation

- [Apache Hudi compaction](https://hudi.apache.org/docs/compaction/)
- [Apache Hudi configurations](https://hudi.apache.org/docs/configurations/)
- [Apache Hudi concurrency control](https://hudi.apache.org/docs/concurrency_control/)
- [Apache Hudi SQL procedures](https://hudi.apache.org/docs/procedures/)

## Conclusion

Tune compaction as a queueing system. Use commit or time controls to schedule plans, use log-size or another planning strategy to prioritize file groups, and cap each wave to protect ingestion. The correct setting is the one that drains logs faster than they arrive while meeting snapshot and read-optimized SLAs.
