# Validation Summary: How to Monitor Memorystore for Redis with Cloud Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Memorystore for Redis
- Google Cloud Monitoring (formerly Stackdriver)
- gcloud CLI
- Terraform (Google provider)
- Python (`google-cloud-monitoring` SDK, `monitoring_v3`)
- Cloud Monitoring Dashboard API
- Cloud Monitoring Alerting API

## Sources Consulted
- Google Cloud Memorystore for Redis metrics reference (https://cloud.google.com/memorystore/docs/redis/supported-monitoring-metrics)
- Google Cloud Monitoring API v3 alerting policy documentation (https://cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alertPolicies)
- Google Cloud Monitoring filter syntax (https://cloud.google.com/monitoring/api/v3/filters)
- Terraform `google_monitoring_alert_policy` resource documentation (https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/monitoring_alert_policy)
- Terraform `google_monitoring_notification_channel` resource documentation (https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/monitoring_notification_channel)
- Python `google-cloud-monitoring` SDK reference (https://cloud.google.com/python/docs/reference/monitoring/latest)
- Cloud Monitoring Dashboard API documentation (https://cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.dashboards)
- gcloud monitoring command group reference (https://cloud.google.com/sdk/gcloud/reference/monitoring)

## Issues Found
No technical issues found.

## Review Notes
- The `gcloud monitoring metrics list` and `gcloud monitoring read` commands may require `alpha` or `beta` release track prefixes depending on the gcloud SDK version installed. The post correctly uses `gcloud alpha` for `monitoring policies create`, but the metrics listing and reading commands are shown without a release track prefix. This is a minor inconsistency — readers should check their installed gcloud version.
- The Python value extraction pattern `point.value.double_value or point.value.int64_value` is a common shorthand but is technically imperfect: if a metric's actual double value is `0.0`, it would fall through to `int64_value` due to Python's truthiness rules. This is unlikely to cause issues for the metrics discussed (memory usage, keyspace hits/misses) but is worth noting for readers adapting the code.
- The dashboard JSON filter strings use implicit AND (space-separated conditions) while the alerting policy JSON uses explicit `AND`. Both are valid in Cloud Monitoring filter syntax, but the inconsistency may confuse readers new to the filter language.
- All Terraform resource configurations, attribute names, and block structures are correct for the Google provider.
- The alerting thresholds chosen (80% memory, 10s replication lag) are reasonable production defaults.
