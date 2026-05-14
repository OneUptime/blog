# Validation Summary: How to Set Up HelmRepository for Grafana Charts in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Helm
- HelmRepository
- HelmRelease
- Grafana
- Grafana Loki
- Grafana Alloy
- Grafana Tempo
- GitOps

## Sources Consulted
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Grafana Helm chart installation documentation: https://grafana.com/docs/grafana/latest/setup-grafana/installation/helm/
- Grafana Loki monolithic Helm chart documentation: https://grafana.com/docs/loki/latest/setup/install/helm/install-monolithic/
- Grafana Loki getting started documentation for Alloy log collection: https://grafana.com/docs/loki/latest/get-started/
- Grafana Alloy Kubernetes Helm installation documentation: https://grafana.com/docs/alloy/latest/set-up/install/kubernetes/
- Grafana Tempo Helm chart documentation: https://grafana.com/docs/tempo/latest/set-up-for-tracing/setup-tempo/deploy/kubernetes/helm-chart/
- Grafana Community Helm chart index: https://grafana-community.github.io/helm-charts/index.yaml
- Grafana Helm chart index: https://grafana.github.io/helm-charts/index.yaml
- Grafana Community Helm chart values: https://github.com/grafana-community/helm-charts
- Grafana Alloy Helm chart values: https://github.com/grafana/alloy/blob/main/operations/helm/charts/alloy/values.yaml

## Issues Found
- The post described one official Grafana Helm repository as the source for the full stack. Current Grafana documentation and chart indexes split active community-maintained charts such as Grafana, Loki, and Tempo into the Grafana Community Helm repository, while Alloy remains in the Grafana Helm repository. I updated the repository explanation and added both Flux HelmRepository resources.
- The Grafana, Loki, and Tempo HelmRelease examples referenced older chart major versions and the old repository source. I updated Grafana to `12.*`, Loki to `14.*`, Tempo to `2.*`, and pointed those HelmReleases at `grafana-community`.
- The Loki example used `deploymentMode: SingleBinary`, which has been renamed to `Monolithic` in current community Loki chart versions. I updated the deployment mode, chart version, comments, and values to align with Grafana's monolithic Loki Helm chart example.
- The Loki example configured filesystem object storage while targeting a current monolithic chart example. I changed it to use the documented single-replica chart pattern with `object_store: s3` and `minio.enabled: true`.
- The post recommended Promtail for log collection. Promtail is deprecated and reached EOL in March 2026, so I replaced the Promtail HelmRelease with a Grafana Alloy HelmRelease and updated the architecture diagram accordingly.
- The Flux dependency section said Grafana depends on Loki and Prometheus while only declaring a Loki `dependsOn` entry. I clarified that the configured Grafana data sources assume those endpoints are available and that `dependsOn` controls HelmReleases managed by Flux.

## Review Notes
- All YAML code blocks in the post parse successfully after the edits.
- The examples still use simple demo credentials and sample ingress hostnames. Those are acceptable for a tutorial but should be replaced with secrets and real hostnames in production.
- `helm`, `flux`, and `kubectl` were not installed in the local environment, so CLI validation was performed against official command documentation rather than local `--help` output.
