# Validation Summary: How to Use Dapr with Workload Identity Federation on GKE

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (component model for GCP services)
- Google Kubernetes Engine (GKE)
- GKE Workload Identity Federation
- Google Cloud IAM
- GCP Secret Manager
- GCP Pub/Sub
- gcloud CLI
- kubectl

## Sources Consulted
- Dapr GCP Secret Manager component spec: https://docs.dapr.io/reference/components-reference/supported-secret-stores/gcp-secret-manager/
- Dapr GCP Pub/Sub component spec: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-gcp-pubsub/
- GKE Workload Identity documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- gcloud container clusters update reference: https://cloud.google.com/sdk/gcloud/reference/container/clusters/update
- gcloud container node-pools update reference: https://cloud.google.com/sdk/gcloud/reference/container/node-pools/update
- Dapr Secrets API reference: https://docs.dapr.io/reference/api/secrets_api/

## Issues Found
1. **Incorrect metadata field name in GCP Secret Manager component**: The metadata field `project` was changed to `project_id`. The Dapr GCP Secret Manager component specification requires the field to be named `project_id`, not `project`. The Pub/Sub component correctly used `projectId` (its own expected field name), but the Secret Manager component had the wrong field name which would cause a runtime error when Dapr tries to initialize the component.

## Review Notes
- The gcloud commands for enabling Workload Identity (`--workload-pool`, `--workload-metadata=GKE_METADATA`) are correct and current.
- The IAM binding member format `serviceAccount:PROJECT.svc.id.goog[NAMESPACE/KSA_NAME]` is correct for GKE Workload Identity.
- The Kubernetes ServiceAccount annotation `iam.gke.io/gcp-service-account` is the correct annotation for GKE Workload Identity.
- The metadata server verification URL and Dapr secrets HTTP API path are both correct.
- Note that different Dapr GCP components use different field naming conventions for the project ID (`project_id` for Secret Manager, `projectId` for Pub/Sub), which can be a common source of confusion.
