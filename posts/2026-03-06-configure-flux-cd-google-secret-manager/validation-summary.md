# Validation Summary: How to Configure Flux CD with Google Secret Manager

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Google Kubernetes Engine
- Google Secret Manager
- Google Cloud CLI
- External Secrets Operator
- Kubernetes Secrets and ServiceAccounts
- GKE Workload Identity Federation
- Flux HelmRelease, HelmRepository, Kustomization, and Alert resources

## Sources Consulted
- External Secrets Operator Google Cloud Secret Manager provider documentation: https://external-secrets.io/main/provider/google-secrets-manager/
- External Secrets Operator API specification: https://external-secrets.io/main/api/spec/
- External Secrets Operator ExternalSecret documentation: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator lifecycle documentation: https://external-secrets.io/latest/guides/ownership-deletion-policy/
- External Secrets Operator Helm chart package: https://artifacthub.io/packages/helm/external-secrets-operator/external-secrets
- Google Kubernetes Engine Workload Identity Federation documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Google Secret Manager rotation documentation: https://docs.cloud.google.com/secret-manager/docs/secret-rotation
- Google Cloud SDK `gcloud secrets update` reference: https://cloud.google.com/sdk/gcloud/reference/secrets/update
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification API reference: https://fluxcd.io/flux/components/notification/api/v1/

## Issues Found
- The post used `external-secrets.io/v1beta1` for `ClusterSecretStore`, `SecretStore`, and `ExternalSecret` resources. Current ESO documentation uses `external-secrets.io/v1`, and the v1beta1 API is deprecated in current chart releases. Updated all ESO pull-secret examples to `external-secrets.io/v1`.
- The HelmRelease pinned the External Secrets Operator chart to `0.x`, which would keep readers on an older chart line. Updated the chart constraint to `2.x` to match current releases that serve the stable ESO v1 API.
- Step 5 referenced `database-host` and `database-port`, but Step 1 did not create those Secret Manager secrets. Added matching `gcloud secrets create` and `gcloud secrets versions add` commands.
- The namespace-scoped `SecretStore` example referenced a service account in the `external-secrets` namespace. ESO documentation requires namespace-scoped `SecretStore` service account references to be in the same namespace; only `ClusterSecretStore` references include the namespace. Updated the example to reference a same-namespace service account.
- The Secret Manager rotation command used `--add-rotation`, which is not part of the current `gcloud secrets update` command. Removed it and changed the rotation period to the documented seconds-based duration format.
- The rotation section implied the schedule alone performs rotation. Google Secret Manager rotation schedules publish rotation notifications and require a Pub/Sub topic and rotation handler. Updated the comment to mention configuring Pub/Sub and a Cloud Function.
- The rotating ExternalSecret comment said `deletionPolicy: Delete` deletes the Kubernetes Secret when the ExternalSecret is deleted. ESO deletion policy controls behavior when provider secrets are deleted; `creationPolicy: Owner` controls owner reference cleanup. Updated the comment.
- The Flux Alert example used `notification.toolkit.fluxcd.io/v1`, but Flux's current notification v1 API reference does not include Alert. Updated the Alert to `notification.toolkit.fluxcd.io/v1beta3`.
- The Flux Alert example used deprecated `spec.summary`. Updated it to `spec.eventMetadata.summary`.

## Review Notes
- The local environment did not have `gcloud` installed, so CLI validation was performed against official Google Cloud SDK and Secret Manager documentation rather than local `--help` output.
- The Workload Identity example uses the GKE Kubernetes ServiceAccount-to-IAM ServiceAccount impersonation pattern, which remains documented by Google and ESO. For new deployments, direct IAM principal identifiers are also a documented option.
