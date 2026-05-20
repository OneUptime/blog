# Validation Summary: How to Configure ArgoCD Image Updater with GCR

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Image Updater
- Argo CD Applications
- Kubernetes ServiceAccounts and Secrets
- Google Kubernetes Engine Workload Identity Federation
- Google Artifact Registry
- Google Container Registry / `gcr.io` repositories
- Google Cloud IAM and service accounts

## Sources Consulted
- Argo CD Image Updater registry configuration: https://argocd-image-updater.readthedocs.io/en/stable/configuration/registries/
- Argo CD Image Updater application configuration and `ImageUpdater` CRs: https://argocd-image-updater.readthedocs.io/en/latest/configuration/applications/
- Argo CD Image Updater image configuration and update strategies: https://argocd-image-updater.readthedocs.io/en/stable/configuration/images/
- Argo CD Image Updater update methods and Git write-back targets: https://argocd-image-updater.readthedocs.io/en/latest/basics/update-methods/
- Google Cloud GKE Workload Identity Federation guide: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Google Cloud Artifact Registry Docker authentication: https://cloud.google.com/artifact-registry/docs/docker/authentication
- Google Cloud Artifact Registry access control: https://cloud.google.com/artifact-registry/docs/access-control
- Google Cloud Artifact Registry repository and image names: https://cloud.google.com/artifact-registry/docs/docker/names
- Google Cloud Artifact Registry locations: https://cloud.google.com/artifact-registry/docs/repositories/repo-locations
- Google Cloud Container Registry shutdown guidance: https://cloud.google.com/artifact-registry/docs/transition/prepare-gcr-shutdown
- Google Cloud `gcr.io` repositories in Artifact Registry: https://cloud.google.com/artifact-registry/docs/transition/gcr-repositories

## Issues Found
- The post described GCR as a current separate registry option. Updated the wording to reflect that Container Registry is deprecated and shut down for writes, while `gcr.io` URLs can continue through Artifact Registry `gcr.io` repositories.
- The IAM guidance suggested `roles/storage.objectViewer` for GCR. Updated it to use `roles/artifactregistry.reader` for Artifact Registry-hosted `gcr.io` repositories, noting that Cloud Storage roles only applied to legacy Container Registry buckets.
- The service account key example created a generic secret but referenced it with `pullsecret:`, which requires a Docker config secret with `.dockerconfigjson`. Changed the command to `kubectl create secret docker-registry` with `_json_key` credentials and added a note to match the registry hostname.
- The Workload Identity registry configuration claimed Image Updater could omit credentials and automatically use the token. Replaced this with an `ext:` credential source that retrieves a short-lived token from the GKE metadata server and uses Docker's `oauth2accesstoken` format.
- The Application examples used a non-official `semver-constraint` annotation. Moved the semver constraint into the image spec in `image-list`, which is the documented Image Updater format.
- The GCR example used the legacy `latest` update strategy name. Changed it to the current `newest-build` name.
- The post used legacy Application annotations without mentioning Argo CD Image Updater v1's `ImageUpdater` CR. Added a note and updated the production example to include an `ImageUpdater` resource with `useAnnotations: true`.

## Review Notes
The article still uses the legacy annotation workflow, which remains usable in Image Updater v1 when selected through an `ImageUpdater` resource with `useAnnotations: true`. A future update could convert the examples fully to native `ImageUpdater` CR fields, but the current version is technically valid after these fixes.
