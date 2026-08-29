# Validation Summary: Why Averaging Per-Minute Success Rates Produces the Wrong SLO

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Service-level indicators (SLIs), service-level objectives (SLOs), and error budgets
- Request-based and windows-based SLO compliance
- Prometheus counters and time-series retention
- PromQL aggregation and the `increase()`, `rate()`, and `avg_over_time()` functions

## Sources Consulted

- [Google SRE Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/)
- [Google Cloud Observability: Concepts in service monitoring](https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring)
- [Google Cloud Observability: Constructs in the SLO API](https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/api/api-structures)
- [Cloud Monitoring REST API: `services.serviceLevelObjectives`](https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/services.serviceLevelObjectives)
- [Prometheus query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus querying basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Prometheus recording-rule best practices](https://prometheus.io/docs/practices/rules/)
- [Prometheus storage and retention](https://prometheus.io/docs/prometheus/latest/storage/)
- [Prometheus histograms and summaries](https://prometheus.io/docs/practices/histograms/)

## Issues Found

- The opening incorrectly said that averaging raw per-minute success percentages measures the fraction of minutes with a high rate. It actually measures the unweighted arithmetic mean of the minute-level ratios. The text now identifies that quantity correctly.
- The post said the unweighted and request-weighted calculations agree only when all minutes have equal traffic. Equal traffic guarantees agreement but is not necessary; unequal-traffic examples can also agree, such as when every minute has the same success rate. The claim now states the sufficient condition without presenting it as necessary.
- The windows-based discussion and conclusion conflated averaging raw minute ratios with counting good minutes. Both now state that each evaluated minute must first be classified against the goodness threshold, after which compliance is `good minutes / evaluated minutes`.
- The short-window PromQL example selects `sli_result="bad"`, so it calculates an error ratio rather than a success ratio. The introductory sentence now labels it explicitly as an error ratio.
- The windows-based behavior example implied that any minute containing 10,000 failures must consume budget. Since a sufficiently busy minute could still meet the percentage threshold, the text now explicitly describes that minute as bad.
- The 28-day PromQL example implicitly required 28 days of queryable samples. The text now states that the query backend must retain the full compliance window.

## Review Notes

- Both arithmetic examples were recalculated and are correct: `100 / 101` is approximately `99.01%`, while `9,999 / 10,001` is approximately `99.98%`.
- Both PromQL expressions are syntactically valid. They correctly apply `increase()` or `rate()` to each counter series before `sum()`, which preserves per-series counter-reset detection.
- Prometheus extrapolates `increase()` to the range boundaries, so its result can be fractional even for integer-valued counters. Missing or insufficient series can also produce an empty result, while exported zero-valued counters can produce `0 / 0` during an idle interval. The post correctly recommends testing idle intervals, missing scrapes, resets, and new instances rather than treating absent evidence as success.
- All outbound links resolve to the intended current pages. No version-specific or deprecated APIs are used.
