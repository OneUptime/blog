# Validation Summary: How to Use HelmRelease for Deploying Keycloak with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux HelmRelease
- Flux HelmRepository
- Kubernetes
- Helm
- Bitnami Keycloak Helm chart
- Keycloak
- PostgreSQL
- Kubernetes Secrets
- Kubernetes Ingress
- cert-manager

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux `bootstrap github` CLI documentation: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Bitnami Keycloak Helm chart documentation: https://hub.docker.com/r/bitnamicharts/keycloak
- Bitnami Keycloak Helm chart values: https://raw.githubusercontent.com/bitnami/charts/main/bitnami/keycloak/values.yaml
- Keycloak reverse proxy documentation: https://www.keycloak.org/server/reverseproxy
- Kubernetes Namespaces documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/

## Issues Found
- The post used the `keycloak` namespace for the HelmRelease and Secret without creating it first. Added a `keycloak-namespace.yaml` manifest and included it in the commit command.
- The Flux OCI `HelmRepository` snippet said `interval` checks for new chart versions every hour. Flux documents that `spec.interval` is ignored for OCI HelmRepository sources, so the comment was corrected.
- The Bitnami Keycloak chart examples pinned `version: "24.x"` and used the older `proxy: edge` setting. Updated the examples to `version: "25.x"` and `proxyHeaders: xforwarded`, matching the current Bitnami chart values and Keycloak's reverse proxy header configuration.
- The deployment commit command omitted `keycloak-secret.yaml`, even though the post creates a Secret manifest for `valuesFrom`. Added it to the `git add` command.
- The credential guidance showed a plain Kubernetes Secret intended for GitOps use. Clarified that the Secret manifest should be encrypted before committing it to Git.

## Review Notes
Flux notes that OCI support through `HelmRepository` is in maintenance mode and recommends `OCIRepository` for improved OCI Helm chart support. The post remains valid because `HelmRepository` with `type: oci` is still documented, but a future update could modernize the tutorial around `OCIRepository`.
