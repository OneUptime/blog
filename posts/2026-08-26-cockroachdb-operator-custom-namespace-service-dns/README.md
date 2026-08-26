# How to Run the CockroachDB Operator Outside the Default Namespace Without Broken Service DNS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CockroachDB, Kubernetes, CockroachDB Operator, DNS, Namespaces, Helm, Webhooks

Description: Install the GA CockroachDB Operator in a dedicated namespace while keeping webhook, join, client-service, certificate, and watch-scope names consistent.

---

The GA CockroachDB Operator does not need to run in `default`, `cockroachdb`, or the same namespace as its database pods. Its own namespace, its reconciliation watch scope, and every `CrdbCluster` region namespace are separate settings. Broken deployments usually conflate two of them or retain a certificate and service address from an old namespace.

Use the GA `cockroachdb-operator-chart` and `crdb.cockroachlabs.com/v1beta1` API described here. The legacy public `cockroachdb/cockroach-operator` project uses `v1alpha1` and defaults such as `cockroach-operator-system`; those examples are not the namespace contract of the GA chart.

## Keep three namespace decisions separate

For this example:

- the operator Deployment runs in `database-operators`;
- it watches only `crdb-prod`;
- the CockroachDB chart and `CrdbCluster` run in `crdb-prod`.

Installing an operator in `database-operators` does not automatically make it watch only that namespace. The GA chart's `watchNamespaces` default is empty, meaning watch all namespaces. Conversely, setting `watchNamespaces: crdb-prod` does not move the Deployment into `crdb-prod`.

## Install the operator in its dedicated namespace

Pin the current reviewed chart version rather than relying on an unbounded latest release:

```bash
helm repo add cockroachdb-v2 https://charts.cockroachdb.com/v2 --force-update
helm repo update cockroachdb-v2

helm upgrade --install crdb-operator \
  cockroachdb-v2/cockroachdb-operator-chart \
  --version 1.0.0 \
  --namespace database-operators \
  --create-namespace \
  --set-string cloudRegion=eu-west-1 \
  --set-string watchNamespaces=crdb-prod
```

`cloudRegion` should match the relevant region code and Kubernetes node labels. A comma-separated `watchNamespaces` value is supported when one operator intentionally reconciles several namespaces. Do not run two operators with overlapping watch scopes; each will reconcile the same objects independently.

Wait for readiness and inspect the downward-API namespace field and watch setting:

```bash
kubectl -n database-operators rollout status deployment/cockroach-operator

kubectl -n database-operators get deployment cockroach-operator \
  -o jsonpath='{"NAMESPACE_FIELD="}{.spec.template.spec.containers[?(@.name=="cockroach-operator")].env[?(@.name=="NAMESPACE")].valueFrom.fieldRef.fieldPath}{"\nWATCH_NAMESPACE="}{.spec.template.spec.containers[?(@.name=="cockroach-operator")].env[?(@.name=="WATCH_NAMESPACE")].value}{"\n"}'
```

The chart sets `NAMESPACE` from the operator pod's `metadata.namespace`; it sets `WATCH_NAMESPACE` only when `watchNamespaces` is nonempty. Do not manually force `NAMESPACE` to the database namespace.

## Make the cluster's namespace and DNS domain explicit

The database chart has a separate release namespace. Its `regions[].namespace` contributes to CockroachDB join addresses, while `clusterDomain` and `regions[].domain` describe Kubernetes DNS. Explicit values avoid the chart's sample defaults leaking into production:

```yaml
k8s:
  fullnameOverride: orders-db

cockroachdb:
  clusterDomain: cluster.local
  crdbCluster:
    regions:
      - code: eu-west-1
        cloudProvider: aws
        namespace: crdb-prod
        domain: cluster.local
        nodes: 3
```

Install that chart into the same namespace named in the region:

```bash
kubectl create namespace crdb-prod

helm upgrade --install orders-db \
  cockroachdb-v2/cockroachdb-chart \
  --version "$CRDB_CHART_VERSION" \
  --namespace crdb-prod \
  --values values.yaml
```

The `v1beta1` API documents region reachability as `<cluster-name>.<namespace>.svc.<domain>`. The chart also creates a public client Service and the operator creates the internal service paths it needs. With `fullnameOverride: orders-db`, TLS templates include names such as `orders-db-public.crdb-prod.svc.cluster.local`, wildcard pod-service names, and the join Service. If your Kubernetes DNS suffix is not `cluster.local`, change the chart value, every region's domain, and any external certificate SANs together.

For a direct `CrdbCluster` rather than Helm, the relevant shape is:

