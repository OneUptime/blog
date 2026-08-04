# Showback for Kubernetes Jobs After Their Pods Disappear

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Showback, Batch Job, Prometheus, OpenCost, FinOps, Observability

Description: Preserve identity, runtime, requests, usage, and cost for short-lived Kubernetes Jobs before TTL cleanup removes their Pods and live metrics.

---

A batch Job can finish between two scrapes, be deleted by the TTL controller, and vanish from every current-state dashboard while its node cost remains real. Reconstructing the month from today's Kubernetes API will undercharge batch-heavy teams and overstate generic cluster idle.

The fix is not a longer `kubectl` query. Build a durable job-allocation ledger while objects and telemetry exist, and attach a documented estimate when exact usage was never observed.

## Understand What Disappears

Kubernetes Jobs create Pods and track their completion. A finished Job can set `.spec.ttlSecondsAfterFinished`; when the TTL expires, the controller deletes the Job and its dependent objects, including Pods. The Pod garbage collector also removes terminated Pods under its policies.

Pod names are not durable identities. A replacement can have the same name and a different UID. The canonical identity for cost collection should include:

```text
cluster_id
namespace
job_uid
pod_uid
container_name
attempt_or_completion_index
```

kube-state-metrics reflects current Kubernetes API objects. Its project documentation states that deleted objects are no longer visible on its metrics endpoint. Metrics Server is a lightweight, short-term, in-memory source for the resource metrics API; it is not a historical cost store.

Prometheus can retain samples after a Pod disappears, but only if it scraped them and retained the required labels. A Job shorter than the scrape interval can leave no usable CPU counter series.

## Capture an Immutable Lifecycle Record

Write an append-only record on Pod creation, updates, and terminal completion. Retain:

- cluster, namespace, Pod UID, Job UID, and CronJob UID where applicable;
- controller kind, name, and UID;
- business labels and annotations under an allowlist;
- container image and resource requests;
- node name and provider instance ID;
- scheduled, started, terminated, and deletion timestamps;
- exit status, restart count, and completion index;
- telemetry coverage and source;
- allocation-policy and rate-card versions.

Capture ownership at the event time. A label added to a later Job with the same name must not rewrite the earlier run.

Kubernetes audit events, an API watcher, or a controller can populate this ledger. The exact mechanism is less important than durability, idempotence, and UIDs.

## Match Collection Resolution to Job Duration

For actual CPU, use the increase in a cumulative CPU-seconds counter over the container lifetime. For memory, integrate sampled memory over time. At least two useful CPU counter samples are normally needed to measure an increase.

Choose scrape and storage settings from the shortest job that requires usage-based allocation:

```text
required_scrape_interval < shortest_billable_job_duration
```

That relationship is a design target, not a guarantee. Scheduling delay, exporter discovery, scrape failure, and immediate deletion can still create gaps.

OpenCost's Allocation API defaults to a one-minute resolution and warns that larger resolutions reduce accuracy for short-running workloads. Query and persist completed windows before retention expires. If finance needs a 13-month restatement window, a 15-day Prometheus retention period is not sufficient unless daily allocation outputs are archived separately.

## Use a Source Hierarchy

Assign one quality level to every job-container allocation:

1. **Billing allocation:** provider split cost row identifies the Pod and period.
2. **Measured:** durable lifecycle plus adequate usage samples and reconciled node rates.
3. **Request estimate:** resource request multiplied by observed runtime and the node component rate.
4. **Node-time estimate:** known node and runtime but incomplete container requests.
5. **Unresolved:** identity or runtime is insufficient for a defensible allocation.

Never present levels two through four as equally precise. Include `allocation_quality` and `coverage_ratio` in the showback.

For a request fallback:

```text
estimated_CPU_core_hours
  = requested_CPU_cores * runtime_hours

estimated_memory_GiB_hours
  = requested_memory_GiB * runtime_hours
```

If a container has no request, do not substitute its limit without an approved rule. Route it to a missing-request policy or use measured usage when available.

