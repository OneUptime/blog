# Validation Summary: How to Configure Rate Limiting and Quotas for Cloud Endpoints APIs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Endpoints
- ESPv2
- Service Control API
- OpenAPI 2.0 / Swagger
- Google Cloud CLI
- Cloud Monitoring
- Python requests
- Flask

## Sources Consulted
- Google Cloud Endpoints: Configuring quotas - https://docs.cloud.google.com/endpoints/docs/openapi/quotas-configure
- Google Cloud Endpoints: About quotas - https://docs.cloud.google.com/endpoints/docs/openapi/quotas-overview
- Google Cloud Endpoints: OpenAPI 2.0 extensions - https://docs.cloud.google.com/endpoints/docs/openapi/openapi-extensions
- Google Cloud SDK: gcloud alpha endpoints quota create - https://docs.cloud.google.com/sdk/gcloud/reference/alpha/endpoints/quota/create
- Google Cloud SDK: gcloud monitoring policies create - https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Cloud Monitoring: Chart and monitor quota metrics - https://docs.cloud.google.com/monitoring/alerts/using-quota-metrics
- Service Control API: services.allocateQuota - https://docs.cloud.google.com/service-infrastructure/docs/service-control/reference/rest/v1/services/allocateQuota
- Flask API documentation: after_request - https://flask.palletsprojects.com/en/stable/api/#flask.Flask.after_request

## Issues Found
- Cloud Endpoints OpenAPI quotas were described as supporting per-minute, per-day, and per-request granularities. Google Cloud documentation states that OpenAPI quota limits currently support only `1/min/{project}`. Removed the daily quota examples and updated the explanation and summary to refer to per-minute, per-project limits.
- The quota override commands used `gcloud endpoints quota override create` with `--limit`. The documented command is `gcloud alpha endpoints quota create`, using `--unit` and `--value`. Updated the override examples accordingly.
- The monitoring example used a non-existent `gcloud monitoring metrics list` command for quota usage. Replaced it with the documented Cloud Monitoring Metrics Explorer guidance and the equivalent Monitoring filter.
- The alerting command used stale command and flag names (`gcloud monitoring alerting policies create`, `--condition-threshold-value`, and `--condition-threshold-comparison`). Updated it to the documented `gcloud monitoring policies create` syntax with `--if` and `--duration`.
- The post implied quota checks happen exactly per request. Google Cloud documents that Endpoints batches quota calls and enforcement is approximate with margin. Updated the flow to say ESPv2 allocates quota through Service Control and added a note that the exact request receiving a 429 can vary.
- The Flask snippet referenced `app` without creating it. Added `app = Flask(__name__)` so the example is executable in context.
- The rate limit header section suggested values could come from Service Control. Service Control quota allocation responses do not provide simple remaining-limit header values to the backend, so the text and comment now say these values should come from the backend's own tracking.

## Review Notes
Cloud Endpoints quota support is documented as Beta / Pre-GA, and the gcloud quota override command is currently under `gcloud alpha`, so those interfaces might change. The post is accurate as of 2026-05-28 after the corrections above.
