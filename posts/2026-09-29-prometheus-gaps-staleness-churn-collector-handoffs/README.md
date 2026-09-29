# How to Trace Prometheus Gaps from Staleness, Churn, and Collector Handoffs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Monitoring, OpenTelemetry, Troubleshooting

Description: Trace missing Prometheus samples through metric presence, label identity, staleness, and stateful Collector ownership changes.

A dashboard can contain holes while every target displays `up=1`. Scrape health describes the HTTP collection operation. It does not guarantee that every expected family was exposed, that its labels stayed constant, or that a downstream pipeline preserved its samples.

Diagnose one concrete gap with a fixed time range and a raw selector before changing timeouts or dashboard settings. Save the selector, scrape interval, evaluation step and deployment timeline. Otherwise a dashboard refresh can move the evidence while you investigate it.

## Separate missing observations from missing rates

Compare the raw counter with its derived rate:

```promql
checkout_requests_total{job="checkout"}
```

```promql
rate(checkout_requests_total{job="checkout"}[5m])
```

Under ordinary counter behavior, a rate needs enough samples to establish change. A new label set may already have a raw sample but not yet have a useful rate. A recording rule can also miss an evaluation while raw ingestion remains healthy. Query both the stored recording rule and its source expression at the same instant.

Inspect range data with a query step near the scrape interval. A large dashboard step can hide short-lived series or make a sparse recording rule appear continuous. Even at a small step, an instant selector can reuse an earlier sample within the lookback period. To inspect stored sample timestamps, evaluate a range-vector selector such as `checkout_requests_total{job="checkout"}[5m]` as an instant query at the end of the interval. A graph renderer's interpolation is not evidence that the underlying samples exist.

## Ask whether the successful scrape returned the family

```promql
up{job="checkout"} == 1
unless on (job, instance)
checkout_requests_total{job="checkout"}
```

This returns targets with `up=1` and no matching counter series at the query time, provided `job` and `instance` match on both sides and uniquely identify each target. Adjust the matching labels if needed. Treat the absence as unexpected only if the family should be initialized before the first request; relabeling can also remove a family that was exposed. Also inspect `scrape_samples_scraped` and `scrape_samples_post_metric_relabeling`. A sudden difference can identify a newly deployed drop rule.

Fetch the exporter endpoint through the same network path and authentication configuration as the scraper. A load balancer in front of multiple exporter instances can alternate between different metric sets while returning success each time. Prefer scraping individual instances with stable discovery identities.

## Understand the staleness boundary

Prometheus does not promise to carry every missing value forward for five minutes. Its normal scrape path marks series stale when they cease to be returned; instant selectors stop returning stale series. The lookback period applies when finding a usable recent sample and should not be interpreted as a missing-data grace period. Exporter-provided timestamps have additional behavior, including configurable timestamp staleness tracking. Check the [querying basics](https://prometheus.io/docs/prometheus/latest/querying/basics/) and the actual scraper's timestamp settings.

Use a recent-presence query to inspect what arrived:

```promql
count_over_time(checkout_requests_total{job="checkout"}[5m])
```

This is a sample count, not a request count. After observations stop, the count generally falls as older samples leave the five-minute window; once no samples remain, the series is absent from the result rather than returning zero. It cannot recover missing values or establish their business meaning.

## Treat label changes as identity changes

Prometheus identifies a series by its metric name and complete label set. Compare old and new values of `instance`, `pod`, `version`, region and instrumentation labels. A rolling upgrade that changes one label creates new series even when the application counter itself was not intentionally renamed.

To view service traffic across instance changes:

```promql
sum by (service, region) (
  rate(checkout_requests_total[5m])
)
```

Compute each counter's rate before aggregation. Keep the raw identities available for investigation, while using stable service dimensions for alerts. An alert carrying a changing pod or version label can repeatedly restart its pending period even when the service problem never recovered.

## Investigate Collector handoffs as state transitions

A Prometheus receiver is stateful: two Collector replicas independently scraping the same targets can produce overlapping streams. A handoff can also leave a collection gap. Cumulative-to-delta conversion adds another stateful boundary, because the new process may not have the previous value needed to calculate the next delta.

OpenTelemetry's [metrics data model](https://opentelemetry.io/docs/specs/otel/metrics/data-model/) describes stream identity, temporality and single-writer expectations. During a handoff, inspect target ownership, process restart time, resource identity, start timestamps and the backend's duplicate or out-of-order rejection evidence. Do not infer successful ingestion solely from an exporter returning success.

Compare the same metric locally and in the remote backend. Present locally but absent remotely narrows the investigation to transport, transformations and ingestion. Absent locally with `up=1` directs attention to exporter behavior, relabeling and target identity.

## Reproduce the transition

Replay a controlled rollout: start the new collector, move one target, stop the old owner, and inspect raw samples and derived rates. Record the maximum gap and whether alerts preserve their labels. Test the startup period, a complete scrape interval lost during handoff, and a renamed resource attribute.

## Conclusion

Successful scrapes and continuous series are separate contracts. Start with raw presence, inspect identity and staleness, then follow stateful collector ownership into the backend. That sequence identifies which boundary lost continuity without disguising a real gap with zero filling or a larger dashboard window.
