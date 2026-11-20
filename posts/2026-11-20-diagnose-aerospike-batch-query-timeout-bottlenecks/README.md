# Diagnose Aerospike Batch and Query Timeout Bottlenecks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Aerospike, Performance, Troubleshooting, Database

Description: Trace Aerospike batch and query timeouts through client consumption, response queues, storage latency, and hot keys before increasing limits or retries.

A batch request times out even though ordinary reads look fast. A query returns a few records and then fails. Both symptoms can produce a timeout error, but they do not necessarily share a cause.

Treat `AEROSPIKE_ERR_TIMEOUT` as the end of a diagnostic trail, not a diagnosis. Identify the operation, the node involved, and the stage where time accumulated. Only then decide whether to change workload shape, client behavior, capacity, or a timeout policy.

## Describe the operation precisely

A batch combines operations for multiple keys. A query selects records through a primary-index traversal or a secondary-index predicate, depending on the request. A secondary index is an additional structure that helps find records by a bin value rather than by primary key.

Record the client language and version, server version, namespace, operation type, batch size or query predicate, result size, concurrency, and configured deadlines. Keep the exact exception details, including whether the client reports a client-side or server-side timeout. Redact credentials and sensitive record data.

For a query, distinguish time to first result from time to completion. For a batch, record both the number of keys and the bytes returned. A batch of ten large records can behave differently from a batch of a thousand small records. If only one application instance fails, compare its CPU, pauses, connection use, and network path before changing the cluster.

## Capture evidence while the problem is happening

