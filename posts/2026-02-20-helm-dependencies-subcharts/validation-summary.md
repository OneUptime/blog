# Validation Summary: How to Manage Helm Chart Dependencies and Subcharts

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Helm
- Helm chart dependencies
- Helm subcharts
- Helm chart repositories
- Kubernetes manifests and values
- Bitnami PostgreSQL and Redis Helm charts
- Prometheus Community Helm charts

## Sources Consulted
- Helm chart format and dependencies documentation: https://helm.sh/docs/topics/charts/
- Helm dependency update command documentation: https://helm.sh/docs/helm/helm_dependency_update/
- Helm dependency build command documentation: https://helm.sh/docs/helm/helm_dependency_build/
- Helm dependency list command documentation: https://helm.sh/docs/helm/helm_dependency_list/
- Helm install command documentation: https://helm.sh/docs/helm/helm_install/
- Helm dependency best practices: https://helm.sh/docs/chart_best_practices/dependencies/
- Bitnami chart repository index: https://charts.bitnami.com/bitnami/index.yaml
- Prometheus Community chart repository index: https://prometheus-community.github.io/helm-charts/index.yaml
- Bitnami PostgreSQL chart values: https://github.com/bitnami/charts/blob/main/bitnami/postgresql/values.yaml
- Bitnami Redis chart values: https://github.com/bitnami/charts/blob/main/bitnami/redis/values.yaml

## Issues Found
- The first PostgreSQL dependency comment said the chart was installed only when `database.enabled` was true, but the actual condition was `postgresql.enabled`. Updated the comment to match the condition path.
- The aliased Prometheus dependency used `condition: monitoring.enabled` while the parent values example configured the chart under the alias `metrics`. Updated the condition to `metrics.enabled` so the enable/disable value matches the aliased dependency configuration.
- The multiple-condition comment said "first match wins", which could imply the first true value wins. Helm evaluates the first existing boolean condition path. Updated the wording to "first existing boolean path wins."
- The `import-values` example used the Bitnami PostgreSQL chart and referenced `exports.connection`, but the Bitnami PostgreSQL values do not define that export. Changed the example to a generic local `database` subchart that defines `exports.connection`.

## Review Notes
The Helm commands and flags shown are valid in current Helm documentation. The referenced Bitnami PostgreSQL `15.5.0`, Bitnami Redis `19.0.0`, and Prometheus Community Prometheus `25.0.0` chart versions are present in their repository indexes. Helm's current documentation defaults to Helm 4.2.0 and notes that some chart topic pages have not yet been fully updated for Helm 4, but the dependency fields and CLI behavior used in this post remain consistent with the documented Helm 3/4 behavior checked here.
