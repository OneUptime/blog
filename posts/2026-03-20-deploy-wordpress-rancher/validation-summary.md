# Validation Summary: How to Deploy WordPress on Rancher - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher
- Kubernetes
- Helm
- Bitnami WordPress chart
- WordPress
- MariaDB
- Longhorn
- cert-manager
- Prometheus Operator / ServiceMonitor
- HorizontalPodAutoscaler

## Sources Consulted
- Bitnami WordPress chart README: https://github.com/bitnami/charts/blob/main/bitnami/wordpress/README.md
- Bitnami WordPress chart values: https://github.com/bitnami/charts/blob/main/bitnami/wordpress/values.yaml
- Bitnami WordPress deployment template: https://github.com/bitnami/charts/blob/main/bitnami/wordpress/templates/deployment.yaml
- Bitnami WordPress metrics service template: https://github.com/bitnami/charts/blob/main/bitnami/wordpress/templates/metrics-svc.yaml
- Bitnami WordPress ServiceMonitor template: https://github.com/bitnami/charts/blob/main/bitnami/wordpress/templates/servicemonitor.yaml
- Bitnami MariaDB chart README: https://github.com/bitnami/charts/blob/main/bitnami/mariadb/README.md
- Helm install reference: https://helm.sh/docs/helm/helm_install/
- Helm values files reference: https://helm.sh/docs/chart_template_guide/values_files/
- Kubernetes Horizontal Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes Pod Disruption Budgets: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- cert-manager annotated Ingress usage: https://cert-manager.io/docs/usage/ingress/
- Longhorn RWX volumes: https://longhorn.io/docs/latest/nodes-and-volumes/volumes/rwx-volumes/
- Prometheus Operator getting started with ServiceMonitor: https://prometheus-operator.dev/docs/developer/getting-started/

## Issues Found
- The post described the deployment as WordPress with MySQL, but the chart example actually deploys MariaDB. Updated the description to match the implementation.
- The original secret keys (`admin-password` and `db-password`) were not compatible with the Bitnami WordPress and MariaDB charts, and the values file did not reference them correctly. Updated the secret creation command to use chart-compatible keys and switched the values file to `existingSecret` for both WordPress and MariaDB.
- The values file used `${DB_ROOT_PASSWORD}` and `${DB_PASSWORD}` placeholders inside `wordpress-values.yaml`. Helm values files are plain YAML and are not automatically populated from shell environment variables, so this would not work as written. Replaced that flow with the chart-supported secret-based configuration.
- The values file used `ingress.certManager`, which is not a supported Bitnami WordPress chart value. Removed it and kept the cert-manager integration through supported Ingress annotations.
- The post configured `replicaCount: 2` without setting shared storage access. Updated the prerequisites and persistence settings to require `ReadWriteMany`, which the chart documents as necessary when scaling WordPress replicas beyond one.
- The post used `podDisruptionBudget`, but the current chart uses the `pdb` block. Updated the values example to `pdb.create` and `pdb.minAvailable`.
- The backup CronJob did not mount the PVC, referenced the wrong claim name, and synced the wrong path. Added the missing `volumeMounts`, corrected the default claim name for the `wordpress` release, and updated the backup path to the chart’s persistent WordPress content directory.
- The monitoring example assumed a generic `ServiceMonitor` selector that would not reliably target the Bitnami metrics service. Enabled metrics in the values example and updated the `ServiceMonitor` selector to match the chart’s metrics service labels.
- The HPA section depended on cluster resource metrics but the prerequisites did not mention that requirement. Added `metrics-server` as a prerequisite for HPA usage.

## Review Notes
- The post still uses the classic Bitnami Helm repository flow. During validation on 2026-05-01, `https://charts.bitnami.com/bitnami` still resolved and remained usable, although current Bitnami chart documentation now defaults to OCI-based installs.
- The backup example only covers WordPress content on persistent storage. A production backup strategy should also include MariaDB data or logical database backups.
- The `ServiceMonitor` discovery label is environment-specific. Rancher Monitoring and other Prometheus Operator deployments may require a different metadata label than `release: prometheus`.
- The review was completed against current upstream documentation and chart source on 2026-05-01. The workspace did not have `helm` or `kubectl` installed, so the commands were validated from authoritative docs rather than executed locally.
