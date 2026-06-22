# Validation Summary: How to Fix 'API Not Enabled' Errors in GCP

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Google Cloud Platform APIs and services
- Google Cloud CLI (`gcloud services`, `gcloud org-policies`, `gcloud monitoring policies`)
- Service Usage API
- Terraform Google provider (`google_project_service`)
- Python Google Cloud Service Usage client library
- Cloud Monitoring alerting policies

## Sources Consulted
- Google Cloud Service Usage overview: https://docs.cloud.google.com/service-usage/docs/overview
- Google Cloud Service Usage enable/disable services guide: https://docs.cloud.google.com/service-usage/docs/enable-disable
- Google Cloud CLI `gcloud services enable` reference: https://docs.cloud.google.com/sdk/gcloud/reference/services/enable
- Google Cloud CLI `gcloud services list` reference: https://docs.cloud.google.com/sdk/gcloud/reference/services/list
- Google Cloud CLI `gcloud services disable` reference: https://docs.cloud.google.com/sdk/gcloud/reference/services/disable
- Service Usage IAM roles: https://docs.cloud.google.com/service-usage/docs/access-control
- Service Usage Python client reference: https://docs.cloud.google.com/python/docs/reference/serviceusage/latest/google.cloud.service_usage_v1.services.service_usage.ServiceUsageClient
- Service Usage Python `ListServicesRequest` reference: https://docs.cloud.google.com/python/docs/reference/serviceusage/latest/google.cloud.service_usage_v1.types.ListServicesRequest
- Terraform `google_project_service` resource reference: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_project_service
- GKE cluster creation prerequisites: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/creating-a-zonal-cluster
- Artifact Registry transition from Container Registry: https://docs.cloud.google.com/artifact-registry/docs/transition/transition-from-gcr
- Cloud Run deploy from source documentation: https://docs.cloud.google.com/run/docs/deploying-source-code
- Cloud Run functions build process overview: https://docs.cloud.google.com/functions/docs/building
- Cloud SQL private services access documentation: https://docs.cloud.google.com/sql/docs/private-ip
- Cloud Monitoring alert policy CLI reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Service Runtime monitoring metric examples: https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/sli-metrics/req-resp-metrics
- Organization policy constraints reference: https://docs.cloud.google.com/resource-manager/docs/organization-policy/org-policy-constraints

## Issues Found
- The architecture diagram referred to the Service Management API for enabled-service checks. Changed this to Service Usage API, which is the Google Cloud service used to list, enable, and disable APIs and services.
- The post claimed every GCP service is accessed through an API and implied API enablement alone controls access. Narrowed this to "most Google Cloud services" and clarified that API enablement reduces accidental usage rather than replacing IAM authorization.
- Several "required API" lists included APIs that are optional for common workflows, such as OS Login, IAP, Eventarc, BigQuery Storage API, and BigQuery Data Transfer API. Updated the examples to mark optional APIs as feature-dependent.
- Removed `containerregistry.googleapis.com` from recommended enablement lists because Container Registry is deprecated and writes to Container Registry were shut down on March 18, 2025. Artifact Registry is the recommended replacement.
- Removed overbroad dependency claims from the dependency map, including Cloud SQL's dependency on Compute Engine and GKE's dependency on Cloud Resource Manager. Kept Service Networking only for Cloud SQL private IP usage.
- Fixed the Terraform comment for `disable_dependent_services`; it controls behavior when disabling dependent services and does not wait for API propagation.
- Fixed the Cloud Monitoring alert command. The previous flags `--condition-threshold-value` and `--condition-threshold-comparison` are not current `gcloud monitoring policies create` flags. Replaced them with `--if`, `--duration`, `--trigger-count`, added an aggregation, corrected the Service Runtime metric filter syntax, and used the stable `gcloud monitoring policies create` command.

## Review Notes
- The Python sample is syntactically valid and matches the current Service Usage client shape, but it assumes Application Default Credentials and that the Service Usage API is already usable in the controlling project.
- The Terraform examples are illustrative. Real projects might need provider configuration, explicit networks/subnetworks, billing, IAM, and longer timeouts depending on organization policies and project setup.
