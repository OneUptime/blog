# Validation Summary: How to Deploy Nextcloud on Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Nextcloud
- Kubernetes
- Helm
- PostgreSQL
- cert-manager
- Prometheus Operator / ServiceMonitor
- Amazon S3

## Sources Consulted
- https://nextcloud.github.io/helm/index.yaml
- https://github.com/nextcloud/helm/blob/main/charts/nextcloud/README.md
- https://raw.githubusercontent.com/nextcloud/helm/main/charts/nextcloud/values.yaml
- https://raw.githubusercontent.com/nextcloud/helm/main/charts/nextcloud/templates/ingress.yaml
- https://raw.githubusercontent.com/nextcloud/helm/main/charts/nextcloud/templates/secrets.yaml
- https://raw.githubusercontent.com/nextcloud/helm/main/charts/nextcloud/templates/db-secret.yaml
- https://raw.githubusercontent.com/nextcloud/helm/main/charts/nextcloud/templates/deployment.yaml
- https://raw.githubusercontent.com/nextcloud/helm/main/charts/nextcloud/templates/service.yaml
- https://raw.githubusercontent.com/nextcloud/helm/main/charts/nextcloud/templates/metrics/deployment.yaml
- https://raw.githubusercontent.com/nextcloud/helm/main/charts/nextcloud/templates/metrics/service.yaml
- https://raw.githubusercontent.com/nextcloud/helm/main/charts/nextcloud/templates/servicemonitor.yaml
- https://raw.githubusercontent.com/nextcloud/helm/main/charts/nextcloud/templates/hpa.yaml
- https://helm.sh/docs/helm/helm_install/
- https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- https://cert-manager.io/docs/usage/ingress/
- https://docs.nextcloud.com/server/latest/admin_manual/maintenance/backup.html

## Issues Found
- The post referenced `bitnami/nextcloud`, but the current public install path is the official `nextcloud/nextcloud` chart. I updated the repo, search, install, and upgrade commands accordingly and pinned the current chart version `9.0.5`.
- The original secret example created keys that do not match the chart’s expected secret names and keys. I replaced it with separate Nextcloud admin and PostgreSQL secrets that align with the chart’s `existingSecret` settings.
- The `nextcloud-values.yaml` snippet used unsupported or incorrect fields for the current chart, including `ingress.hostname`, `ingress.ingressClassName`, `ingress.tls: true`, `certManager: true`, `postgresql.auth.password`, and `podDisruptionBudget`. I replaced them with the current official chart fields and disabled SQLite in favor of PostgreSQL.
- `helm install --version latest` is invalid for Helm because `--version` expects a version or semver constraint. I replaced it with `--version 9.0.5`.
- The verification command read the admin password from a nonexistent secret/key. I updated it to read `nextcloud-password` from `nextcloud-secret`.
- The backup CronJob would not work as written because it mounted no volume and referenced the wrong PVC name. I added the missing `volumeMounts`, corrected the PVC claim name, and clarified that the example backs up the data PVC only.
- The ServiceMonitor example did not match the current chart’s monitoring integration. I replaced it with a chart values overlay that enables the bundled exporter and `prometheus.serviceMonitor`.
- The HPA example did not match the current chart guidance for clustered Nextcloud. I replaced it with a chart values overlay that enables the built-in HPA and documents the `ReadWriteMany` storage and sticky-session prerequisites.
- I fixed `unextcloud` typos in the introduction, install/upgrade comments, conclusion, and related references.

## Review Notes
- The review was documentation-based. `helm` and `kubectl` were not installed in the review environment, so I did not run a live deployment test.
- The monitoring overlay assumes Prometheus Operator is already installed in the cluster.
- The HPA overlay assumes `metrics-server` is available and that the storage class supports `ReadWriteMany`.
- The backup example is intentionally limited to PVC data. Nextcloud’s official backup guidance also requires backing up the database, config, custom apps, and themes.
