# Validation Summary: How to Deploy Apache Airflow with Helm for Workflow Orchestration

## Status
validated

## Post Type
Technical tutorial / deployment guide

## Technologies Covered
- Apache Airflow
- Apache Airflow Helm chart
- Kubernetes
- Helm
- PostgreSQL
- Redis
- Git Sync
- KubernetesExecutor
- CeleryExecutor
- Docker
- Prometheus / StatsD
- External Secrets Operator

## Sources Consulted
- Apache Airflow Helm chart 1.13.1 parameters reference: https://airflow.apache.org/docs/helm-chart/1.13.1/parameters-ref.html
- Apache Airflow Helm chart 1.13.1 production guide: https://airflow.apache.org/docs/helm-chart/1.13.1/production-guide.html
- Apache Airflow Helm chart statsd Service template: https://raw.githubusercontent.com/apache/airflow/helm-chart/1.13.1/chart/templates/statsd/statsd-service.yaml
- Apache Airflow Helm chart helper templates for Git Sync, extraEnv, and secrets: https://raw.githubusercontent.com/apache/airflow/helm-chart/1.13.1/chart/templates/_helpers.yaml
- Apache Airflow Helm chart Redis templates: https://raw.githubusercontent.com/apache/airflow/helm-chart/1.13.1/chart/templates/redis/redis-statefulset.yaml and https://raw.githubusercontent.com/apache/airflow/helm-chart/1.13.1/chart/templates/secrets/redis-secrets.yaml
- Apache Airflow 2.8.0 configuration reference: https://airflow.apache.org/docs/apache-airflow/2.8.0/configurations-ref.html
- Apache Airflow KubernetesExecutor provider documentation: https://airflow.apache.org/docs/apache-airflow-providers-cncf-kubernetes/stable/kubernetes_executor.html
- Apache Airflow metrics documentation: https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/logging-monitoring/metrics.html
- Helm install command reference: https://helm.sh/docs/helm/helm_install/
- Kubernetes kubectl create secret generic reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- Apache Airflow Docker image build documentation: https://airflow.apache.org/docs/docker-stack/build.html

## Issues Found
- The webserver secret key values were placed under `webserver`, but the official chart expects `webserverSecretKey` or `webserverSecretKeySecretName` at the top level. Moved `webserverSecretKeySecretName` to the correct top-level location.
- The default admin password was set to an empty string in the production values example. Replaced it with an explicit placeholder value because the chart passes this value to the create-user job.
- The external database example used unsupported `metadataConnection.existingSecret` and `existingSecretKey` fields. Replaced it with the supported `data.metadataSecretName` pattern and documented the required `connection` secret key.
- The Git Sync values enabled both HTTPS credentials and SSH key secret at the same time. Commented them as alternatives, since the chart gives the SSH path precedence when `sshKeySecret` is set.
- The Git Sync credentials Secret only included legacy `GIT_SYNC_*` keys. Added the `GITSYNC_*` keys required by the chart's git-sync v4 compatibility environment.
- `AIRFLOW__WEBSERVER__RBAC` was included even though it is not an Airflow 2.8.0 configuration option. Removed it.
- `extraEnv` and `extraEnvFrom` were written as YAML arrays, but the chart templates call `tpl` on these values and expect templated strings. Converted both examples to block scalar strings.
- The KubernetesExecutor pod template set `AIRFLOW__CORE__EXECUTOR` to `LocalExecutor` inside task pods. Removed that override because the deployment is configured for KubernetesExecutor.
- The Celery Redis example used Bitnami Redis values (`redis.auth` and `redis.master.persistence`) that are not supported by the official Airflow chart. Replaced them with the chart's `redis.persistence` values and left internal Redis password handling to the chart.
- The ServiceMonitor example selected `app: airflow` and scraped `statsd-ingest`, but the chart's StatsD Service uses `tier: airflow`, `component: statsd`, `release: <release>` labels and exposes Prometheus metrics on `statsd-scrape`. Updated the selector and port.
- The troubleshooting migration command used `airflow db upgrade`, but Airflow 2.7+ uses `airflow db migrate`; the chart uses the same conditional command for Airflow 2.8. Updated the command.

## Review Notes
The post pins Airflow `2.8.0`, which is no longer current as of this review date. The examples are now corrected for the Airflow 2.8-era official Helm chart, but a future refresh should consider updating the Airflow and chart versions and revisiting Airflow 3 chart changes.
