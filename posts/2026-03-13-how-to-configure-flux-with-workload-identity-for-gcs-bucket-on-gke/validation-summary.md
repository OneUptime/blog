# Validation Summary: How to Configure Flux with Workload Identity for GCS Bucket on GKE

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux source-controller
- Flux Bucket and Kustomization custom resources
- Kubernetes
- Google Kubernetes Engine
- Workload Identity Federation for GKE
- Google Cloud IAM
- Google Cloud Storage
- Google Cloud CLI
- Kustomize

## Sources Consulted
- Flux Bucket documentation: https://fluxcd.io/flux/components/source/buckets/
- Flux Google Cloud Platform integration documentation: https://fluxcd.io/flux/integrations/gcp/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI documentation for `flux reconcile source bucket`: https://fluxcd.io/flux/cmd/flux_reconcile_source_bucket/
- Google Cloud Storage bucket creation documentation: https://docs.cloud.google.com/storage/docs/creating-buckets
- Google Cloud SDK documentation for `gcloud storage buckets add-iam-policy-binding`: https://cloud.google.com/sdk/gcloud/reference/storage/buckets/add-iam-policy-binding
- GKE Workload Identity Federation documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Cloud Storage uniform bucket-level access documentation: https://cloud.google.com/storage/docs/uniform-bucket-level-access

## Issues Found
- The Flux `Bucket` manifest was missing `spec.endpoint`. Flux documents `spec.endpoint` as a required field for Bucket sources, so I added `endpoint: storage.googleapis.com`.
- The GCS IAM setup granted only `roles/storage.objectViewer`. Flux's GCP integration documentation recommends both `roles/storage.bucketViewer` and `roles/storage.objectViewer` for the Bucket API because Flux checks bucket existence as well as listing and reading objects, so I added the bucket viewer binding.
- The prerequisites used the older shorthand "Workload Identity enabled" and a broad "Flux v2.0 or later" statement while the snippets use the current `source.toolkit.fluxcd.io/v1` and `kustomize.toolkit.fluxcd.io/v1` APIs. I updated the wording to refer to Workload Identity Federation for GKE and the required Flux API versions.
- The explanation of `provider: gcp` implied only metadata-based authentication. I clarified that `provider: gcp` selects Flux's GCP authentication path and that controller-level Workload Identity should leave `serviceAccountName` unset and omit `secretRef`.

## Review Notes
The remaining commands and manifests are consistent with the current official documentation. The article uses IAM service account impersonation for Workload Identity Federation for GKE; Google also documents direct IAM principal grants to Kubernetes ServiceAccounts as a recommended option, but the impersonation flow shown in the post remains valid.
