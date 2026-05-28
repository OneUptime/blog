# Validation Summary: How to Create Custom Metrics in Cloud Monitoring Using the API

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Monitoring
- Cloud Monitoring API
- User-defined/custom metrics
- Python client library for Cloud Monitoring
- Node.js client library for Cloud Monitoring
- REST API with curl

## Sources Consulted
- Google Cloud Monitoring: Create user-defined metrics with the API - https://docs.cloud.google.com/monitoring/custom-metrics/creating-metrics
- Google Cloud Monitoring: User-defined metrics overview - https://docs.cloud.google.com/monitoring/custom-metrics/
- Google Cloud Monitoring: Value types and metric kinds - https://docs.cloud.google.com/monitoring/api/v3/kinds-and-types
- Google Cloud Monitoring: Quotas and limits - https://docs.cloud.google.com/monitoring/quotas
- Cloud Monitoring REST API: projects.metricDescriptors.list - https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.metricDescriptors/list
- Cloud Monitoring REST API: projects.metricDescriptors.delete - https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.metricDescriptors/delete
- Google Cloud SDK reference: gcloud monitoring - https://docs.cloud.google.com/sdk/gcloud/reference/monitoring

## Issues Found
- The Python metric descriptor example used `metric_pb2.LabelDescriptor.ValueType.STRING`, but `LabelDescriptor` is defined in `google.api.label_pb2`. Added the correct `label_pb2` import and updated label value type references.
- The custom metric prefix explanation was incomplete. Updated it to distinguish metrics created directly with `custom.googleapis.com/` from other user-defined metric domains such as workload, external user, and Prometheus metrics.
- The cumulative metric example did not ensure the metric was treated as a cumulative INT64 metric if the descriptor was auto-created. Added `series.metric_kind` and `series.value_type`, and clarified that the descriptor should be cumulative INT64 for counters.
- The rate-limit section had stale limits: it said one data point per time series per 10 seconds and 500 metric descriptors per project. Updated this to the current documented limits of one point per time series every 5 seconds, one point per time series per write request, 200 time series per write request, and 10,000 custom metric descriptors per project.
- The listing/deleting commands used a `gcloud monitoring metrics-descriptors` command group that is not present in the current `gcloud monitoring` reference. Replaced those commands with REST API `curl` examples for `metricDescriptors.list` and `metricDescriptors.delete`.

## Review Notes
The examples use the `global` monitored resource for simplicity. This is valid, but Google Cloud documentation recommends using a more specific resource such as `generic_node`, `generic_task`, `gce_instance`, or Kubernetes resource types when they fit the workload, because `global` has only a `project_id` label and can make sources harder to distinguish.
