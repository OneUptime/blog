# Validation Summary: How to Use HelmRelease for Deploying MongoDB with Flux

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
- MongoDB
- Bitnami MongoDB Helm chart
- Kubernetes Secrets
- SOPS / Sealed Secrets

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux GitHub bootstrap documentation: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux CLI installation documentation: https://fluxcd.io/flux/installation/
- Bitnami MongoDB chart source and values: https://github.com/bitnami/charts/tree/main/bitnami/mongodb
- Bitnami MongoDB OCI chart artifact tags and chart package: oci://registry-1.docker.io/bitnamicharts/mongodb
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The HelmRepository comment said Flux would check an OCI chart repository for new chart versions every hour. Flux documents that `.spec.interval` is ignored for OCI HelmRepository objects, so the comment was corrected to say the field is ignored for OCI repositories.
- The HelmRelease examples used `metadata.namespace: database` without ensuring the `database` namespace exists. Since a namespaced HelmRelease object cannot be applied into a missing namespace, a `Namespace` manifest was added before each HelmRelease example.
- The chart version constraint used `16.x`, while the current Bitnami MongoDB chart artifact reviewed is in the `19.x` series. The examples were updated to `19.x`.

## Review Notes
- The Flux `HelmRepository` API with `spec.type: oci`, the `HelmRelease` API version, `valuesFrom` Secret references, remediation fields, and `install.createNamespace` usage are valid.
- Bitnami MongoDB chart values such as `architecture`, `auth.rootUser`, `auth.rootPassword`, `auth.replicaSetKey`, `replicaCount`, `persistence.size`, `resources`, `arbiter.enabled`, `arbiter.resources`, and `backup.cronjob.storage.size` match the chart values reviewed.
- For a production GitOps setup, the post correctly advises using SOPS or Sealed Secrets instead of committing plain Secret manifests, though a future improvement could show one encrypted-secret workflow end to end.
