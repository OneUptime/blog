# Hadoop Speculation Without Duplicate Side Effects

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Hadoop, MapReduce, Speculative Execution, OutputCommitter, Idempotency, Reliability

Description: Decide when Hadoop speculative execution shortens stragglers, when it wastes capacity, and how to prevent duplicate writes to external systems.

---

Hadoop speculative execution starts another attempt for a task that is progressing unusually slowly. If the new attempt finishes first, MapReduce accepts one successful result and stops or discards the other attempt. This can shorten the long tail caused by a slow host, transient disk contention, or an unlucky process.

It does not make arbitrary task side effects exactly once. Two attempts may run the same mapper or reducer code concurrently, and ordinary task retries can repeat that code even when speculation is disabled. Any call to a database, message broker, HTTP API, or fixed external path must therefore be idempotent or protected by its own commit protocol.

## What Hadoop speculates

A MapReduce **task** is a logical unit of work. A task **attempt** is one execution of that work. Failures already allow several attempts. Speculation adds a concurrent attempt when the ApplicationMaster's estimator considers a running attempt sufficiently slow relative to peers.

Apache Hadoop controls maps and reducers separately:

```xml
<property>
  <name>mapreduce.map.speculative</name>
  <value>true</value>
</property>
<property>
  <name>mapreduce.reduce.speculative</name>
  <value>true</value>
</property>
```

Those are the current upstream defaults. A distribution, cluster policy, or job can override them. Check the effective job configuration in JobHistory rather than assuming the defaults apply.

Only one attempt is allowed to become the accepted task result. For ordinary filesystem job output, the configured `OutputCommitter` coordinates task setup, commit, and abort. That coordination does not automatically cover an external side effect performed inside `map()`, `reduce()`, `setup()`, or `cleanup()`.

## When speculation helps

Speculation is useful when the remaining work is dominated by a small number of accidental stragglers and another node is likely to execute the same work faster. Typical examples include:

- one worker with transient local-disk contention;
- a noisy neighbor temporarily consuming CPU;
- intermittent network or HDFS read latency on one path;
- JVM pauses or a degraded process on one host;
- heterogeneous hardware where an attempt landed on an unusually slow node;
- a large job with many comparable tasks and a small slow tail.

The ideal candidate has many tasks, predictable progress, spare cluster capacity, and deterministic output. The speculative copy is a hedge: it consumes another container now to reduce the probability that one attempt determines the job's finish time.

Measure success in end-to-end terms. Compare job p95 and p99 duration, speculative attempts launched, speculative attempts that win, extra vCore- and memory-milliseconds, and queue impact on other applications. A duplicate that never wins still consumed resources.

## When it does not fix the problem

Speculation cannot repair a deterministic bottleneck that every attempt will encounter:

- a single hot key sends most records to one reducer;
- one input split is much larger than the others;
- reducer code has quadratic behavior for a large value group;
- every attempt waits on the same overloaded database or API;
- a corrupt record deterministically hangs or crashes the code;
- the cluster has no spare container capacity;
- all candidate nodes share the same saturated storage or network path.

For skew, both attempts process the same oversized partition. For a shared dependency, the duplicate can make load worse. For an undersized container, both attempts may fail with the same memory error.

Use task-level input bytes, shuffle bytes, progress rate, logs, and host metrics to distinguish a bad attempt from inherently uneven work. Fix partitioning, input layout, algorithmic behavior, or resource sizing before asking speculation to hide it.

## The duplicate side-effect trap

Consider a reducer that writes a billing record directly to a database:

```java
public void reduce(Text accountId, Iterable<Charge> charges, Context context)
    throws IOException, InterruptedException {
  BigDecimal total = calculateTotal(charges);
  billingClient.createInvoice(accountId.toString(), total);
  context.write(accountId, new Text(total.toPlainString()));
}
```

Two speculative attempts can both call `createInvoice`. The framework may commit only one reducer's filesystem output, but the remote service has already observed two requests. The same duplication can occur when a failed attempt performs the call and then crashes before Hadoop records success.

Risky side effects include:

- `INSERT` statements without a uniqueness key;
- publishing messages with no deduplication identifier;
- incrementing a counter in a remote service;
- sending email, payments, or webhooks;
- writing to a fixed filename outside the task work path;
- appending to a shared object or file;
- acquiring a lease whose owner is not the task attempt;
- invoking a non-idempotent REST endpoint.

Disabling speculation reduces concurrent duplicates but does not remove retry duplicates. Map and reduce attempt retries are a core fault-tolerance mechanism. Design for at-least-once execution of task code.

## Safe output patterns

### Let the OutputCommitter own job output

Write normal results through `Context.write()` and a suitable `OutputFormat`. The `OutputCommitter` API provides `setupTask`, `needsTaskCommit`, `commitTask`, and `abortTask`. The standard file output path uses temporary attempt work and promotes accepted output during commit.

