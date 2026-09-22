# Validation Summary: How to Convert Classic to Native Histograms During Prometheus Scraping

## Status
validated

## Post Type
Technical guide with scrape configuration, OpenMetrics exposition, and PromQL migration examples.

## Technologies Covered
- Prometheus scraping and time-series storage
- Native histograms with custom buckets (NHCBs) and classic histograms
- OpenMetrics 1.0 and Prometheus text exposition
- YAML scrape configuration
- PromQL histogram queries
- promtool, federation, and remote write

## Sources Consulted
- Prometheus native histogram specification: https://prometheus.io/docs/specs/native_histograms/#scraping-classic-histograms-as-nhcbs
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- PromQL histogram and rate functions: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile
- OpenMetrics 1.0 specification: https://prometheus.io/docs/specs/om/open_metrics_spec/
- promtool command reference: https://prometheus.io/docs/prometheus/latest/command-line/promtool/
- Prometheus storage documentation: https://prometheus.io/docs/prometheus/latest/storage/
- Author profile link: https://github.com/nawazdhandala

## Issues Found
No technical issues found.

## Review Notes
- Reviewed every exposition, YAML, and PromQL example against official documentation. The README required no changes.
- The exposition has valid metadata, cumulative integer counts, ordered unique boundaries, consistent labels, matching total and overflow counts, and an EOF marker. Its sum is consistent with a possible set of observations in the displayed buckets.
- Confirmed the scrape option names, supported protocol identifiers, classic retention behavior, independence of conversion from native scraping for classic-only responses, and precedence when actual native samples are ingested.
- Confirmed that conversion preserves explicit boundaries without recovering observations within buckets. Custom-layout aggregation retains shared boundaries and can reduce resolution.
- The selectors, histogram_count expression, and both p95 expressions are valid. Applying rate before aggregation supports counter-reset handling; native histogram aggregation does not require the le label.
- The post correctly advises checking downstream consumers, avoiding duplicate-job aggregation, and validating configuration with the deployed version of promtool. Changing scrape configuration affects future ingestion rather than rewriting historical blocks.
- Version caveat: the guide explicitly requires a release supporting the listed configuration fields. Older installations must check their own release documentation and binary before adopting the example.
- Remote-write caveat: send_native_histograms controls native samples with the original remote-write message format; the io.prometheus.write.v2.Request format always enables them. Receiver compatibility still matters.
- The documentation and author links resolve to the intended resources.
- This was a documentation and static-example review. No live exporter, Prometheus ingestion, restart, federation, or remote-write integration test was performed.
