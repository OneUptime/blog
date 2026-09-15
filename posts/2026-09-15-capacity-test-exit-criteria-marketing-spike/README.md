# How to Define Capacity Test Exit Criteria Before a Marketing Traffic Spike

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Capacity Planning, Load Testing, k6, SLO, Performance Testing

Description: Define measurable launch capacity gates for offered load, useful outcomes, latency, recovery, and failure scenarios before running a marketing-spike test.

---

A load test that turns green at the end of a marketing rehearsal is useful only if the acceptance criteria were decided before the run. Otherwise it is easy to accept the traffic the generator happened to deliver, ignore errors, and rename an overloaded system's throughput its capacity.

Write a compact acceptance contract connecting the forecast audience to business operations, the traffic profile, and the evidence required for a launch decision.

## Define the event and workload

Record the campaign's start time, expected burst shape, duration, geography, client behavior, payload distribution, cache state, and expensive paths. Distinguish page views, API requests, checkout attempts, and successful orders; they are different units.

For illustration, suppose the requirement is 600 product-detail requests per second for thirty minutes after a separately tested burst, with additional checkout and authentication scenarios. The product-detail criterion alone does not certify the entire site.

Version the application artifact, database fixture, infrastructure configuration, test script, and forecast. Google SRE's launch guidance emphasizes dependency readiness and testing as part of launch coordination. [Reliable product launches](https://sre.google/sre-book/reliable-product-launches/)

## Separate delivery, outcomes, and resources

An example acceptance matrix might be:

| Gate | Illustrative criterion |
| --- | --- |
| Generator delivery | Planned arrival rate maintained; no dropped iterations |
| Business correctness | Required fields and expected business effects verified |
| HTTP failures | Under 0.5%, with the error definition fixed in advance |
| Latency | Product-detail p95 under 250 ms and p99 under 700 ms |
| Resource stability | No sustained queue growth, leaks, or connection exhaustion |
| Recovery | Backlog and latency return to the agreed baseline within five minutes |
| Resilience | Same declared objectives pass the required degraded-capacity scenario |

These numbers are invented examples, not universal targets. Specify whether latency and errors are evaluated over the whole run, each plateau, or shorter rolling windows. An all-run percentile can conceal a short but unacceptable outage.

## Encode a narrow gate in k6

The following independent smokeable scenario demonstrates the product-detail plateau. The environment must supply a representative URL that returns a JSON object containing an `id`; use test data and an authorized test environment.

```javascript
import http from 'k6/http';
import { check } from 'k6';

const base = __ENV.BASE_URL;
if (!base) throw new Error('Set BASE_URL for the test environment');

export const options = {
  scenarios: {
    product_peak: {
      executor: 'constant-arrival-rate',
      rate: 600,
      timeUnit: '1s',
      duration: '30m',
      preAllocatedVUs: 600,
      maxVUs: 1000,
      gracefulStop: '30s',
    },
  },
  thresholds: {
    'dropped_iterations{scenario:product_peak}': ['count==0'],
    'http_req_failed{scenario:product_peak}': ['rate<0.005'],
    'http_req_duration{scenario:product_peak}': ['p(95)<250', 'p(99)<700'],
    'checks{scenario:product_peak}': ['rate==1'],
  },
};

export default function () {
  const response = http.get(`${base}/products/test-product`, {
    redirects: 0,
    timeout: '3s',
  });
  let valid = false;
  if (response.status === 200) {
    try {
      const body = response.json();
      valid = body !== null && typeof body === 'object' &&
        body.id === 'test-product';
    } catch (_) {
      valid = false;
    }
  }
  check(response, { 'expected product returned': () => valid });
}
```

The arrival-rate executor schedules iterations independently of response duration when VUs are available. It controls iteration starts, not an arbitrary number of requests inside a user journey. Here each iteration sends one HTTP request and automatic redirects are disabled. [k6 constant arrival rate](https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/constant-arrival-rate/)

The VU values are example generator allocations, not a service concurrency recommendation. Verify generator CPU, memory, network, connection limits, and telemetry. Dropped iterations invalidate the intended offered-load claim until their cause is understood.

A `check()` by itself does not make k6 exit unsuccessfully; a threshold makes its result an acceptance gate. The `checks` threshold above is deliberately stricter than the HTTP-failure allowance because this example requires every returned product check to pass. [k6 thresholds](https://grafana.com/docs/k6/latest/using-k6/thresholds/)

## Add scenarios that the script does not cover

Test the opening burst, cold caches, real authentication, checkout side effects, downstream rate limits, delayed scaling, and the required node or zone loss. Give business writes unique test identities and reconcile the created results; a `200` response cannot prove the correct number of orders.

Run a separate post-load recovery phase with arrivals at the declared normal rate. Measure useful departures and backlog, rather than stopping the generator and overlooking the work left behind. Keep a soak long enough to reveal the leaks, credit depletion, and maintenance cycles relevant to the event.

## Make the decision auditable

Before execution, name a launch owner, the non-negotiable gates, and permitted mitigations. Record whether evidence applies to the normal or degraded topology. A failed gate should produce a concrete action such as reducing campaign admission, adding tested capacity, fixing a dependency, or delaying launch.

Save raw time series and the test's final configuration. Report planned, started, and completed work separately, including interrupted and rejected operations. Approve the event only when the tested traffic envelope, business outcomes, and recovery behavior match the contract the team actually intends to operate.
