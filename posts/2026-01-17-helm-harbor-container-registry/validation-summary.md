# Validation Summary: How to Deploy Harbor Container Registry with Helm

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Harbor
- Helm
- Kubernetes
- PostgreSQL
- Redis
- S3-compatible object storage
- Trivy
- OIDC / Keycloak
- Prometheus ServiceMonitor
- Docker registry authentication

## Sources Consulted
- Harbor Helm chart values: https://github.com/goharbor/harbor-helm/blob/main/values.yaml
- Harbor Helm chart ServiceMonitor template: https://github.com/goharbor/harbor-helm/blob/main/templates/metrics/metrics-svcmon.yaml
- Harbor metrics documentation: https://goharbor.io/docs/2.14.0/administration/metrics/
- Harbor robot account documentation: https://goharbor.io/docs/2.14.0/administration/robot-accounts/
- Harbor API OpenAPI specification: https://github.com/goharbor/harbor/blob/main/api/v2.0/swagger.yaml
- Harbor garbage collection documentation: https://goharbor.io/docs/2.14.0/administration/garbage-collection/
- Bitnami PostgreSQL chart values: https://github.com/bitnami/charts/blob/main/bitnami/postgresql/values.yaml

## Issues Found
- The Harbor `secretKey` example generated 32 hex characters, but the Harbor Helm chart requires a 16-character value. Changed the command from `openssl rand -hex 16` to `openssl rand -hex 8` and corrected the nearby comment.
- The PostgreSQL existing secret example only created the `password` key, while the Bitnami PostgreSQL values referenced both `password` and `postgres-password`. Added `postgres-password` to the secret creation command.
- The monitoring section showed a manually authored ServiceMonitor while the Harbor Helm chart already supports creating one via `metrics.serviceMonitor.enabled`. Updated the values examples to use the chart-supported option.
- Several metric names in the PromQL examples did not match the current Harbor metrics documentation. Updated repository, artifact, registry request duration, and scan task examples to documented metric names.

## Review Notes
The post is technically relevant and generally aligned with current Harbor Helm deployment patterns. Some production choices, such as using specific external Redis and PostgreSQL endpoints, remain environment-dependent and should be adjusted by operators for their clusters.
