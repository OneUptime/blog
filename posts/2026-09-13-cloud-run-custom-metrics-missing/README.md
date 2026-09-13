# Export Cloud Run Custom Metrics When Only Logs Appear

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cloud Run, Google Cloud, Cloud Monitoring, Monitoring, Troubleshooting

Description: Trace metric creation, export, IAM, resource labels, and query filters separately so missing Cloud Run application metrics become diagnosable.

---

A Cloud Run service writes logs successfully, but a custom metric never appears. Printing a counter or exposing a `/metrics` endpoint does not automatically create a time series in Cloud Monitoring. Logs and metrics use different ingestion paths.

Trace one metric through four stages: the application creates a measurement, an exporter sends it, the backend accepts it, and a query selects it. Successful logs show only that the logging path worked.

## Choose the intended ingestion path

Cloud Run supports custom metric collection through sidecars, and log-based metrics provide another option. Decide which path your deployment actually uses. [Cloud Run monitoring](https://docs.cloud.google.com/run/docs/monitoring).

| Application output | Required path |
| --- | --- |
| Prometheus text endpoint | A collector that scrapes each instance and exports samples |
| OTLP metrics | An OTLP receiver and configured metrics exporter |
| Direct Monitoring API calls | Correct time-series requests and Monitoring permissions |
| Structured log events | A configured log-based metric matching those events |

An OpenTelemetry setup that exports traces may have no metric reader or metrics pipeline. A collector receiving OTLP on one port may not have its metrics pipeline connected to the intended exporter.

## Prove ingestion with one controlled point

Use a single diagnostic write to separate backend access from periodic export behavior. The following illustrative Python code writes a gauge using `google-cloud-monitoring`. Run it once in a controlled administrative path, with `METRICS_PROJECT_ID` explicitly configured:

```python
import os
import time

from google.cloud import monitoring_v3

project_id = os.environ["METRICS_PROJECT_ID"]
client = monitoring_v3.MetricServiceClient()

series = monitoring_v3.TimeSeries()
series.metric.type = "custom.googleapis.com/diagnostics/export_probe"
series.resource.type = "global"
series.resource.labels["project_id"] = project_id

now_ns = time.time_ns()
point = monitoring_v3.Point({
    "interval": {
        "end_time": {
            "seconds": now_ns // 1_000_000_000,
            "nanos": now_ns % 1_000_000_000,
        }
    },
    "value": {"double_value": 1.0},
})
series.points = [point]

client.create_time_series(
    request={
        "name": "projects/" + project_id,
        "time_series": [series],
    },
    timeout=10,
)
print("Metric probe write completed")
```

The API can create a custom metric descriptor from the first write. Use a new diagnostic metric name if an incompatible descriptor already exists. The `global` resource is intentional for this single probe; it means you must query that resource, not Cloud Run Revision. Production metrics need a suitable resource model and writer identity. [Create user-defined metrics](https://docs.cloud.google.com/monitoring/custom-metrics/creating-metrics).

Do not run this unchanged from every request. Multiple instances would write the same series, and write frequency, ordering, and quota constraints would become separate problems.

## Check identity and errors

Enable the Monitoring API in the destination project and grant the runtime identity the necessary write permission, commonly through `roles/monitoring.metricWriter`:

```bash
gcloud services enable monitoring.googleapis.com \
  --project=example-project

gcloud projects add-iam-policy-binding example-project \
  --member=serviceAccount:metrics-writer@example-project.iam.gserviceaccount.com \
  --role=roles/monitoring.metricWriter
```

Verify that this is the identity attached to the serving revision. Permission to write logs is not evidence of `monitoring.timeSeries.create`. The [time-series create API](https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.timeSeries/create) documents the required permission and request constraints.

Log exporter errors without logging credentials. Distinguish permission denied, unavailable API, malformed resource labels, incompatible metric type, and point-ordering errors. Repeatedly changing dashboards cannot repair a rejected write.

If the probe succeeds but the regular exporter fails, the fault is likely in measurement creation, exporter configuration, or lifecycle timing rather than basic project write permission.

## Inspect the collector path

For Prometheus-style metrics, Cloud Run's documented sidecar scrapes a local endpoint and exports to Managed Service for Prometheus. Its default scrape target is port 8080 at `/metrics` every 30 seconds; a different endpoint requires matching configuration. [Prometheus sidecar](https://docs.cloud.google.com/run/docs/monitoring-managed-prometheus-sidecar).

Verify that the endpoint returns valid metrics and that the collector can reach it inside the instance. A successful request to the service URL might hit a different instance, so it does not prove the local scrape works for the instance being diagnosed.

For OTLP, verify protocol and port agreement, whether the SDK exports metrics, and whether the collector's metrics pipeline includes the exporter. Use Google's current [OTLP sidecar tutorial](https://docs.cloud.google.com/run/docs/tutorials/custom-metrics-opentelemetry-sidecar) as the deployment reference instead of mixing configuration fragments from unrelated collector distributions.

Periodic collection may require CPU outside active requests. Configure that need explicitly and account for the cost. A collector also needs startup and shutdown behavior compatible with the application. An accepted measurement buffered in a dying process is not yet an ingested sample.

## Query the correct namespace and resource

The direct probe uses `custom.googleapis.com/diagnostics/export_probe` and resource `global`. The Prometheus sidecar writes `prometheus.googleapis.com` metrics, with its own resource labels. Searching only for custom metrics under Cloud Run Revision can miss successfully exported Prometheus data.

Start with the destination project, a recent time range, and the exact metric name. Remove restrictive filters and aggregation until you see raw series, then add them back. Check whether the metrics scope includes the writing project.

For counters, distinguish raw values from rates. A single point can prove ingestion but may not produce a meaningful rate calculation. Use several correctly timed points to validate rate queries.

## Make the production model intentional

Use stable metric names and bounded labels. Avoid request IDs, user IDs, or full URLs as metric labels; those can create large numbers of time series. Keep detailed identifiers in logs and traces.

Choose one writer per series or include an appropriate instance identity. Define cumulative counter reset behavior across restarts and flush behavior during shutdown. Test an idle interval, a scale-out event, and instance replacement to expose lifecycle assumptions.

These examples validate API structure and an investigation method; they do not claim a live Cloud Run deployment was exercised.

## Conclusion

Follow a missing metric from measurement to accepted write to query selection. A controlled direct write isolates IAM and backend access, while collector logs reveal export failures. Once that path works, verify resource labels, namespace, lifecycle timing, and cardinality before relying on the metric for alerts.

## Official Documentation

- [Cloud Run monitoring](https://docs.cloud.google.com/run/docs/monitoring)
- [Create custom metrics](https://docs.cloud.google.com/monitoring/custom-metrics/creating-metrics)
- [Create time series API](https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.timeSeries/create)
- [Prometheus sidecar](https://docs.cloud.google.com/run/docs/monitoring-managed-prometheus-sidecar)
- [OTLP collector sidecar](https://docs.cloud.google.com/run/docs/tutorials/custom-metrics-opentelemetry-sidecar)
