# Validation Summary: How to Deploy MySQL on Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- MySQL
- Helm
- Bitnami MySQL Helm chart
- Prometheus Operator ServiceMonitor
- Grafana

## Sources Consulted
- Bitnami MySQL Helm chart README: https://raw.githubusercontent.com/bitnami/charts/main/bitnami/mysql/README.md
- Bitnami MySQL Helm chart values: https://raw.githubusercontent.com/bitnami/charts/main/bitnami/mysql/values.yaml
- Bitnami MySQL Helm chart primary service template: https://raw.githubusercontent.com/bitnami/charts/main/bitnami/mysql/templates/primary/svc.yaml
- Bitnami MySQL Helm chart ServiceMonitor template: https://raw.githubusercontent.com/bitnami/charts/main/bitnami/mysql/templates/servicemonitor.yaml
- Bitnami MySQL Helm chart helpers template: https://raw.githubusercontent.com/bitnami/charts/main/bitnami/mysql/templates/_helpers.tpl
- Bitnami MySQL Helm chart StatefulSet templates: https://raw.githubusercontent.com/bitnami/charts/main/bitnami/mysql/templates/primary/statefulset.yaml and https://raw.githubusercontent.com/bitnami/charts/main/bitnami/mysql/templates/secondary/statefulset.yaml
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- MySQL `SHOW REPLICA STATUS` reference: https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html
- Rancher ServiceMonitor and PodMonitor Configuration: https://ranchermanager.docs.rancher.com/reference-guides/monitoring-v2-configuration/servicemonitors-and-podmonitors
- Grafana MySQL Overview dashboard 7362: https://grafana.com/grafana/dashboards/7362-mysql-overview/

## Issues Found
- The post configured `secondary.replicaCount` but never enabled `architecture: replication`. I added `architecture: replication` so the primary/secondary topology, `mysql-primary` service, and replication examples match the chart behavior.
- The prerequisites were too broad for the current chart. I updated them to Kubernetes 1.23+ and Helm 3.8+ based on the current Bitnami chart requirements.
- The `backup` block in `mysql-values.yaml` does not exist in the current Bitnami MySQL chart. I removed that block and kept backups in the separate CronJob section instead.
- The verification commands used `MYSQL_ROOT_PASSWORD` without first defining it locally and used deprecated `SHOW SLAVE STATUS`. I updated the examples to read the password from the Kubernetes Secret and use `SHOW REPLICA STATUS`.
- The optional PVC example created a claim but never attached it to the Helm release. I updated it to set `primary.persistence.existingClaim`.
- The application access section recreated a `mysql-primary` Service that the chart already creates automatically in replication mode. I replaced that manifest with guidance to use the chart-managed service directly.
- The application config hard-coded the default cluster domain. I changed the hostname to `mysql-primary.databases.svc` so the example works without assuming `cluster.local`.
- The backup CronJob referenced `mysql-backup-pvc` without defining it. I added the PVC manifest required by the CronJob.
- The backup CronJob used an outdated `bitnami/mysql:8.0` image example. I aligned it with the current Bitnami chart image tag and noted that it should match the deployed release.
- The introduction and conclusion overstated built-in high-availability and backup support. I revised the wording to describe replication and monitoring accurately, with backups added separately.

## Review Notes
- The guide still uses the classic `helm repo add` workflow. Bitnami’s current README also shows OCI installation examples, but repository-based installation remains valid.
- The backup example stores dumps on a PVC inside the cluster. For production disaster recovery, off-cluster or object storage remains the safer target.
