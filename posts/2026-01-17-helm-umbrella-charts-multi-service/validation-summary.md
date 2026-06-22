# Validation Summary: Helm Umbrella Charts: Managing Multi-Service Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Helm charts and umbrella charts
- Helm chart dependencies, conditions, tags, and import-values
- Kubernetes manifests, Secrets, ConfigMaps, and NetworkPolicies
- Bitnami PostgreSQL, Redis, and RabbitMQ Helm charts
- YAML configuration

## Sources Consulted
- Helm Charts documentation: https://helm.sh/docs/topics/charts/
- Helm dependency update documentation: https://helm.sh/docs/helm/helm_dependency_update/
- Helm dependency build documentation: https://helm.sh/docs/helm/helm_dependency_build/
- Helm template documentation: https://helm.sh/docs/helm/helm_template/
- Helm install documentation: https://helm.sh/docs/helm/helm_install/
- Helm upgrade documentation: https://helm.sh/docs/helm/helm_upgrade/
- Helm lint documentation: https://helm.sh/docs/helm/helm_lint/
- Helm test documentation: https://helm.sh/docs/helm/helm_test/
- Helm chart tips and tricks, tpl function: https://helm.sh/docs/howto/charts_tips_and_tricks/#using-the-tpl-function
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Bitnami PostgreSQL chart values: https://raw.githubusercontent.com/bitnami/charts/main/bitnami/postgresql/values.yaml
- Bitnami Redis chart values: https://raw.githubusercontent.com/bitnami/charts/main/bitnami/redis/values.yaml
- Bitnami RabbitMQ chart values: https://raw.githubusercontent.com/bitnami/charts/main/bitnami/rabbitmq/values.yaml
- YAML 1.2.2 specification, node model and mapping uniqueness: https://yaml.org/spec/1.2.2/

## Issues Found
- The main `values.yaml` example defined duplicate top-level keys such as `frontend`, `backend`, `worker`, `postgresql`, and `redis`. YAML mappings require unique keys, and duplicate keys can cause earlier values such as `enabled: true` to be ignored. I merged the `enabled` flags into the corresponding component configuration blocks.
- The `values.yaml` example used Helm template expressions such as `{{ .Release.Name }}` and `{{ .Values.global.domain }}` directly inside values. Helm values files are data, and template strings are only evaluated when chart templates explicitly call `tpl`. I replaced those examples with literal hostnames and secret names.
- The shared Secret template referenced `.Values.rabbitmq.auth.username` and `.Values.rabbitmq.auth.password`, but the values example only set `rabbitmq.enabled`. I added a RabbitMQ `auth` example so enabling the dependency has the required values.
- The NetworkPolicy template referenced `.Values.networkPolicy.enabled`, but the values example did not define `networkPolicy`. I added a `networkPolicy.enabled` value.
- The dependency commands omitted the chart path even though the Helm command synopsis expects a chart argument. I updated them to `helm dependency update .`, `helm dependency build .`, and `helm dependency list .`.
- The comment for `helm dependency build` said it was for existing local charts. Helm documents it as rebuilding `charts/` from `Chart.lock`, so I corrected the comment.
- The testing command used `helm template my-app . --validate`, which is not present in current Helm documentation. I changed it to `helm template my-app . --dry-run=server` for server-side validation.
- The dependency snippet labeled RabbitMQ as coming from another repository while it used the same Bitnami repository URL. I changed the comment to identify it as another Bitnami external chart.
- The best-practices table said to pin versions explicitly while the dependency examples use valid semver constraints such as `13.x.x`. I changed the wording to "version constraints" to match Helm's supported dependency version semantics.

## Review Notes
Helm's current documentation is published for Helm 4.2.2 and still notes that some chart-topic pages have not been fully updated for Helm 4. The post's `apiVersion: v2` chart examples remain appropriate for modern Helm usage. The example still uses hardcoded demonstration passwords in `values.yaml`; that is technically valid for a tutorial, but production charts should normally use externally managed secrets or secret generation patterns.
