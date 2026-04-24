# Validation Summary: How to Deploy PostgreSQL on Kubernetes with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- PostgreSQL
- Kubernetes
- OpenTofu / Terraform HCL
- Helm
- Bitnami PostgreSQL Helm chart
- Prometheus Operator / ServiceMonitor

## Sources Consulted
- Bitnami PostgreSQL Helm chart README: https://github.com/bitnami/charts/blob/main/bitnami/postgresql/README.md
- Bitnami PostgreSQL Helm chart values: https://raw.githubusercontent.com/bitnami/charts/main/bitnami/postgresql/values.yaml
- Bitnami PostgreSQL Helm chart metadata: https://github.com/bitnami/charts/blob/main/bitnami/postgresql/Chart.yaml
- Bitnami PostgreSQL chart naming helpers and service templates: https://github.com/bitnami/charts/blob/main/bitnami/postgresql/templates/_helpers.tpl
- Bitnami PostgreSQL primary service template: https://github.com/bitnami/charts/blob/main/bitnami/postgresql/templates/primary/svc.yaml
- Bitnami PostgreSQL read service template: https://github.com/bitnami/charts/blob/main/bitnami/postgresql/templates/read/svc.yaml
- PostgreSQL `pg_stat_statements` documentation: https://www.postgresql.org/docs/current/pgstatstatements.html
- Terraform Helm provider `helm_release` docs: https://registry.terraform.io/providers/hashicorp/helm/latest/docs/resources/release
- Terraform Kubernetes provider `kubernetes_secret` docs: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/secret
- Terraform Kubernetes provider `kubernetes_namespace` docs: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/namespace
- Terraform Kubernetes provider `kubernetes_pod_disruption_budget_v1` docs: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/pod_disruption_budget_v1
- Kubernetes namespaces, secrets, and PodDisruptionBudget docs: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/ , https://kubernetes.io/docs/concepts/configuration/secret/ , https://kubernetes.io/docs/tasks/run-application/configure-pdb/

## Issues Found
- The post claimed Bitnami's `postgresql` chart supported PgBouncer, but the current upstream chart does not expose a `pgbouncer` configuration block. I removed the PgBouncer references, the invalid values block, and the PgBouncer output.
- The post described automated backups, but the article did not configure or demonstrate backups. I removed that claim from the description.
- The example omitted `architecture = "replication"`, which means the `readReplicas` settings would otherwise be ignored. I added the replication architecture setting.
- The Secret was created in the `postgres` namespace before any namespace resource existed, while `helm_release.create_namespace` would not help because the Secret must exist before Helm can consume `auth.existingSecret`. I added an explicit `kubernetes_namespace` resource and referenced it from the Secret, Helm release, and PDB.
- The example pinned chart version `14.2.0`, which is outdated relative to the current upstream chart metadata. I updated it to `17.1.0`.
- The example initialized `pg_stat_statements` without preloading the module. PostgreSQL requires `pg_stat_statements` in `shared_preload_libraries` for the extension to be active. I added `postgresqlSharedPreloadLibraries = "pg_stat_statements"`.
- The example manually created a read-replica PodDisruptionBudget while the chart's current defaults already create read-replica and primary PDBs. I disabled the chart-managed read-replica PDB so the manual PDB in Step 2 is the only one applied.
- The primary output hostname was incorrect for replicated deployments. Based on the chart's current naming helpers and service templates, the primary service is `postgresql-primary`, not `postgresql`.
- The metrics example enabled `metrics.serviceMonitor.enabled` without noting the Prometheus Operator CRD requirement. I added an inline note that the CRDs must exist.
- The `High Availability` tag was misleading because the Bitnami `postgresql` chart is replication-oriented and the upstream README directs users to `postgresql-ha` for HA. I replaced it with `Replication`.

## Review Notes
- The example assumes the default Kubernetes cluster domain `cluster.local`; clusters using a custom domain would need different output hostnames.
- The `gp3` StorageClass is AWS-specific. It is valid as an example, but other environments should replace it with an appropriate class.
- This review was validated against official documentation and chart sources. Helm and OpenTofu binaries were not installed in the local workspace, so the example was not executed in this environment.
