# Validation Summary: Managing Helm Chart Dependencies and Subcharts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Helm
- Kubernetes
- Helm charts
- Helm dependencies and subcharts
- Helm library charts
- YAML configuration
- OCI chart registries

## Sources Consulted
- Helm dependency command documentation: https://helm.sh/docs/helm/helm_dependency/
- Helm dependency update documentation: https://helm.sh/docs/helm/helm_dependency_update/
- Helm dependency build documentation: https://helm.sh/docs/helm/helm_dependency_build/
- Helm charts topic documentation, including dependency conditions, tags, import-values, manual dependency management, and template values: https://helm.sh/docs/topics/charts/
- Helm Subcharts and Global Values guide: https://helm.sh/docs/chart_template_guide/subcharts_and_globals/
- Helm chart dependency best practices: https://helm.sh/docs/chart_best_practices/dependencies/
- Helm 3 changes FAQ for library chart behavior: https://helm.sh/docs/v3/faq/changes_since_helm2/

## Issues Found
- The post stated that Helm automatically installs all dependencies when installing the parent chart. Helm installs dependency charts as part of the release after dependencies are present under `charts/`, typically via `helm dependency update`, `helm dependency build`, or manual vendoring. Updated the wording to avoid implying that `helm install` fetches missing dependencies by default.
- The `helm dependency build` section said it builds from `Chart.lock` without updating. Helm's documented behavior is to build from `Chart.lock` without re-resolving versions, but to behave like `helm dependency update` when no lock file exists. Added that caveat.
- The exported values example used Go template syntax inside `values.yaml`. Helm values files are YAML data, not rendered templates. Replaced it with a static `exports.data.connectionString` example and updated `import-values` accordingly.
- The ConfigMap example used whitespace-trimming template delimiters inside a YAML block scalar. The leading `{{-` delimiters could remove the newline after keys such as `database:` and render invalid embedded YAML. Removed the trimming markers from those control statements.

## Review Notes
The Helm CLI was not installed in the local environment, so CLI command verification was performed against the official Helm command documentation rather than local `helm --help` output. The Bitnami chart value examples are plausible for the chart families shown, but chart-specific value keys can change between major chart versions and should be checked against the target chart README when used in production.