For side files associated with normal filesystem output, use the task work output path exposed by the file output classes instead of constructing a shared final path. The MapReduce tutorial specifically documents task side-effect files and the attempt work directory.

Commit behavior depends on the filesystem and committer implementation. Validate the committer selected for HDFS or an object store; do not assume a rename-based HDFS design has identical cost or atomicity on every connector.

### Stage, then publish once

For an external sink, split calculation from publication:

1. MapReduce writes deterministic records to committed job output.
2. A separate publisher reads the successful job output.
3. The publisher applies idempotent upserts or transactions using stable keys.
4. A completion record marks the dataset version as published.

This turns task attempts into pure computation and gives the external commit a clear job-level boundary.

### Use stable idempotency keys

When a task must call an external API, derive the key from business identity and input version, not from `TaskAttemptID`. Two attempts have different attempt IDs but represent the same logical work.

```text
idempotency_key = sha256(
  job_input_version + account_id + billing_period
)
```

Enforce that key at the sink with a unique constraint, conditional write, transactional outbox, or API-supported idempotency token. “Check then insert” without a transaction is still racy when attempts run concurrently.

### Keep attempt-local diagnostics attempt-local

If each attempt must emit debugging artifacts, include the full attempt ID in the diagnostic path and treat the files as disposable. Do not later count those artifacts as one-per-task business records.

## Configure speculation per job

Disable both forms for a job whose code has unsafe effects:

```java
Configuration conf = new Configuration();
conf.setBoolean("mapreduce.map.speculative", false);
conf.setBoolean("mapreduce.reduce.speculative", false);

Job job = Job.getInstance(conf, "publish-invoices");
```

Or disable only the unsafe stage:

```java
job.setMapSpeculativeExecution(true);
job.setReduceSpeculativeExecution(false);
```

A read-transform map stage can be safe to speculate while a reducer integrating with a legacy sink is not. Prefer job-specific settings over changing a cluster-wide default for one workload.

The current default configuration also exposes caps and estimator thresholds, including:

```text
mapreduce.job.speculative.speculative-cap-running-tasks = 0.1
mapreduce.job.speculative.speculative-cap-total-tasks   = 0.01
mapreduce.job.speculative.minimum-allowed-tasks        = 10
mapreduce.job.speculative.slowtaskthreshold            = 1.0
```

These properties constrain how aggressively the ApplicationMaster speculates. Treat them as expert settings. An estimator needs enough comparable task progress to recognize a straggler; small or highly variable jobs provide weak evidence. Tuning a threshold cannot make non-idempotent code safe.

## Prove whether speculation is valuable

In JobHistory, compare the logical task count with `TOTAL_LAUNCHED_MAPS` and `TOTAL_LAUNCHED_REDUCES`, then inspect killed and successful attempts. For each speculative attempt, record:

- which attempt won and how much time it saved;
- source and destination hosts;
- input or shuffle size;
- progress curves and GC time;
- extra container resource time;
- any external calls performed by both attempts.

Run controlled tests with speculation enabled and disabled against the same input and comparable queue load. Also inject an attempt failure after an external write. That test catches duplicate behavior caused by retries, which a speculation-only test misses.

Before enabling speculation, answer:

- Is task output deterministic for a fixed input?
- Does every write go through a committer or an idempotent sink?
- Can two attempts safely run concurrently?
- Are stragglers attempt-specific rather than data-specific?
- Is spare capacity available without harming higher-priority work?
- Can monitoring identify duplicate external operations?

If any side effect cannot tolerate replay, redesign the write path or keep speculation disabled for that stage while the redesign is pending.

## Official Documentation

- [Apache Hadoop MapReduce Tutorial](https://hadoop.apache.org/docs/current/hadoop-mapreduce-client/hadoop-mapreduce-client-core/MapReduceTutorial.html)
- [Apache Hadoop MapReduce Default Configuration](https://hadoop.apache.org/docs/current/hadoop-mapreduce-client/hadoop-mapreduce-client-core/mapred-default.xml)
- [Apache Hadoop `OutputCommitter` API](https://hadoop.apache.org/docs/current/api/org/apache/hadoop/mapreduce/OutputCommitter.html)
- [Apache Hadoop `Job` API](https://hadoop.apache.org/docs/current/api/org/apache/hadoop/mapreduce/Job.html)
- [Apache Hadoop `JobCounter` API](https://hadoop.apache.org/docs/current/api/org/apache/hadoop/mapreduce/JobCounter.html)

## Conclusion

Speculative execution is a tail-latency hedge, not an exactly-once guarantee. It helps when one attempt is accidentally slow and the same task can finish faster elsewhere. It wastes capacity when the work itself is skewed, and it can duplicate any effect outside the configured output commit protocol. Keep task computation deterministic, publish through committers or idempotent sinks, and judge speculation by measured time saved versus resources and risk added.
