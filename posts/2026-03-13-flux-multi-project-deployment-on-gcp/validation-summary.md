# Validation Summary: How to Set Up Flux Multi-Project Deployment on GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Kustomize
- Google Kubernetes Engine (GKE)
- Google Cloud IAM
- Workload Identity Federation for GKE
- Artifact Registry
- GitHub

## Sources Consulted
- Flux bootstrap for GitHub documentation: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux CLI reference for `flux bootstrap github`: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Google Cloud GKE Workload Identity Federation concepts: https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- Google Cloud guide to authenticate GKE workloads to Google Cloud APIs: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Google Cloud SDK reference for `gcloud iam service-accounts create`: https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/create
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Google Cloud Artifact Registry Container Registry shutdown guidance: https://cloud.google.com/artifact-registry/docs/transition/prepare-gcr-shutdown

## Issues Found
- The Flux bootstrap examples used `--personal` while the post describes a GitHub organization repository. The Flux CLI documents `--personal` as meaning the owner is a GitHub user rather than an organization, so the flag was removed from the organization bootstrap examples.
- The Workload Identity section created an IAM service account and annotated the Kubernetes ServiceAccount, but it did not grant the Kubernetes ServiceAccount `roles/iam.workloadIdentityUser` on the IAM service account. Google Cloud requires both the IAM allow policy and the annotation for the IAM service account impersonation method, so the missing `gcloud iam service-accounts add-iam-policy-binding` command was added.
- The introduction implied that Workload Identity federates IAM roles for Flux controllers and application pods. The example only configures application pod access to Google Cloud APIs, so the wording was corrected to describe Workload Identity Federation for GKE more precisely.
- The image promotion example used a `gcr.io` image path. Container Registry is shut down for direct Container Registry writes and Artifact Registry is the recommended service, so the example was updated to an Artifact Registry image path.
- The Workload Identity step title referred to cross-project access, but the example configures same-environment, per-project access. The heading was updated to match the commands shown.

## Review Notes
The Flux `Kustomization` examples use the current `kustomize.toolkit.fluxcd.io/v1` API and valid `postBuild.substitute`, `sourceRef`, `path`, and `prune` fields. The Kustomize inline JSON patch format is valid. The post assumes the `my-app` namespace and workload use the `my-app` Kubernetes ServiceAccount; a complete production example would also include the namespace and workload manifests, but that omission is acceptable for the focused walkthrough.
