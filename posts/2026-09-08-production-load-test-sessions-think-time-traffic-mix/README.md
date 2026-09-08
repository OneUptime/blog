# How to Model Sessions, Think Time, and Traffic Mix in Load Tests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Load Testing, Performance Testing, Capacity Planning, Scalability, Latency

Description: Turn observed user journeys, pauses, arrival patterns, and endpoint proportions into a load test that preserves production demand instead of a synthetic RPS target.

---

A test that sends the correct total requests per second can still exercise the wrong system. Login storms, search-heavy sessions, cached reads, slow writes, and user pauses create different concurrency and dependency pressure even when their aggregate RPS is identical.

A production-realistic model starts with journeys and arrival behavior. The load tool comes last.

## Choose an open or closed workload deliberately

A closed model controls the population of virtual users rather than the arrival rate; that population can be fixed or vary over time. Each user completes an iteration, waits for think time, and begins another. For one homogeneous journey with a fixed population, the interactive response-time relationship uses mean response and think times:

```text
throughput X = users N / (response time R + think time Z)
users N = target throughput X * (R + Z)
```

If 6,000 active sessions complete a checkout journey every 30 seconds on average, including 24 seconds of user think time and 6 seconds of request time, expected journey throughput is:

```text
X = 6,000 / (6 + 24) = 200 journeys/second
```

This is useful when the real population is bounded, such as operators logged into a console. It also creates feedback: when the system slows, each user completes fewer iterations.

An open model starts iterations according to an external arrival schedule, independent of response time. Use it for API calls, web arrivals, events, or other demand that will continue arriving while the service slows. Grafana k6 warns that a closed model can reduce offered traffic during slow responses, a form of coordinated omission.

Many products need both: open arrivals for new sessions and stateful journeys within each session.

## Derive a journey catalog from production

Build the smallest catalog that explains most resource demand. Use privacy-safe analytics, traces, access logs, and business events to capture:

```yaml
journey: purchase
share_of_started_sessions: 0.08
steps:
  - request: GET /catalog
    probability: 1.0
  - think_time_seconds: distribution:observed-catalog-pause
  - request: POST /cart
    probability: 0.42
  - think_time_seconds: distribution:observed-cart-pause
  - request: POST /orders
    probability: 0.31
```

This YAML is an illustrative journey catalog, not a k6 configuration. Here, each request probability is conditional on reaching that step; not taking the request ends the journey, so an order requires a preceding cart request. Keep abandonment and conditional branches. Forcing every virtual user to finish checkout dramatically overstates writes. Conversely, replaying only individual endpoint percentages loses correlation, authentication state, cache behavior, and data dependencies.

Segment when behavior matters: anonymous versus authenticated, mobile versus web, new versus returning, region, tenant size, and heavy versus ordinary accounts. Do not create a unique script for every tiny difference. Retain segments that change cost, state, or latency.

## Preserve traffic mix by work, not just request count

For each request class `i`, calculate its target rate:

```text
lambda_i = total request arrival rate * request fraction_i
```

Then validate both the count mix and the resource mix. Suppose a stable workload at 1,000 RPS consists of 90 percent cached reads with a mean response time of 20 ms and 10 percent report builds with a mean response time of 500 ms. By Little's law:

```text
cached-read concurrency = 900 * 0.020 = 18
report concurrency      = 100 * 0.500 = 50
```

Reports are only 10 percent of RPS but account for most mean concurrency. Also record payload distributions, response sizes, cache hit ratio, database statements, fan-out, and retry rate. Average payloads conceal costly tails, so sample from observed buckets or a bounded empirical distribution.

## Model think time as a distribution

A constant `sleep(3)` removes think-time variation and can preserve synchronized bursts when users start together and have similar request durations; it does not itself synchronize virtual users. Capture think-time histograms between meaningful steps, then sample them with bounds. Preserve zero-pause automation and long-tail human pauses without letting an accidental multi-hour session hold a test VU forever.

Do not add think time inside a k6 arrival-rate iteration merely to control its start rate. Arrival-rate executors already pace iteration starts. Think time belongs inside a stateful user journey when that pause is part of the behavior being modeled.

## Reproduce time structure

An hourly average does not describe a login wave at 09:00 or a webhook burst on the minute. Construct a normalized demand curve from short production buckets:

```text
stage target = forecast peak rate * observed bucket / observed peak bucket
```

Include:

- ordinary ramp-up and ramp-down;
- the steepest observed rate of change;
- short bursts and synchronized events;
- a steady soak long enough to expose pools, garbage collection, compaction, and leaks;
- a recovery stage after overload.

Use an expected forecast and a documented stress scenario. Do not label an arbitrary multiple such as 10x as realistic.

## Protect test validity

Production realism does not mean using production unsafely. Generate representative synthetic accounts and data cardinalities. Isolate destructive operations, payment and email integrations, and rate-limited third parties. If a dependency is stubbed, reproduce its latency, error, connection, and payload behavior and clearly exclude its capacity from the result.

Instrument the generator. In k6, insufficient VUs in an arrival-rate test cause `dropped_iterations`; that means the scheduled load was not fully delivered. It can result from insufficient VU allocation or application slowdown holding VUs busy longer, and does not by itself prove generator hardware saturation or application success. Monitor generator CPU, network, and file descriptors, and distribute generators only after checking clock and data coordination.

Define thresholds before execution:

```text
delivered arrival rate >= 99.9% of target
request mix error <= 1 percentage point per major class
p99 latency <= service objective
error rate <= service objective
no monotonic queue or memory growth during steady stage
```

Compare test telemetry with a matched production window. Check endpoint mix, journey completion and abandonment, payload buckets, cache hit ratio, dependency calls per journey, geographic latency, and session duration. A test is calibrated when these distributions are close enough for the capacity decision, not when its headline RPS matches.

## Conclusion

Build load from observed session starts, journey branches, think-time distributions, and resource-relevant request classes. Select open or closed arrival semantics explicitly, preserve bursts and payload tails, and verify that the generator delivered the intended mix. That model makes capacity findings transferable to production.

## Official Documentation

- [Grafana k6 open and closed models](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/open-vs-closed/)
- [Grafana k6 scenarios](https://grafana.com/docs/k6/latest/using-k6/scenarios/)
- [Grafana k6 arrival-rate VU allocation](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/arrival-rate-vu-allocation/)
- [Grafana k6 built-in metrics](https://grafana.com/docs/k6/latest/using-k6/metrics/reference/)
- [Google SRE Book: Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/)
