# Validation Summary: Deploy Grafana with LDAP Authentication Using Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Kubernetes
- Grafana
- Grafana Helm chart
- LDAP authentication
- Kubernetes Secrets
- SOPS and Sealed Secrets

## Sources Consulted
- Grafana LDAP authentication documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-access/configure-authentication/ldap/
- Grafana configuration variable expansion documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/#variable-expansion
- Grafana community Helm chart documentation and values: https://github.com/grafana-community/helm-charts/tree/main/charts/grafana
- Grafana Helm chart migration notice: https://github.com/grafana/helm-charts/blob/main/charts/grafana/README.md
- Flux HelmRelease guide and API documentation: https://fluxcd.io/flux/guides/helmreleases/ and https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The introduction incorrectly implied that LDAP removes local Grafana accounts. Grafana can still create local user records on successful LDAP authentication, so the text now says LDAP removes the need to manage local passwords.
- The post claimed that Kubernetes Secrets ensure sensitive data never sits in plain text in the cluster. Kubernetes Secrets protect access but are not the same as encrypted-at-rest secret storage, so the wording now correctly scopes the claim to encrypted Git storage with SOPS or Sealed Secrets.
- The HelmRepository used the old `https://grafana.github.io/helm-charts` repository. Official chart docs now point to `grafana-community/helm-charts` after the January 30, 2026 migration, so the repository URL and source reference were updated.
- The HelmRelease pinned Grafana chart `>=7.0.0 <8.0.0`, which is outdated for the current chart repository. The example now targets `>=12.0.0 <13.0.0`, matching the current major chart line reviewed.
- The HelmRelease comment said the built-in login form was disabled, but the shown configuration did not set `auth.disable_login_form`, and LDAP uses the normal Grafana login form for username/password authentication. The inaccurate comment was removed.
- The `extraSecretMounts` example omitted `defaultMode`, while the current Grafana Helm chart template emits that value for secret mounts. The example now sets `defaultMode: 0440`.
- The Flux Kustomization example was shown as `clusters/my-cluster/grafana/kustomization.yaml`, the same path it reconciles. That filename can be interpreted by Kustomize as a Kustomize config file rather than as a Flux custom resource. The example path now places the Flux Kustomization outside the reconciled application directory.
- The best-practice note recommended `grafana-cli admin reset-admin-password` as an LDAP connectivity test, but that command resets a local admin password and does not validate LDAP auth. The note now recommends signing in with an LDAP user and checking Grafana logs for LDAP authentication errors.

## Review Notes
- All YAML snippets parsed successfully after the corrections.
- The example assumes the `monitoring` namespace exists or is reconciled separately.
