# Validation Summary: How to Deploy TiDB Operator with Flux CD - 2026-03-06

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- HelmRelease and HelmRepository resources
- TiDB Operator
- TiDB, PD, and TiKV
- TidbCluster, TidbMonitor, and BackupSchedule custom resources
- Prometheus and Grafana monitoring
- S3-compatible backup storage

## Sources Consulted
- TiDB Operator deployment documentation: https://docs.pingcap.com/tidb-in-kubernetes/stable/deploy-tidb-operator/
- TiDB Operator v1.5 deployment documentation: https://docs.pingcap.com/tidb-in-kubernetes/v1.5/deploy-tidb-operator/
- TiDB Operator v1.5.5 chart values and package: https://raw.githubusercontent.com/pingcap/tidb-operator/v1.5.5/charts/tidb-operator/values.yaml and https://charts.pingcap.org/tidb-operator-v1.5.5.tgz
- TiDB Operator v1.5.5 CRD manifest: https://raw.githubusercontent.com/pingcap/tidb-operator/v1.5.5/manifests/crd.yaml
- PingCAP Helm chart repository index: https://charts.pingcap.org/index.yaml
- TiDB monitoring documentation: https://docs.pingcap.com/tidb-in-kubernetes/stable/monitor-a-tidb-cluster/
- TiDB BR backup to S3 documentation: https://docs.pingcap.com/tidb-in-kubernetes/stable/backup-to-aws-s3-using-br/
- TiDB TLS between components documentation: https://docs.pingcap.com/tidb-in-kubernetes/stable/enable-tls-between-components/
- TiDB configuration documentation: https://docs.pingcap.com/tidb/stable/tidb-configuration-file
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The post used a separate `tidb-operator-crds` HelmRelease with the same `tidb-operator` chart and claimed it would install only CRDs. The v1.5.5 chart package does not include a Helm `crds/` directory and the chart would also render operator resources. I changed the flow to commit PingCAP's official `manifests/crd.yaml` and apply it through the operator Kustomization before the HelmRelease.
- The post placed the TiDB custom resources in the same Flux Kustomization as the operator install. Flux validates objects against the API server, so custom resources can fail before their CRDs are installed. I split the repository layout and Flux resources into `tidb-operator` and `tidb-cluster` Kustomizations, with the cluster Kustomization depending on the operator Kustomization.
- The chart version was specified as `"1.5.x"`, but PingCAP publishes TiDB Operator chart versions with a `v` prefix, such as `v1.5.5`. I pinned the examples to `"v1.5.5"`.
- The operator Helm values put `resources` at the top level, but the chart expects controller resources under `controllerManager.resources`. I moved the resource requests and limits under `controllerManager`.
- The TidbCluster example used `enableTLSCluster`, which is not a v1.5.5 CRD field. I changed it to `tlsCluster.enabled`.
- The TidbCluster example used `slowLogThreshold`, which is not a TidbCluster component field. I changed it to the TiDB config key `log.slow-threshold`.
- The TidbMonitor example put `storageClassName` and `storage` under `prometheus`, but the TidbMonitor CRD defines persistence fields at the monitor spec level. I moved them to `spec.storageClassName` and `spec.storage`, and added `spec.persistent: true`.
- The TidbMonitor example omitted required `reloader` configuration from the CRD. I added `reloader` and `prometheusReloader` image settings matching PingCAP examples.
- The BackupSchedule example mixed SQL connection fields under `from` with BR backup configuration. PingCAP's BR schedule examples use `backupType: full` with `br` and `s3` fields, so I removed the obsolete root-user secret and `from` block and added `backupType: full`.
- The Flux verification command was updated to list Kustomizations without passing multiple resource names in one command.

## Review Notes
The corrected manifests are still example manifests. Operators should replace placeholder credentials with a secret management workflow such as SOPS or External Secrets before using this pattern in production.
