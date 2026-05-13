# Validation Summary: How to Deploy Percona MySQL Operator with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Kubernetes
- HelmRepository and HelmRelease resources
- Flux Kustomization resources
- Percona Operator for MySQL based on Percona XtraDB Cluster
- Percona XtraDB Cluster and Galera replication
- HAProxy
- Percona Monitoring and Management
- S3-compatible backups

## Sources Consulted
- Percona Operator for MySQL 1.15.1 release notes: https://docs.percona.com/percona-operator-for-mysql/pxc/ReleaseNotes/Kubernetes-Operator-for-PXC-RN1.15.1.html
- Percona Operator for MySQL custom resource options: https://docs.percona.com/percona-operator-for-mysql/pxc/operator.html
- Percona Operator for MySQL application and system users: https://docs.percona.com/percona-operator-for-mysql/pxc/users.html
- Percona Operator for MySQL backup storage documentation: https://docs.percona.com/percona-operator-for-mysql/pxc/backups-storage.html
- Percona Operator v1.15.1 upstream `deploy/cr.yaml`: https://raw.githubusercontent.com/percona/percona-xtradb-cluster-operator/v1.15.1/deploy/cr.yaml
- Percona Operator v1.15.1 upstream `deploy/secrets.yaml`: https://raw.githubusercontent.com/percona/percona-xtradb-cluster-operator/v1.15.1/deploy/secrets.yaml
- Percona Helm chart `pxc-operator` v1.15.1 metadata and values: https://github.com/percona/percona-helm-charts/tree/pxc-operator-1.15.1/charts/pxc-operator
- Percona XtraDB Cluster certification documentation: https://docs.percona.com/percona-xtradb-cluster/5.7/manual/certification.html
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The introduction described PXC replication as simply synchronous and said conflicts are automatically resolved. Updated this to "virtually synchronous" and clarified that Galera/PXC uses certification to detect conflicts, which can cause transaction rollbacks.
- The prerequisite listed Kubernetes v1.26+, which is broader than the tested platform versions for Percona Operator 1.15.1. Changed it to require a Kubernetes version supported by Percona Operator 1.15.1.
- The custom resource used `upgradeOptions.apply: Disabled`; the upstream 1.15.1 manifest uses the lowercase `disabled` value. Updated the value.
- The HAProxy, PMM client, and backup images did not match the official components for operator 1.15.1. Updated them to `percona/haproxy:2.8.5`, `percona/pmm-client:2.42.0`, and `percona/percona-xtradb-cluster-operator:1.15.1-pxc8.0-backup-pxb8.0.35`.
- The system user Secret included unsupported/incorrect keys for the 1.15.1 example, including `clustercheck` and `pmmserver`. Removed `clustercheck` and changed the optional PMM key comment to `pmmserverkey`.
- The Flux Kustomization applied the HelmRelease and PerconaXtraDBCluster in one reconciliation path, which can fail because the PXC CRD is installed by the HelmRelease. Split the example into operator and cluster Kustomizations and added `dependsOn` so the cluster custom resource is applied only after the operator Kustomization is ready.
- The Flux health check watched the Helm-created Deployment directly. Updated it to health-check the `HelmRelease`, matching Flux guidance for Kustomizations that contain HelmRelease objects.

## Review Notes
The S3 backup Secret uses `stringData`, which is valid Kubernetes syntax and will be encoded into `data` by the API server, although Percona's examples show pre-encoded `data` values. The example still uses placeholder AWS credentials and should be converted to SealedSecret or SOPS-managed content before committing to a real GitOps repository.
