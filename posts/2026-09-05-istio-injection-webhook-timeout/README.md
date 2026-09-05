# Istio Sidecar Injection Webhook Times Out: Test the API-Server-to-istiod Network Path, CA Bundle, and Endpoints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, Kubernetes, Admission Webhook, Sidecar Injection, TLS, EndpointSlice, Troubleshooting

Description: Diagnose Istio injection timeouts by tracing the Kubernetes API server through webhook matching, Service endpoints, network reachability, and TLS trust.

---

When an Istio injection webhook times out, Deployments often exist but their ReplicaSets cannot create Pods. The event resembles `failed calling webhook`, references `istiod.istio-system.svc:443/inject`, and ends in a timeout, connection error, or x509 message.

The direction of this call is the critical fact: **kube-apiserver calls the webhook**. A successful `curl` from a workload Pod, an administrator laptop, or even the Istiod Pod does not prove that the API server's network path works.

The default in-cluster path is usually:

```text
kube-apiserver
  -> MutatingWebhookConfiguration match
  -> istiod.istio-system.svc:443
  -> ready EndpointSlice address:15017
  -> TLS certificate verified by clientConfig.caBundle
  -> /inject AdmissionReview response
```

Trace that exact path instead of reinstalling Istio immediately.

## Capture a Safe, Precise Reproduction

Start with controller events because they retain the server's error text:

```bash
kubectl -n checkout describe replicaset checkout-api-7c994dd9db
kubectl -n checkout get events \
  --sort-by=.metadata.creationTimestamp \
  --field-selector reason=FailedCreate
```

Record the webhook name, URL or Service, port, path, timeout text, API-server identity if known, and UTC timestamp. The suffix matters:

- `context deadline exceeded` or `Client.Timeout exceeded` means the call did not complete before its deadline;
- `connect: connection refused` usually means the address was reachable but nothing accepted that port;
- `no route to host` or an I/O timeout points toward routing or filtering;
- `x509: certificate signed by unknown authority` points toward the CA bundle or served chain; and
- a hostname/SAN error means the certificate identity does not match the configured Service.

Use server-side dry run with a harmless Pod manifest in the affected namespace to reproduce admission without persisting a Pod:

```bash
kubectl -n checkout apply --server-side --dry-run=server -f minimal-pod.yaml
```

The manifest should contain no Secrets and no external side effects. Dry run still invokes compatible admission webhooks, so use it only after confirming the webhook declares `sideEffects: None` or `NoneOnDryRun`. Capture `kubectl --v=8` output locally if request timing is needed, but sanitize bearer tokens and request bodies before sharing.

## Resolve the Exact Webhook That Matched

Revisioned installations can have several Istio injector configurations. Inventory all mutating webhooks:

```bash
kubectl get mutatingwebhookconfigurations.admissionregistration.k8s.io

kubectl get mutatingwebhookconfigurations -o json |
  jq -r '.items[] as $cfg | $cfg.webhooks[] |
    select(.name | test("sidecar-injector\\.istio\\.io$")) |
    [$cfg.metadata.name, .name,
     (.clientConfig.service.namespace // "URL"),
     (.clientConfig.service.name // .clientConfig.url),
     (.clientConfig.service.port // 443),
     (.clientConfig.service.path // "/"),
     (.timeoutSeconds // 10), (.failurePolicy // "Fail")] | @tsv'
```

Inspect the matching entry in full:

```bash
kubectl get mutatingwebhookconfiguration istio-sidecar-injector -o yaml
kubectl get namespace checkout --show-labels
```

Evaluate `namespaceSelector`, `objectSelector`, rules, `matchPolicy`, and any match conditions. Namespace selectors match labels on the Namespace object, not its name unless a name label is explicitly selected. For revisions, `istio.io/rev` determines the matching injector. If both legacy `istio-injection` and revision labels exist, fix the ambiguity using Istio's documented injection policy rather than editing every Pod.

Do not assume the webhook is named exactly `istio-sidecar-injector`; use the name from the failure. A stale webhook left by a retired revision can still match and call a Service that no longer exists.

## Follow Service Port 443 to Istiod Port 15017

Read the webhook's `clientConfig.service` directly. For the common Istiod Service, compare Service ports and every EndpointSlice:

```bash
kubectl -n istio-system get service istiod -o yaml
kubectl -n istio-system get endpointslice \
  -l kubernetes.io/service-name=istiod -o yaml
kubectl -n istio-system get pods -l app=istiod -o wide
```

Istio documents `443` as the webhook Service port and `15017` as the Istiod webhook container port. Verify the deployed Service's actual `targetPort`; custom charts may differ. In EndpointSlices, confirm:

- at least one endpoint is `ready: true`;
- endpoint addresses match current Istiod Pod IPs;
- the slice port resolves to the webhook serving port; and
- every endpoint belongs to the expected revision.

There may be multiple EndpointSlices. A single healthy endpoint can also mask one broken Istiod replica, producing intermittent admission failures. Compare failure timestamps with each Istiod Pod's logs and restarts:

```bash
kubectl -n istio-system logs -l app=istiod \
  --since=20m --timestamps --prefix --max-log-requests=10
kubectl -n istio-system get pods -l app=istiod \
  -o custom-columns='NAME:.metadata.name,READY:.status.containerStatuses[*].ready,RESTARTS:.status.containerStatuses[*].restartCount,NODE:.spec.nodeName,IP:.status.podIP'
```

If EndpointSlices are empty, fix Istiod readiness, the Service selector, or the installation owner. Do not hand-create endpoint addresses for a selector-backed Service.

## Test from the API Server's Network Perspective

The API server may run as a host-network static Pod, a managed service outside the cluster network, or behind Konnectivity or an egress selector. Each has a different route to ClusterIP and Pod IP addresses.

