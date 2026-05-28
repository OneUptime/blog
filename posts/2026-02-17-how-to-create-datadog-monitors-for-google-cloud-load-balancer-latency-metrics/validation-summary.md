# Validation Summary: How to Create Datadog Monitors for Google Cloud Load Balancer Latency Metrics

## Status
validated

## Post Type
Technical tutorial

## Technologies Covered
- Google Cloud Load Balancing
- Google Cloud Monitoring metrics
- Datadog Google Cloud integration
- Datadog metric, anomaly, and composite monitors
- Datadog dashboards
- Terraform Datadog provider
- gcloud CLI

## Sources Consulted
- Datadog Google Cloud Platform integration documentation: https://docs.datadoghq.com/integrations/google_cloud_platform/
- Datadog Google Cloud Load Balancing integration metrics: https://docs.datadoghq.com/integrations/google-cloud-loadbalancing/
- Datadog composite monitor documentation: https://docs.datadoghq.com/monitors/types/composite/
- Datadog Terraform provider monitor examples: https://registry.terraform.io/providers/DataDog/datadog/latest/docs/guides/monitors
- Google Cloud Load Balancing metrics documentation: https://cloud.google.com/load-balancing/docs/metrics
- Google Cloud Monitoring monitored resource descriptors: https://cloud.google.com/monitoring/api/resources
- gcloud projects add-iam-policy-binding reference: https://cloud.google.com/sdk/gcloud/reference/projects/add-iam-policy-binding
- gcloud iam service-accounts add-iam-policy-binding reference: https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/add-iam-policy-binding

## Issues Found
- The Datadog GCP integration setup used a downloaded service account key. Datadog's current setup uses service account impersonation, so the instructions now grant the documented project roles and Service Account Token Creator access to the Datadog principal.
- The latency examples used base metric names such as `gcp.loadbalancing.https.total_latencies` with `percentile(...)` queries. Datadog exposes Google Cloud load balancer latency distribution values as `.avg`, `.p95`, and `.p99` metric names, so the monitor and dashboard queries were updated accordingly.
- The total latency description said the measurement ends when the load balancer sends the last response byte. Google Cloud and Datadog document the metric as ending when the proxy sees the client ACK for the last response byte, so that explanation was corrected.
- The backend latency explanation implied that total minus backend latency precisely measures load balancer overhead. This was softened because the comparison separates backend processing from the rest of the path but is not a precise load balancer overhead measurement.
- The first monitor message referenced `backend_target_name` and `matched_url_path_rule` template variables even though the query grouped only by `url_map_name`. Those unavailable template references were removed.
- The anomaly query used the wrong latency metric name and omitted documented anomaly monitor parameters. The query now uses the `.p95` metric with alert window, interval, count-default-zero, and seasonality parameters.
- The dashboard included a `p50` latency query for a metric variant that Datadog does not document for this integration. It now charts the documented average, p95, and p99 metrics.
- The composite monitor example used two raw metric queries joined with `&&`. Datadog composite monitors are defined in terms of existing monitor IDs, so the example now uses Terraform references to non-composite monitors.
- The scheduling tip said Datadog scheduling can adjust monitor thresholds. It now distinguishes notification/evaluation scheduling from using separate monitors for different threshold values.

## Review Notes
The gcloud CLI was not installed in the local environment, so command syntax was checked against the official Google Cloud SDK reference instead of local `--help` output.
