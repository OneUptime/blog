# Validation Summary: How to Deploy Zalando Postgres Operator with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Kubernetes
- HelmRelease and HelmRepository resources
- Zalando Postgres Operator
- PostgreSQL custom resources
- Patroni
- WAL-G and logical backups
- kubectl

## Sources Consulted
- Zalando Postgres Operator cluster manifest reference: https://opensource.zalando.com/postgres-operator/docs/reference/cluster_manifest.html
- Zalando Postgres Operator configuration parameters: https://opensource.zalando.com/postgres-operator/docs/reference/operator_parameters.html
- Zalando Postgres Operator quickstart and Helm repository documentation: https://opensource.zalando.com/postgres-operator/docs/quickstart.html
- Zalando Postgres Operator v1.12.2 Helm chart values: https://raw.githubusercontent.com/zalando/postgres-operator/v1.12.2/charts/postgres-operator/values.yaml
- Zalando Postgres Operator v1.12.2 Helm chart templates: https://github.com/zalando/postgres-operator/tree/v1.12.2/charts/postgres-operator/templates
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes JSONPath reference: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Patroni Kubernetes DCS documentation: https://patroni.readthedocs.io/en/rel_3_3/kubernetes.html

## Issues Found
- The introduction conflated logical backups with WAL-G. Updated it to distinguish WAL archiving via WAL-G from logical backups.
- The prerequisites described S3 only as storage for WAL backups. Updated the wording to cover logical backups and WAL archiving.
- The HelmRelease was created in the `postgres-operator` namespace without creating that namespace. Changed the HelmRelease to live in `flux-system`, added `targetNamespace: postgres-operator`, and set `install.createNamespace: true` so Flux can install the Helm release into the target namespace.
- The operator Helm values placed `enable_teams_api` under `configGeneral`, but the chart expects it under `configTeamsApi`. Moved the setting to `configTeamsApi`.
- The operator Helm values used a non-existent `configPostgreSQL.parameters` section for global PostgreSQL parameters. Removed that section; the post already shows valid per-cluster PostgreSQL parameters under `spec.postgresql.parameters`.
- The load balancer values used `enable_master_pool_size`, which is not a valid Zalando Postgres Operator chart value. Replaced it with valid `configLoadBalancer` fields.
- The Spilo image tag differed from the v1.12.2 chart default. Updated it to `ghcr.io/zalando/spilo-16:3.2-p3`.
- The logical backup example only configured global backup settings but did not enable backups on the sample PostgreSQL cluster. Added `enableLogicalBackup: true` to the cluster manifest.
- The logical backup retention value used `"7"`, but the operator documents retention values such as `"7 days"`. Updated it to `"7 days"`.
- The verification command assumed `acid-my-app-db-0` is the primary. Replaced it with a label-based lookup for the pod with `spilo-role=master`.
- The best-practice note described odd instance counts as required for quorum-based leader election. Patroni uses a DCS such as Kubernetes Endpoints or ConfigMaps for leader state, so the note was revised to recommend three instances for a highly available primary with two replicas.

## Review Notes
- The Flux, kubectl, and PostgreSQL custom resource examples are otherwise consistent with the referenced APIs.
- The Prometheus pod annotations are syntactically valid Kubernetes annotations, but a real scrape target on port 9187 requires an exporter or sidecar to be configured separately.
