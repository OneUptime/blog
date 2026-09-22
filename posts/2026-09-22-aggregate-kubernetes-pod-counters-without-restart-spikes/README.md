# How to Aggregate Prometheus Counters Across Kubernetes Pods Without Restart Spikes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, PromQL, Kubernetes, Counter, Monitoring

Description: Keep counter identities intact through Kubernetes restarts, calculate per-series rates, and aggregate into stable service labels with a reproducible reset test.

---

A rolling deployment changes the set of Pods behind a service. If a dashboard first adds their lifetime request counters, a disappearing Pod can make that sum fall sharply. Treating the resulting total as one counter produces an apparent reset and a misleading traffic spike.

The service query should calculate each original counter's rate before combining Pods. That solves the reset-order problem; collection gaps and duplicate scrapes still need separate checks.

## Establish the series identity

Assume each Pod exposes `checkout_requests_total`, and the ingested series have `cluster`, `namespace`, `service`, `pod`, and `instance` labels. These labels are assumptions about your scrape configuration, not labels Prometheus automatically supplies in every installation.

Inspect the raw selector in the Prometheus table view:

```promql
checkout_requests_total{namespace="shop",service="checkout"}
```

Two Pods must remain distinguishable. Keep the target identity in storage even when the dashboard only needs a service total. Also confirm that a Pod's application endpoint appears in one intended scrape job. Two jobs collecting the same counter create two observations of the same work.

## Calculate a stable service rate

```promql
sum by (cluster, namespace, service) (
  rate(checkout_requests_total{
    namespace="shop",service="checkout",job="checkout-pods"
  }[5m])
)
```

The output is requests per second. `pod` and `instance` disappear only after each source series has undergone reset handling. Retaining `cluster` and `namespace` prevents unrelated deployments with the same service name from being merged.

[Prometheus documents this ordering](https://prometheus.io/docs/prometheus/latest/querying/functions/#rate): counter rate calculation must happen before aggregation. A subquery around a sum makes an expression syntactically possible, but does not restore the per-Pod histories that the sum discarded.

For an estimated number of requests over an hour, use `sum by (cluster, namespace, service) (increase(checkout_requests_total{job="checkout-pods"}[1h]))`. Use the same namespace and service filters when narrowing to this application. `increase` extrapolates, so the result can be fractional and is not an exact transaction ledger.

## Reproduce one restart locally

Save this as `pod-reset.test.yml`. It uses two counters sampled every minute; Pod A resets while Pod B continues increasing.

```yaml
evaluation_interval: 1m
tests:
  - interval: 1m
    input_series:
      - series: 'checkout_requests_total{service="checkout",pod="a"}'
        values: '100 160 220 0 60 120'
      - series: 'checkout_requests_total{service="checkout",pod="b"}'
        values: '200 320 440 560 680 800'
    promql_expr_test:
      - expr: sum by (service) (rate(checkout_requests_total[5m]))
        eval_time: 5m
        exp_samples:
          - labels: '{service="checkout"}'
            value: 2.75
```

Run it with a compatible Prometheus `promtool` binary:

```bash
promtool test rules pod-reset.test.yml
```

The expected value is 2.75, not a guessed constant 3. The selected window excludes the sample at its left boundary. The reset-adjusted observed increases are 180 for A and 480 for B over 240 seconds; their rates sum to 2.75. Extrapolation does not recover requests that happened after A's last pre-restart scrape and before its reset. The [official test format](https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/) lets you add rollout and missing-sample cases without deploying Kubernetes.

## Separate a restart from missing telemetry

Use a per-Pod diagnostic alongside the aggregate:

```promql
resets(checkout_requests_total{job="checkout-pods"}[15m])
```

A container restart that preserves all labels can appear as a reset within a series. A replacement Pod with a new label set starts a different series; its first sample does not prove a reset in the old series. Newly observed counters need enough samples for a rate, and events before the first scrape can be missed.

Check `up{job="checkout-pods"}` and discovery when the total drops unexpectedly. A query cannot distinguish no traffic from unobserved traffic using a missing request counter alone. Avoid appending an unconditional zero fallback to hide missing results.

Prometheus's [staleness rules](https://prometheus.io/docs/prometheus/latest/querying/basics/#staleness) explain why a removed target stops appearing in instant selectors. A range-based rate can still use older samples within its window, so a five-minute service rate is a recent-window estimate rather than an instantaneous inventory of active Pods.

## Verify the rollout boundary

In staging, compare the service query with per-Pod rates during a controlled restart. Confirm that the total does not spike because a lifetime counter disappeared. Repeat with a replacement Pod, an unavailable scrape endpoint, and two accidentally overlapping discovery rules.

If a long-term backend receives two high-availability Prometheus replicas, configure its supported replica deduplication before computing service totals. Removing a replica label with `sum` adds both copies; it does not identify duplicate observations. Keep collection health visible next to the traffic graph so a stable aggregate cannot conceal a missing Pod.
