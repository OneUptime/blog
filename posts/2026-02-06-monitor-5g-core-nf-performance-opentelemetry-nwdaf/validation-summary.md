# Validation Summary: How to Monitor 5G Core Network Function Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Go API
- Prometheus scraping
- OTLP exporter
- 5G Core network functions: AMF, SMF, UPF
- NWDAF / 3GPP Nnwdaf services
- Python requests

## Sources Consulted
- OpenTelemetry Go documentation: https://opentelemetry.io/docs/languages/go/
- OpenTelemetry Go metric API reference: https://pkg.go.dev/go.opentelemetry.io/otel/metric
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector Prometheus receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/prometheusreceiver/README.md
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- 3GPP TS 29.520 Nnwdaf_AnalyticsInfo OpenAPI: https://forge.3gpp.org/rep/all/5G_APIs/-/blame/c49ee90cfc1a8da784e4499c99b4098fbf9f5140/TS29520_Nnwdaf_AnalyticsInfo.yaml
- 3GPP TS 29.520 Nnwdaf_EventsSubscription OpenAPI: https://forge.3gpp.org/rep/all/5G_APIs/-/blame/6ed641674694d1e033dd57fb705c157778bbd4c2/TS29520_Nnwdaf_EventsSubscription.yaml

## Issues Found
- The Go example used `time.Now()` and `time.Since()` without importing the Go standard library `time` package. Added the missing import so the snippet is syntactically correct apart from the intentionally application-specific placeholder types and functions.
- The NWDAF bridge incorrectly described `Nnwdaf_AnalyticsInfo` as a POST ingestion endpoint for OTLP-derived metrics. The 3GPP OpenAPI defines `Nnwdaf_AnalyticsInfo` as a GET `/analytics` API for analytics retrieval, while `Nnwdaf_EventsSubscription` uses POST `/subscriptions` for creating subscriptions and callbacks for notifications. Updated the text and Python example to describe an implementation-specific NWDAF ingestion adapter instead of a standard 3GPP analytics info POST endpoint.
- The Python example imported `MetricReader` but did not use it. Removed the unused import while keeping the example focused on the bridge request.

## Review Notes
The OpenTelemetry Collector configuration follows the documented Prometheus receiver, resource processor, batch processor, and OTLP exporter patterns. The telemetry attribute names are custom 5G-domain labels rather than OpenTelemetry semantic convention attributes, which is acceptable for a domain-specific example but should be documented more explicitly if the post is expanded later.
