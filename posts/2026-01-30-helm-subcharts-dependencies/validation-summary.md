# Validation Summary: How to Implement Helm Subcharts Dependencies

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Helm 3
- Kubernetes
- Helm charts and subcharts
- Chart dependencies
- OCI chart registries
- Helm library charts
- Bitnami, Prometheus Community, and Grafana Helm chart repositories

## Sources Consulted
- Helm Charts documentation: https://helm.sh/docs/topics/charts/
- Helm Subcharts and Global Values documentation: https://helm.sh/docs/chart_template_guide/subcharts_and_globals/
- Helm dependency update command reference: https://helm.sh/docs/helm/helm_dependency_update/
- Helm dependency build command reference: https://helm.sh/docs/helm/helm_dependency_build/
- Helm dependency list command reference: https://helm.sh/docs/helm/helm_dependency_list/
- Helm dependency best practices: https://helm.sh/docs/chart_best_practices/dependencies/
- Helm OCI registry documentation: https://helm.sh/docs/topics/registries/
- Helm library charts documentation: https://helm.sh/docs/topics/library_charts/
- Helm plugins documentation: https://helm.sh/docs/topics/plugins/
- Trivy Helm scanning documentation: https://trivy.dev/docs/latest/coverage/iac/helm/
- Prometheus Community Helm chart repository documentation: https://prometheus-community.github.io/helm-charts/
- Prometheus Community chart templates and values: https://github.com/prometheus-community/helm-charts/tree/main/charts/prometheus

## Issues Found
- The post said `helm dependency build` fails if `Chart.lock` is missing. Helm's official command reference says `dependency build` mirrors `dependency update` when no lock file is found, so the command comments were corrected.
- The `helm dependency list` example omitted the chart argument shown in the official command syntax. The example now uses `helm dependency list .`.
- The Grafana datasource example used `{{ .Release.Name }}` inside `values.yaml`. Helm does not generally render template expressions in values files; templates are rendered from the `templates/` directory unless a chart explicitly applies `tpl`. The example now uses a static Prometheus service name and sets `prometheus.server.fullnameOverride` so that service name is predictable.
- The security checklist referred to `helm audit` as though it were a built-in Helm command. Helm plugins are external to core Helm, and Trivy documents Helm chart scanning support, so the recommendation now says to use a security scanner such as Trivy.
- The repository management checklist recommended `helm dependency update` in CI despite the post's reproducibility guidance. It now recommends `helm dependency build` for CI dependency restoration from `Chart.lock`.

## Review Notes
The dependency fields, alias behavior, condition and tag behavior, `import-values` explanation, global values usage, OCI dependency syntax, and library chart concepts were consistent with the official Helm documentation. Some chart versions in examples are pinned and may be older than the latest repository versions, but that is acceptable for a dependency management tutorial.
