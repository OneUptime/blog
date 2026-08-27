# Why Is the CockroachDB Operator Ready Before Its Admission Webhook Accepts Requests?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CockroachDB, Kubernetes, CockroachDB Operator, Admission Webhooks, Readiness, TLS, Troubleshooting

Description: Explain the legacy Public Operator readiness race, contrast GA v1beta1 health probes, and test every hop from Kubernetes API server through Service, TLS, and webhook handler.

---

`kubectl get pods` can show a CockroachDB operator pod as Ready while a `CrdbCluster` create or update still fails with `failed calling webhook`. Those observations measure different paths. Pod readiness is a kubelet-local condition; admission is an outbound HTTPS request from the Kubernetes API server through a Service to a webhook handler whose certificate must validate against `clientConfig.caBundle`.

The exact reason depends on which CockroachDB operator generation is installed. Start by identifying it:

```bash
kubectl get crdbclusters -A \
  -o custom-columns=NAMESPACE:.metadata.namespace,NAME:.metadata.name,API:.apiVersion
kubectl get deployment -A | grep -E 'cockroach.*operator'
```

The deprecated Public Operator serves `v1alpha1` clusters and deploys `cockroach-operator-manager`. The GA CockroachDB Operator normally serves `v1beta1` and manages `CrdbNode` objects; during migration it can temporarily add `v1alpha1` conversion support. Their Deployment probes, webhook names, Services, and certificate Secrets are different. During a dual-version migration, the `API` column is the representation returned by the API server, not proof of which operator reconciles the object; use the Deployments and their images and arguments to identify the installed generations.

## Why the Public Operator Has a Real Ready-Before-Serving Window

The current Public Operator installation bundle has no container `readinessProbe`. Kubernetes therefore considers the container ready once it is running; it does not wait for TCP port `9443`, a TLS handshake, or an admission response.

Meanwhile, with the bundled default arguments, the Public Operator process performs this startup sequence:

1. construct the controller-runtime manager and register `v1alpha1` webhook handlers;
2. find or create Secret `cockroach-operator-webhook-ca`;
3. generate a new pod-local serving certificate;
4. write `tls.crt` and `tls.key` under `/tmp/k8s-webhook-server/serving-certs`;
5. patch the mutating and validating configurations' `caBundle` values;
6. start the manager and its webhook server on port `9443`.

The pod can briefly report `1/1 Ready` before that sequence reaches step 6. If setup fails, the process exits and Kubernetes restarts it, but clients can observe the transient Ready condition first. A Deployment's Available condition is therefore not evidence that an end-to-end admission request will work.

The two Public Operator webhook configurations also use `failurePolicy: Fail`. While the endpoint is unavailable or its TLS chain is wrong, matching `v1alpha1` `CrdbCluster` creates and updates are rejected rather than admitted without validation.

## GA Readiness Is Better but Still Not End-to-End Admission

The current GA operator chart configures an HTTP readiness probe at `/health` on port `9080` and a liveness probe at `/healthz`. That removes the Public Operator's absence-of-probe race, but `/health` is still not the API server's entire webhook path.

A GA pod can pass its local health handler while any of these remain broken:

- the webhook Service selector points at no Ready endpoints;
- EndpointSlice propagation has not completed;
- the API server cannot route to the Service because of a firewall or NetworkPolicy;
- `clientConfig.caBundle` does not trust the serving leaf;
- the serving leaf lacks the exact `<service>.<namespace>.svc` name;
- a stale cluster-scoped webhook configuration routes to an old operator release;
- during a `v1alpha1` migration, the conversion webhook fails even though the admission handler itself is healthy.

Readiness should gate Service endpoints, but it cannot test from the control plane's network namespace or validate every cluster-scoped registration.

## Diagnose the Path in Layers

Do not repeatedly restart the operator until the error changes. Capture the exact API error and work from registration toward the backend.

### 1. Inspect the webhook registration

For the Public Operator:

```bash
kubectl get mutatingwebhookconfiguration \
  cockroach-operator-mutating-webhook-configuration -o yaml
kubectl get validatingwebhookconfiguration \
  cockroach-operator-validating-webhook-configuration -o yaml
```

Confirm `clientConfig.service.name`, namespace, path, `caBundle`, rules, and `failurePolicy`. During coexistence migration, both legacy webhook entries must have `matchPolicy: Exact`; otherwise their default `Equivalent` matching can intercept converted `v1beta1` requests. If both operator generations run in the same namespace, also give the GA operator a distinct `appLabel` (the migration guide uses `cockroachdb-operator`) so their Services cannot select both pod sets. For the GA Operator, first list configurations and follow the Service reference they actually contain instead of assuming legacy names:

```bash
kubectl get mutatingwebhookconfiguration,validatingwebhookconfiguration
```

During a `v1alpha1` migration, inspect the conversion webhook registration on the CRD as well:

```bash
kubectl get crd crdbclusters.crdb.cockroachlabs.com -o yaml
```

### 2. Inspect the Service and endpoints

For the Public Operator:

```bash
kubectl get service cockroach-operator-webhook-service \
  -n cockroach-operator-system -o yaml
kubectl get pods -n cockroach-operator-system \
  -l app=cockroach-operator --show-labels
kubectl get endpointslice -n cockroach-operator-system \
  -l kubernetes.io/service-name=cockroach-operator-webhook-service -o yaml
```

