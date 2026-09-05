# Validation Summary: Which Admission Webhook Is Blocking `kubectl`? Trace the API Request and Test Control-Plane Reachability

## Status

validated

## Post Type

Technical troubleshooting guide with shell commands, JSONPath, jq, and PromQL examples.

## Technologies Covered

- Kubernetes kube-apiserver and dynamic admission webhooks
- admissionregistration.k8s.io/v1 webhook configuration and CEL matching
- kubectl server-side apply and server-side dry run
- Kubernetes audit logging and OpenTelemetry system tracing
- Services, EndpointSlices, NetworkPolicy, and control-plane networking
- Prometheus histograms and PromQL
- TLS, X.509 certificates, OpenSSL, base64, and jq

## Sources Consulted

- Kubernetes Dynamic Admission Control: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes Admission Webhook Good Practices: https://kubernetes.io/docs/concepts/cluster-administration/admission-webhooks-good-practices/
- Kubernetes ValidatingWebhookConfiguration v1 API (the original link redirects here): https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-webhook-configuration-v1/
- Kubernetes Auditing: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes System Component Traces: https://kubernetes.io/docs/concepts/cluster-administration/system-traces/
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes JSONPath Support: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes EndpointSlices: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes v1.35.0 mutating webhook dispatcher, especially call errors versus patch application errors: https://github.com/kubernetes/kubernetes/blob/v1.35.0/staging/src/k8s.io/apiserver/pkg/admission/plugin/webhook/mutating/dispatcher.go
- Kubernetes v1.35.0 webhook client and Service resolution: https://github.com/kubernetes/kubernetes/blob/v1.35.0/staging/src/k8s.io/apiserver/pkg/util/webhook/client.go
- Kubernetes v1.35.0 ClusterIP and endpoint resolvers: https://github.com/kubernetes/kubernetes/blob/v1.35.0/staging/src/k8s.io/kube-aggregator/pkg/apiserver/resolvers.go
- Prometheus histogram_quantile documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile
- OpenSSL s_client documentation: https://docs.openssl.org/3.5/man1/openssl-s_client/
- OpenSSL certificate verification options: https://docs.openssl.org/3.5/man1/openssl-verification-options/
- jq manual: https://jqlang.org/manual/
- Local CLI help: `kubectl apply --help`, `kubectl options`, `openssl x509 -help`, and `base64 --help`.

## Issues Found

1. **A generic deadline error was treated as proof of a webhook call failure.** Clarified that timeout, DNS, connection, or certificate details accompanying `failed calling webhook` identify a callout failure, while `context deadline exceeded` alone can originate elsewhere in request processing.
2. **The failurePolicy explanation included all invalid patches.** Replaced this with undecodable patches and explained that failures applying a decoded patch or decoding the resulting object can still reject the request under `Ignore`. The upstream dispatcher distinguishes these internal errors from errors calling the webhook.
3. **The inventory command was described as displaying matching criteria.** Its actual output contains names, failure handling, and destinations, not rules or selectors. Corrected the introductory sentence; the following inspection checklist still covers matching criteria.
4. **The PromQL aggregation discarded the API-server instance label despite recommending retaining it.** Added `instance` to the aggregation so per-replica latency differences remain visible.
5. **URL validation guidance was imprecise.** Replaced the unspecified host-permission check with the actual HTTPS and URL-component restrictions, and clarified that in-cluster Services should use a Service reference.
6. **The Service lookup assumed the first port was the webhook port.** Changed it to display all Service port mappings and instructed readers to select the configured webhook Service port and corresponding EndpointSlice port. Also clarified that the endpoint command lists addresses and readiness conditions rather than filtering to ready addresses.
7. **The certificate explanation implied caBundle was mandatory.** Explained the system-trust-root fallback when the bundle is omitted. Qualified the inspection command as requiring a non-empty bundle and inspecting the first certificate of the selected webhook's bundle.
8. **The OpenSSL guidance did not distinguish SNI from hostname verification or enforce verification failure.** Specified `-verify_hostname` alongside `-servername`, the CA file option, and `-verify_return_error` to avoid interpreting a completed diagnostic connection as successful certificate verification.

## Review Notes

- Confirmed admission ordering, dry-run side-effect declarations, explicit denial behavior, matching fields and defaults, timeout bounds, audit metadata and mutation annotations, tracing correlation, metric names and labels, and the policy-preserving remediation guidance.
- All six Kubernetes documentation links lead to the intended resources; the API reference redirects to its reorganized location.
- Checked all seven shell blocks with `bash -n`. Executed both jq filters against synthetic configuration data, confirming valid TSV output and default values. Checked CLI flags against local help and reviewed JSONPath syntax against its official reference. Parsed the resulting validation.json and checked the diff for whitespace errors.
- No live Kubernetes requests, webhook calls, certificate handshakes, or Prometheus queries were executed. Cluster-specific networking, TLS configuration, metrics availability, and admission outcomes still require testing in the reader's environment.
- Resource names and minimal-test.yaml are illustrative inputs. A dry-run apply exercises create/update behavior; reproducing a DELETE-specific problem requires the corresponding operation. Dry-run behavior also relies on the webhook honoring its declared side-effect contract.
- The `instance` label assumes the usual Prometheus scrape labeling; deployments that relabel targets should retain their equivalent replica identifier. Tracing configuration versions and instrumentation details should be checked against the deployed Kubernetes version.
- Changes were limited to technical corrections in existing sections; the article's structure was preserved.
