# Diagnose an Unexpected Cloud Run Bill

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cloud Run, Google Cloud, Billing, Performance, Monitoring

Description: Trace Cloud Run spending to billable resource time, minimum instances, concurrency, networking, and adjacent services before tuning costs.

---

An application receives only a modest number of requests, yet its Google Cloud bill rises sharply. Request count alone is a poor cost model. The service may keep instances running, allocate more CPU or memory than it needs, transfer large responses, or create charges in products outside Cloud Run.

Investigate the invoice dimensions first. Changing concurrency before identifying the expensive SKU can reduce throughput without touching the real source of spending.

## Start with the billed service and SKU

Open Cloud Billing Reports for the affected billing account and project. Use a precise date range covering the change, then group by service and SKU. Compare an earlier period with a similar traffic pattern. Billing Reports supports these views and filters. [Analyze costs with Billing Reports](https://docs.cloud.google.com/billing/docs/how-to/reports).

Capture usage quantity, units, gross cost, credits, and net cost separately. An expired credit can increase net spending while usage remains unchanged. Also distinguish the usage period from an invoice month, particularly when investigating an adjustment.

Create a small investigation table:

| Observation | Next evidence to collect |
| --- | --- |
| CPU or memory usage rises | Billing mode, instance lifetime, resources, request duration |
| Request charges rise | Actual requests, retries, scheduled traffic, bots |
| Network costs rise | Bytes transferred, destinations, routes, cache effectiveness |
| Another service dominates | Cloud Build, Artifact Registry, Logging, NAT, load balancer, database |

This is an analysis checklist, not a claim that every listed charge appears in every deployment.

## Reconstruct resource time

For an approximate comparison, use billable instance time rather than summing request durations. Overlapping requests can share one instance's allocated resources.

```text
Approximate CPU usage = sum(allocated vCPU × billable instance seconds)
Approximate memory usage = sum(allocated GiB × billable instance seconds)
```

Apply the current rates and applicable billing rules from the pricing page. Region, billing mode, free-tier treatment, commitments, and other features can change the final amount. Avoid treating this simple equation as an invoice calculator. [Cloud Run pricing](https://cloud.google.com/run/pricing).

For example, a service with two allocated vCPUs does not pay only for the fraction its application actively uses. If one single-threaded operation needs one core, allocating more cores may still be necessary for a memory configuration, but the unused capacity remains part of the cost investigation.

Look at resource allocation and utilization together. Low average CPU utilization alone does not justify reducing CPU if latency spikes require that capacity.

## Inspect billing and minimum-instance settings

Read the current configuration:

```bash
gcloud run services describe checkout-api \
  --project=example-project \
  --region=us-central1 \
  --format=export
```

Inspect the billing mode, service-level and revision-level minimum instances, memory, CPU, traffic split, and sidecars. For an older billing period, use deployment history and audit logs; the current settings may differ from the expensive revision.

Request-based and instance-based billing account for instance lifetime differently. Instance-based billing charges throughout the lifecycle. Minimum instances can create idle costs even for a request-based service. [Cloud Run billing settings](https://docs.cloud.google.com/run/docs/configuring/billing-settings), [minimum-instance billing](https://docs.cloud.google.com/run/docs/configuring/min-instances).

Review every revision configured with a minimum. An old tagged revision can matter, especially when revision-level minimum settings keep it warm. Do not assume the main production traffic percentage describes all warm capacity.

A minimum instance can be justified by a latency objective. Calculate the cost of that objective explicitly, then test whether a smaller minimum meets it. Removing warm capacity without measuring startup latency merely exchanges one problem for another.

## Examine concurrency and duration together

If an I/O-heavy service permits only one request per instance, many mostly waiting instances may be needed. Higher concurrency can let requests share resources, but only if the application, database pools, and memory budget support it.

For a CPU-heavy transformation, increasing concurrency can instead make every request take longer. That can increase resource time, queueing, and retries. The correct comparison measures successful work completed per allocated resource unit at an acceptable latency.

Use a staging experiment with one representative load profile and change one setting at a time. Record throughput, tail latency, error rate, active instances, memory, and database load. The [Cloud Run concurrency guide](https://docs.cloud.google.com/run/docs/about-concurrency) explains how concurrent requests share an instance; it does not prescribe one universally cheapest value.

Also inspect timeouts and retries. If a caller times out after the server commits work, a retry can repeat expensive processing unless the operation is idempotent.

## Follow networking costs beyond the service

Measure response bytes and downstream transfer volume. A small JSON endpoint and a file-download endpoint can have equal request counts with very different networking costs.

Trace whether traffic crosses regions, exits to the internet, passes through Cloud NAT, or uses a load balancer. A VPC connector can have its own compute costs. Cloud Build and Artifact Registry can grow after a CI change even when application traffic is flat.

For cacheable content, inspect the actual cache hit ratio and cache-control behavior. Adding a cache does not save transfer if responses remain uncacheable or every request uses a unique cache key.

## Add controls that match the finding

After locating the driver, choose a measurable action: right-size resources, revise warm capacity, reduce unnecessary retries, fix excessive logging, or change data placement. Use labels consistently so future cost reviews can map workloads to owners.

Distinguish notification budgets from explicit enforcement. Current Cloud Run documentation describes Preview budget spend caps that can pause workloads. Review that feature's scope and availability before using it; do not assume a budget alert alone is an application spending cutoff. [Cloud Run budget spend caps](https://docs.cloud.google.com/run/docs/configuring/billing-settings).

A maximum-instance setting is also an operational capacity control, not a complete cap on all products in the architecture.

## Conclusion

Explain the increased bill in billed units before tuning the service. Connect those units to instance lifetime, allocation, request behavior, and network paths. Then verify a targeted change against both cost and service quality, using the invoice as evidence and application metrics as the explanation.

## Official Documentation

- [Cloud Billing Reports](https://docs.cloud.google.com/billing/docs/how-to/reports)
- [Cloud Run pricing](https://cloud.google.com/run/pricing)
- [Cloud Run billing settings](https://docs.cloud.google.com/run/docs/configuring/billing-settings)
- [Minimum instances](https://docs.cloud.google.com/run/docs/configuring/min-instances)
- [Cloud Run concurrency](https://docs.cloud.google.com/run/docs/about-concurrency)
