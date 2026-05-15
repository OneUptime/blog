# Validation Summary: How to Create a HelmRelease in Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux Helm Controller
- Flux Source Controller
- Kubernetes custom resources
- Helm
- kubectl
- Flux CLI
- YAML

## Sources Consulted
- Flux HelmRelease API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Manage Helm Releases guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux `create helmrelease` command reference: https://fluxcd.io/flux/cmd/flux_create_helmrelease/
- Flux `get helmreleases` command reference: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Flux `reconcile helmrelease` command reference: https://fluxcd.io/flux/cmd/flux_reconcile_helmrelease/
- Kubernetes `kubectl events` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Bitnami nginx Helm chart metadata and values: https://artifacthub.io/packages/helm/bitnami/nginx

## Issues Found
- The post said a HelmRelease minimally requires a chart reference pointing to a source and the chart name. In Flux v2, a HelmRelease can use either `spec.chart` with a chart template or `spec.chartRef` for an existing chart artifact source. I changed the wording to describe the requirements for the chart-template form used in the tutorial.
- The post said the Flux CLI `--export` flag outputs YAML to a file. The flag prints YAML to stdout; the `> helmrelease.yaml` shell redirection writes it to a file. I updated the sentence to make that distinction accurate.

## Review Notes
The YAML examples use current Flux API versions (`helm.toolkit.fluxcd.io/v2` and `source.toolkit.fluxcd.io/v1`) and the Flux CLI flags shown are current. The Bitnami nginx chart values used in the example (`replicaCount` and `service.type`) are valid for current chart releases.
