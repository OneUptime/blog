# Which Admission Webhook Is Blocking `kubectl`? Trace the API Request and Test Control-Plane Reachability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Admission Webhook, Webhook, kubectl, Audit Logging, TLS, Troubleshooting

Description: Identify the webhook matched by a slow or rejected kubectl write, then validate admission scope, metrics, API-server routing, endpoints, and TLS trust.

---

When `kubectl get` works but a create, update, or delete hangs, admission is a strong suspect. Dynamic admission webhooks run after authentication and authorization and before an object is persisted. A matching webhook can explicitly deny the request, time out, return a malformed response, or be unreachable from the kube-apiserver.

The key diagnostic detail is direction: it is the **kube-apiserver** that calls the webhook. Reaching the webhook from a laptop or an arbitrary Pod does not prove that the control plane can resolve, route to, and authenticate that endpoint.

## Capture One Safe Reproduction

Use a non-secret object and server-side dry run where possible:

```bash
kubectl --request-timeout=20s --v=8 apply \
  --server-side --dry-run=server -f minimal-test.yaml
```

Server-side dry run runs validation and admission but does not persist the object. It can call only webhooks that declare compatible `sideEffects` (`None` or `NoneOnDryRun`), so an error about unsupported dry run is itself useful evidence. Never test a production webhook with sensitive object bodies or an operation that may trigger external side effects.

Record the UTC time, verb, group/version/resource, namespace, user, total duration, HTTP status, and full Status message. Interpret the failure shape:

- an explicit message such as `admission webhook "policy.example.com" denied the request` identifies a reached webhook that returned `allowed: false`;
- `failed calling webhook` with timeout, DNS, connect, or x509 details identifies a callout failure; `context deadline exceeded` alone can also come from other parts of request processing;
- HTTP `401` or `403` from kube-apiserver before admission points to authentication or authorization instead; and
- a client-side `--request-timeout` can expire before the webhook's own timeout, obscuring the server result.

`failurePolicy` does not override an explicit denial. It controls call errors such as timeouts, connection failures, non-2xx responses, malformed AdmissionReview responses, and undecodable patches. A patch that decodes but cannot be applied, or produces an object that cannot be decoded, can still fail the request even with `failurePolicy: Ignore`.

## Inventory Every Webhook That Could Match

List both phases. Mutating webhooks run before validating webhooks:

```bash
kubectl get mutatingwebhookconfigurations.admissionregistration.k8s.io
kubectl get validatingwebhookconfigurations.admissionregistration.k8s.io
```

Render a summary of webhook names, failure handling, and destinations:

```bash
kubectl get validatingwebhookconfigurations -o json |
  jq -r '.items[] as $cfg | $cfg.webhooks[] |
    [$cfg.metadata.name, .name, (.failurePolicy // "Fail"),
     (.timeoutSeconds // 10), (.clientConfig.service.namespace // "URL"),
     (.clientConfig.service.name // .clientConfig.url // "-")] | @tsv'
```

For each candidate, inspect:

- `rules`: operations, API groups, versions, resources, and scope;
- `matchPolicy`: normally `Equivalent`, so another API version may still match;
- `namespaceSelector` and `objectSelector`;
- `matchConditions`, whose CEL expressions are evaluated after the earlier filters;
- `clientConfig.service` or `clientConfig.url` and `caBundle`;
- `timeoutSeconds`, valid from 1 to 30 seconds; and
- `failurePolicy`, which defaults to `Fail`.

Selectors apply to labels, not namespace names unless the corresponding Namespace is labeled. For DELETE requests, matching can involve the old object. Read the API reference for the exact semantics rather than inferring from a short YAML view.

## Use Metrics to Name the Slow Webhook

The stable kube-apiserver metric `apiserver_admission_webhook_admission_duration_seconds` is labeled by webhook name, operation, rejection, and admission type. Rank the slow candidates:

```promql
histogram_quantile(
  0.99,
  sum by (le, instance, name, operation, rejected, type) (
    rate(apiserver_admission_webhook_admission_duration_seconds_bucket[5m])
  )
)
```

