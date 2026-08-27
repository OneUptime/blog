# Validation Summary: Why Is the CockroachDB Operator Ready Before Its Admission Webhook Accepts Requests?

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- CockroachDB Public Operator (`v1alpha1`)
- GA CockroachDB Operator (`v1beta1`) and `CrdbNode`
- Kubernetes admission and conversion webhooks
- Kubernetes readiness probes, Services, and EndpointSlices
- TLS, X.509 service identities, CA bundles, and OpenSSL
- `kubectl`, server-side apply, and server-side dry run
- CockroachDB Helm charts and operator migration

## Sources Consulted

- [Public Operator installation bundle, commit 9b1544c](https://github.com/cockroachdb/cockroach-operator/blob/9b1544c83d5b201c5be34a8d5db4736ba8d17283/install/operator.yaml)
- [Public Operator startup source, commit 9b1544c](https://github.com/cockroachdb/cockroach-operator/blob/9b1544c83d5b201c5be34a8d5db4736ba8d17283/cmd/cockroach-operator/main.go)
- [Public Operator webhook TLS preparation, commit 9b1544c](https://github.com/cockroachdb/cockroach-operator/blob/9b1544c83d5b201c5be34a8d5db4736ba8d17283/cmd/cockroach-operator/prep_webhooks.go)
- [Public Operator certificate and webhook configuration implementation, commit 9b1544c](https://github.com/cockroachdb/cockroach-operator/blob/9b1544c83d5b201c5be34a8d5db4736ba8d17283/pkg/resource/webhook_certificates.go)
- [CockroachDB Public Operator webhook certificate documentation](https://www.cockroachlabs.com/docs/stable/secure-cockroachdb-kubernetes#secure-the-webhooks)
- [GA Operator chart template, commit e2fca92](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/operator/templates/operator.yaml)
- [GA Operator chart values, commit e2fca92](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/operator/values.yaml)
- [GA Operator certificate template and Service DNS SANs, commit e2fca92](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/operator/templates/_operator_certs.tpl)
- [GA Operator API reference and CRDs, commit e2fca92](https://github.com/cockroachdb/helm-charts/tree/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/cockroachdb-parent/charts/operator/api)
- [CockroachDB Public Operator migration guide, commit e2fca92](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/docs/migration/operator/manual_migration.md)
- [CockroachDB migration-controller guide, commit e2fca92](https://github.com/cockroachdb/helm-charts/blob/e2fca923e3f0c77c60c771b773d46fc86bf6aa48/docs/migration/operator/controller_migration.md)
- [CockroachDB GA Operator announcement](https://www.cockroachlabs.com/blog/cockroachdb-kubernetes-operator/)
- [Kubernetes dynamic admission control](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)
- [Kubernetes admissionregistration v1 API reference](https://kubernetes.io/docs/reference/kubernetes-api/extend-resources/validating-webhook-configuration-v1/)
- [Kubernetes probe semantics](https://kubernetes.io/docs/concepts/workloads/pods/probes/)
- [Kubernetes EndpointSlice concepts and readiness conditions](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes NetworkPolicy documentation](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Kubernetes API dry-run documentation](https://kubernetes.io/docs/reference/using-api/api-concepts/#dry-run)
- [`kubectl apply` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/)
- [`kubectl port-forward` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/)
- [controller-runtime v0.18 admission HTTP handler](https://github.com/kubernetes-sigs/controller-runtime/blob/v0.18.0/pkg/webhook/admission/http.go)
- [OpenSSL `s_client` documentation](https://docs.openssl.org/3.6/man1/openssl-s_client/)

## Issues Found

- The API-version discovery command was presented as if it identified the managing operator. During dual-version migration, the same object can be served through conversion, so `.apiVersion` identifies the returned representation rather than the reconciler. The post now directs readers to inspect Deployment images and arguments to identify installed generations.
- The Public Operator startup sequence was stated without accounting for `--skip-webhook-config`. It is now explicitly described as the bundled default startup path.
- The conversion-webhook failure case appeared to apply to every GA installation. The default GA CRD is `v1beta1`-only; conversion is installed for `v1alpha1` migration. The post now scopes that failure to migration and adds a command to inspect the CRD's `spec.conversion` registration.
- Same-namespace coexistence omitted a selector-collision requirement. Both generations can otherwise use `app=cockroach-operator`, allowing Services to select both pod sets. The post now requires a distinct GA `appLabel`, as shown in CockroachDB's migration guide.
- The EndpointSlice check treated absence of endpoints as a readiness signal. EndpointSlices can retain an address with `conditions.ready: false`. The command now emits YAML, and the explanation distinguishes missing addresses from unready addresses.
- The CA Secret failure description was too broad. It now specifically states that an unparsable or key-mismatched CA Secret stops legacy startup; other semantic certificate faults can instead surface during TLS verification.
- The text said to compare both admission webhook `caBundle` values, but the commands only hashed the validating configuration. A mutating-webhook hash command and the expected three-way equality were added.
- The port-forward result was incorrectly described as proving Service-to-Pod traffic. `kubectl port-forward service/...` uses Service metadata to select a Pod and forwards directly to that Pod; it does not traverse the Service ClusterIP. The result is now described as backend-Pod TLS validation only.
- The post suggested a normal HTTPS readiness probe on the legacy webhook port. The unmodified webhook exposes no successful GET health endpoint, so a Kubernetes `httpGet` probe would fail. The recommendation now uses a TCP readiness probe only.

## Review Notes

The source review used Public Operator commit `9b1544c` (bundle image `v2.18.4`) and GA Helm chart commit `e2fca92` (chart and app version `1.0.0`), current for the validation date. The remaining commands and explanations were verified against Kubernetes documentation, local `kubectl v1.34.1` help, and OpenSSL 3.6.2 option help. The Public Operator is deprecated, so its version-specific manifest details should be rechecked if the upstream bundle changes.
