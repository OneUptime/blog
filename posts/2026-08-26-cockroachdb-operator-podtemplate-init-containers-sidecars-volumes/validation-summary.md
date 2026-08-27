# Validation Summary: How to Add Init Containers, Sidecars, and Volumes with the CockroachDB Operator `podTemplate`

## Status

validated

## Post Type

Technical guide / Kubernetes configuration tutorial

## Technologies Covered

- CockroachDB
- CockroachDB Kubernetes Operator GA (`v1beta1` API)
- CockroachDB Helm v2 charts
- Kubernetes `PodSpec`, init containers, sidecar containers, and volumes
- Kubernetes ConfigMaps, Secrets, persistent volume claims, and security contexts
- Helm
- `kubectl` and JSONPath

## Sources Consulted

- [CockroachDB Operator GA announcement](https://www.cockroachlabs.com/blog/cockroachdb-kubernetes-operator/)
- [CockroachDB: Override Deployment Templates with the CockroachDB Operator](https://www.cockroachlabs.com/docs/stable/override-templates-cockroachdb-operator)
- [CockroachDB Operator v1beta1 API reference](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/operator/api/README.md)
- [CockroachDB `CrdbNodeSpec` and `PodTemplateSpec` source](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/operator/api/v1beta1/crdbnode_types.go)
- [CockroachDB `CrdbCluster` template, region, and revision source](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/operator/api/v1beta1/crdbcluster_types.go)
- [CockroachDB chart values](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/cockroachdb/values.yaml)
- [CockroachDB `CrdbCluster` Helm template](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/cockroachdb/templates/crdb.yaml)
- [CockroachDB chart pod-template example](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/operator/manifests/examples/crdb/pod-template.yaml)
- [CockroachDB Helm v2 versioning and distribution](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/docs/VERSIONING.md)
- [Official CockroachDB Helm v2 repository index](https://charts.cockroachdb.com/v2/index.yaml)
- [Helm `template` command reference](https://helm.sh/docs/helm/helm_template/)
- [Helm `upgrade` command reference](https://helm.sh/docs/helm/helm_upgrade/)
- [Kubernetes init containers](https://kubernetes.io/docs/concepts/workloads/pods/init-containers/)
- [Kubernetes sidecar containers](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)
- [Kubernetes volumes and `emptyDir`](https://kubernetes.io/docs/concepts/storage/volumes/)
- [Kubernetes ConfigMaps](https://kubernetes.io/docs/concepts/configuration/configmap/)
- [Kubernetes Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)
- [Kubernetes persistent volumes and claims](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes pod lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Kubernetes JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)

## Issues Found

No technical issues found.

## Review Notes

- The examples were concretely rendered with the published `cockroachdb-chart` 26.2.4 (CockroachDB app version 26.2.5) and checked against GA operator chart 1.0.0 and upstream commit `e2fca923e3f0c77c60c771b773d46fc86bf6aa48`. The rendered resource used `crdb.cockroachlabs.com/v1beta1` and placed the pod template at `spec.template.spec.podTemplate` as documented.
- All YAML excerpts parsed successfully. The init-container, sidecar, and volume configuration also passed a client-side Kubernetes dry run, and the documented JSONPath expression returned the expected init-container, container, and volume names.
- The commands assume that the `cockroachdb-v2` Helm repository alias is configured, `CRDB_CHART_VERSION` is set to a chart version compatible with the installed operator, and `crdb-prod` already exists. These are reasonable prerequisites for the existing-cluster workflow described in the post; `helm upgrade --install --namespace` does not create a missing namespace unless `--create-namespace` is also supplied.
- The `observer` example is a conventional sidecar declared in `podTemplate.spec.containers`. Kubernetes also supports native sidecars as restartable init containers, but the post does not claim native-sidecar startup or shutdown ordering.
- The chart derives `podTemplate.spec.serviceAccountName` from its RBAC values rather than passing through a value set directly at that Helm path. This exception is outside the fields configured by the post's examples.
