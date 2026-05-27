# Validation Summary: How to Mount Secret Manager Secrets as Volumes in GKE Using the CSI Driver

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- GKE Secret Manager add-on
- Google Cloud Secret Manager
- Kubernetes Secrets Store CSI Driver
- Kubernetes SecretProviderClass
- Kubernetes SecretSync
- Workload Identity Federation for GKE
- gcloud CLI
- Kubernetes Deployment manifests

## Sources Consulted
- Google Cloud Secret Manager: Use Secret Manager add-on with Google Kubernetes Engine - https://docs.cloud.google.com/secret-manager/docs/secret-manager-managed-csi-component
- Google Cloud Secret Manager: Synchronize secrets to Kubernetes Secrets - https://docs.cloud.google.com/secret-manager/docs/sync-k8-secrets
- Google Kubernetes Engine: Workload Identity Federation for GKE - https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- Google Kubernetes Engine: Authenticate to Google Cloud APIs from GKE workloads - https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity

## Issues Found
- The prerequisites listed GKE 1.25 or later. Google Cloud documentation currently requires GKE version 1.27.14-gke.1042001 or later for the Secret Manager add-on, so the version requirement was updated.
- The post said Autopilot clusters had the driver available automatically from version 1.25. Current documentation requires enabling the Secret Manager add-on for Autopilot clusters, so the Autopilot guidance was replaced with a `gcloud container clusters create-auto --enable-secret-manager` example.
- The Workload Identity setup used IAM service account impersonation and a Kubernetes service account annotation. The Secret Manager add-on documentation grants Secret Manager access directly to the Kubernetes service account principal, so the commands were updated to use the Workload Identity Federation principal URI.
- The `SecretProviderClass` examples used `provider: gcp`. The managed GKE Secret Manager add-on uses `provider: gke`, so the examples were corrected.
- The pod volume examples used the open-source CSI driver name `secrets-store.csi.k8s.io`. The managed GKE add-on uses `secrets-store-gke.csi.k8s.io`, so the deployment examples were corrected.
- The Kubernetes Secret sync example used the open-source `secretObjects` field. The managed GKE Secret Manager add-on does not support that feature; Google documents `SecretSync` as the supported mechanism. The sync section was updated to use `--enable-secret-sync` and a `secret-sync.gke.io/v1` `SecretSync` resource.
- The rotation command omitted `--enable-secret-manager-rotation` and used a `60s` interval. Current documentation requires enabling rotation explicitly and states the minimum Secret Manager add-on rotation interval is `120s`, so the command and explanation were corrected.
- The troubleshooting commands checked open-source driver/provider pod labels. The managed add-on documentation recommends checking `secretManagerConfig` in the cluster description, so the troubleshooting section was updated.

## Review Notes
The optional Kubernetes Secret synchronization feature is documented as Preview and requires GKE version 1.33 or later. The main mounted-volume flow is the preferred and more secure path when applications can read files directly.