## Use EKS Split Cost Data Where It Fits

AWS EKS split cost allocation adds Pod-level rows to CUR and documents two CPU and memory records per Pod per hour. It can use requests or telemetry-backed allocation, depending on the enabled preference. Those billing rows can survive after the Kubernetes object is gone and are valuable for retrospective showback.

Still retain the lifecycle ledger:

- split rows do not allocate every load balancer, volume, or control-plane fee;
- workload tags are populated under specific controller conditions;
- data can take time to appear;
- attribution needs a stable mapping to the internal owner;
- retries and recreated names require UID-aware aggregation.

Treat the provider row as a billing source and the ledger as the business-identity source.

## Aggregate Retries Correctly

A Job can create several Pods because of parallelism, indexes, retries, eviction, or node failure. Cost all actual Pod attempts, including failed ones, then aggregate to the Job:

```text
job_cost = sum(cost_of_every_pod_attempt)
```

Do not keep only the successful Pod. Failed attempts consumed capacity and are often the optimization signal. Preserve `completion_index`, Pod UID, status, and failure reason so users can distinguish required parallel work from retry waste.

For CronJobs, use CronJob UID plus the child Job UID and scheduled timestamp. Grouping only by a generated name is vulnerable to retention and name reuse.

## Do Not Misuse the Pushgateway

Prometheus documents the Pushgateway as appropriate only for limited service-level batch-job outcomes and warns that pushed series persist until explicitly deleted. It is useful for outcomes such as last success time, not as a general replacement for node and container resource accounting.

Pushing one final `job_used_cpu` gauge from an application does not automatically equal cgroup CPU consumption, and stale high-cardinality series can outlive Jobs. Keep infrastructure resource metrics in the cluster telemetry pipeline and use the lifecycle ledger for durable identity.

## Reconcile to Node Cost

For each node interval:

```text
node_cost
  = long_running_workload_cost
  + short_lived_job_cost
  + platform_cost
  + idle_cost
  + unresolved_cost
```

As capture improves, cost should move from idle or unresolved into short-lived jobs without changing total node cost. A pipeline that simply adds recovered job estimates on top of an already-allocated node total double counts.

## Operational Controls

- Emit an alert when a Job finishes with no lifecycle record.
- Compare discovered Job Pods with archived Pod UIDs.
- Track the percentage with sufficient CPU and memory samples.
- Ensure terminal records are idempotent under repeated watch events.
- Retain source records longer than the showback correction window.
- Test zero-second TTL Jobs and Jobs shorter than one scrape.
- Include failed and evicted attempts.
- Keep estimated cost in the same node-cost control, not an extra pool.
- Verify labels against the creation-time snapshot.

## Official Documentation

- [Kubernetes: Jobs, terminal state, and TTL cleanup](https://kubernetes.io/docs/concepts/workloads/controllers/job/)
- [Kubernetes API: Job ttlSecondsAfterFinished](https://kubernetes.io/docs/reference/kubernetes-api/batch/job-v1/)
- [Kubernetes: Pod lifecycle, UID, and garbage collection](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Kubernetes: Short-term resource metrics pipeline](https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-usage-monitoring/)
- [kube-state-metrics: Current-state behavior for deleted objects](https://github.com/kubernetes/kube-state-metrics)
- [OpenCost: Allocation API resolution for short-running workloads](https://opencost.io/docs/integrations/api/)
- [Prometheus: When to use the Pushgateway](https://prometheus.io/docs/practices/pushing/)
- [AWS Data Exports: EKS split cost allocation row behavior](https://docs.aws.amazon.com/cur/latest/userguide/split-cost-allocation-data.html)

## Conclusion

Short-lived Jobs need durable identity and interval records before TTL and garbage collection remove their objects. Prefer provider split costs or adequately sampled usage, fall back to requests times runtime with an explicit quality flag, and cost every retry. Recovered batch cost must move out of the same node idle pool so the cluster still reconciles.
