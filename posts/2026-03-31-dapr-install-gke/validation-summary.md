# Validation Summary: How to Install Dapr on Google Kubernetes Engine (GKE)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (distributed application runtime)
- Google Kubernetes Engine (GKE)
- Google Cloud SDK / gcloud CLI
- Helm 3
- GCP Pub/Sub
- GKE Workload Identity
- kubectl

## Sources Consulted
- Dapr Helm chart repository and values.yaml — https://github.com/dapr/helm-charts
- Dapr GCP Pub/Sub component reference — https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-gcp-pubsub/
- Dapr HA mode documentation — https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/
- Dapr CLI installation docs — https://docs.dapr.io/getting-started/install-dapr-cli/
- GKE Workload Identity documentation — https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- gcloud container clusters create reference — https://cloud.google.com/sdk/gcloud/reference/container/clusters/create

## Issues Found

### 1. Invalid `topic` metadata field in GCP Pub/Sub component YAML
**What was wrong:** The Dapr `pubsub.gcp.pubsub` component definition included a `topic` metadata field. This is not a valid component-level metadata field — topics are specified at the application level when publishing or subscribing via the Dapr pub/sub API, not in the component definition.
**What was changed:** Removed the `topic` metadata entry from the component YAML, leaving only the required `projectId` field.
**Why:** The `topic` field would be silently ignored, but its presence is misleading and suggests it is required for the component to function.

### 2. Dead replica count overrides in Helm install command
**What was wrong:** The Helm install command included `--set dapr_operator.replicaCount=2` and `--set dapr_sentry.replicaCount=2` alongside `--set global.ha.enabled=true`. When HA mode is enabled, the Dapr Helm chart templates use `global.ha.replicaCount` (which defaults to 3) and ignore the per-component `replicaCount` values. These overrides had no effect.
**What was changed:** Removed the two ineffective `--set` flags, leaving only `--set global.ha.enabled=true` which correctly enables HA with the default 3 replicas per component.
**Why:** Dead configuration is confusing and gives readers the false impression they are customizing replica counts.

## Review Notes
- The `--enable-ip-alias` flag on `gcloud container clusters create` is redundant in newer GKE versions where VPC-native clusters are the default, but it is not incorrect and ensures compatibility with older configurations.
- The post uses placeholder values (`my-project-id`, `my-app-sa`, `my-topic`) consistently, which is good practice for tutorials.
- All gcloud, kubectl, helm, and dapr CLI commands use correct syntax and valid flags.
- The Workload Identity setup flow (create GCP SA → grant IAM role → bind to K8s SA → annotate K8s SA) is correct and follows Google's recommended approach.
