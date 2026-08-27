# Validation Summary: How to Choose a CockroachDB Image Version Supported by Your Operator Release

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- CockroachDB 26.2
- CockroachDB Operator v2 GA
- CockroachDB `crdb.cockroachlabs.com/v1beta1` custom resources
- Kubernetes and `kubectl`
- Helm charts and Helm repositories
- Container image versioning and upgrade workflows

## Sources Consulted

- [CockroachDB Helm v2 versioning and upgrade order](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/docs/VERSIONING.md)
- [Official CockroachDB v2 Helm repository index](https://charts.cockroachdb.com/v2/index.yaml)
- [CockroachDB chart metadata](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/cockroachdb/Chart.yaml)
- [CockroachDB chart default values](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/cockroachdb/values.yaml)
- [CockroachDB `CrdbCluster` Helm template](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/cockroachdb/templates/crdb.yaml)
- [CockroachDB chart naming helpers](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/cockroachdb/templates/_helpers.tpl)
- [CockroachDB database chart changelog](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/cockroachdb/CHANGELOG.md)
- [CockroachDB Operator chart changelog](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/CHANGELOG.md)
- [CockroachDB Operator v1beta1 `CrdbNode` API](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/api/v1beta1/crdbnode_types.go)
- [CockroachDB Operator v1beta1 `CrdbCluster` status API](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/api/v1beta1/crdbcluster_types.go)
- [CockroachDB Public Operator to v1beta1 migration field mapping](https://github.com/cockroachdb/helm-charts/blob/master/docs/migration/operator/controller_migration.md)
- [CockroachDB: Upgrade a cluster in Kubernetes with the operator](https://www.cockroachlabs.com/docs/stable/upgrade-cockroachdb-operator)
- [CockroachDB release support policy](https://www.cockroachlabs.com/docs/releases/release-support-policy)
- [Helm `search repo` command reference](https://helm.sh/docs/helm/helm_search_repo/)
- [Kubernetes JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)

## Issues Found

- The chart searches claimed to list every release, but `--versions` alone excludes prereleases. Added `--devel` so the commands also return the published operator release candidates.
- The `sed` range began at the earlier TLS self-signer `image:` block and printed unrelated values before reaching the database image. Restricted the range to the four-space-indented `cockroachdb.crdbCluster.image` block.
- Helm release `orders-db` renders the default `CrdbCluster` name as `orders-db-cockroachdb`, so the original `kubectl get crdbcluster orders-db` commands would fail unless an unshown `k8s.fullnameOverride` was present. Documented the default name and corrected both commands.
- The render command used an undefined `CRDB_CHART_VERSION`, which did not guarantee that the reviewed chart was rendered. Replaced it with the reviewed chart version `26.2.4`.
- `cockroachdb.crdbCluster.image.pullPolicy` is not rendered into the `CrdbCluster` or CockroachDB pod template in chart 26.2.4; it is consumed only by the Helm test Pod. Removed it from the database-version override example.
- The pod query selected every CockroachDB release in the namespace. Added the `app.kubernetes.io/instance=orders-db` label so rollout verification is limited to the example release.

## Review Notes

The August 5, 2026 repository snapshot was verified: `cockroachdb-operator-chart` `1.0.0` uses operator image `cockroachdb/cockroachdb-operator-v2:v1.0.0`, and `cockroachdb-chart` `26.2.4` has `appVersion: 26.2.5` and renders `cockroachdb/cockroach:v26.2.5`. Both image manifests exist, and v26.2.5 is within the release policy's supported v26.2 production series. The v1beta1 image and status fields, legacy v1alpha1 distinction, operator-first upgrade order, rolling-update behavior, supported major-version paths, health checks, finalization behavior, Helm flags, kubectl output expressions, and all documentation links were also verified. The deployment commands assume the namespaces already exist and that `values.yaml` contains the environment-specific topology settings.
