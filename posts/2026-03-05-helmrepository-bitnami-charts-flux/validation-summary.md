# Validation Summary: How to Set Up HelmRepository for Bitnami Charts in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux source-controller HelmRepository
- Flux helm-controller HelmRelease
- Kubernetes
- Helm
- OCI Helm registries
- Bitnami Helm charts
- Docker Hub registry authentication

## Sources Consulted
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux Source API reference: https://fluxcd.io/flux/components/source/api/v1/
- Bitnami charts GitHub repository: https://github.com/bitnami/charts
- Bitnami catalog changes announcement: https://github.com/bitnami/charts/issues/35164
- Helm OCI registry documentation: https://helm.sh/docs/v3/topics/registries/
- Helm `show chart` command documentation: https://helm.sh/docs/helm/helm_show_chart/
- Kubernetes `kubectl create secret docker-registry` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/

## Issues Found
- The post said Docker Hub OCI was the official and current Bitnami chart distribution method and that Bitnami charts were actively maintained and frequently updated. This is outdated for 2026: Broadcom states that, since August 28, 2025, new Bitnami container images and Helm charts are no longer published to Docker Hub in OCI format. I updated the introduction and closing notes to distinguish the still-valid Docker Hub OCI endpoint from the lack of new public updates there.
- The post did not mention Flux's current caveat for OCI HelmRepository sources. Flux still supports `spec.type: oci`, but the official Flux documentation says this mode is in maintenance mode and recommends `OCIRepository` for improved OCI support. I added that caveat without changing the post's HelmRepository-focused examples.
- The "Checking Available Chart Versions" section claimed that `helm show chart ... --version 16.0.0` lists available tags. Helm's official documentation says `helm show chart` inspects a chart and displays its `Chart.yaml`; it does not list OCI tags. I changed the text to say registry UI/API should be used for tag discovery, while Helm can inspect or pull a known version.

## Review Notes
The Flux `HelmRepository` and `HelmRelease` YAML examples use current API versions and valid fields. The Docker registry Secret command is consistent with Kubernetes documentation, and Flux supports `kubernetes.io/dockerconfigjson` secrets for OCI Helm repositories. Local `helm`, `flux`, and `kubectl` binaries were not installed in this environment, so CLI syntax was verified against official documentation rather than local `--help` output.
