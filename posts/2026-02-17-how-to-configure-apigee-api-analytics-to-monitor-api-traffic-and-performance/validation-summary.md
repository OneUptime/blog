# Validation Summary: How to Configure Apigee API Analytics to Monitor API Traffic and Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apigee API Analytics
- Apigee Analytics API
- Apigee custom reports
- Apigee DataCapture policy and data collectors
- BigQuery analytics export
- Cloud Monitoring alerting policies
- Google Cloud Monitoring metrics
- SQL
- curl and gcloud authentication

## Sources Consulted
- Apigee API Analytics overview: https://docs.cloud.google.com/apigee/docs/api-platform/analytics/analytics-services-overview
- Apigee analytics metrics, dimensions, and filters reference: https://docs.cloud.google.com/apigee/docs/api-platform/analytics/analytics-reference
- Apigee custom reports REST resource: https://docs.cloud.google.com/apigee/docs/reference/apis/apigee/rest/v1/organizations.reports
- Apigee DataCapture policy: https://docs.cloud.google.com/apigee/docs/api-platform/reference/policies/data-capture-policy
- Collecting custom data with the DataCapture policy: https://docs.cloud.google.com/apigee/docs/api-platform/analytics/using-data-capture
- Managing Apigee data collectors: https://docs.cloud.google.com/apigee/docs/api-platform/system-administration/data-collectors
- Exporting Apigee analytics data: https://docs.cloud.google.com/apigee/docs/api-platform/analytics/export-data
- Apigee API Monitoring alerts and metrics: https://docs.cloud.google.com/apigee/docs/api-monitoring/alerts-notifications
- Cloud Monitoring alert policies REST API: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alertPolicies
- Cloud Monitoring Apigee metric types: https://docs.cloud.google.com/monitoring/api/metrics_gcp_a_b
- Cloud Monitoring monitored resource types: https://docs.cloud.google.com/monitoring/api/resources

## Issues Found
- The post claimed analytics data is stored for 90 days in a standard tier and longer with advanced analytics. Updated this to describe current retention as plan-dependent and note the documented 14-month retention for Pay-as-you-go organizations with the Apigee API Analytics add-on enabled.
- Custom report metric definitions used expressions such as `sum(message_count)` in the `name` field. Updated them to the documented `{"name": "message_count", "function": "sum"}` format.
- The custom analytics section used the older `StatisticsCollector` policy. Updated it to the current Apigee `DataCapture` policy flow, including required data collector resources with `dc_` names.
- The custom dimension query used `api_version`; updated it to query the data collector-backed dimension `dc_api_version`.
- The BigQuery export section implied that creating a datastore directly exports data. Clarified that the datastore is the export destination configuration and that an export request must reference it.
- The alert examples used a non-current Apigee `/environments/prod/alerts` endpoint and unsupported alert payload fields. Replaced them with Cloud Monitoring alert policy API examples using Apigee metric types and monitored resource labels.
- Updated the dashboard navigation and visualization wording to match current Google Cloud console and Looker Studio naming.

## Review Notes
The BigQuery SQL examples are plausible for exported analytics tables, but exact field availability can vary with export format and captured data. The alert examples omit notification channel resource names, so they create policies without notifications unless the reader adds `notificationChannels`.
