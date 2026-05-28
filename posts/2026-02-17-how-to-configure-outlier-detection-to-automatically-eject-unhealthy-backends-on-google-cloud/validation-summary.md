# Validation Summary: How to Configure Outlier Detection to Automatically Eject Unhealthy Backends

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Load Balancing
- Backend services
- Outlier detection
- Google Cloud CLI
- Compute Engine REST API and Python client library
- Cloud Logging Log Analytics

## Sources Consulted
- Google Cloud Compute Engine REST API: backendServices.update and `outlierDetection` fields: https://docs.cloud.google.com/compute/docs/reference/rest/v1/backendServices/update
- Google Cloud Load Balancing guide for configuring outlier detection with exported/imported backend service YAML: https://docs.cloud.google.com/load-balancing/docs/l7-internal/setting-up-l7-cross-reg-serverless#enable-outlier-detection
- Google Cloud regional external Application Load Balancer traffic management guide, `outlierDetection` YAML fields: https://docs.cloud.google.com/load-balancing/docs/https/setting-up-reg-traffic-mgmt#configure_outlier_detection
- Google Cloud SDK reference for `gcloud compute backend-services update`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-services/update
- Google Cloud SDK reference for `gcloud compute backend-services get-health`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-services/get-health
- Google Cloud Python client library `OutlierDetection` reference: https://cloud.google.com/python/docs/reference/compute/latest/google.cloud.compute_v1.types.OutlierDetection
- Google Cloud Python client library `BackendServicesClient` reference: https://docs.cloud.google.com/python/docs/reference/compute/latest/google.cloud.compute_v1.services.backend_services.BackendServicesClient

## Issues Found
- The original `gcloud compute backend-services update --outlier-detection=...` examples used a flag that is not present in the current official `gcloud compute backend-services update` reference. Replaced those command examples with the documented export/edit/import workflow using `gcloud compute backend-services export`, YAML `outlierDetection` blocks, and `gcloud compute backend-services import`.
- The post described outlier ejection as a single load-balancer-wide backend removal. Google Cloud documents that outlier detection is performed independently by each proxy instance. Updated the explanation and `maxEjectionPercent` pitfall to reflect per-proxy ejection behavior.
- The monitoring section said `get-health` shows outlier detection status and suggested a specific `backend_connection_closed` log pattern as an outlier ejection event. Official docs describe `get-health` as health-check status, not outlier ejection state. Updated the section to use `get-health` for configured health checks and recommend load balancer logs/error-rate metrics for ejection signals.
- Several parameter descriptions used obsolete CLI-style kebab-case names after changing the examples to YAML. Updated descriptions to the Compute Engine API/YAML field names, such as `consecutiveErrors`, `baseEjectionTime`, and `successRateStdevFactor`.

## Review Notes
Success-rate outlier detection fields are not supported for backend services using serverless NEGs. The post's examples are otherwise valid for supported backend service types, but future edits could call out that limitation explicitly if the article is expanded to cover Cloud Run, App Engine, or Cloud Functions backends.
