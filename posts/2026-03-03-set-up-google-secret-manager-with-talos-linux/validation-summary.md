# Validation Summary: How to Set Up Google Secret Manager with Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- Google Cloud Secret Manager
- External Secrets Operator
- Secrets Store CSI Driver
- Google Cloud CLI
- Helm
- Pub/Sub

## Sources Consulted
- Google Cloud SDK `gcloud secrets create` reference: https://cloud.google.com/sdk/gcloud/reference/secrets/create
- Google Cloud SDK `gcloud secrets update` reference: https://docs.cloud.google.com/sdk/gcloud/reference/secrets/update
- Google Cloud Secret Manager event notifications documentation: https://docs.cloud.google.com/secret-manager/docs/event-notifications
- External Secrets Operator Google Cloud Secret Manager provider documentation: https://external-secrets.io/main/provider/google-secrets-manager/
- External Secrets Operator API specification: https://external-secrets.io/main/api/spec/
- External Secrets Operator templating documentation: https://external-secrets.io/main/guides/templating/
- Secrets Store CSI Driver installation documentation: https://secrets-store-csi-driver.sigs.k8s.io/getting-started/installation
- Secrets Store CSI Driver usage documentation: https://secrets-store-csi-driver.sigs.k8s.io/getting-started/usage.html
- Google Secret Manager provider for Secrets Store CSI Driver README: https://github.com/GoogleCloudPlatform/secrets-store-csi-driver-provider-gcp

## Issues Found
- Updated External Secrets Operator manifests from `external-secrets.io/v1beta1` to the current `external-secrets.io/v1` API shown in current ESO documentation.
- Added `engineVersion: v2` to the ESO template example to match the current templating documentation.
- Added the missing Helm repository setup before installing the Secrets Store CSI Driver chart.
- Clarified that the Google Secrets Store CSI provider authenticates using the workload identity of the pod, so non-GKE Talos clusters need Workload Identity Federation or another supported workload identity setup.
- Removed the unsupported `--event-types=SECRET_VERSION_ADD` flag from the `gcloud secrets update` example. Secret Manager Pub/Sub topics receive all supported modification event types, and consumers filter on the `eventType` message attribute.

## Review Notes
The local environment did not have `gcloud`, `helm`, or `kubectl` installed, so command validation was performed against official documentation rather than local CLI help output. The service-account-key approach for ESO is technically supported for clusters outside GKE, but Workload Identity Federation is generally preferable for production because it avoids long-lived static keys.
