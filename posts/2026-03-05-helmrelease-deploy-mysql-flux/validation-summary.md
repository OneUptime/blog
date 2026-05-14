# Validation Summary: How to Use HelmRelease for Deploying MySQL with Flux

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
- Bitnami MySQL Helm chart
- MySQL

## Sources Consulted
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux CLI bootstrap GitHub documentation: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Bitnami MySQL chart values: https://raw.githubusercontent.com/bitnami/charts/main/bitnami/mysql/values.yaml
- Bitnami MySQL chart metadata: https://raw.githubusercontent.com/bitnami/charts/main/bitnami/mysql/Chart.yaml
- Bitnami MySQL chart service templates: https://github.com/bitnami/charts/tree/main/bitnami/mysql/templates
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes Service DNS documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/

## Issues Found
- The HelmRelease examples used `metadata.namespace: database` with `install.createNamespace: true`. Kubernetes must already have the `database` namespace before it can store the HelmRelease or Secret there. Changed the HelmRelease and Secret namespace to `flux-system`, added `targetNamespace: database`, and set `releaseName: mysql` so Helm creates the target namespace and the service names remain as documented.
- The Bitnami OCI HelmRepository comment said `interval` polls for new versions. Flux documentation states `.spec.interval` is ignored for OCI HelmRepository sources. Updated the comment to reflect that it is required by the API but ignored for OCI sources.
- The chart version constraint used `12.x`, while the current Bitnami MySQL chart major version is `14.x`. Updated both HelmRelease examples to `14.x`.
- The custom `primary.configuration` block replaced the Bitnami chart's default `my.cnf` and omitted default chart settings such as socket and client configuration. Replaced it with `primary.extraFlags` for the same MySQL server settings.
- The connection section listed `mysql-primary` as the primary service name for all deployments. The Bitnami chart uses `mysql` in standalone mode and `mysql-primary` only in replication mode. Updated the service DNS list accordingly.
- The monitoring command checked HelmReleases in the `database` namespace. After moving the HelmRelease to `flux-system`, updated it to `flux get helmreleases -n flux-system`.
- The Secret section implied that a plain YAML Secret manifest is not plain text. Clarified that the Secret removes credentials from HelmRelease values and should be encrypted with SOPS or Sealed Secrets before being committed to Git.

## Review Notes
The examples now use the current Flux `helm.toolkit.fluxcd.io/v2` API and Bitnami MySQL chart values. Flux documents OCIRepository as the improved API for OCI chart sources, while OCI HelmRepository remains supported in maintenance mode; a future update could show the OCIRepository plus `chartRef` pattern.
