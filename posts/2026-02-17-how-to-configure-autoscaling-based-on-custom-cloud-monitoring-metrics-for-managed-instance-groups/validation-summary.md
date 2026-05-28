# Validation Summary: How to Configure Autoscaling Based on Custom Cloud Monitoring Metrics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Compute Engine managed instance groups
- Compute Engine autoscaling
- Cloud Monitoring custom metrics
- Google Cloud CLI
- Cloud Monitoring API
- Python Google Cloud Monitoring client
- Terraform Google provider

## Sources Consulted
- Google Cloud Compute Engine documentation: Scale based on Monitoring metrics, https://docs.cloud.google.com/compute/docs/autoscaler/scaling-cloud-monitoring-metrics
- Google Cloud SDK reference: `gcloud compute instance-groups managed set-autoscaling`, https://docs.cloud.google.com/sdk/gcloud/reference/compute/instance-groups/managed/set-autoscaling
- Google Cloud Monitoring documentation: Create user-defined metrics with the API, https://docs.cloud.google.com/monitoring/custom-metrics/creating-metrics
- Google Cloud Monitoring API reference: `projects.timeSeries.create`, https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.timeSeries/create
- Google Cloud Python client reference: `MetricServiceClient.create_time_series`, https://docs.cloud.google.com/python/docs/reference/monitoring/latest/google.cloud.monitoring_v3.services.metric_service.MetricServiceClient
- Terraform Google provider documentation: `google_compute_autoscaler`, https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_autoscaler
- Google Cloud Compute Engine documentation: Using an autoscaling policy with multiple signals, https://docs.cloud.google.com/compute/docs/autoscaler/multiple-signals
- Google Cloud Compute Engine REST reference: Autoscaler `scaleInControl`, https://docs.cloud.google.com/compute/docs/reference/rest/v1/autoscalers

## Issues Found
- The post used an undocumented `gcloud monitoring metrics-descriptors create` command to create a custom metric descriptor. Replaced it with a Cloud Monitoring API `metricDescriptors` request using `curl` and `gcloud auth print-access-token`, matching the documented API.
- The queue depth example published a global queue value as a `gce_instance` metric and then used a utilization target. For a total queue depth, Google Cloud documents `single_instance_assignment` as the correct autoscaling mode. Updated the Python sample to publish the metric on the `global` monitored resource with a `queue_name` label, and updated the gcloud and Terraform autoscaler examples to use `single_instance_assignment` with a matching metric filter.
- The post described `--stackdriver-metric-utilization-target-type` values as uppercase enum names and said GAUGE divides the total by the instance count. The gcloud flag values are `gauge`, `delta-per-minute`, and `delta-per-second`, and Google's documentation describes them as averaging recent values or rates. Updated the explanation and examples.
- The Terraform examples used `target` and `type` for a queue-depth metric that represents total work. Replaced these with `single_instance_assignment` and `filter`, which matches Terraform's documented custom metric autoscaler schema for per-group metrics.
- The scale-down control Terraform example used `scale_down_control` and `max_scaled_down_replicas`. Updated it to the current `scale_in_control` and `max_scaled_in_replicas` fields documented for the v1 autoscaler API and Terraform provider.
- The Python sample referenced an undefined `get_instance_id()` helper. Removing the per-instance resource labels for the global queue metric eliminated that undefined call.

## Review Notes
Local `gcloud` was not installed in the review environment, so CLI validation was performed against the official Google Cloud SDK reference instead of local `--help` output. The updated queue-depth publisher should run once per queue or from a dedicated exporter; running the same global time series publisher independently on every worker can cause duplicate writes to the same time series.
