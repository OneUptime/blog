# Groundcover at Scale: ClickHouse Failures, Backpressure, and Telemetry Loss

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Groundcover, ClickHouse, eBPF, OpenTelemetry, Backpressure, Observability, Reliability

Description: Learn where Groundcover telemetry can queue, fail, or be lost when ClickHouse slows down, and build a practical detection and recovery plan.

---

A full telemetry pipeline is only as reliable as its least visible boundary. An agent can observe a request correctly while the storage backend is unable to persist it. The UI may then show a gap even though collection itself never stopped.

Groundcover documents ClickHouse as the store for logs, traces, and Kubernetes events. Metrics take a separate path into VictoriaMetrics. That distinction is the starting point for diagnosing a Groundcover incident at scale: a ClickHouse failure does not automatically imply that metrics are missing, and healthy metrics do not prove that logs and traces were stored.

This article separates documented architecture from operational inference. Groundcover does not publicly document every queue, acknowledgement point, retry duration, or overflow policy inside its managed pipeline. Verify those details with Groundcover for your deployed version before treating them as guarantees.

## Map the Persistence Path

The [Groundcover architecture overview](https://docs.groundcover.com/architecture/overview) describes sensors running as a DaemonSet, Vector components used for log and trace transformations, ClickHouse for logs, traces, and events, and VictoriaMetrics for metrics. In a BYOC deployment, the observability backend runs in the customer's cloud environment.

For operational analysis, split the path into boundaries:

1. The sensor observes or receives telemetry.
2. A local or intermediate component transforms and batches it.
3. In Groundcover's documented BYOC flow for logs, traces, and events, aggregation components write data to object storage for asynchronous transfer to the managed backend.
4. The storage writer attempts an insert.
5. ClickHouse completes the insert according to its configured table engine, replication or quorum, and filesystem-sync behavior.
6. Older eligible data may later be offloaded to object storage.

Only the broad component roles and object-storage transfer are documented. The sequence above is a useful failure model, not a claim about Groundcover's exact internal acknowledgements. Ask which boundary increments an accepted counter, how long each queue survives, whether a restart preserves it, and what happens when it fills.

## How ClickHouse Backpressure Develops

MergeTree-family tables store inserted data in parts and merge those parts in the background. ClickHouse's guidance warns that many small synchronous inserts can create parts faster than the merge process can consolidate them. When the active part count in a partition exceeds the configured `parts_to_throw_insert` threshold, ClickHouse can reject inserts with `TOO_MANY_PARTS`.

Storage pressure can also come from exhausted disk space, slow volumes, unavailable replicas, expensive transformations, or an ingestion rate that exceeds the backend's sustained capacity. The outward symptom is often higher insert latency before outright failures begin.

What happens next depends on the writer. It may wait, retry, place work in a bounded queue, spill to disk, or drop records. Those are general backpressure patterns, not documented Groundcover behavior. A bounded queue protects the node but eventually overflows. An effectively unbounded queue can instead convert a prolonged ingestion incident into a memory or disk incident.

ClickHouse recommends batching inserts or using asynchronous inserts for small-write workloads. Its documentation also recommends waiting for an asynchronous flush before acknowledging success when durability matters. Do not assume Groundcover uses a particular ClickHouse version or those settings, and do not change a managed BYOC backend directly without a supported procedure.

## A Storage Failure Is Signal-Specific

Use this matrix before declaring a platform-wide outage:

| Signal | Documented primary store | Likely symptom during ClickHouse trouble |
| --- | --- | --- |
| Logs | ClickHouse | Delayed searches, recent gaps, or failed ingestion |
| Traces | ClickHouse | Missing recent traces or increased indexing delay |
| Kubernetes events | ClickHouse | Gaps in event history |
| Metrics | VictoriaMetrics | May remain healthy unless the incident has a shared cause |

The last column is an operational expectation, not a product guarantee. A shared volume, node, network, or resource shortage can affect both storage systems. Test each signal independently with a known canary.

## When Does Backpressure Become Loss?

Delayed data is not yet lost. Data becomes irrecoverable when no durable copy remains anywhere in the path. Common loss boundaries include:

- the process exits while records exist only in memory;
- a bounded sending queue fills and rejects new records;
- a retry deadline expires while storage remains unavailable;
- an operator deletes a queue or volume during recovery;
- the source itself has no replay mechanism after an unsuccessful export.

The OpenTelemetry Collector documentation makes the same general point: an undersized Collector or an unavailable destination can cause drops, while sending queues and retry policies only provide finite protection. This applies directly to an external OpenTelemetry Collector path configured with those mechanisms. It is also a useful model for Groundcover, but it does not prove the product's internal queue implementation.

Groundcover's [disaster recovery documentation](https://docs.groundcover.com/architecture/byoc/disaster-recovery) describes daily volume snapshots and object-storage offload for older logs, traces, and events. Those facilities can recover only data captured by a snapshot or retained in object storage. They cannot reconstruct telemetry that never reached either recovery source. The same documentation says object storage is not used for metrics, so metric recovery has a different boundary.

## Detect the Gap Before the UI Does

Monitor the pipeline, not just ClickHouse CPU:

- compare records observed, accepted, retried, dropped, and persisted at every exposed boundary;
- alert on queue utilization, queue age, retry rate, and oldest pending item;
- watch ClickHouse insert latency, insert errors, part counts, merge pressure, disk latency, and free space;
- track end-to-end freshness for logs, traces, events, and metrics separately;
- emit a low-volume canary with a unique ID and verify that it becomes queryable;
- reconcile application request counts with stored trace counts only after accounting for sampling;
- record backend restarts and configuration changes next to ingestion graphs.

An end-to-end canary is especially valuable. Internal health checks can be green while data is stuck between two healthy components. A canary proves both ingestion and queryability.

## Incident Runbook

Start by determining scope and time. Query each signal for a known workload, note the last visible timestamp, and check whether the gap is global or isolated to a cluster, node, namespace, or source.

Next, preserve evidence. Capture pod states, restart counts, storage events, backend logs, queue metrics, and ClickHouse errors. Avoid repeatedly restarting ingestion components because a restart may discard an in-memory queue. Whether that risk applies to your installation is one of the facts to confirm with support.

Then stabilize the system:

1. Stop nonessential configuration changes and bulk imports.
2. Check persistent volume capacity, latency, and attachment health.
3. Reduce optional telemetry using documented filters or sampling controls if the backend is still falling behind.
4. Escalate to Groundcover with the deployed version and exact failure window.
5. Follow the supported recovery procedure for the managed storage components.

Do not run `OPTIMIZE TABLE ... FINAL` as a generic cure. ClickHouse explicitly explains that forced final merges are resource intensive and can ignore normal merge safeguards. It can make a pressured system worse. Likewise, do not alter merge thresholds, insert settings, or table schemas unless Groundcover supports the change.

After service recovers, wait for queues to drain and watch their age, not only their depth. Query the canary across the incident window, compare source-side and destination-side counts, and label any confirmed missing interval. A dashboard returning results again proves recovery, not completeness.

## Design for a Known Recovery Objective

Capacity planning should use peak sustained ingest, not a daily average. Include deployment bursts, incident-driven log amplification, trace payload size, retention, merge overhead, and enough headroom for catch-up after an outage. Load tests should exercise the entire write and query path.

Finally, document the unanswered questions as part of the service contract:

- Which component acknowledges each signal, and after what durability event?
- Are queues memory-backed or disk-backed, and what are their limits?
- How long are retries attempted, and which errors are retryable?
- Which drop and retry counters are exposed?
- Can a source replay a failed interval?
- What is the supported procedure for a full ClickHouse volume or excess parts?

Telemetry loss is manageable when its boundaries are explicit. Treat ClickHouse health, pipeline buffering, and end-to-end persistence as three separate concerns, then validate all three during normal operation and after every incident.

## Official Documentation

- [Groundcover architecture overview](https://docs.groundcover.com/architecture/overview)
- [Groundcover high availability](https://docs.groundcover.com/architecture/byoc/high-availability)
- [Groundcover disaster recovery](https://docs.groundcover.com/architecture/byoc/disaster-recovery)
- [Groundcover querying documentation](https://docs.groundcover.com/use-groundcover/querying-your-groundcover-data)
- [ClickHouse guidance on avoiding excessive parts and `OPTIMIZE FINAL`](https://clickhouse.com/resources/engineering/clickhouse-optimize-table-final)
- [ClickHouse asynchronous inserts](https://clickhouse.com/docs/optimize/asynchronous-inserts)
- [ClickHouse transactional insert guarantees](https://clickhouse.com/docs/guides/developer/transactional)
- [OpenTelemetry Collector troubleshooting](https://opentelemetry.io/docs/collector/troubleshooting/)
- [OpenTelemetry Collector resiliency](https://opentelemetry.io/docs/collector/resiliency/)
- [OpenTelemetry Protocol specification](https://opentelemetry.io/docs/specs/otlp/)
