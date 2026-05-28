# Validation Summary: How to Define and Monitor Service Level Objectives in Google Cloud Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Monitoring
- Cloud Monitoring SLO API
- Service Level Indicators and Service Level Objectives
- Google Cloud metrics and Monitoring filters
- Cloud Load Balancing metrics
- Cloud Run metrics
- Istio on GKE metrics
- Terraform Google provider
- curl and gcloud authentication

## Sources Consulted
- Google Cloud Monitoring REST API: ServiceLevelObjective resource and SLI schema: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/services.serviceLevelObjectives
- Google Cloud Monitoring REST API: services.create: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/services/create
- Google Cloud Monitoring REST API: services.list: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/services/list
- Google Cloud Monitoring REST API: services.serviceLevelObjectives.list: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/services.serviceLevelObjectives/list
- Google Cloud Monitoring REST API: services.serviceLevelObjectives.get: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/services.serviceLevelObjectives/get
- Google Cloud SLO monitoring concepts and supported service discovery: https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring
- Google Cloud defining a microservice: https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/ui/define-svc
- Google Cloud request-response service SLI metric examples: https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/sli-metrics/req-resp-metrics
- Google Cloud load balancer SLI metric examples: https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/sli-metrics/lb-metrics
- Google Cloud metrics list for Cloud Run and Service Runtime metrics: https://docs.cloud.google.com/monitoring/api/metrics_gcp_p_z
- Google Cloud Istio metrics list: https://docs.cloud.google.com/monitoring/api/metrics_istio
- Terraform Google provider google_monitoring_slo documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/monitoring_slo

## Issues Found
- The post used `gcloud monitoring services` and `gcloud monitoring slos` commands, but the current GA `gcloud monitoring` reference does not expose services or SLO command groups. Replaced those snippets with documented Cloud Monitoring REST API calls while keeping `gcloud auth print-access-token` for authentication.
- The service-discovery wording overstated automatic discovery for Cloud Run and GKE. Updated it to distinguish automatically discovered App Engine / Cloud Service Mesh / Istio services from GKE and Cloud Run candidates that can be defined as Monitoring services.
- The SLO creation snippets used CLI flags that did not match the documented REST SLO schema. Replaced them with `serviceLevelObjectives.create` JSON payloads using `requestBased.goodTotalRatio` and `requestBased.distributionCut`.
- The API example omitted the monitored resource type and used an imprecise metric label form. Updated the App Engine filter to include `resource.type="gae_app"` and the documented metric label syntax.
- The Terraform availability filter used `metric.labels.response_code_class`. Updated it to the documented Monitoring filter label syntax used in Google Cloud examples.
- The downtime comparison said 99.9% equals 8.6 minutes per month. Corrected it to about 43 minutes per 30-day month.
- The Cloud Run and Istio common SLI filters were missing monitored resource constraints and used less accurate label syntax. Updated them to include `cloud_run_revision` and `k8s_container` resource types and documented metric labels.

## Review Notes
The post is technically valid after edits. The examples still use placeholder project, service, and resource names; users must adjust filters to match the specific monitored resource labels for their service, such as load balancer URL map or backend labels.
