# How to Estimate Peak API Requests per Second from User Sessions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Capacity Planning, Performance, Load Testing, Monitoring, Scalability

Description: Translate session arrivals and user journeys into API request rates, then account for short bursts, background traffic, and retries.

---

A forecast of 24,000 sessions during a promotion does not directly tell you how many API requests the service must handle each second. Sessions contain think time, different journeys, and requests that may never reach your origin. Start by defining the traffic boundary, then translate session arrivals into requests crossing that boundary.

## Choose a measurement boundary

For this example, capacity means HTTP requests arriving at the application API. Exclude images served entirely by the CDN, but include browser API calls, mobile clients, failed attempts, and retries. A page view can make several API calls, and an authenticated session can sit idle for minutes.

Measure three quantities for the same population and representative period:

- session starts per second;
- API requests per session, separated by journey;
- session duration and the timing of requests within each session.

Also measure request traffic that has no interactive session, such as integrations and scheduled polling. Do not divide all API traffic by browser sessions and then add integration traffic again.

Grafana documents the relationship between session arrivals, average duration, and average concurrent sessions. That relationship gives a useful consistency check; it does not make concurrent sessions equal to simultaneous HTTP requests. [Grafana guidance on concurrent users](https://grafana.com/docs/k6/latest/testing-guides/calculate-concurrent-users/).

## Convert the journey mix into a baseline

Assume these illustrative measurements hold during a sustained peak period:

| Input | Value |
| --- | ---: |
| Session starts in 15 minutes | 24,000 |
| Mean session duration | 180 seconds |
| Browsing sessions | 80%, 12 API requests each |
| Checkout sessions | 20%, 30 API requests each |

The weighted request count and arrival rate are:

```text
session arrival rate = 24,000 / 900 = 26.667 sessions/second
requests per session = 0.80 * 12 + 0.20 * 30 = 15.6
session API traffic  = 26.667 * 15.6 = 416 requests/second
```

The corresponding mean number of active sessions is:

```text
concurrent sessions = 26.667 * 180 = 4,800
```

An equivalent calculation is `4,800 * 15.6 / 180 = 416 RPS`. Using 4,800 as the API's request concurrency would be a different and unjustified assumption. For example, 416 RPS at 200 ms mean request duration corresponds to roughly 83 mean in-flight requests in a stable system.

This baseline assumes the session population and behavior are reasonably stable over the window. Count complete sessions or correct for sessions crossing the window boundary; truncated sessions bias requests per session downward.

## Add short bursts and non-session work

A 15-minute rate can hide a promotion's first ten seconds. Suppose request logs show that the busiest ten-second window has 2.5 times the session-derived rate. Separately, integrations contribute 80 first attempts per second. Suppose aligned measurements show 1.06 total attempts per original request for the combined workload:

```text
burst first-attempt demand = 416 * 2.5 + 80 = 1,120 RPS
burst attempt demand       = 1,120 * 1.06 = 1,187.2 RPS
```

These factors are example observations, not universal margins. If the request-per-session measurement already includes retries, multiplying by retry amplification again is incorrect. If integrations also spike during the campaign, give them their own burst model.

A small calculator keeps the assumptions visible:

```python
sessions = 24_000
window_seconds = 15 * 60
journeys = [(0.80, 12), (0.20, 30)]
assert abs(sum(share for share, _ in journeys) - 1) < 1e-9

session_rps = sessions / window_seconds * sum(
    share * requests for share, requests in journeys
)
first_attempt_peak = session_rps * 2.5 + 80
attempt_peak = first_attempt_peak * 1.06
print(f"Session baseline: {session_rps:.1f} RPS")
print(f"Peak attempts: {attempt_peak:.1f} RPS")
```

The output is 416.0 and 1187.2 RPS. Keep additional forecast uncertainty separate from measured amplification so the plan explains every multiplier.

## Handle synchronized session starts

The steady formula does not capture users opening the same page at the same instant. For a launch, record a request profile by session age: requests in the first second, next five seconds, and later navigation.

In discrete time bins, estimate:

```text
requests[t] = sum(session_starts[t - age] * requests_per_session_at_age[age])
```

Here both arrays use the same bin width; divide the resulting request count by that width to obtain RPS. This convolution preserves front-loaded login and page-bootstrap traffic. Use separate profiles for each journey and add their results.

Replay the launch arrival curve with realistic journey timing. k6 arrival-rate executors schedule iterations independently of completion, whereas closed workloads can reduce arrivals as responses slow. If one iteration represents a session, its configured rate is sessions per second; the API request rate follows the requests inside those iterations. [k6 workload models](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/open-vs-closed/).

## Compare the estimate with observed arrivals

With an application counter named `api_requests_total`, an illustrative PromQL check is:

```promql
sum(rate(api_requests_total{service="shop-api"}[1m]))
```

Replace the metric and labels with your instrumentation. Apply `rate` before aggregation so each series' counter resets are handled correctly. A one-minute range still smooths shorter bursts; use access-log bins or finer telemetry to verify ten-second assumptions. [Prometheus rate documentation](https://prometheus.io/docs/prometheus/latest/querying/functions/#rate).

Compare predicted and observed rates for several historical peaks, then investigate discrepancies by journey, client, retry behavior, and cache boundary. Carry the resulting endpoint mix into the capacity test: a forecast of 1,200 RPS says little about capacity unless the test also preserves the work those requests perform.
