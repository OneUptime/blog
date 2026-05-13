# Validation Summary: How to Deploy ScyllaDB Operator with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ScyllaDB
- ScyllaDB Operator
- ScyllaDB Manager Agent
- Kubernetes
- Flux CD
- HelmRelease
- Kustomization
- ConfigMap
- CQL and cqlsh

## Sources Consulted
- ScyllaDB Operator Helm installation documentation: https://operator.docs.scylladb.com/stable/installation/helm.html
- ScyllaDB Operator ScyllaCluster API reference: https://operator.docs.scylladb.com/stable/reference/api/groups/scylla.scylladb.com/scyllaclusters.html
- ScyllaDB Operator releases and support matrix: https://operator.docs.scylladb.com/stable/support/releases.html
- ScyllaDB Operator ScyllaCluster basics: https://operator.docs.scylladb.com/stable/resources/scyllaclusters/basics.html
- ScyllaDB Operator CQL client documentation: https://operator.docs.scylladb.com/stable/resources/scyllaclusters/clients/cql.html
- ScyllaDB Operator Manager architecture documentation: https://operator.docs.scylladb.com/stable/architecture/manager.html
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization dependency documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- ScyllaDB stable Helm chart index: https://scylla-operator-charts.storage.googleapis.com/stable/index.yaml
- ScyllaDB default scylla.yaml source: https://github.com/scylladb/scylladb/blob/master/conf/scylla.yaml

## Issues Found
- The post pinned `scylla-operator` chart version `1.13.0`, which is unsupported and does not match the current stable chart index format. Updated it to `v1.20.2`.
- The post used ScyllaDB `6.1.2` and Manager Agent `3.3.0`, which do not match the current Operator support matrix. Updated them to ScyllaDB `2026.1.0` and Manager Agent `3.9.0`.
- The `cpuset` field was recommended and used directly, but the current ScyllaCluster API marks it deprecated and treats it as always enabled. Removed the field and updated the best-practice guidance to use Guaranteed QoS resource requests and limits.
- The ScyllaDB namespace was missing. Added a `scylla` namespace manifest.
- The sample deployed the operator and ScyllaCluster in one Flux Kustomization, which can race because custom resources require the CRDs and operator to be installed first. Split the Flux configuration into operator and cluster Kustomizations with `dependsOn`.
- The cluster used one rack with three members while recommending replication factor 3. Updated the example to three racks with one member each.
- The toleration key did not match the ScyllaDB Operator examples. Updated it to `scylla-operator.scylladb.com/dedicated` with `value: scyllaclusters` and `effect: NoSchedule`.
- The ScyllaDB config example included settings that are not present in the current default `scylla.yaml` and mislabeled timeout settings as consistency configuration. Removed the invalid settings and corrected the comments.
- The Manager Agent config ConfigMap used an empty `auth_token` and was not needed for the tutorial. Removed it to avoid an insecure or misleading configuration.
- The verification commands hard-coded a pod name and omitted the `scylla` container name. Updated them to select a ScyllaDB pod by labels and use `-c scylla`, and used the client Service for `cqlsh`.
- Claims about microsecond latency and automated repairs were too absolute for the shown deployment. Adjusted the wording to low-latency performance and clarified that repair and backup task integration requires ScyllaDB Manager.

## Review Notes
- `helm` and `kubectl` were not installed in the workspace, so command validation was performed against official documentation and the live Helm chart index rather than local CLI help output.
- The `local-nvme` StorageClass remains an environment-specific placeholder; readers must provide a matching StorageClass in their own clusters.
