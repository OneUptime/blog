# Nuclio in Iguazio: Monitor Serving Latency, Errors, Throughput, and Saturation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nuclio, Model Serving, Prometheus, Observability, MLOps

Description: Diagnose Nuclio serving performance in Iguazio by discovering deployed metrics, measuring client latency and errors, and correlating worker queues with replica capacity.

A model-serving function can remain ready while callers wait for a worker, time out at an ingress, or receive invalid predictions. Useful monitoring connects the requests callers send with the work Nuclio actually handles.

This workflow uses the dashboards documented for Iguazio 3.7 and focuses on synchronous HTTP serving. Record your installed Iguazio, MLRun, and Nuclio versions before building queries: the bundled release, metric sink, and relabeling determine which series and labels exist. The optional queue metrics below require discovery on your deployment.

## Start with the existing monitoring path

Open your Grafana service and find **Nuclio Functions Monitoring - Overview**, then **Nuclio Functions Monitoring - Per Function**. Select the deployed function and an interval containing known traffic. Iguazio's tenant-wide `monitoring` service supplies these dashboards; it also supports Nuclio autoscaling. Check that service when both dashboards and scaling appear inactive. See [Iguazio's monitoring service documentation](https://www.iguazio.com/docs/latest-release/services/monitoring-services/).

Inspect a panel's query and data source before creating another collector. Record the function selector, namespace or tenant boundary, trigger selector, and replica dimension that the working dashboard uses.

Nuclio supports both Prometheus push and pull sinks, with a separately configured listener for pull. Find the actual sink and scrape endpoint rather than assuming the inference URL exposes `/metrics`. The [platform configuration reference](https://docs.nuclio.io/en/stable/tasks/configuring-a-platform.html#metric-sinks-metrics) documents this separation.

In the dashboard's Prometheus data source, inventory metric names:

```promql
count by (__name__) ({__name__=~"nuclio_processor_.*"})
```

Then inspect the raw series for each candidate. Check its `HELP` and `TYPE` metadata at the exporter or through your monitoring tooling. Establish whether it counts requests, events, model predictions, or worker allocations; those denominators are not interchangeable when requests contain batches or traverse multiple functions.

## Measure throughput within a verified scope

`nuclio_processor_handled_events_total` is a documented Nuclio activity metric, including in [MLRun's scale-to-zero example](https://docs.mlrun.org/en/stable/cheat-sheet.html). Start with its raw series and identify the labels selecting your function's HTTP trigger.

For a directly scraped processor target, this is a useful first query:

```promql
sum(
  rate(nuclio_processor_handled_events_total{
    job="REPLACE_JOB", instance="REPLACE_INSTANCE"
  }[5m])
)
```

Replace both values with labels from the returned series. This example covers one scrape target. To cover the function, use the dashboard's verified selectors for all its replicas and only the intended trigger. If a push gateway aggregates functions, `job` and `instance` alone may not isolate one function. Prometheus explains these target labels and their interaction with exported labels in [Jobs and instances](https://prometheus.io/docs/concepts/jobs_instances/).

Keep a second panel split by replica. A total can hide one overloaded replica while its peers are idle. Compare the event rate with successful client requests per second and record the batch size. A change in predictions per request can make prediction throughput rise without any increase in request throughput.

## Measure latency and errors at the caller

Treat handler execution time, worker waiting time, and complete HTTP response time as separate measurements. For an exported duration metric, verify its unit and type before writing a formula. A classic histogram supports aggregated percentiles through its buckets; a summary's per-worker quantiles cannot be averaged into a function-wide p95. With matching `_sum` and `_count` counters, dividing their rates gives a mean. See [Prometheus's histogram and summary guide](https://prometheus.io/docs/practices/histograms/).

When the available series cannot answer the client-latency question, run this small probe against a test deployment. Save a valid model request in `payload.json`, set `SERVING_URL` to its invocation endpoint, and supply any required headers as a JSON object in `SERVING_HEADERS_JSON`.

```python
import json
import math
import os
import time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from http.client import HTTPException
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

url = os.environ["SERVING_URL"]
body = Path("payload.json").read_bytes()
headers = {"Content-Type": "application/json"}
headers.update(json.loads(os.getenv("SERVING_HEADERS_JSON", "{}")))
requests, concurrency = 50, 2

def invoke(_):
    started = time.perf_counter()
    try:
        with urlopen(Request(url, body, headers), timeout=10) as response:
            response.read()
            status = str(response.status)
    except HTTPError as error:
        status = str(error.code)
        error.close()
    except (OSError, HTTPException):
        status = "transport_error"
    return status, time.perf_counter() - started

run_started_at = datetime.now(timezone.utc).isoformat()
started = time.perf_counter()
with ThreadPoolExecutor(max_workers=concurrency) as pool:
    results = list(pool.map(invoke, range(requests)))
elapsed = time.perf_counter() - started
run_finished_at = datetime.now(timezone.utc).isoformat()
counts = Counter(status for status, _ in results)
successful = sorted(t for status, t in results if status.startswith("2"))
p95 = successful[math.ceil(0.95 * len(successful)) - 1] if successful else None
print({"started_at_utc": run_started_at,
       "finished_at_utc": run_finished_at,
       "status_counts": dict(counts),
       "successful_rps": len(successful) / elapsed,
       "successful_p95_seconds": p95})
```

This probe reports successful-response p95 separately from HTTP failures and transport failures, including incomplete reads and malformed HTTP status lines detected by Python's HTTP client. It makes no retries and includes connection setup in response timing. It follows redirects by default, so the recorded status can be from the final response. It runs 50 invocations with at most two active at once; the [10-second socket timeout](https://docs.python.org/3/library/urllib.request.html#urllib.request.urlopen) applies to blocking operations, not total run time. This sample cannot establish the service's maximum throughput. Also validate prediction content; HTTP 200 alone does not prove a correct inference.

Compare its timestamps with processor and ingress logs. A 503 generated before a request reaches a worker may not appear in a handler-failure counter. Use a defined client-success condition for availability, then use internal counters to locate failures.

## Identify worker saturation

Read the deployed trigger configuration, using your actual namespace and function name:

```bash
kubectl -n YOUR_NAMESPACE get nucliofunction YOUR_FUNCTION -o json \
  | jq '.spec | {triggers, replicas, minReplicas, maxReplicas, resources}'
```

For synchronous HTTP, examine `numWorkers` and `workerAvailabilityTimeoutMilliseconds`. Nuclio returns 503 when no worker becomes available within that timeout; zero means no waiting. Increasing the timeout can convert immediate rejections into slower responses without adding capacity. These behaviors are documented in [Nuclio's worker configuration guidance](https://docs.nuclio.io/en/stable/concepts/best-practices-and-common-pitfalls.html#tweak-worker-configurations-to-resolve-unavailable-server-errors).

The upstream [platform configuration source](https://github.com/nuclio/nuclio/blob/development/pkg/platformconfig/platformconfig.go) lists `nuclio_processor_worker_pending_allocation_current` and `nuclio_processor_worker_allocation_wait_duration_ms_sum` among supported autoscaling metrics. This development source does not guarantee either exists in your bundled version.

If the first metric is exposed and its metadata confirms a pending-allocation gauge, inspect it with the same verified function/trigger selectors. For the single-target example:

```promql
nuclio_processor_worker_pending_allocation_current{
  job="REPLACE_JOB", instance="REPLACE_INSTANCE"
}
```

Preserve replica dimensions before aggregating. Sustained waiting alongside rising client latency and flat throughput supports a saturation diagnosis. For the wait-duration sum, verify its type, units, and matching observation count before calculating a mean; the sum alone is not an average request delay. An absent series is unavailable evidence, not zero waiting.

Check the trigger's `mode` as well. The [configuration reference](https://docs.nuclio.io/en/stable/reference/function-configuration/function-configuration-reference.html) distinguishes `sync` and `async`. Python HTTP async serving can process concurrent requests within a worker and has separate connection limits, so the synchronous worker-capacity interpretation does not apply unchanged. See [Nuclio's async documentation](https://docs.nuclio.io/en/stable/reference/function-configuration/async-mode.html).

## Turn the observations into a decision

Use one time range for client success rate, response latency, handled-event rate, pending work, replica readiness, CPU, and memory. Then investigate the combination:

| Observation | Next check |
|---|---|
| Waiting rises and throughput plateaus | Worker occupancy, CPU/GPU limits, slow dependencies |
| Only one replica queues | Traffic distribution and replica readiness |
| Client latency rises while handler time stays stable | Ingress, worker waiting, connection setup |
| Errors rise without added load | Recent deployment, payload compatibility, dependency failures |

Change one capacity setting at a time and repeat the same workload. More workers consume additional resources; more replicas need time to start and load models. Keep client success and latency as the acceptance criteria, and use the internal signals to explain whether the change actually relieved contention.
