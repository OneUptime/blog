# Validation Summary: How to Configure Flux OCI Secret with Docker Config JSON

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux source-controller
- Flux OCIRepository
- Flux HelmRepository
- Flux HelmRelease
- Kubernetes Secrets
- Docker config JSON / image pull secrets
- OCI container registries
- Helm OCI registries
- kubectl
- Docker CLI
- crane

## Sources Consulted
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux Source API v1 reference: https://fluxcd.io/flux/components/source/api/v1/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux OCI artifacts cheatsheet: https://fluxcd.io/flux/cheatsheets/oci-artifacts/
- Flux installation prerequisites: https://fluxcd.io/flux/installation/
- Kubernetes kubectl create secret docker-registry reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Helm OCI registry documentation: https://helm.sh/docs/v3/topics/registries/

## Issues Found
- The prerequisite "A Kubernetes cluster (v1.20 or later)" was outdated for current Flux releases. Updated it to "A Kubernetes cluster supported by your Flux release" because Flux's supported Kubernetes versions change by release.
- The troubleshooting step said to ensure the registry URL in the Secret matches the URL in the OCI resource. Updated it to compare the registry host instead, because Docker config JSON auth keys such as `ghcr.io` match the registry host, while Flux OCI URLs include `oci://` plus the repository path.

## Review Notes
- The `OCIRepository`, `HelmRepository` with `type: oci`, `HelmRelease`, Docker config JSON Secret, `kubectl create secret docker-registry`, `flux push artifact`, and `helm push` examples are consistent with the official documentation.
- Current Flux documentation notes that OCI `HelmRepository` is in maintenance mode and recommends `OCIRepository` for improved OCI Helm chart support. The post's `HelmRepository` example remains technically valid.