These read-only examples use **Aerospike Admin 5.2.0** against an **Aerospike Database 8.2.0.1** diagnostic target. Commands were checked against the [tagged Admin controller implementation](https://github.com/aerospike/aerospike-admin/blob/5.2.0/lib/live_cluster/show_controller.py). Use the supported tools for your server version; available metrics and histograms vary.

Replace `10.20.0.11` with an approved seed and `test` with your namespace. Add your normal authentication and TLS options. The management client must be able to reach the discovered nodes, not just the seed.

```bash
asadm -h 10.20.0.11 -p 3000 -e "show latencies"
asadm -h 10.20.0.11 -p 3000 -e "show statistics service like batch_index"
asadm -h 10.20.0.11 -p 3000 -e "show statistics namespace for test like fail_key_busy"
asadm -h 10.20.0.11 -p 3000 -e "show jobs queries"
```

Save a baseline and another observation during the failure window, keeping timestamps and node names. Expect per-node latency histograms, batch statistics, the key-busy counter, and tracked query jobs. A finished or very short query may no longer be visible in a job snapshot. The [live-mode command reference](https://aerospike.com/docs/database/tools/asadm/live-mode/) explains the views and their filters.

Counter values usually accumulate over time. Compare their increase over an interval rather than treating an old nonzero value as a new fault. Detect restarts before calculating a rate: a lower second value may mean the counter reset. Queue depth is different; it describes work currently waiting and should not be interpreted as a cumulative error count.

## Follow the request through four possible bottlenecks

```mermaid
flowchart LR
    C[Client submits and consumes results]
    N[Network and connections]
    Q[Server work and response queues]
    S[Record access and storage]
    C --> N
    N --> Q
    Q --> S
    S --> Q
    Q --> N
    N --> C
```

The return path matters. A server can retrieve records quickly but struggle to deliver responses to a client that is not reading them promptly. The following comparisons help narrow the investigation without assuming a particular server setting is at fault.

### 1. Check the client and result consumer

Compare application wall-clock time with server latency. If server operations are fast but application requests are slow, examine connection acquisition, client CPU, garbage collection, event-loop stalls, and result processing. A slow serializer or a callback doing synchronous network work can turn fast database responses into a slow request.

In staging, replace the expensive result consumer with a minimal consumer that counts records and bytes. Preserve the same query and concurrency. If completion improves substantially, investigate the application path before increasing server thread counts. Keep the test bounded so it does not turn into an unplanned full-dataset export.

Also check that result sets and streams are closed according to the client API when a caller cancels. Raising the deadline while leaving abandoned consumers running can increase resource pressure. Aerospike's [connection tuning guide](https://aerospike.com/docs/develop/connection-tuning-guide/) discusses timeout boundaries and connection behavior; apply the settings for the specific operation and client.

### 2. Inspect batch response queues

For batches, compare `batch_index_queue` with changes in `batch_index_timeout`, `batch_index_error`, and the buffer statistics. `batch_index_queue` reports request and response-buffer counts for each queue; it is not a single number of failed records. The [batch management guide](https://aerospike.com/docs/database/manage/cluster/batches/) documents the format and buffer behavior.

Growing queues can reflect more submitted work, slow record access, or slow response delivery. They do not prove that the queue limit is too small. Look for correlation with client consumption, returned bytes, and individual node latency.

Try smaller batches at controlled concurrency in staging. Keep track of both logical records per second and request rate: splitting one batch into ten requests can increase overhead. If larger records create substantial response-buffer churn, reducing returned bins or changing batch composition may help more than enlarging the queue.

Do not raise response-buffer limits without estimating the memory consequence and checking why responses are accumulating. A larger queue can merely allow more work to wait until it expires.

### 3. Correlate storage and query work

Compare per-node read and query latency with device latency, queueing, CPU, network utilization, and migration activity. Use the same time interval. One busy device and a cluster-wide average can tell very different stories.

For a query, inspect the actual predicate and index readiness. A small final result does not prove little work was done: filtering may discard many candidates. Review the selected bins and result size as well as the number of records. Aerospike's [key metrics guide](https://aerospike.com/docs/database/observe/key-metrics/) separates client, batch, and query error metrics so they can be compared in context.

If only one node is slow, investigate that node's device, network, and workload distribution. If every node slows as concurrency rises, test admission limits or workload scheduling before assuming a hardware fault. Do not initiate a rebalance or restart solely to see whether the graph changes.

### 4. Look for concentrated keys

A hot key receives disproportionate traffic. It can overload the node handling its partition even when average cluster utilization looks comfortable. Compare per-node throughput and latency, then examine application access patterns using approved identifiers or digests.

`fail_key_busy` is useful evidence when it grows, but it is not a universal hot-key detector. Stable AP-namespace reads can concentrate on a record without producing `KEY_BUSY`. Write contention and certain consistency or migration cases behave differently. Aerospike's [hot-key diagnostic guide](https://aerospike.com/docs/database/advanced/troubleshoot/hot-keys/) explains those distinctions.

Avoid enabling detailed transaction logging across the whole cluster as a first step. Start with existing counters and application evidence. If detailed logging is necessary, use a short, approved capture on the affected node and restore the previous logging level afterward.

## Turn the evidence into one controlled change

| Evidence | First experiment |
| --- | --- |
| Fast server responses, slow application completion | Simplify result consumption and inspect client pauses |
| Queue growth follows large response volume | Reduce returned bins or batch size at controlled concurrency |
| Query latency follows device pressure | Reduce competing load and investigate storage behavior |
| One key or partition dominates | Reconsider access pattern, caching, or data distribution |
| No overload, deadline is below legitimate operation duration | Revisit the operation-specific deadline |

State the hypothesis and success criteria before the experiment. For example: “Reducing concurrent queries should lower device queueing and final timeout rate while preserving the required records per second.” Compare equivalent workloads, not an idle test against peak production traffic.

Keep partial-result handling separate from performance diagnosis. A timed-out query may already have delivered records, and a batch may contain completed entries. Do not blindly repeat side-effecting work. Preserve per-operation outcomes and use the client's documented retry or resume behavior.

A useful fix improves completion within the application's deadline without hiding lost work, duplicating effects, or creating larger queues. Retain the client and server versions, timestamps, per-node observations, workload shape, and the measured before-and-after result so the next timeout starts with evidence rather than another timeout increase.
