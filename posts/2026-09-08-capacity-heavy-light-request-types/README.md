# How to Plan Capacity for Heavy and Light Requests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Capacity Planning, Performance, Load Testing, Scalability, Latency

Description: Replace average RPS with a class-based work model that preserves request cost, latency, concurrency, and traffic-mix changes.

---

RPS treats every request as one unit. A cached health read and a report that scans millions of rows both count as one request, but they consume very different amounts of CPU, memory, I/O, connections, and time.

Plan heterogeneous workloads by class and constrained resource, then test the combinations the system must serve.

## Define request classes by cost

Choose a small number of classes whose resource profiles differ materially. Route name alone may be insufficient: one search endpoint can be light for a selective query and heavy for a wildcard query over a large tenant.

For each class capture:

```text
arrival rate and burst distribution
successful service-time distribution
CPU seconds per successful request
bytes read and written
memory retained while in flight
database and downstream operations
response bytes and fan-out
cache-hit state and tenant/data-size segment
```

Measure at matched production conditions. CPU cost from an idle microbenchmark may omit contention, garbage collection, or cache effects near saturation.

## Build a resource-demand equation

For resource `r`, total offered demand is:

```text
D_r = sum(lambda_i * d_i,r)
```

Here `lambda_i` is arrivals per second for class `i`, and `d_i,r` is resource-seconds or resource units per successful request. For CPU, seconds of CPU per request multiplied by requests per second yields required busy cores before operating headroom.

Suppose traffic is 950 light requests per second at 5 ms CPU each and 50 heavy requests per second at 120 ms CPU each:

```text
light CPU demand = 950 * 0.005 = 4.75 cores
heavy CPU demand =  50 * 0.120 = 6.00 cores
total CPU demand                 10.75 cores
```

Heavy requests are 5 percent of RPS but consume about 56 percent of CPU demand. An unweighted model based on the 5 ms light path would estimate only five cores.

At a 65 percent target CPU utilization:

```text
planned CPU = 10.75 / 0.65 = 16.54 cores
```

Round at the scheduling and failure-domain layer, then add runtime and sidecar demands that were outside the measurement boundary.

## Calculate concurrency by class

Use Little's Law with mean time inside the same boundary:

```text
L_total = sum(lambda_i * W_i)
```

At 80 ms mean end-to-end latency for light requests and 900 ms for heavy requests:

```text
light in flight = 950 * 0.080 = 76
heavy in flight =  50 * 0.900 = 45
```

Heavy work again consumes far more concurrency than its RPS share. Use these class estimates to test worker, memory, connection, and queue budgets. Do not multiply class rates by p99 latency and call the result mean concurrency.

## Forecast the traffic mix, not just total traffic

A stable total of 1,000 RPS can require much more capacity if heavy traffic rises from 5 to 10 percent:

```text
900 * 0.005 + 100 * 0.120 = 16.5 busy CPU cores
```

That is a 53 percent increase over 10.75 cores with no change in RPS. Forecast class rates independently when campaigns, customer growth, time of day, or feature flags change the mix.

Track a weighted demand metric alongside RPS:

```text
work units/second = sum(requests_i/second * calibrated weight_i)
```

Weights can be derived from the current binding resource, but keep the underlying class metrics. One scalar weight becomes stale when the bottleneck moves from CPU to database I/O.

## Protect light work from heavy work

Shared FIFO queues and pools allow heavy work to cause head-of-line blocking. Consider:

- separate queues or worker pools;
- per-class concurrency limits;
- weighted fair admission;
- tenant quotas for expensive queries;
- deadlines and bounded queues;
- degraded or asynchronous heavy operations;
- reserved capacity for latency-critical traffic.

The controls must be end to end. Separating HTTP worker pools will not help if both classes exhaust the same database connections.

## Load test a mix matrix

Do not validate only today's average mix. Test:

```text
expected peak volume, expected mix
expected peak volume, heavy-mix upper bound
ordinary volume, worst credible heavy burst
one dependency degraded, expected mix
one instance unavailable, heavy-mix upper bound
```

Use an open workload model so slow heavy requests do not cause the generator to reduce arrivals. Preserve payload and tenant-size distributions. Report useful throughput and latency by class, plus resource pressure, queue wait, pool wait, rejection, and fairness.

Set scaling signals from the constrained work. Total RPS per replica is safe only while class mix stays within its calibrated range. Heavy-class concurrency, weighted work units, or queue age can provide an earlier signal.

## Conclusion

Replace average RPS with class arrival rates multiplied by measured resource demand and mean latency. Forecast mix changes, validate a matrix of heavy and light scenarios, and isolate expensive work where it can starve interactive traffic. Keep weights calibrated to current production behavior and remeasure after code, data, or cache changes.

## Official Documentation

- [Google SRE Book: Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/)
- [Google SRE Book: Reliable Product Launches at Scale](https://sre.google/sre-book/reliable-product-launches/)
- [Grafana k6 open and closed workload models](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/open-vs-closed/)
- [Prometheus histograms and summaries](https://prometheus.io/docs/practices/histograms/)
- [MIT OpenCourseWare: Queueing systems and Little's Law](https://ocw.mit.edu/courses/1-203j-logistical-and-transportation-planning-methods-fall-2006/resources/lec5/)
