# How to Diagnose Dropped k6 Iterations Before Declaring a Service at Capacity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k6, Capacity Planning, Load Testing, Performance Testing, Monitoring

Description: Separate k6 iteration-allocation failures, client bottlenecks, and genuine service slowdown before reporting a capacity limit.

---

A k6 run reports `dropped_iterations`, but that counter alone cannot tell you the API is full. It records iteration work that was not started. The useful question is why the configured executor could not start it, and whether the service actually received the workload you intended.

Treat delivery of the test workload as a separate acceptance condition from the API's latency and correctness.

## Check the executor before interpreting the counter

The cause depends on the executor:

| Executor | Meaning to investigate |
| --- | --- |
| `constant-arrival-rate`, `ramping-arrival-rate` | No free VU was available for a scheduled iteration |
| `shared-iterations`, `per-vu-iterations` | The scenario hit `maxDuration` before finishing its assigned iteration work |

With arrival-rate tests, early drops often indicate inadequate allocation. Later drops can follow rising service latency, but their timing is evidence to investigate, not proof of a cause. [k6 dropped iterations](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/dropped-iterations/).

This article focuses on arrival-rate executors. Extending `maxDuration` in an iteration-count test answers a different question from determining sustainable external arrival capacity.

## Calculate the minimum plausible VU demand

Use the complete iteration duration, including HTTP calls, script processing, deliberate delays, and dependency requests:

```text
mean busy VUs approximately equals
  iterations started per second * mean iteration duration in seconds
```

At 800 iterations/s with a 150 ms mean iteration duration, approximately 120 VUs are busy. Limiting the executor to 100 VUs cannot maintain the average workload even before accounting for variation. If duration rises to 600 ms, mean busy VUs rise to 480.

These numbers do not prescribe a safe VU count. A long tail needs a measured cushion, and the generator must support that cushion. Multiplying by p99 duration can be a conservative experiment, but it is not a mathematical guarantee of zero drops.

Grafana recommends preallocating enough VUs and warns that dynamically creating them through `maxVUs` has CPU and memory costs. For a repeatable capacity run, prefer an allocation established in a pilot. [k6 arrival-rate VU allocation](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/arrival-rate-vu-allocation/).

## Inspect all work inside the iteration

Consider this illustrative mistake:

```javascript
import http from 'k6/http';
import { sleep } from 'k6';

export default function () {
  http.get(__ENV.TARGET_URL);
  sleep(1);
}
```

An 80 ms HTTP call plus one second of sleep keeps its VU occupied for roughly 1.08 seconds. At 800 iterations/s, the mean requirement becomes about 864 busy VUs. The server could respond quickly while k6 drops work because VUs are sleeping.

Arrival-rate executors already pace starts. Remove a trailing pacing sleep when one iteration means one independently arriving API request. Preserve think time when it is deliberately part of a session journey, and budget the longer iteration accordingly. [k6 constant arrival-rate pacing](https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/constant-arrival-rate/).

Also inspect redirects, authentication refresh, multiple requests per iteration, large JSON transformations, and synchronous logging. Counting eight requests inside an iteration as one RPS creates a workload-definition error even when every iteration starts successfully.

## Correlate the first drop with the timeline

Collect generator and service metrics on aligned clocks. The following patterns suggest different next experiments:

| Evidence near first drop | Next experiment |
| --- | --- |
| Drops immediately; service latency flat; generator resources healthy | Raise preallocated VUs while holding rate constant |
| Iteration duration rises before drops; service queue and pool wait rise | Investigate the service or dependency bottleneck |
| Generator CPU or memory pressure rises; server ingress falls | Reduce client overhead or split the workload across generators |
| Client connection time rises; server arrivals remain below target | Inspect DNS, TLS, network, socket, and load-balancer paths |
| HTTP duration stays flat but iteration duration grows | Inspect script work and non-HTTP waits |

k6 exposes separate metrics for blocked time, connection setup, TLS, waiting, receiving, and complete iterations. `http_req_duration` is the sum of sending, waiting, and receiving; it does not cover all time a VU is occupied. [k6 metric definitions](https://grafana.com/docs/k6/latest/using-k6/metrics/reference/).

Low server CPU does not exonerate the service. Database pools, locks, downstream rate limits, and CPU quotas can constrain useful throughput while fleet-average CPU remains moderate.

## Repeat with one controlled change

For example, hold the offered rate at 800/s and increase `preAllocatedVUs` from 200 to 600 after verifying generator capacity. Keep the artifact, data, cache state, timeout, and request mix fixed.

If drops disappear and the API meets its objectives, the earlier run did not establish a service capacity limit. If latency and queue wait still violate the objective with zero drops, you now have stronger evidence of a service limit. If the additional VUs overload the generator, the experiment remains inconclusive.

When splitting load across two independent generators, assign each half the intended total rate. Two generators each configured for 800/s offer 1,600/s; they do not jointly offer 800/s. Confirm the aggregate at the ingress boundary.

Do not shorten timeouts merely to free VUs and hide drops. Timeouts must represent the client contract, and their failed attempts still count against successful capacity.

## Make incomplete delivery fail visibly

For a strict capacity plateau, add this fragment to the existing options object:

```javascript
thresholds: {
  dropped_iterations: ['count==0'],
  http_req_failed: ['rate<0.01'],
}
```

Add the API's latency and business-success thresholds as well. Thresholds express acceptance criteria and fail the run when unmet. [k6 thresholds](https://grafana.com/docs/k6/latest/using-k6/thresholds/).

In a controlled ten-minute 800/s run, 480,000 iterations are intended. If 24,000 are dropped, 5% of that schedule never started, subject to start/end alignment. Compare actual starts and completed requests separately, because interrupted work is another category.

Report the result as either a valid passing plateau, a valid service failure, or an invalid capacity measurement caused by incomplete delivery. Keep the counter in the evidence; give it a cause only after the timeline and controlled repeat support that conclusion.