Also inspect `apiserver_admission_webhook_rejection_count`, request latency, and webhook fail-open counts. Keep the API-server instance label while debugging an HA control plane; one replica may have a different network or CA state.

Metrics prove which webhook is slow or failing at aggregate level. They do not link one human command to one callout, so align their window with the captured request and use audit records or tracing for causality.

## Correlate Audit Records and Traces

Kubernetes audit logging produces chronological request records. A short-lived, targeted policy at `Metadata` level can capture identity, verb, resource, response status, timestamps, and audit ID without recording object bodies. Mutating admission can add audit annotations showing which webhook ran and whether it mutated the object.

Avoid enabling `RequestResponse` globally: admission requests can contain Secrets and audit logging increases kube-apiserver memory use. Apply retention and access controls to audit output.

If kube-apiserver system tracing is already configured, inspect the trace for the affected request. Kube-apiserver emits spans for incoming HTTP requests and outgoing calls to webhooks and etcd. If tracing is not enabled, configure a low sampling rate through a version-supported `TracingConfiguration` and `--tracing-config-file`; raising sampling during an incident has CPU, network, and storage cost.

Tracing generates a new root for the incoming API request rather than trusting an arbitrary client trace header. Correlate by time, request attributes, and available IDs instead of expecting a client-created trace ID to be preserved.

## Follow the Service to Ready Endpoints

For an in-cluster service reference, retrieve the exact route:

```bash
kubectl get validatingwebhookconfiguration policy-webhook -o json |
  jq -r '.webhooks[] | [.name,
    .clientConfig.service.namespace,
    .clientConfig.service.name,
    (.clientConfig.service.port // 443),
    (.clientConfig.service.path // "/")] | @tsv'
```

Then inspect that Service and its EndpointSlices:

```bash
kubectl -n policy-system get service policy-webhook -o yaml
kubectl -n policy-system get endpointslice \
  -l kubernetes.io/service-name=policy-webhook -o wide
kubectl -n policy-system get pods -o wide
kubectl -n policy-system logs deployment/policy-webhook --tail=200
```

Confirm that the target port maps to the actual serving port, EndpointSlice addresses are ready, Pods are not crash-looping, and the process accepts the configured path. Multiple endpoints can hide a single bad replica, so compare endpoint IPs with webhook logs and request failures.

For a URL-based webhook, verify that the URL uses HTTPS, contains no user information, query parameters, or fragment, and that the control-plane resolver and egress route reach its host. Use `clientConfig.service` for an in-cluster Service rather than putting its DNS name in `clientConfig.url`. A WebhookConfiguration should not point at `localhost` unless the server intentionally runs in every kube-apiserver's network namespace.

## Test From the Control-Plane Path

For `clientConfig.service`, kube-apiserver uses Kubernetes' Service resolver; it does not require the control-plane host's libc resolver to resolve `*.svc`. First obtain the ClusterIP, all Service port mappings, and EndpointSlice addresses with their readiness conditions. Select the Service port matching `clientConfig.service.port` (default 443), rather than assuming the first port is correct; use the corresponding EndpointSlice port when testing endpoint IPs:

```bash
kubectl -n policy-system get service policy-webhook \
  -o jsonpath='{.spec.clusterIP}{"\n"}{range .spec.ports[*]}{.name}{"\t"}{.port}{"\t"}{.targetPort}{"\n"}{end}'
kubectl -n policy-system get endpointslice \
  -l kubernetes.io/service-name=policy-webhook \
  -o jsonpath='{range .items[*].endpoints[*]}{.addresses[0]}{"\t"}{.conditions.ready}{"\n"}{end}'
```

Inspect kube-apiserver logs for the reproduction timestamp. On a self-managed cluster, test TCP reachability to the Service ClusterIP and, when isolating Service routing, each ready endpoint IP and target port from the kube-apiserver network namespace. Use the Service DNS name as TLS SNI and verification identity even when connecting to the ClusterIP. A failed `getent` lookup on a host-networked control-plane node is not proof that Service resolution inside kube-apiserver is broken.