For self-managed control planes, use approved host or API-server namespace diagnostics to test the exact Service ClusterIP:port and each ready endpoint:targetPort. Preserve the expected TLS server name `istiod.istio-system.svc` even when connecting to an IP. A generic test shape is:

```bash
openssl s_client \
  -connect ISTIOD_SERVICE_IP:443 \
  -servername istiod.istio-system.svc \
  -showcerts </dev/null
```

Run it only from an authorized control-plane path and replace the placeholder explicitly. A completed TLS handshake still does not validate an AdmissionReview response, but it separates reachability and trust from application logic.

On a managed control plane, do not attempt to create an unauthorized shell. Use provider control-plane logs, firewall diagnostics, and the documented webhook connectivity model. Check security groups, control-plane authorized networks, CNI policy for host-originated traffic, node firewalls, and any private-cluster master-to-node rules.

NetworkPolicy behavior for control-plane sources is CNI-specific. An allow rule for Pods with an `apiserver` label does not help when the source is a node address or provider control-plane CIDR. Test all API-server replicas if the failures are intermittent.

Also inspect API-server proxy environment configuration. Istio's injection troubleshooting documentation notes that API-server proxy settings can break webhook calls if `.svc` destinations are not excluded correctly. Make changes only through the cluster's supported control-plane configuration.

## Verify the CA Bundle and Served Identity

For a Service reference, kube-apiserver verifies the webhook using the Service DNS identity. Inspect only public certificate material:

```bash
kubectl get mutatingwebhookconfiguration istio-sidecar-injector -o json |
  jq -r --arg name 'MATCHED_WEBHOOK_NAME' \
    '.webhooks[] | select(.name == $name) | .clientConfig.caBundle' |
  base64 --decode |
  openssl x509 -noout -subject -issuer -dates -fingerprint -sha256
```

Replace both the configuration name and `MATCHED_WEBHOOK_NAME` with the values from the failed admission call. A configuration can contain several webhook entries; inspecting `[0]` without proving it is the matching entry can validate the wrong CA bundle.

Retrieve the serving chain with `openssl s_client` from the API-server path and compare issuer, validity window, fingerprinted trust anchor, and DNS SAN. The leaf certificate should cover the Service identity used by the webhook. Check clock synchronization on control-plane and Istiod nodes.

An empty or stale `caBundle` often means the installation's certificate reconciliation did not complete or another manager overwrote the webhook. Determine who owns the object:

```bash
kubectl get mutatingwebhookconfiguration istio-sidecar-injector \
  -o json --show-managed-fields |
  jq '.metadata.managedFields[] | {manager, operation, time, fieldsType}'
```

Repair the Istio installer or reconciler rather than pasting a CA from an unrelated cluster. Never set insecure TLS verification: Kubernetes admission webhook configuration provides a CA bundle, not a supported skip-verification switch.

## Distinguish Timeout from Slow Admission Logic

Kubernetes allows `timeoutSeconds` from 1 to 30 and defaults it to 10. Raising it can reduce false failures only when the network and TLS path work and Istiod is demonstrably slow. It also increases API request latency and can multiply an outage across controllers.

Inspect API-server admission webhook latency and rejection metrics, retaining labels for webhook name and API-server instance. Compare them with Istiod CPU, throttling, garbage collection, request concurrency, and logs. If a request reaches Istiod but processing stalls, scale or repair the control plane and reduce admission load; do not automatically set a 30-second timeout.

Changing `failurePolicy` from `Fail` to `Ignore` trades successful Pod creation for bypassed mutation. For injection, that can create running Pods without sidecars in a namespace that operators believe is meshed. Use such a change only under an approved, time-bounded break-glass procedure with detection, workload quarantine, and a plan to recreate every bypassed Pod.

## Verify Recovery and Prevent Recurrence

After fixing Service selection, endpoints, routing, or CA reconciliation, repeat server-side dry run. Then create one canary from the owning workload and verify injection actually occurred:

```bash
kubectl -n checkout get pod checkout-api-CANARY -o json |
  jq '{containers: [.spec.containers[].name],
       initContainers: [.spec.initContainers[]?.name],
       sidecarStatus: .metadata.annotations["sidecar.istio.io/status"]}'
```

Confirm both application and proxy become ready, the proxy connects to the intended revision, and webhook latency returns to baseline. Remove stale revision webhooks only through the supported uninstall process after proving no namespaces select them.

Alert separately on admission call failures, webhook latency, Istiod ready endpoints, certificate expiry, and Pods created in mesh namespaces without a data plane. A green Istiod Deployment alone does not cover the API-server network path.

## Conclusion

An injection timeout is an API-server outbound-call failure until evidence shows otherwise. Resolve the exact matching webhook, map its Service port to every ready Istiod endpoint, test from the API server's real network path, and verify the served certificate against `caBundle`. Restore the owning configuration and prove that a canary is actually injected; availability without the expected sidecar is not a successful recovery.

## Official Documentation

- [Istio: Sidecar Injection Problems](https://istio.io/latest/docs/ops/common-problems/injection/)
- [Istio: Installing the Sidecar](https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/)
- [Istio: Application Requirements and Ports](https://istio.io/latest/docs/ops/deployment/application-requirements/)
- [Kubernetes: Dynamic Admission Control](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)
- [Kubernetes: Admission Webhook Good Practices](https://kubernetes.io/docs/concepts/cluster-administration/admission-webhooks-good-practices/)
- [Kubernetes: EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes: MutatingWebhookConfiguration v1 API](https://kubernetes.io/docs/reference/kubernetes-api/extend-resources/mutating-webhook-configuration-v1/)
