# Validation Summary: How to Deploy Keycloak with Helm for Authentication

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- Keycloak
- Helm
- Bitnami Keycloak Helm chart
- Kubernetes
- PostgreSQL
- Prometheus Operator ServiceMonitor
- Grafana / PromQL
- LDAP

## Sources Consulted
- Bitnami Keycloak Helm chart values: https://github.com/bitnami/charts/blob/main/bitnami/keycloak/values.yaml
- Bitnami Keycloak Helm chart templates: https://github.com/bitnami/charts/tree/main/bitnami/keycloak/templates
- Bitnami PostgreSQL Helm chart values: https://github.com/bitnami/charts/blob/main/bitnami/postgresql/values.yaml
- Keycloak distributed cache documentation: https://www.keycloak.org/server/caching
- Keycloak reverse proxy documentation: https://www.keycloak.org/server/reverseproxy
- Keycloak metrics documentation: https://www.keycloak.org/observability/configuration-metrics
- Keycloak SLI / PromQL examples: https://www.keycloak.org/observability/keycloak-service-level-indicators
- Keycloak realm import/export documentation: https://www.keycloak.org/server/importExport
- Keycloak 26.0.0 release notes for proxy option removal: https://www.keycloak.org/2024/10/keycloak-2600-released
- Keycloak 26.1.0 release notes for jdbc-ping default transport: https://www.keycloak.org/2025/01/keycloak-2610-released

## Issues Found
- The Bitnami chart value `global.storageClass` was outdated for the current Keycloak chart. Changed it to `global.defaultStorageClass`.
- The admin password secret key used `auth.existingSecretKey`, which is not the current Bitnami Keycloak chart field. Changed it to `auth.passwordSecretKey`.
- The Keycloak proxy configuration used the removed/deprecated `proxy: edge` option. Changed it to `proxyHeaders: xforwarded`, which matches current Keycloak and Bitnami chart configuration.
- The values file used a non-chart `health.enabled` block. Replaced it with supported `livenessProbe.enabled` and `readinessProbe.enabled` settings.
- The cache examples used the deprecated `kubernetes` transport stack and manual JGroups DNS settings. Changed them to `jdbc-ping`, the current default/recommended stack, and removed redundant `JAVA_OPTS_APPEND` / `KC_CACHE_STACK` overrides.
- The autoscaling values used the old flat structure. Changed them to the current `autoscaling.hpa.*` structure.
- The realm import example used `bearerOnly`, a deprecated client style. Replaced it with disabled authentication flows for an API-style client.
- The realm import `extraStartupArgs` example overwrote the earlier startup args. Changed it to include both `--import-realm` and the existing theme cache arguments.
- The standalone ServiceMonitor example selected the wrong service labels and port. Changed it to select the chart's metrics service and scrape the `tcp-metrics` port.
- The Grafana dashboard used metrics such as `keycloak_logins_total`, `keycloak_failed_login_attempts_total`, and `keycloak_sessions`, which are not current built-in Keycloak metrics. Replaced them with documented built-in HTTP request and Agroal database metrics.
- The HA example had duplicate `service:` keys and deprecated headless service annotations. Removed the obsolete headless service block and kept the session affinity service settings.
- Troubleshooting commands referenced a Deployment and legacy WildFly log path. Updated them to use the Bitnami chart's StatefulSet and Kubernetes logs.

## Review Notes
- Helm and kubectl were not installed in the local environment, so CLI behavior was checked against official documentation and chart source instead of local `--help` output.
- The post now aligns with the current Bitnami Keycloak chart and Keycloak 26.x behavior. Future chart releases may still rename values, so pinning a chart version would make the tutorial more reproducible.
