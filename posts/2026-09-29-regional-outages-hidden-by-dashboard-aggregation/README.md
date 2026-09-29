# Why Dashboard Aggregation Hides Regional Outages and How to Detect Them

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Monitoring, Prometheus, Dashboard, SLO

Description: Preserve regional failure boundaries in SLIs and dashboards, detect missing regions explicitly, and avoid global aggregates that conceal outages.

A global success chart can remain green while one region is completely unavailable. If that region normally handles only 1% of traffic, a total regional failure may look like a small global error increase. If requests never reach the application, the region can disappear from the denominator entirely.

Keep a global view for overall customer impact, but retain views aligned with independent failure domains. A regional outage should be visible as a regional failure even when the global average stays within its threshold.

## Compute ratios from compatible totals

Suppose the application initializes successful and failed outcome counters. A regional error ratio is:

```promql
sum by (service, region) (
  rate(requests_total{outcome="error"}[5m])
)
/
sum by (service, region) (
  rate(requests_total[5m])
)
```

A global ratio can aggregate the numerator and denominator across regions, but should not average the regional percentages. Regions with ten and ten thousand requests need different traffic weights if the question is the fraction of all failed requests.

Both metrics are useful: the weighted global result describes aggregate impact, while the regional result exposes concentrated failure. Neither replaces the other. The [PromQL operator reference](https://prometheus.io/docs/prometheus/latest/querying/operators/) explains how aggregation changes the output label set.

## Do not assume absent traffic means success

When a region's ingress is unreachable, its application request counter may stop changing or vanish. A ratio computed only from surviving regions can improve during that outage. A zero denominator is also not proof of a healthy service.

Maintain an independent expected-region inventory:

```text
service_region_expected{service="checkout",region="eu-west-1"} 1
service_region_expected{service="checkout",region="us-east-1"} 1
```

Compare it with recent telemetry presence:

```promql
service_region_expected == 1
unless on (service, region)
max by (service, region) (
  present_over_time(requests_total[5m])
)
```

This detects complete absence of the selected metric for an expected region. It does not detect a frozen exporter repeating an old counter, so pair it with source freshness or a regional canary.

The expectation source must outlive the monitored region. Generating the expected set from the same application counters simply reproduces the disappearance. Prometheus's [absence and presence functions](https://prometheus.io/docs/prometheus/latest/querying/functions/) operate on observed series; they cannot invent missing region identities.

## Probe the actual regional path

A public global hostname may route the probe away from the failed region. That is valuable evidence that failover works, but it does not establish regional health. Run both global customer-path probes and region-specific checks whose routing behavior is known.

Verify DNS, CDN and load-balancer policies. A region-specific URL that still resolves through automatic failover may test a different backend than its name suggests. Record the observed region or backend identity in probe evidence where the application can expose it safely.

For an authenticated workflow, check a safe business transaction rather than only `/health`. A healthy load balancer can return a static response while checkout is unavailable. Google's [monitoring guidance](https://sre.google/sre-book/monitoring-distributed-systems/) emphasizes customer-visible symptoms alongside internal diagnostics.

## Design dashboards to reveal concentration

Show each expected region with an explicit state: healthy, failing, no traffic, missing telemetry or intentionally inactive. Keep the expected set visible even if no data arrives. Avoid panels that simply omit empty series and leave a row of healthy surviving regions.

Provide regional request volume next to the regional error ratio. A single error at very low volume can produce a large ratio; a minimum-volume policy may be appropriate for paging but should not turn the displayed region green. Preserve a separate synthetic failure signal for low-traffic regions.

Use regional latency distributions correctly. Aggregate histogram buckets by region before computing regional quantiles. Do not average p95 values from instances or regions; a percentile is not an additive quantity.

## Test failover and recovery

Simulate a regional application outage, an ingress outage that prevents requests arriving, missing telemetry and traffic fully rerouted elsewhere. The dashboard should distinguish those states. A successful failover may restore the global SLI while leaving the regional restoration task active.

During recovery, verify that the returning region handles real or controlled traffic correctly before marking it healthy. A zero-error idle region has not demonstrated successful service. Check routing, warmup and a bounded transaction canary.

## Conclusion

Global aggregates answer global questions. Regional failures require regional SLIs, expected-region inventory and probes that actually exercise the intended path. Keep missing data and rerouted traffic explicit so a healthy aggregate cannot hide a failed part of the service.