If kube-apiserver is a host-networked static Pod, an ordinary debug Pod follows a different NetworkPolicy and routing path. Managed control planes may not expose a shell; use provider-supported connectivity diagnostics and API-server logs. For URL-based webhooks, separately verify that the URL hostname resolves in the API server's resolver context.

NetworkPolicy commonly selects Pods as destinations but the source may be a control-plane node rather than another Pod. Check CNI policy semantics, host firewall rules, security groups, Konnectivity or egress-selector configuration, and whether all control-plane replicas can reach every endpoint.

## Verify the Webhook Certificate and CA Bundle

For a Service reference, kube-apiserver verifies the webhook as `<service>.<namespace>.svc`. The serving certificate needs that DNS SAN and must chain to a trusted CA. When `clientConfig.caBundle` is supplied, it provides trusted CA certificates; if omitted, the API server uses its system trust roots.

For a non-empty bundle, inspect the public CA data without touching private keys (select the matching webhook index; this example inspects the first certificate in the first webhook's bundle):

```bash
kubectl get validatingwebhookconfiguration policy-webhook \
  -o jsonpath='{.webhooks[0].clientConfig.caBundle}' |
  base64 --decode |
  openssl x509 -noout -subject -issuer -dates -fingerprint -sha256
```

From an authorized control-plane path, use `openssl s_client` with `-servername` and `-verify_hostname` set to the expected Service DNS name, `-CAfile` pointing to the extracted CA file, and `-verify_return_error` to enforce verification. SNI alone does not verify the hostname, and `s_client` otherwise continues after certificate verification errors. Verify expiry, issuer, DNS SAN, intermediate certificates, and clock synchronization. Do not set an insecure skip option or replace the CA bundle with an unrelated cluster CA.

If a certificate controller injects the bundle, repair its issuer, Secret, permissions, or reconciliation. Manual patches to generated WebhookConfigurations are likely to be overwritten.

## Restore Availability Without Removing Policy Blindly

Choose remediation based on evidence:

- fix Service selectors, EndpointSlices, readiness, routing, or the serving certificate;
- shorten webhook processing and remove external dependencies from the request path;
- narrow `rules`, selectors, and `matchConditions` so irrelevant requests do not call it;
- deploy multiple ready endpoints and use a small, measured timeout; and
- make mutating webhooks idempotent and exclude their own dependencies to avoid deadlocks.

Changing `failurePolicy: Fail` to `Ignore` trades enforcement for availability. It can be reasonable for some mutating webhooks when final state is independently validated, but it is a security and compliance decision, not a generic outage command. Likewise, deleting a WebhookConfiguration immediately removes its protection from matching writes. Use the owning chart or Operator, an approved break-glass plan, and a time-bounded rollback.

After the fix, repeat server-side dry run and a controlled real write, confirm the expected mutation or denial, test all API-server and webhook replicas, and verify latency, timeout, rejection, and fail-open metrics return to baseline.

## Conclusion

A blocking admission webhook becomes straightforward once the call path is explicit. Capture one safe request, calculate which configurations match it, name the slow webhook with metrics and traces, and test Service routing and TLS from the API server's network. Repair the owning component while preserving the intended policy boundary.

## Official Documentation

- [Kubernetes Dynamic Admission Control](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)
- [Kubernetes Admission Webhook Good Practices](https://kubernetes.io/docs/concepts/cluster-administration/admission-webhooks-good-practices/)
- [Kubernetes ValidatingWebhookConfiguration v1 API](https://kubernetes.io/docs/reference/kubernetes-api/extend-resources/validating-webhook-configuration-v1/)
- [Kubernetes Auditing](https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/)
- [Kubernetes System Component Traces](https://kubernetes.io/docs/concepts/cluster-administration/system-traces/)
- [Kubernetes Metrics Reference](https://kubernetes.io/docs/reference/instrumentation/metrics/)
