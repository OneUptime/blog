# How to Diagnose Cloud Run `The Request Was Aborted Because There Was No Available Instance`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Google Cloud, Cloud Run, Autoscaling, Observability, Performance

Description: Distinguish Cloud Run 429 and 500 instance-availability failures, correlate scaling metrics, and fix the actual capacity bottleneck.

---

Cloud Run can log this message while serving traffic:

```text
The request was aborted because there was no available instance.
```

The response status is essential context. Google documents a `429` form when the service reaches its maximum instance limit or otherwise cannot scale to incoming requests. A `500` form means Cloud Run could not manage the traffic rate, including cases where the configured maximum has not been reached.

Do not treat the phrase as proof of one cause. Correlate the status, instance count, startup latency, request duration, concurrency, application errors, and traffic shape over the same short time window.

## Find the affected responses

Start by finding the affected log entries for the service:

```bash
PROJECT_ID='example-run-project'
REGION='us-central1'
SERVICE='checkout-api'

LOG_FILTER="resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${SERVICE}\" AND resource.labels.location=\"${REGION}\" AND SEARCH(\"\`The request was aborted because there was no available instance\`\")"

gcloud logging read "${LOG_FILTER}" \
  --project="${PROJECT_ID}" \
  --limit=100 \
  --format=json
```

When the filter has no timestamp restriction, `gcloud logging read` defaults to entries from the preceding day. Add explicit `timestamp` bounds to `LOG_FILTER` for an older incident.

After identifying the incident timestamps, inspect surrounding request, system, and container logs over the same narrow window for related failures.

For each event, record:

- `httpRequest.status`, especially `429` versus `500`, and the documented billing-recovery `503` exception.
- The revision and timestamp.
- Whether traffic jumped suddenly.
- Application errors, failed startup or readiness probes, and container exits near that time.

Use Cloud Monitoring at a fine resolution around the incident. Google specifically notes that a short traffic or latency spike may only be visible when zoomed to approximately 10-second resolution.

## Inspect the deployed scaling configuration

Export the current service configuration without changing it:

```bash
gcloud run services describe "${SERVICE}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --format=export
```

The service export shows the current service-level settings and current revision template. Describe the revision named in the failed request rather than assuming the latest revision received all traffic:

```bash
REVISION='checkout-api-00042-abc'

gcloud run revisions describe "${REVISION}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --format=yaml
```

Review the scaling mode, maximum concurrent requests, CPU, memory, request timeout, startup CPU boost, and probes. For automatic scaling, review both service-level and revision-level maximum and minimum instance settings. For manual scaling, review the fixed service instance count; revision-level minimum and maximum settings are ignored for revisions receiving traffic. For an older incident, use Admin Activity audit logs if mutable service-level scaling or traffic settings might have changed since the failure.

In Cloud Monitoring, compare at least these signals:

- The capacity allocated to the affected revision. With automatic scaling, compare its container instance count against its effective maximum: the lower of its revision-level maximum and its allocation from any service-level maximum. With manual scaling, compare against its proportional share of the fixed service instance count. A revision can exhaust its traffic-split allocation before the service-wide instance count reaches the configured service capacity.
- Request logs and response-code distribution. The revision request-count metric excludes some requests that never reach a container, including requests rejected at a maximum-instance limit.
- Pending request latency and end-to-end request latency.
- Container startup latency.
- CPU and memory utilization.
- Per-instance concurrency and application dependency latency.

A dashboard that averages over several minutes can hide the burst that exhausted the pending queue.

The container instance-count metric is sampled every 60 seconds, and Cloud Run can temporarily exceed a configured maximum during spikes, replacements, or deployments. Not seeing an exact plateau at the limit does not by itself rule out that limit.

## Interpret HTTP 429

For the documented `429` case, first check whether the affected revision exhausted its relevant capacity allocation. Cloud Run queues requests while it waits for capacity. Requests can remain pending for up to 3.5 times the service's average startup time or 10 seconds, whichever is greater. If no instance becomes available within the applicable window, the request is rejected.

