# Validation Summary: Why Dashboard Aggregation Hides Regional Outages and How to Detect Them

## Status
validated

## Post Type
Technical monitoring guide with PromQL examples and Prometheus metric exposition samples.

## Technologies Covered
- Prometheus and PromQL
- Request counters, histogram distributions, and regional aggregation
- Service-level indicators (SLIs) and service-level objectives (SLOs)
- Synthetic monitoring and regional transaction canaries
- DNS, CDN, load balancing, and regional failover

## Sources Consulted
- [Prometheus query operators](https://prometheus.io/docs/prometheus/latest/querying/operators/): aggregation labels, division, comparison filtering, operator precedence, and vector matching with `unless` and `on`.
- [Prometheus query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/): `rate`, `present_over_time`, absence functions, and histogram quantiles.
- [Prometheus querying basics](https://prometheus.io/docs/prometheus/latest/querying/basics/): range selectors and stale or missing series.
- [Prometheus instrumentation guidance](https://prometheus.io/docs/practices/instrumentation/): counter semantics, initialized series, and timestamp-based freshness monitoring.
- [Prometheus histograms and summaries](https://prometheus.io/docs/practices/histograms/): distribution aggregation and the inability to combine percentiles by averaging them.
- [Google SRE: Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/): customer-visible symptoms, black-box and white-box monitoring, traffic, errors, and latency.
- [Prometheus Blackbox Exporter configuration](https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md): HTTP response validation, redirects, and authenticated probes.
- [Amazon Route 53 active-active and active-passive failover](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-types.html): routing DNS answers toward healthy resources.
- [Author GitHub profile](https://github.com/nawazdhandala): verified that the post's author URL redirects to the intended profile.

## Issues Found
No technical issues found.

## Review Notes
- Both PromQL expressions are syntactically consistent with the current official documentation. The ratio applies `rate` before aggregation and retains matching `service` and `region` labels on both sides. The stated initialization of successful and failed counters is important for retaining a zero-error numerator.
- The expected-region query first filters inventory values to 1, then excludes service/region pairs with observed request samples. It detects complete metric absence across the five-minute range, rather than immediate scrape loss or partial instance loss. Repeated unchanged samples still count as presence, as the post correctly warns.
- The inventory samples use valid Prometheus text sample syntax. They illustrate a custom metric that must be provided independently; it is not a built-in regional inventory.
- Traffic-weighted global ratios and regional ratios answer different questions. For illustration, 10 failed requests in one region and 10,000 successful requests elsewhere produce a global error fraction of 10/10,010 (about 0.1%), while the unweighted mean of regional error percentages is 50%.
- Missing application observations cannot measure requests that never arrive. Idle counters, missing telemetry, and successful request handling therefore require distinct interpretations; zero divided by zero is not a successful SLI measurement.
- When implementing the histogram guidance with classic histograms, retain the `le` bucket label along with the regional/service grouping and aggregate bucket rates before computing a quantile. Native histograms do not require the classic `le` label. The post supplies conceptual guidance rather than a histogram query requiring correction.
- Regional routing checks, meaningful transaction probes, explicit dashboard states, and recovery exercises are sound operational recommendations. A successful global probe alone cannot establish that every regional backend is healthy.
- All external links in the post resolved to the intended resources. No version-specific claims, deprecated APIs, terminal commands, or deployable configuration files require correction.
- Review consisted of documentation verification and manual evaluation of query semantics; no live Prometheus deployment or regional fault-injection exercise was run. README.md was left unchanged.
