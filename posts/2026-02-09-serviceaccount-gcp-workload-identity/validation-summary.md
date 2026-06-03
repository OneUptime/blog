# Validation Summary: How to Implement ServiceAccount for GCP Workload Identity

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Kubernetes Engine Workload Identity Federation for GKE
- Kubernetes ServiceAccounts and Pods
- Google Cloud IAM service accounts and IAM roles
- Cloud Storage
- Secret Manager
- Pub/Sub
- BigQuery
- Google Cloud CLI and kubectl
- Go Google Cloud client libraries
- Python Google Cloud client libraries
- Cloud Audit Logs

## Sources Consulted
- Google Cloud GKE documentation: Authenticate to Google Cloud APIs from GKE workloads: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Google Cloud GKE documentation: About Workload Identity Federation for GKE: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- Google Cloud SDK reference: gcloud container clusters create: https://docs.cloud.google.com/sdk/gcloud/reference/container/clusters/create
- Google Cloud Storage documentation: IAM roles for Cloud Storage: https://docs.cloud.google.com/storage/docs/access-control/iam-roles
- Google Cloud Storage documentation: Listing buckets: https://docs.cloud.google.com/storage/docs/listing-buckets
- Google Cloud Storage documentation: List objects: https://docs.cloud.google.com/storage/docs/listing-objects
- Google Cloud documentation: How Application Default Credentials works: https://docs.cloud.google.com/docs/authentication/application-default-credentials
- Google Cloud documentation: Authenticate for using client libraries: https://docs.cloud.google.com/docs/authentication/client-libraries
- Python client library reference: Cloud Storage Client: https://docs.cloud.google.com/python/docs/reference/storage/latest/google.cloud.storage.client.Client
- Secret Manager documentation: Access a secret version: https://docs.cloud.google.com/secret-manager/docs/access-secret-version
- Go package documentation: google.golang.org/api/impersonate: https://pkg.go.dev/google.golang.org/api/impersonate
- Cloud Logging documentation: Enable Data Access audit logs: https://docs.cloud.google.com/logging/docs/audit/configure-data-access
- Google Cloud SDK reference: gcloud projects add-iam-policy-binding: https://docs.cloud.google.com/sdk/gcloud/reference/projects/add-iam-policy-binding

## Issues Found
- The Kubernetes ServiceAccount was applied to the `production` namespace without first creating that namespace. Added an idempotent namespace creation command before applying the ServiceAccount.
- The pod verification steps used `gcloud auth list` and claimed the IAM service account would appear as the active account. Replaced this with the documented metadata server email check, which is the reliable way to verify the service account identity inside the pod.
- The Go and Python client examples listed buckets while the tutorial granted only `roles/storage.objectViewer`, which permits listing objects but not listing buckets. Removed bucket listing from the examples so they match the stated IAM permissions.
- The Go service account impersonation example imported `golang.org/x/oauth2/google` without using it, which would prevent compilation. Removed the unused import.
- The Cloud Audit Logs setup appended a second JSON document to `policy.json`, producing invalid JSON and risking an invalid IAM policy update. Replaced it with the documented get-edit-set workflow using YAML and an `auditConfigs` snippet.
- The IAM Conditions example omitted the required condition title for `gcloud projects add-iam-policy-binding`. Added `title=app1-bucket-only` to the condition flag.

## Review Notes
The post uses the older shorthand "Workload Identity"; current Google documentation generally uses "Workload Identity Federation for GKE." The configuration pattern using `roles/iam.workloadIdentityUser` and the `iam.gke.io/gcp-service-account` annotation remains valid for IAM service account impersonation from GKE workloads.