If the configured capacity is the bottleneck, raising the applicable automatic-scaling limit or manual instance count can help only when the project has quota and downstream systems can accept the additional parallel load. Check database connection limits, third-party rate limits, regional quotas, and cost controls before increasing it.

If the evidence does not support configured capacity as the cause, investigate slow or failing startups, a sudden burst faster than instances can become ready, long request processing, high application error rates, and quota or billing conditions.

## Interpret HTTP 500

For the documented `500` form, Cloud Run could not manage the incoming rate even though the configured maximum might not have been reached. Investigate the same short-lived traffic, startup, processing-time, and application-error signals.

Clients can retry requests that are safe to retry by using exponential backoff and jitter. Do not blindly retry non-idempotent operations because doing so can duplicate a write after an ambiguous failure.

If evidence shows a transient period attributable solely to Cloud Run and the application, quotas, and configuration are healthy, Google's troubleshooting guidance recommends contacting Cloud Customer Care with service, region, revision, timestamps, request statuses, and relevant log references.

## Choose the fix that matches the evidence

### Reduce startup latency

Remove unnecessary initialization from the request-serving path, reduce dependency-loading work, configure startup probes correctly, and evaluate startup CPU boost. A minimum-instance setting can reduce cold starts, but it incurs cost and does not replace capacity planning.

### Tune concurrency deliberately

Higher concurrency can reduce the number of instances needed, but only if the application can process requests in parallel without CPU, memory, connection-pool, or thread-safety bottlenecks. Lower concurrency can improve latency for CPU-heavy or single-threaded workloads but can require faster scale-out and more instances. Load test the actual container before changing it.

### Shorten request processing

Optimize slow handlers and dependencies. Move work that does not need to finish in the HTTP response to a durable asynchronous system. Long requests keep concurrency slots occupied and make traffic bursts harder to absorb.

### Raise the maximum safely

Increase maximum instances only after checking Cloud Run quotas, downstream capacity, and spend controls. Set alerts before the new ceiling is reached and document why the limit exists.

### Protect downstream services

Use bounded connection pools, timeouts, circuit breakers, and admission control. Unbounded scale can move the outage from Cloud Run to a database or third-party API.

## Validate under controlled load

Apply a revision-scoped change by deploying a new revision. Service-level scaling changes take effect without a new revision, so record the previous setting for rollback before applying them. In either case, test a representative ramp and burst and compare response codes, pending latency, startup latency, instance count, application latency, and downstream saturation. When validating a new revision, send only a controlled share of production traffic until the new behavior is understood.

Also check the Cloud Run known-issues page, Personalized Service Health for project-specific incidents, and the public Google Cloud Service Health dashboard for broader platform events. After billing is re-enabled or a spend cap is lifted, the same instance-availability message can accompany `429` or `503` responses for up to 30 minutes.

## Official Documentation

- [Troubleshoot no available Cloud Run instances](https://cloud.google.com/run/docs/troubleshooting#429-max-instances)
- [Cloud Run instance autoscaling and pending requests](https://cloud.google.com/run/docs/about-instance-autoscaling)
- [Configure maximum instances](https://cloud.google.com/run/docs/configuring/max-instances)
- [Configure minimum instances](https://cloud.google.com/run/docs/configuring/min-instances)
- [Configure maximum concurrency](https://cloud.google.com/run/docs/configuring/concurrency)
- [Monitor Cloud Run](https://cloud.google.com/run/docs/monitoring)
- [Cloud Run metrics reference](https://cloud.google.com/monitoring/api/metrics_gcp_p_z#gcp-run)
- [Cloud Run known issues](https://cloud.google.com/run/docs/known-issues)

## Conclusion

The instance-availability message is a symptom, not a complete diagnosis. Separate its general `429` and `500` forms, account for the documented billing-recovery `503` exception, inspect short-window scaling and application signals, and determine whether the constraint is configured capacity, startup, concurrency, processing time, errors, or a transient platform condition. Change only the limiting component and verify it under controlled load.
