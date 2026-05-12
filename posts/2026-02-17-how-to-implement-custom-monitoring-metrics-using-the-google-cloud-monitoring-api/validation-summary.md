# Validation Summary: How to Implement Custom Monitoring Metrics Using the Google Cloud Monitoring API

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Monitoring (Cloud Monitoring API v3)
- Custom metrics (gauge, cumulative, distribution)
- Python `google-cloud-monitoring` client (`monitoring_v3`)
- Go `cloud.google.com/go/monitoring/apiv3/v2` client
- `gcloud` CLI (`gcloud monitoring policies`, `gcloud auth`)
- Cloud Monitoring REST API (`monitoring.googleapis.com/v3`)

## Sources Consulted
- Cloud Monitoring API reference: https://cloud.google.com/monitoring/api/ref_v3/rest
- `projects.metricDescriptors.create`: https://cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.metricDescriptors/create
- `projects.timeSeries.create`: https://cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.timeSeries/create
- Custom metrics overview: https://cloud.google.com/monitoring/custom-metrics
- `gcloud monitoring` help output (561.0.0) — confirmed no `metric-descriptors` subgroup exists in either GA or alpha
- `gcloud monitoring policies create --help` and `gcloud alpha monitoring policies create --help` — confirmed flag set
- Python proto-plus monitoring client patterns
- Go monitoring client: https://pkg.go.dev/cloud.google.com/go/monitoring/apiv3/v2

## Issues Found

1. **Non-existent gcloud command for creating metric descriptors.** The post showed `gcloud monitoring metrics-descriptors create ...`, but the `gcloud monitoring` command group has no `metrics-descriptors` (or `metric-descriptors`) subgroup at all — neither in GA nor alpha. The only direct CLI approach is to call the REST API. Replaced this section with an equivalent `curl` invocation against `https://monitoring.googleapis.com/v3/projects/{PROJECT_ID}/metricDescriptors`, including obtaining an access token with `gcloud auth print-access-token`. The JSON body uses the documented camelCase field names (`metricKind`, `valueType`, `displayName`, etc.).

2. **Invalid flags on the alert policy command.** The original `gcloud alpha monitoring policies create` example used flags that do not exist: `--condition-threshold-value`, `--condition-threshold-comparison`, `--condition-threshold-duration`, `--condition-threshold-aggregation-alignment-period`, and `--condition-threshold-aggregation-per-series-aligner`. The actual command (now also GA as `gcloud monitoring policies create`) accepts `--if='> 10'` (combining comparison and threshold value), `--duration=300s`, and an `--aggregation` flag that takes a JSON/YAML object (e.g. `'{"alignmentPeriod": "60s", "perSeriesAligner": "ALIGN_RATE"}'`). Rewrote the command using the correct flag set and switched to the GA `gcloud monitoring policies create` since the feature is no longer alpha-only.

## Review Notes
- The Python samples use `from google.api import metric_pb2, label_pb2` and access enums via `metric_pb2.MetricDescriptor.MetricKind.CUMULATIVE` / `label_pb2.LabelDescriptor.ValueType.STRING`. This matches the official Google samples for the `google-cloud-monitoring` library. Modern code can equivalently use `monitoring_v3.MetricDescriptor.MetricKind.CUMULATIVE` via the proto-plus wrapper, but the existing form is correct.
- The cumulative example uses `start_time = end_time - 60`. For true cumulative semantics the `start_time` should be the fixed time at which the cumulative counter started (and remain constant across data points), not a sliding 60-second window. Cloud Monitoring still accepts the data as long as `start_time < end_time`, and Google's own tutorial uses this 60-second pattern, so the example is technically valid but readers running a real cumulative pipeline should keep `start_time` constant across writes.
- For distribution metrics, `len(bucket_counts) == len(bucket_boundaries) + 1` is required by the API; the example handles this correctly.
- The Go imports (`metricpb "google.golang.org/genproto/googleapis/api/metric"`, `monitoredrespb "google.golang.org/genproto/googleapis/api/monitoredres"`) still resolve, though the genproto packages have been progressively split out into per-module copies. They remain backward compatible.
- `client.CreateTimeSeries(ctx, req)` in Go returns only `error` (not `(*emptypb.Empty, error)`), which matches the code.
