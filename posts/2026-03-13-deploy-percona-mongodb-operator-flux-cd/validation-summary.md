# Validation Summary: How to Deploy Percona MongoDB Operator with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Flux CD
- Kubernetes
- HelmRelease and HelmRepository custom resources
- Kustomization custom resources
- Percona Operator for MongoDB
- Percona Server for MongoDB
- Percona Backup for MongoDB
- MongoDB replica sets
- Kubernetes Secrets and PersistentVolumeClaims

## Sources Consulted
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Percona Operator for MongoDB Helm installation guide: https://docs.percona.com/percona-operator-for-mongodb/helm.html
- Percona Operator for MongoDB custom resource options: https://docs.percona.com/percona-operator-for-mongodb/operator.html
- Percona Operator for MongoDB system users documentation: https://docs.percona.com/percona-operator-for-mongodb/system-users.html
- Percona Helm chart repository index: https://percona.github.io/percona-helm-charts/index.yaml
- Percona Helm chart artifacts for `psmdb-operator` and `psmdb-db` version 1.16.3 from https://github.com/percona/percona-helm-charts/releases

## Issues Found
- The Flux example applied the operator HelmRelease and the `PerconaServerMongoDB` custom resource from the same Kustomization. This is not reliable because the Percona CRD must exist before Flux applies resources of that kind. I split the example into separate operator and cluster Kustomizations and added `dependsOn` so the cluster is applied only after the operator Kustomization is ready.
- The Flux health check watched the operator Deployment directly. I changed it to health check the `HelmRelease`, which better reflects the readiness of the Helm-managed operator and its CRDs in this GitOps flow.
- The example placed `!` passwords inside double-quoted shell commands. In an interactive Bash shell, history expansion can break those commands. I changed the `mongosh` URI examples to single quotes.
- The replica set `expose` comment said members were exposed via ClusterIP while `enabled: false` disabled that exposure setting. I corrected the comment and removed the irrelevant `exposeType`.
- The introduction included an unclear claim that the operator "supports both Percona Server for MongoDB (PSMDB)" and is built on community operator patterns. I tightened it to the documented scope: managing Percona Server for MongoDB replica sets and sharded clusters.
- The conclusion described PBM as "pgBackup-equivalent." I replaced that inaccurate comparison with a direct statement that PBM provides backup capabilities.

## Review Notes
- The post pins Percona Operator and chart examples to 1.16.3, which is older than the current Percona Operator documentation and releases available on 2026-05-13. The pinned chart and CRD fields were checked against the 1.16.3 chart artifacts where version-specific behavior mattered.
- Current Percona Helm documentation installs CRDs with a separate `psmdb-operator-crds` chart before installing the operator. The pinned 1.16.3 `psmdb-operator` chart still includes CRDs under its `crds/` directory, so the Flux `install.crds` and `upgrade.crds` settings are valid for this version.