```yaml
apiVersion: crdb.cockroachlabs.com/v1beta1
kind: CrdbCluster
metadata:
  name: orders-db
  namespace: crdb-prod
spec:
  regions:
    - code: eu-west-1
      cloudProvider: aws
      namespace: crdb-prod
      domain: cluster.local
      nodes: 3
```

## Understand the operator's own service and webhook DNS

The operator chart renders its Service, ServiceAccount, Deployment, certificate Secret, and namespaced RBAC subjects using Helm's `.Release.Namespace`. With the command above, the operator gRPC Service is in `database-operators` and its normal fully qualified name is:

```text
cockroach-operator.database-operators.svc.cluster.local
```

The webhook serving certificate generated by the chart includes namespace-qualified SANs for `cockroach-webhook-service.<operator-namespace>.svc` and `cockroach-operator.<operator-namespace>.svc`. The operator creates admission webhook configurations at runtime. Their `clientConfig.service.namespace` must be `database-operators`, not `default` or `crdb-prod`.

Inspect rather than assume those objects are correct:

```bash
kubectl -n database-operators get services,endpoints,pods
kubectl get validatingwebhookconfiguration,mutatingwebhookconfiguration | grep cockroach

kubectl get validatingwebhookconfiguration <cockroach-validating-webhook-name> \
  -o jsonpath='{range .webhooks[*]}{.clientConfig.service.name}{"."}{.clientConfig.service.namespace}{"\n"}{end}'

kubectl -n database-operators get secret cockroach-operator-certs \
  -o jsonpath='{.data.tls\.crt}' \
  | base64 --decode \
  | openssl x509 -noout -ext subjectAltName
```

On macOS, `base64 -D` is the native equivalent of GNU `base64 --decode`. The certificate SAN and webhook Service reference must agree. A TLS error from the API server during `CrdbCluster` admission is an operator-webhook problem, not CockroachDB node-service DNS.

Admission webhook selection is not currently restricted by `watchNamespaces`; the chart documentation explicitly calls this out. Watch scope restricts reconciliation, while the cluster-scoped webhook can still validate `CrdbCluster` requests elsewhere. Coordinate multiple scoped operators carefully because CRDs and webhook configurations are shared cluster-wide.

## Test the database service DNS independently

List the actual Services and endpoints in the database namespace:

```bash
kubectl -n crdb-prod get service,endpoints
kubectl -n crdb-prod get crdbcluster,crdbnode,pod
```

Use Kubernetes' DNS test image from a disposable pod:

```bash
kubectl -n crdb-prod run dns-check \
  --image=registry.k8s.io/e2e-test-images/dnsutils:1.3 \
  --restart=Never \
  --rm -it -- \
  nslookup orders-db.crdb-prod.svc.cluster.local
```

Also resolve the exact public and join Service names returned by `kubectl get service`. A successful lookup with no ready endpoints points to pod readiness or selectors, not CoreDNS. A lookup failure for every Service points to DNS configuration or NetworkPolicy. A lookup that works only with a fully qualified name often means a pod's DNS search path or `dnsPolicy` was overridden in `podTemplate`.

## Moving an existing operator is a migration

A Helm release is namespaced; changing `--namespace` is not an in-place upgrade. Install a new operator release in the destination namespace, use the same operator version during the handoff, verify its certificate and webhook routing, and remove the old release promptly. Keep overlapping reconciliation as short as possible and never leave different operator versions fighting over one namespace.

For non-Helm installation, the checked-in bundle is rendered for namespace `cockroachdb`. The official manifest README requires changing every namespaced resource when moving it. Audit the Deployment, Service, ServiceAccount, certificate Secret, RBAC subject namespaces, `NAMESPACE` behavior, and any webhook objects; a blind text replacement that misses one RBAC subject or old certificate is not sufficient.

## Official Documentation

- [CockroachDB Operator chart namespace scoping](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/README.md#namespace-scoping)
- [CockroachDB Operator chart template](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/templates/operator.yaml)
- [CockroachDB Operator webhook certificate template](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/templates/_operator_certs.tpl)
- [CockroachDB non-Helm operator manifest guidance](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/manifests/README.md)
- [CockroachDB `v1beta1` region namespace and domain fields](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/api/v1beta1/crdbcluster_types.go)
- [CockroachDB: Deploy with the operator](https://www.cockroachlabs.com/docs/stable/deploy-cockroachdb-with-cockroachdb-operator)
- [Kubernetes DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)

## Conclusion

Install the operator with Helm in its intended namespace, set `watchNamespaces` independently, and put each `CrdbCluster` region's real namespace and DNS domain in the database values. Verify both trust paths: the API server's webhook Service and certificate in the operator namespace, and CockroachDB join/client Services in the database namespace. Moving an existing operator is a controlled migration, not a namespace string edit.
