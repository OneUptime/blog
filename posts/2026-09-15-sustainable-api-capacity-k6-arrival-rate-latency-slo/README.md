# How to Find Sustainable API Capacity Under a Latency SLO with k6 Arrival-Rate Tests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Capacity Planning, k6, Load Testing, Performance Testing, Monitoring

Description: Use fixed arrival-rate plateaus, explicit latency and success thresholds, and generator checks to identify sustainable API throughput.

---

Sustainable API capacity is the highest arrival rate a particular deployment can serve for a defined workload while meeting its latency and success objectives. A momentary throughput maximum is insufficient: the API may be building a queue or the load generator may have stopped delivering the intended traffic.

Use k6 to hold a fixed arrival rate, inspect each plateau independently, and report a capacity interval rather than pretending the precise failure point is known.

## Define what one iteration represents

The `constant-arrival-rate` executor schedules iterations at a configured rate while VUs are available. It does not directly schedule HTTP requests. The example below makes exactly one HTTP request per iteration, disables redirects, and performs no retries, so iteration starts correspond to attempted API requests. Multi-step journeys require a separate translation between iteration rate and endpoint traffic. [k6 constant arrival rate](https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/constant-arrival-rate/).

For the example endpoint, define an illustrative objective: at least 99% of requests return HTTP 200 within 300 ms. Also inspect p99 call latency, errors, and delivered load separately. Replace these values and the response validation with the service's actual contract.

## Write a plateau test

Save the following as `capacity.js`. The URL must be an authorized test environment with representative data and dependency limits.

```javascript
import http from 'k6/http';
import { Rate, Trend } from 'k6/metrics';

const good = new Rate('good_requests');
const elapsed = new Trend('call_elapsed_ms', true);
const rate = Number(__ENV.RATE || '200');
const vus = Number(__ENV.VUS || '200');
if (!Number.isInteger(rate) || rate < 1) throw new Error('Invalid RATE');
if (!Number.isInteger(vus) || vus < 1) throw new Error('Invalid VUS');
if (!__ENV.TARGET_URL) throw new Error('Set TARGET_URL');

export const options = {
  discardResponseBodies: true,
  maxRedirects: 0,
  scenarios: {
    plateau: {
      executor: 'constant-arrival-rate',
      rate,
      timeUnit: '1s',
      duration: '10m',
      preAllocatedVUs: vus,
      gracefulStop: '10s',
    },
  },
  thresholds: {
    good_requests: ['rate>=0.99'],
    call_elapsed_ms: ['p(99)<300'],
    http_req_failed: ['rate<0.01'],
    dropped_iterations: ['count==0'],
  },
};

export default function () {
  const start = Date.now();
  const response = http.get(__ENV.TARGET_URL, {
    timeout: '5s',
    tags: { name: 'catalog-read' },
  });
  const duration = Date.now() - start;
  elapsed.add(duration);
  good.add(response.status === 200 && duration < 300);
}
```

The custom success metric evaluates status and latency together, preventing fast error responses from appearing successful. `call_elapsed_ms` measures wall time around the client call, including connection work; k6's built-in `http_req_duration` excludes initial connection setup. Neither measures browser rendering or time waiting before k6 starts an iteration. [k6 built-in metrics](https://grafana.com/docs/k6/latest/using-k6/metrics/reference/).

The sample discards bodies, so it verifies transport status only. For an endpoint that can return HTTP 200 with an invalid result, retain and validate the required fields and include that outcome in `good.add(...)`.

## Run separately scored plateaus

Warm the application and establish the intended cache state before the measured run. Then execute one candidate rate:

```bash
TARGET_URL=https://api.staging.example.com/catalog RATE=200 VUS=200 k6 run capacity.js
```

Increase the rate in subsequent runs, allowing the system to return to the same baseline between them. Ten minutes is an example duration; extend it to cover relevant garbage collection, cache expiry, and background activity. Do not mix a long low-load ramp and a short overloaded interval into one percentile.

k6 thresholds determine the run's pass/fail result and produce a nonzero exit code on failure. The script deliberately does not stop at the first threshold breach, allowing inspection of recovery and queue behavior within the authorized test envelope. [k6 thresholds](https://grafana.com/docs/k6/latest/using-k6/thresholds/).

A hypothetical search might produce:

| Offered rate | p99 call time | Good requests | Dropped iterations | Queue trend | Decision |
| --- | ---: | ---: | ---: | --- | --- |
| 200/s | 160 ms | 99.98% | 0 | Stable | Pass |
| 300/s | 230 ms | 99.95% | 0 | Stable | Pass |
| 350/s | 410 ms | 97.80% | 0 | Growing | Fail |

These are illustrative results, not measurements of a real service. They establish a passing point at 300/s and a failing point at 350/s; another plateau at 325/s narrows the interval.

## Prove the generator delivered the workload

A VU executes one iteration at a time. At 300 iterations/s and 0.2 seconds mean iteration duration, approximately 60 VUs are busy on average. Tail duration and variation require additional allocation. Preallocate from pilot observations and confirm that CPU, memory, sockets, and network on the generator have room to sustain the test. Creating VUs dynamically can itself distort a run. [k6 VU allocation](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/arrival-rate-vu-allocation/).

For a ten-minute 300/s plateau, the intended schedule is about 180,000 iteration starts. Check dropped and interrupted work, and compare timestamped starts with ingress request counts over aligned windows. A summary rate can include shutdown time; it is not a substitute for the plateau time series.

A zero-drop run can still be limited by a shared network path. Correlate client timings with load-balancer arrivals and application metrics before assigning the bottleneck to the server.

## Record capacity with its conditions

Accept a candidate only when the success objective holds, arrivals are delivered, and queue length, pool wait, and memory remain stable. Repeat the highest passing candidate to assess variation. Record the deployment size, artifact, instance type, dataset, endpoint mix, cache state, dependency limits, and first failing resource.

Use the lower verified point as evidence for an operating plan. Growth margin, one-replica loss, and zone failover require additional scenarios; they are not automatically covered by a successful healthy-fleet plateau.
