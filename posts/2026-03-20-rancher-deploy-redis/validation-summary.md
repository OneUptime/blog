# Validation Summary: How to Deploy Redis on Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Redis
- Redis Sentinel
- Redis Cluster
- Helm
- Prometheus Operator / ServiceMonitor
- Grafana

## Sources Consulted
- Bitnami Redis Helm chart README: https://github.com/bitnami/charts/blob/main/bitnami/redis/README.md
- Bitnami Redis chart templates: https://raw.githubusercontent.com/bitnami/charts/main/bitnami/redis/templates/sentinel/statefulset.yaml
- Bitnami Redis chart config template: https://raw.githubusercontent.com/bitnami/charts/main/bitnami/redis/templates/configmap.yaml
- Bitnami Redis Cluster chart values: https://raw.githubusercontent.com/bitnami/charts/main/bitnami/redis-cluster/values.yaml
- Bitnami Redis package page: https://bitnami.com/stack/redis/helm
- Bitnami OCI migration announcement: https://blog.bitnami.com/2024/10/bitnami-helm-charts-moving-to-oci.html
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes ConfigMap docs: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes dependent environment variables docs: https://kubernetes.io/docs/tasks/inject-data-application/define-interdependent-environment-variables/
- Redis `INFO` command docs: https://redis.io/docs/latest/commands/info/
- Redis Sentinel docs: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Rancher monitoring enablement docs: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/monitoring-alerting-guides/enable-monitoring
- Rancher Prometheus Federator / selector guidance: https://ranchermanager.docs.rancher.com/v2.11/how-to-guides/advanced-user-guides/monitoring-alerting-guides/prometheus-federator-guides/enable-prometheus-federator
- Grafana Redis exporter dashboard example: https://grafana.com/grafana/dashboards/10819-redis-dashboard-for-prometheus-redis-exporter-1-x/

## Issues Found
- The Sentinel values file used chart fields that did not match the current Bitnami Redis chart behavior for Sentinel mode. I moved the shared Redis configuration to `commonConfiguration`, moved persistence and Redis container resources under `replica`, increased `replica.replicaCount` from `2` to `3` for a robust three-Sentinel deployment, and corrected `metrics.serviceMonitor.labels` to `metrics.serviceMonitor.additionalLabels`.
- The install commands used the older chart-repository flow. I updated them to the current OCI install syntax from Bitnami and tightened the prerequisite from generic Helm 3.x to Helm 3.8+.
- The “Verify Redis Cluster” section was mislabeled and used a `kubectl` label selector for a master pod that does not apply to the Bitnami Sentinel topology. I renamed the section, switched verification to Sentinel-based master discovery, and removed the invalid `INFO sentinel` command from the Redis server connection.
- The Redis Cluster values example did not match the current `bitnami/redis-cluster` chart schema. I replaced deprecated/incorrect keys such as `cluster.enabled`, `slaveCount`, `global.redis.password`, `redis.usePassword`, and `redis.persistence` with the current `cluster.init`, `cluster.nodes`, `cluster.replicas`, top-level `usePassword`, top-level `password`, and top-level `persistence` fields.
- The sample Kubernetes `Deployment` manifest was invalid for `apps/v1` because it omitted the required selector and matching pod labels. I added `spec.selector.matchLabels` and `template.metadata.labels`.
- The application example referenced a `redis-secret` secret that the shown Bitnami installation does not create. I corrected it to the chart-generated secret name `redis` and key `redis-password` for the documented release name.
- The session management example incorrectly attempted to interpolate `$(REDIS_PASSWORD)` inside a `ConfigMap` value and pointed at a `redis-master` service that is not created by the shown Sentinel configuration. I replaced that with session settings that reuse the Sentinel connection environment variables from the deployment example.
- The persistence and troubleshooting commands used `redis-master-0`, which does not match the Sentinel deployment shown in the post. I updated those sections to discover the current master pod through Sentinel first and then run the commands against the actual current master.
- The monitoring section relied on a hard-coded Prometheus pod name. I changed it to a stable Grafana port-forward example and a PromQL query example, and updated the dashboard reference to a current Redis exporter dashboard example.

## Review Notes
- The examples assume the Helm release name is `redis`, so the generated secret name and StatefulSet pod DNS names also use `redis`.
- The ServiceMonitor example assumes Rancher Monitoring is installed in `cattle-monitoring-system` and configured to select resources labeled with `release: rancher-monitoring`, which matches Rancher’s documented guidance.
