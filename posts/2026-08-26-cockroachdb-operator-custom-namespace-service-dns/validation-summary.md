# Validation Summary: How to Run the CockroachDB Operator Outside the Default Namespace Without Broken Service DNS

## Status

validated

## Post Type

Technical guide / Kubernetes deployment and troubleshooting tutorial

## Technologies Covered

- CockroachDB and CockroachDB 26.2
- CockroachDB Operator 1.0.0 (GA)
- CockroachDB `crdb.cockroachlabs.com/v1beta1` custom resources
- Kubernetes namespaces, Services, EndpointSlices, and cluster DNS
- Kubernetes admission webhooks and TLS certificates
- Helm 3 and the CockroachDB v2 chart repository
- `kubectl`, JSONPath, `nslookup`, OpenSSL, and `base64`

## Sources Consulted

- [Official CockroachDB v2 Helm repository index](https://charts.cockroachdb.com/v2/index.yaml)
- [CockroachDB v2 chart versioning and distribution](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/docs/VERSIONING.md)
- [CockroachDB Operator chart namespace scoping](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/operator/README.md#namespace-scoping)
- [CockroachDB Operator chart values](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/operator/values.yaml)
- [CockroachDB Operator resource, RBAC, Service, and Deployment template](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/operator/templates/operator.yaml)
- [CockroachDB Operator webhook certificate template](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/operator/templates/_operator_certs.tpl)
- [CockroachDB non-Helm operator manifest guidance](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/operator/manifests/README.md)
- [CockroachDB `v1beta1` `CrdbCluster` region API](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/operator/api/v1beta1/crdbcluster_types.go)
- [CockroachDB chart values](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/cockroachdb/values.yaml)
- [CockroachDB cert-manager node certificate SAN template](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/cockroachdb/templates/certificate.node.yaml)
- [CockroachDB self-signer certificate generator](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/pkg/generator/generate_cert.go)
- [Cockroach Labs GA Operator announcement](https://www.cockroachlabs.com/blog/cockroachdb-kubernetes-operator/)
- [Legacy public CockroachDB Operator](https://github.com/cockroachdb/cockroach-operator)
- [Kubernetes DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
- [Kubernetes DNS debugging guide](https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/)
- [Kubernetes EndpointSlice API](https://kubernetes.io/docs/reference/kubernetes-api/discovery/endpoint-slice-v1/)
- [Kubernetes dynamic admission control](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)
- [Kubernetes `kubectl run` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/)
- [Kubernetes JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [Helm `repo add` reference](https://helm.sh/docs/helm/helm_repo_add/)
- [Helm `upgrade` reference](https://helm.sh/docs/helm/helm_upgrade/)

## Issues Found

No technical issues found.

## Review Notes

- The exact published `cockroachdb-operator-chart` 1.0.0 and `cockroachdb-chart` 26.2.4 packages were downloaded, rendered with the post's values, and linted successfully. The latter chart has `appVersion: 26.2.5`, so `26.2.4` in the Helm command is correctly the chart version rather than the CockroachDB binary version.
- An isolated Kubernetes test confirmed the expected operator Deployment, gRPC and webhook Services, operator-namespace-suffixed cluster-scoped webhook configurations, serving-certificate SANs, and database Services (`orders-db`, `orders-db-join`, and `orders-db-public`). The post's JSONPath, certificate-inspection, and disposable DNS-pod commands are syntactically valid.
- Both reviewed charts require Kubernetes 1.30 or later. The Kubernetes DNS test image `registry.k8s.io/e2e-test-images/agnhost:2.39` is the image used by the official DNS debugging guide, and the post correctly uses `--command` to run its packaged `nslookup` binary.
- For a future command that passes multiple watch namespaces directly through Helm, the comma must be escaped, for example `--set-string 'watchNamespaces=prod-a\,prod-b'`, or supplied through a values file. The post's shown single-namespace command is correct.
- The post's GitHub documentation links track `master` and can drift after publication. They resolved to the intended resources during this review, and the relevant source files matched the published chart packages.
