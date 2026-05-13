# Validation Summary: How to Deploy Nexus Repository Manager with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Kubernetes
- Helm
- Sonatype Nexus Repository
- Sonatype nxrm-ha Helm chart
- PostgreSQL
- Kubernetes Ingress

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI documentation for `flux get all`: https://fluxcd.io/flux/cmd/flux_get_all/
- Flux CLI documentation for `flux reconcile kustomization`: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Sonatype Helm chart repository index: https://sonatype.github.io/helm3-charts/index.yaml
- Sonatype Helm chart overview: https://sonatype.github.io/helm3-charts/
- Sonatype Nexus Repository container deployment documentation: https://help.sonatype.com/en/cloud-deployments.html
- Sonatype nxrm3-ha repository and chart values: https://github.com/sonatype/nxrm3-ha-repository
- Sonatype archived nxrm3 chart repository deprecation notice: https://github.com/sonatype/nxrm3-helm-repository
- Artifact Hub entry for `sonatype/nxrm-ha`: https://artifacthub.io/packages/helm/sonatype/nxrm-ha

## Issues Found
- The post claimed to deploy Nexus OSS with the `nexus-repository-manager` chart. Sonatype has deprecated the single-instance embedded-database chart and states that Helm deployments using embedded databases, including OSS deployments, are not supported. Updated the tutorial to use the supported `nxrm-ha` chart and to require Nexus Repository Pro, a license, and an external PostgreSQL database.
- The HelmRelease values used old `nexus-repository-manager` keys such as `nexus.imageTag`, `persistence.storage`, and `ingress.rules`. Replaced them with current `nxrm-ha` values such as `statefulset.container.image.nexusTag`, `secret.dbSecret`, `secret.license.licenseSecret`, `service.nexus`, `storageClass`, `pvc`, and `ingress.defaultRule`.
- The original example placed a Flux `Kustomization` custom resource in `clusters/my-cluster/nexus/kustomization.yaml`, which conflicts with Kustomize's reserved `kustomization.yaml` file name in the reconciled path. Moved the example to `clusters/my-cluster/flux-system/nexus-kustomization.yaml`.
- The admin password retrieval instructions used the old chart's pod label and `/nexus-data/admin.password` file. Updated them to wait on the `nxrm-ha` chart labels and read the configured admin password from the chart-created Kubernetes Secret.
- The best-practices section referenced `nexus.scripts.allowCreation`, which is not part of the current `nxrm-ha` values. Replaced it with guidance to use an external PostgreSQL database for Kubernetes deployments.

## Review Notes
- The example uses placeholder secret values to show the chart fields. In a real GitOps repository, those values should be supplied through Sealed Secrets, SOPS, Vault, External Secrets, or Flux `valuesFrom` rather than committed in plain text.
- `helm`, `flux`, and `ruby` were not installed in the local environment, so command help could not be checked locally. Official documentation and the published chart archive were used instead, and the YAML snippets were parsed successfully with Python.
