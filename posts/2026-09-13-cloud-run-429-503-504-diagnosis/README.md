# Distinguish Cloud Run 429, 503, and 504 Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cloud Run, Google Cloud, Troubleshooting, Monitoring, Performance

Description: Use request logs, container lifecycle events, latency, and revision settings to distinguish saturation, container failure, and request deadlines.

---

A chart showing more HTTP errors is the start of a Cloud Run investigation. It is not a diagnosis. A `503` can come from an application, an interrupted container connection, or a different layer in front of the service. A `504` can reflect the Cloud Run request deadline or an upstream proxy deadline.

Find who generated one failing response and reconstruct its timeline. Then group similar failures by revision and symptom before changing scaling or timeouts.

## Collect one complete request

Preserve the client timestamp, destination hostname, path, HTTP status, latency, and request or trace identifier. Record whether traffic passes through a load balancer, gateway, or CDN.

Search Cloud Logging with a service and time range:

```text
resource.type="cloud_run_revision"
resource.labels.service_name="checkout-api"
timestamp>="2026-09-13T10:00:00Z"
timestamp<"2026-09-13T10:10:00Z"
(httpRequest.status=429 OR
 httpRequest.status=503 OR
 httpRequest.status=504)
```

These timestamps are illustrative. First inspect request logs, then include system and application logs around the same event. Cloud Run collects request, container, and system logs with different purposes; a missing application completion line does not by itself show that the request never entered the process. [Cloud Run logging](https://docs.cloud.google.com/run/docs/logging).

Check whether your own code intentionally emits one of these statuses. A rate-limiting middleware response should not be treated as platform autoscaling failure.

## Recognize the saturation pattern

Cloud Run documents `429` responses when no instance is available, including when scaling cannot keep up or the configured maximum is reached. It also documents a `500` variant for failures to manage traffic growth. Consequently, a search limited to `429` can miss related failures. [Cloud Run serving errors](https://docs.cloud.google.com/run/docs/troubleshooting#serving).

Look for the platform message, then correlate:

- A burst in incoming requests.
- Longer application processing time.
- Slow new-instance startup.
- Instance counts near a configured limit.
- A dependency bottleneck that leaves requests occupying slots.

A useful approximation is that more time per request requires more simultaneous capacity at the same arrival rate. If the database becomes slow, Cloud Run can appear saturated even though inbound traffic has barely changed.

Raising the maximum can help only if downstream systems can accept the additional connections and work. Increasing concurrency can help only if existing instances have capacity. Choose the setting after measuring the bottleneck, rather than treating both as interchangeable ways to remove `429`.

## Investigate 503 as an interrupted serving path

If a request reached a container and then failed, inspect process exits, out-of-memory messages, failed probes, and framework worker timeouts. Cloud Run documents `503` cases involving malformed responses or connection errors, and memory failures can produce `500` or `503`. [Container and connection failures](https://docs.cloud.google.com/run/docs/troubleshooting#malformed-response-or-connection-error).

Describe the affected revision, not merely the latest service template:

```bash
gcloud run revisions describe REVISION_NAME \
  --project=example-project \
  --region=us-central1 \
  --format=yaml
```

Compare its memory, CPU, concurrency, container command, and probe settings with a working revision. A worker killed after 30 seconds by its own framework cannot be repaired by setting Cloud Run's deadline to ten minutes.

A memory chart can miss a brief allocation peak immediately before a process dies. System logs and application measurements around large uploads or decompression are useful corroborating evidence. A single large payload may explain failures more accurately than average traffic volume.

If failures cluster around deployment, check startup and shutdown behavior. The application should become ready before accepting useful work, stop accepting new work during shutdown, and handle interruptions safely. Do not disable health checks merely because they expose a blocked process.

## Locate the 504 deadline

Cloud Run service requests have a configurable deadline, with a default of five minutes and a maximum of sixty minutes. If that deadline expires, Cloud Run returns a timeout response; the application may continue working afterward. [Cloud Run request timeout](https://docs.cloud.google.com/run/docs/configuring/request-timeout).

Measure elapsed time instead of recognizing only the status. A repeatable failure near 30 seconds while Cloud Run is configured for 300 seconds suggests another timeout. Compare the client, proxy, framework, and downstream deadlines.

For Cloud Run behind a serverless NEG, do not assume that a generic backend-service timeout setting controls the request. Google documents specific limitations for serverless NEG backends. [Serverless NEG limitations](https://docs.cloud.google.com/load-balancing/docs/negs/serverless-neg-concepts#limitations).

Set the application's work budget below the outer request deadline and give downstream calls smaller bounded timeouts. That lets the application return a controlled error before the connection disappears. Streaming output can provide progress but does not remove Cloud Run's request deadline.

## Use a decision table after reading the logs

| Evidence | First investigation |
| --- | --- |
| Platform no-available-instance message with burst or long waits | Scaling, startup, request occupancy, downstream capacity |
| Process exit, OOM, failed probe, or worker timeout | Container health and resource behavior |
| Failure at a repeatable configured deadline | Timeout hierarchy and cancellation |
| Application logs its own 429 or 503 response | Application admission or dependency policy |
| Client failure without a matching Cloud Run request | Upstream path, destination, and logging coverage |

The rows describe evidence patterns, not one-to-one status guarantees. Several can happen in the same incident. For example, a slow dependency can create queueing, then timeouts, then aggressive retries that increase saturation.

## Validate the correction under the original trigger

Repeat the problematic workload in staging with bounded load. For saturation, include burst shape and request duration. For memory failures, include the largest representative payload. For timeout fixes, simulate slow dependencies and verify that cancellation or replay remains safe.

Compare successful completion rate and tail latency, not just disappearance of one status code. A change that converts `429` into a database outage has not solved the capacity problem.

## Conclusion

Classify errors using the generating layer and correlated evidence. Saturation calls for capacity and occupancy analysis, container failures require lifecycle and resource debugging, and deadlines require a timeout hierarchy. The status code helps find requests; the request timeline determines the fix.

## Official Documentation

- [Cloud Run troubleshooting](https://docs.cloud.google.com/run/docs/troubleshooting)
- [Cloud Run logging](https://docs.cloud.google.com/run/docs/logging)
- [Configure request timeout](https://docs.cloud.google.com/run/docs/configuring/request-timeout)
- [Serverless NEG limitations](https://docs.cloud.google.com/load-balancing/docs/negs/serverless-neg-concepts#limitations)
