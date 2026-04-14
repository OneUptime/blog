# Validation Summary: How to Use Dapr with Google Cloud SQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state management, PostgreSQL state store component)
- Google Cloud SQL for PostgreSQL
- Google Kubernetes Engine (GKE)
- Cloud SQL Auth Proxy v2
- GKE Workload Identity
- Kubernetes Deployments and ServiceAccounts
- gcloud CLI
- kubectl CLI

## Sources Consulted
- Dapr PostgreSQL state store component reference (https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-postgresql/)
- Dapr component secrets reference (https://docs.dapr.io/operations/components/component-secrets/)
- Dapr state management API reference (https://docs.dapr.io/reference/api/state_api/)
- Google Cloud SQL Auth Proxy documentation (https://cloud.google.com/sql/docs/postgres/connect-kubernetes-engine)
- GKE Workload Identity documentation (https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity)
- Kubernetes Deployment spec reference (https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/deployment-v1/)
- gcloud sql CLI reference (https://cloud.google.com/sdk/gcloud/reference/sql)
- gcloud iam service-accounts CLI reference (https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts)

## Issues Found

1. **Deployment YAML missing required Kubernetes fields**: The Deployment spec was missing `spec.selector.matchLabels` and `spec.template.metadata.labels`, both of which are required for a valid Kubernetes Deployment. Without these, `kubectl apply` would reject the manifest with a validation error. Added `selector.matchLabels` and `labels` with `app: order-service`.

2. **Description mentions "connection pooling" but post does not cover it**: The post description claimed to cover "connection pooling" alongside Cloud SQL Auth Proxy and Workload Identity, but the post body never discusses connection pooling. Removed "connection pooling" from the description to accurately reflect the post content.

## Review Notes
- The `state.postgresql` component uses `version: v1`. For v2, the `tableName` field would need to be changed to `tablePrefix`. This is a potential future migration note if the post is updated for Dapr's v2 PostgreSQL component.
- The `gcloud sql users create` command passes the password as a CLI argument, which exposes it in shell history. For production use, `--prompt-for-password` would be more secure, but this is acceptable for a tutorial.
- The Cloud SQL Auth Proxy image uses the floating `:2` tag. For production deployments, pinning to a specific version (e.g., `:2.11.0`) is recommended, but `:2` is fine for a tutorial.
- The architecture correctly places the Cloud SQL Auth Proxy as a sidecar in the same pod, allowing the Dapr sidecar to connect via localhost. However, this means each pod that needs database access must include the proxy sidecar.