The Service exposes port `443`, targets container port `9443`, and selects `app=cockroach-operator` in the bundled legacy manifest. No endpoint address usually indicates a selector, namespace, or pod-IP problem; an address with `conditions.ready: false` indicates a readiness problem. An endpoint with the wrong port indicates a Service/rendering mismatch.

### 3. Inspect startup logs and certificate state

```bash
kubectl logs deployment/cockroach-operator-manager \
  -n cockroach-operator-system --all-containers --prefix
kubectl get secret cockroach-operator-webhook-ca \
  -n cockroach-operator-system \
  -o go-template='{{range $key,$value := .data}}{{$key}}{{"\n"}}{{end}}'
```

The legacy startup logs should reach certificate generation, mutating `caBundle` patching, validating `caBundle` patching, and manager start. RBAC denial while updating a cluster-scoped webhook configuration is different from a Service timeout. An unparsable or key-mismatched CA Secret causes startup to exit before the server begins listening.

Compare the legacy CA Secret to both `caBundle` fields without exposing private material:

```bash
kubectl get secret cockroach-operator-webhook-ca \
  -n cockroach-operator-system \
  -o jsonpath='{.data.tls\.crt}' | base64 -d \
  | openssl x509 -outform DER | openssl dgst -sha256

kubectl get mutatingwebhookconfiguration \
  cockroach-operator-mutating-webhook-configuration \
  -o jsonpath='{.webhooks[0].clientConfig.caBundle}' | base64 -d \
  | openssl x509 -outform DER | openssl dgst -sha256

kubectl get validatingwebhookconfiguration \
  cockroach-operator-validating-webhook-configuration \
  -o jsonpath='{.webhooks[0].clientConfig.caBundle}' | base64 -d \
  | openssl x509 -outform DER | openssl dgst -sha256
```

All three SHA-256 outputs should match.

### 4. Test backend TLS independently

Port-forward the Service:

```bash
kubectl port-forward -n cockroach-operator-system \
  service/cockroach-operator-webhook-service 9443:443
```

In another terminal, save the public CA and test the Service identity:

```bash
kubectl get secret cockroach-operator-webhook-ca \
  -n cockroach-operator-system \
  -o jsonpath='{.data.tls\.crt}' | base64 -d > webhook-ca.crt

openssl s_client -connect 127.0.0.1:9443 \
  -servername cockroach-operator-webhook-service.cockroach-operator-system.svc \
  -verify_hostname cockroach-operator-webhook-service.cockroach-operator-system.svc \
  -CAfile webhook-ca.crt -verify_return_error </dev/null
```

This proves TLS to a backend Pod selected from the Service metadata. Port-forwarding does not traverse the Service ClusterIP or prove control-plane routing, but it separates serving-certificate failures from network failures.

### 5. Test a real admission request

Use server-side dry run with a known-good manifest for the correct API generation:

```bash
kubectl apply --server-side --dry-run=server \
  -f known-good-crdbcluster.yaml
```

Interpret the result literally:

| Error fragment | Likely layer |
| --- | --- |
| `no endpoints available` | Service selector or endpoint readiness |
| `connect: connection refused` | endpoint exists but server is not listening |
| `i/o timeout` or `context deadline exceeded` | control-plane route, firewall, NetworkPolicy, or overloaded webhook |
| `x509: certificate signed by unknown authority` | stale or wrong `caBundle` |
| `x509 ... valid for ... not ...` | serving leaf SAN does not match Service DNS |
| webhook denial message | transport works; object failed admission logic |

On managed Kubernetes, the API server may run outside the worker-node network. A successful pod-to-Service `curl` is not proof that the control plane can reach that same endpoint. Check the provider's documented control-plane firewall requirements and any policies applying to the operator namespace.

## Choose a Health Fix, Not a Validation Bypass

For the Public Operator, an operationally maintained manifest can add a TCP readiness probe for port `9443`, but a socket check still does not test the API server route or `caBundle`. The stronger external signal is a periodic server-side dry-run canary against the correct API generation.

Do not permanently change `failurePolicy` to `Ignore` just to make writes succeed. That turns a webhook outage into unvalidated configuration changes. Repair the Service, endpoint, trust bundle, or network path, then verify admission before resuming production changes.

## Official Documentation

- [Public Operator startup and webhook server source](https://github.com/cockroachdb/cockroach-operator/blob/master/cmd/cockroach-operator/main.go)
- [Public Operator installation bundle](https://github.com/cockroachdb/cockroach-operator/blob/master/install/operator.yaml)
- [Public Operator webhook certificate setup](https://github.com/cockroachdb/cockroach-operator/blob/master/cmd/cockroach-operator/prep_webhooks.go)
- [GA Operator Deployment readiness probe](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/templates/operator.yaml)
- [GA Operator webhook certificate lifecycle](https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/operator/README.md#operator-tls-certificates-selfsignedoperatorcerts)
- [Kubernetes dynamic admission control](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)
- [Kubernetes readiness probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)

## Conclusion

Ready and admission-ready are different claims. The legacy Public Operator can report Ready before it even starts its webhook because its bundle has no readiness probe; the GA probe covers local health but not the control-plane network and TLS path. Test registration, endpoints, CA matching, backend TLS, and a server-side dry-run separately to identify the failing boundary.
