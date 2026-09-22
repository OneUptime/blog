# Validation Summary: How to Diagnose Missing Native Histograms in Prometheus Scrapes

## Status
validated

## Post Type
Technical troubleshooting guide with shell, YAML, and PromQL examples.

## Technologies Covered
- Prometheus scrape configuration and protocol negotiation
- OpenMetrics 1.0 text and Prometheus protobuf exposition
- Classic and native histograms, including native histograms with custom buckets (NHCB)
- PromQL histogram quantiles and rates
- HTTP, curl, metric relabeling, and remote write

## Sources Consulted
- Prometheus native histogram specification: https://prometheus.io/docs/specs/native_histograms/
- Prometheus configuration reference (scrape options, conversion cases, limits, relabeling, remote write): https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus query function reference: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile
- Prometheus 3.8.0 release notes: https://github.com/prometheus/prometheus/releases/tag/v3.8.0
- Prometheus scrape protocol content negotiation: https://prometheus.io/docs/instrumenting/content_negotiation/
- Prometheus exposition formats: https://prometheus.io/docs/instrumenting/exposition_formats/
- Official curl manual: https://curl.se/docs/manpage.html

## Issues Found
- The statement that classic buckets remain available after disabling native scraping omitted the effect of classic-to-NHCB conversion. Qualified this statement: classic bucket series are retained unless conversion is enabled without `always_scrape_classic_histograms: true`. The official configuration reference explicitly describes this combination. Only this sentence was changed in README.md.

## Review Notes
- Confirmed the distinction between classic float series and native histogram samples, and the OpenMetrics 1.0 limitation. The format claim is explicitly versioned and should not be generalized to every OpenMetrics version.
- Confirmed that Prometheus 3.8 introduced the stable native scraping configuration model. Older installations need version-specific configuration; the post already states this caveat.
- Checked the YAML structure, scrape option names, protocol identifiers, and static target syntax against the configuration reference. The example explicitly requests protobuf first.
- Confirmed the documented native-only protobuf fallback with a sole +Inf bucket when native scraping is disabled. It cannot provide finite bucket resolution. Keeping classic components does not reconstruct finite classic boundaries.
- Checked all four PromQL expressions against the function reference. Native quantiles use the base metric; classic aggregation retains le. The p95 examples aggregate across all matching series, while the diagnostic selectors restrict the job. A single classic +Inf bucket is insufficient for a quantile and produces NaN.
- Checked curl flags: -f handles HTTP errors, -s suppresses progress, -S retains error reporting, -D writes response headers, -o writes the body, and -H sets Accept. The header matches the documented OpenMetrics 1.0 media type. The response Content-Type still determines the returned format.
- Confirmed the scrape-failure and metric-relabeling guidance. Remote-write delivery also depends on the selected message format and receiver support; the v2 request format always sends native histograms, whereas the older format uses send_native_histograms.
- The three technical documentation links resolve to the intended official resources. The author link has the expected GitHub profile URL structure.
- Validation was based on official documentation and static review. Shell syntax was checked with bash -n. No live scrape or PromQL evaluation was performed against the illustrative internal exporter endpoint.
