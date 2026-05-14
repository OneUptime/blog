# Validation Summary: How to Configure OCIRepository with Google Artifact Registry in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux source-controller
- OCIRepository
- Kubernetes
- Google Kubernetes Engine
- Workload Identity Federation for GKE
- Google Artifact Registry
- Google Cloud IAM
- gcloud CLI
- kubectl

## Sources Consulted
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux v2.6 Source API reference v1: https://v2-6.docs.fluxcd.io/flux/components/source/api/v1/
- Flux `flux push artifact` CLI documentation: https://fluxcd.io/flux/cmd/flux_push_artifact/
- Flux `flux list artifacts` CLI documentation: https://fluxcd.io/flux/cmd/flux_list_artifacts/
- Google Cloud Artifact Registry Docker authentication documentation: https://cloud.google.com/artifact-registry/docs/docker/authentication
- Google Cloud Artifact Registry repository creation documentation: https://cloud.google.com/artifact-registry/docs/repositories/create-repos
- Google Kubernetes Engine Workload Identity Federation documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity

## Issues Found
- The prerequisites listed Flux CD v0.35 or later, but the examples use `apiVersion: source.toolkit.fluxcd.io/v1` for `OCIRepository`. Updated the prerequisite to Flux CD v2.6 or later to match the documented v1 API examples.
- The GKE Workload Identity setup enabled Workload Identity at the cluster level but omitted the required metadata server configuration for existing Standard cluster node pools. Added the `gcloud container node-pools update ... --workload-metadata=GKE_METADATA` command.
- The `flux push artifact` example used `--revision="main/$(git rev-parse HEAD)"`, which does not match Flux's documented revision format. Changed it to `--revision="main@sha1:$(git rev-parse HEAD)"`.

## Review Notes
- The `provider: gcp`, `secretRef`, semver reference, Artifact Registry Docker repository format, service account key username `_json_key`, IAM role `roles/artifactregistry.reader`, and Workload Identity IAM binding/annotation examples match the official documentation.
- Service account keys are technically supported but are a higher-risk authentication method. The post correctly presents Workload Identity as the recommended option and removes the local key file after creating the Kubernetes secret.
