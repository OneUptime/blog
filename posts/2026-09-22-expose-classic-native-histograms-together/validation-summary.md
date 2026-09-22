# Validation Summary: How to Expose Classic and Native Histograms Together Without Duplicate-Series Surprises

## Status
validated

## Post Type
Technical migration guide with Go instrumentation, Prometheus scrape configuration, and PromQL examples.

## Technologies Covered
- Go and the standard net/http package
- Prometheus client_golang and promhttp
- Classic and native histograms
- Prometheus protobuf and OpenMetrics 1.0 text exposition
- Prometheus 3.8+ scrape configuration and PromQL
- Recording rules, federation, and remote-write migration

## Sources Consulted
- Go client HistogramOpts and registry API: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus#HistogramOpts
- HTTP metrics handler options: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus/promhttp#HandlerOpts
- Go HTTP server API: https://pkg.go.dev/net/http#ListenAndServe
- Current Prometheus scrape configuration: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Version-pinned Prometheus 3.8.0 configuration: https://raw.githubusercontent.com/prometheus/prometheus/v3.8.0/docs/configuration/configuration.md
- Native histogram specification and migration considerations: https://prometheus.io/docs/specs/native_histograms/
- PromQL histogram and rate functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus time-series identity: https://prometheus.io/docs/concepts/data_model/

## Issues Found
- The heading “Expect quantiles to differ slightly” implied that differences are necessarily small. Classic bucket widths and interpolation can produce substantial differences from native estimates. Removed “slightly” from the heading; the existing explanation and comparison guidance remain accurate.

## Review Notes
- Verified explicit classic boundaries and NativeHistogramBucketFactor can coexist in one Go histogram. The observations share count and sum; duplicate registration is unnecessary.
- Confirmed the three scrape settings and protocol identifiers against both current documentation and the version-pinned 3.8.0 configuration reference. Native ingestion and classic retention must both be enabled for dual ingestion of a histogram exposing both representations.
- Protobuf carries both representations. The statement about text support explicitly concerns OpenMetrics 1.0 and should not be generalized to later protocol versions. EnableOpenMetrics permits additional negotiation; it does not prevent protobuf negotiation.
- Both PromQL expressions use rate before aggregation and compare the same event stream. Adding their results would double-count observations. Base-name native series and suffixed classic series normally have distinct identities.
- The example records only two startup observations. It demonstrates exposition; ongoing RPC observations are needed for meaningful nonzero steady-state rates, as the post already explains.
- The loopback target assumes the exporter and Prometheus can access the same loopback network namespace.
- Disabling classic retention suppresses accompanying classic data when native samples are ingested. A text-only fallback or classic-only target can still produce classic series; the instruction to confirm native queries remains relevant.
- Reviewed retention, consumer migration, resource costs, and native-only bucket limitations. Existing historical data remains available until retention removes it. No terminal command examples required validation.
- All four technical documentation links in the post resolved to the intended official resources.
- Configuration and PromQL were checked against documentation; no full Prometheus ingestion or remote-write integration test was run.
- Extracted the exact Go example into a temporary module and successfully built it with client_golang v1.23.2. Ran the executable, confirmed classic buckets, count 2 and sum 0.4 in text exposition, and verified successful protobuf content negotiation. The protobuf payload was not decoded in this smoke check.
