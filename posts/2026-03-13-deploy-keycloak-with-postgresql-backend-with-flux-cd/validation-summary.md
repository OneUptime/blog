# Validation Summary: How to Deploy Keycloak with PostgreSQL Backend with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Keycloak
- PostgreSQL
- Kubernetes
- Flux CD
- HelmRelease and HelmRepository custom resources
- Bitnami Keycloak and PostgreSQL Helm charts
- Kubernetes Ingress and Secrets
- OpenID Connect

## Sources Consulted
- Bitnami Keycloak Helm chart values for chart 21.0.0: https://raw.githubusercontent.com/bitnami/charts/keycloak/21.0.0/bitnami/keycloak/values.yaml
- Bitnami Keycloak Helm chart templates for chart 21.0.0: https://raw.githubusercontent.com/bitnami/charts/keycloak/21.0.0/bitnami/keycloak/templates/statefulset.yaml and https://raw.githubusercontent.com/bitnami/charts/keycloak/21.0.0/bitnami/keycloak/templates/configmap-env-vars.yaml
- Bitnami PostgreSQL Helm chart values for chart 13.0.0: https://raw.githubusercontent.com/bitnami/charts/postgresql/13.0.0/bitnami/postgresql/values.yaml
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Keycloak hostname configuration: https://www.keycloak.org/server/hostname
- Keycloak all configuration options: https://www.keycloak.org/server/all-config
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The Keycloak values snippet used a `hostname:` object with `hostname` and `adminHostname` keys. The Bitnami Keycloak chart 21.x does not define or render that values object, so it would be ignored. Replaced it with `extraEnvVars` using Keycloak's supported `KC_HOSTNAME` and `KC_HOSTNAME_ADMIN` environment variables.
- The Flux Kustomization example was shown as `clusters/my-cluster/keycloak/kustomization.yaml`, which conflicts with the managed path `./clusters/my-cluster/keycloak`. Flux expects that path to contain either plain manifests or a Kustomize `kustomization.yaml`, not the Flux Kustomization object managing that same path. Changed the example file location to `clusters/my-cluster/keycloak.yaml`.
- The OIDC sequence diagram used `/auth` as the authorization redirect target. Modern Keycloak uses the realm OIDC endpoint `/realms/<realm>/protocol/openid-connect/auth` unless a custom relative path is configured. Updated the diagram endpoint.
- The introduction said PostgreSQL provides "proper connection pooling." PostgreSQL provides durability and transactional storage, while connection pooling is handled by clients or a separate pooler. Reworded the claim to focus on durability, transactions, backups, and point-in-time recovery.
- The password rotation best practice said Flux would trigger a rolling restart after a Secret update. The chart consumes these values as environment variables, and running pods do not pick up changed Secret-backed environment variables automatically. Updated the guidance to reconcile or restart the Keycloak pods after rotating the Secret.

## Review Notes
- The chart version ranges are valid for the examples reviewed, but they pin to older Bitnami chart majors. Future maintenance should re-check values before moving to newer Bitnami chart majors because current chart values have renamed several settings, including proxy and cache options.
- The guide creates Secrets imperatively with `kubectl`, so those Secrets are not Git-managed unless the reader later adds SOPS, Sealed Secrets, External Secrets, or a similar GitOps secret-management workflow.
