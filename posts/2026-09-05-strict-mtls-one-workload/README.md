# Strict mTLS Breaks One Workload: Find Sidecar Gaps and PeerAuthentication Scope

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, mTLS, PeerAuthentication, Sidecar Injection, Service Mesh Security, Kubernetes, Troubleshooting

Description: Diagnose one workload failing under strict Istio mTLS by checking both proxies, policy precedence, workload ports, revisions, and certificates.

---

When a namespace moves from permissive to strict mutual TLS and one workload fails, the strict policy is often exposing an incomplete mesh migration. The affected source may lack a sidecar, the destination may have been recreated without injection, a port-level policy may use the wrong number, or an explicit DestinationRule may contradict Istio's automatic mTLS choice.

`PeerAuthentication` controls what incoming transport a destination sidecar accepts. In sidecar mode, `STRICT` means that sidecar requires a client certificate on the Istio mTLS connection. It does not add a proxy to a Pod, repair traffic capture, or make a non-mesh client capable of mTLS.

Trace one failing source-to-destination pair. Avoid changing the entire mesh to `PERMISSIVE` before identifying which side lacks the expected identity.

## Build a Small Failure Matrix

Record results for the same host and port from at least:

- the failing source Pod;
- a known-good meshed Pod in the same namespace;
- a known-good meshed Pod in another namespace; and
- any legitimate non-mesh caller such as a node health check or monitoring system.

Use an idempotent endpoint and explicit timeouts. Replace `failing-client-POD` with the exact failing Pod; this example uses the Service port `80` shown below:

```bash
kubectl -n clients exec failing-client-POD -c app -- \
  curl -sv --connect-timeout 3 --max-time 10 \
  http://ledger.finance.svc.cluster.local:80/health -o /dev/null
```

Keep the exact Service DNS name. A test to a Pod IP may select a different outbound cluster and bypass Service-based mTLS detection. Do not include application credentials in verbose output.

Classify the error: connection reset during handshake, upstream connection failure, no healthy upstream, authorization denial, timeout, or application response. `403 RBAC: access denied` points toward AuthorizationPolicy after transport succeeds; a TLS reset or Envoy `UF` points earlier.

## Prove Both Pods Actually Have Sidecars

Namespace labels express intent at admission time; they do not mutate existing Pods. Inspect the live source and destination:

```bash
for pod in failing-client-POD ledger-POD; do
  kubectl -n NAMESPACE get pod "$pod" -o json |
    jq '{name: .metadata.name,
         containers: [.spec.containers[].name],
         initContainers: [.spec.initContainers[]?.name],
         proxyReady: ([.status.containerStatuses[]?, .status.initContainerStatuses[]?] |
           map(select(.name == "istio-proxy") | .ready)),
         sidecarStatus: .metadata.annotations["sidecar.istio.io/status"],
         requestedRevision: .metadata.labels["istio.io/rev"],
         actualRevision: .metadata.annotations["istio.io/rev"]}'
done
```

Run the commands separately with the real namespaces; the loop is illustrative because the two Pods may not share one namespace. Strong evidence of sidecar injection is the `istio-proxy` container plus the generated status annotation. With native sidecars, `istio-proxy` appears in `initContainers`. Check `proxyReady` above, then check xDS sync separately; the Pod-specific commands below compare Envoy configuration with Istiod:

```bash
istioctl proxy-status failing-client-POD.clients
istioctl proxy-status ledger-POD.finance
```

Common sidecar gaps include:

- Pods created before the namespace was labelled;
- a Pod-template label `sidecar.istio.io/inject: "false"`;
- `hostNetwork: true`, which Istio automatic injection skips;
- conflicting legacy and revision injection labels;
- a revision tag that no longer points to the expected injector; and
- a Job, DaemonSet, or third-party controller overlooked during migration.

Fix the workload template or namespace selection, then recreate Pods through their controller. You cannot safely add a sidecar to a running Pod.

## Resolve Effective PeerAuthentication Scope

List policies at every scope:

```bash
kubectl get peerauthentication.security.istio.io -A -o yaml
istioctl x describe pod ledger-POD.finance
```

Evaluate them from broadest to most specific:

1. a selector-less policy in the mesh root namespace sets the mesh default;
2. a selector-less policy in the workload namespace sets its namespace default;
3. a workload-selector policy in that namespace targets matching Pod labels; and
4. `portLevelMtls` can change the mode for a particular workload port.

Do not assume `istio-system` is the mesh root namespace if the installation changed `meshConfig.rootNamespace`. The current PeerAuthentication reference states that policies with workload selectors in the root namespace are ignored; check the reference for the deployed release. Omitted or `UNSET` modes inherit from the broader scope. If multiple policies match at the same scope, Istio uses the oldest matching policy rather than merging them.

The port in `portLevelMtls` is the **workload port**, not the Kubernetes Service port. With this Service mapping:

```yaml
ports:
- name: http-api
  port: 80
  targetPort: 8080
```

a destination exception targets `8080`, not `80`:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: ledger
  namespace: finance
spec:
  selector:
    matchLabels:
      app: ledger
  mtls:
    mode: STRICT
  portLevelMtls:
    8080:
      mode: DISABLE
```

This example deliberately permits plaintext on that workload port and should not be copied casually. Prefer bringing the caller into the mesh or providing an authenticated gateway. A port exception can expose a path other clients also reach.

## Check What the Source Proxy Sends

Istio auto mTLS ordinarily sends mTLS when it knows the destination supports it and plaintext to endpoints it identifies as outside the mesh. An explicit DestinationRule can override that decision.

Inspect rules visible to the source and the effective cluster:

```bash
kubectl get destinationrule -A -o yaml
istioctl proxy-config clusters \
  pod/failing-client-POD.clients \
  --fqdn ledger.finance.svc.cluster.local -o json \
  > /tmp/ledger-cluster.json

jq '.[] | {name, transportSocket, transportSocketMatches}' \
  /tmp/ledger-cluster.json
```

Look for:

- a top-level or port-level `tls.mode: DISABLE` that forces plaintext;
- a rule for a short host that resolves to a different namespace;
- multiple exported rules for the same host;
- a service port selector that does not match the call; and
- a manually configured `MUTUAL` policy using stale certificates when `ISTIO_MUTUAL` or auto mTLS was intended.

DestinationRule port-level settings use the destination **Service port**, which differs from PeerAuthentication's workload port. Preserve that distinction in reviews.

If the source cluster has no Istio mTLS transport socket but the endpoint is injected, inspect endpoint metadata and EDS state. A newly injected destination may not yet have converged in the source proxy. If only one Istiod revision has stale service metadata, callers connected to different revisions can disagree.

## Check Endpoint and Revision Consistency

Inspect every endpoint behind the Service:

```bash
kubectl -n finance get endpointslice \
  -l kubernetes.io/service-name=ledger -o yaml
kubectl -n finance get pods -l app=ledger \
  -o custom-columns='NAME:.metadata.name,IP:.status.podIP,READY:.status.conditions[?(@.type=="Ready")].status,REV:.metadata.annotations.istio\.io/rev,CONTAINERS:.spec.containers[*].name,INIT_CONTAINERS:.spec.initContainers[*].name'
```

A mixed Deployment can have some endpoints with sidecars and some without. A non-mesh caller can fail against strict sidecars while still reaching unproxied replicas in plaintext, because PeerAuthentication cannot protect a Pod without a proxy. A meshed caller using auto mTLS can reach both kinds of endpoint, whereas an explicit `ISTIO_MUTUAL` policy can fail against unproxied replicas. Drain and recreate only the nonconforming replicas after capacity is available.

Compare actual revision annotations, proxy image versions, trust domain metadata, and `istioctl proxy-status`. During a canary control-plane upgrade, both revisions must compute compatible endpoint and security state. A proxy synced to the wrong revision can still show `SYNCED` while missing the policy you expected.

## Separate mTLS from Authorization and Application TLS

After an Istio mTLS handshake, AuthorizationPolicy may still deny the source identity. Check policies and the destination proxy log:

```bash
kubectl get authorizationpolicy -A -o yaml
kubectl -n finance logs ledger-POD -c istio-proxy \
  --since=10m --timestamps
```

If logs show an authenticated peer principal and an RBAC denial, transport identity likely succeeded; fix authorization scope rather than weakening PeerAuthentication. Access logs or RBAC debug logging must be enabled to expose the relevant request details; default proxy logs may not show them.

Application-owned TLS is another layer. A backend that directly serves HTTPS can receive TLS bytes after the destination sidecar's Istio mTLS has been terminated. That can be valid passthrough, but client URL, Service protocol, and DestinationRule must reflect it. Do not assume every TLS-looking error belongs to Istio mTLS.

Likewise, direct kubelet probes, cloud load-balancer checks, and Prometheus scrapes may be plaintext non-mesh clients. Istio can rewrite application health probes through its status port, and secure metrics has dedicated patterns. Inventory those callers before enforcing strict mode.

## Check Certificates Without Exposing Keys

The Istio agent provisions and rotates workload certificates. Inspect proxy secret metadata through supported tools:

```bash
istioctl proxy-config secret pod/failing-client-POD.clients
istioctl proxy-config secret pod/ledger-POD.finance
```

The default summary shows certificate validity, serial numbers, and validity dates. Compare those first; trust-domain SANs and root details require inspecting the public certificates separately. Do not dump private keys or Secret volume contents. Check node clocks if certificates appear not yet valid or expired. Repeated certificate-signing failures in proxy logs may trace back to service-account token audience, Istiod reachability, CA configuration, or revision mismatch.

A proxy can continue using cached traffic configuration during an Istiod outage, but certificate expiry will eventually affect new mTLS connections. Treat xDS sync and certificate health as separate control-plane dependencies.

## Choose a Narrow Remediation

Preferred fixes, in order, are:

1. inject and recreate the missing source or destination sidecar;
2. correct the workload's revision label or stale Pod template;
3. remove an unintended DestinationRule TLS override;
4. correct service-port versus workload-port policy selection; or
5. route a legitimate non-mesh caller through an authenticated gateway.

Temporarily changing one workload to `PERMISSIVE` can be a migration bridge, but it allows both plaintext and mTLS to that target. Scope it with an exact selector, time-bound it, monitor plaintext, and retain a tracked rollback. Changing the namespace or mesh default is much broader.

NetworkPolicy provides useful defense in depth. Restrict which Pods and namespaces can reach the workload port during a temporary permissive mode. Standard Kubernetes NetworkPolicy always allows traffic from the node hosting the Pod; account for this exception and any CNI-specific host policies when assessing node-originated health checks.

## Verify Both Positive and Negative Cases

After the repair, confirm both proxies are synced, the source cluster has an Istio mTLS transport, and every ready destination endpoint has the intended proxy. Run the known-good and formerly failing calls again.

Then prove strictness: an approved test client without mesh credentials should be rejected on the protected path, while a meshed client with the allowed identity succeeds. Do this in a controlled test namespace; do not deploy an untrusted diagnostic Pod into production merely to demonstrate failure.

Monitor connection failures, mTLS telemetry, authorization denials, certificate expiry, and Pods in strict namespaces lacking `istio-proxy`. The final condition should be uniform across all replicas, not just one lucky request.

## Conclusion

Strict mTLS rarely singles out a workload arbitrarily. It exposes a gap in injection, policy port selection, client TLS configuration, revision state, or identity. Verify both live Pods, resolve effective PeerAuthentication at the workload port, inspect what the source cluster actually sends on the Service port, and repair the narrow declarative owner. Keep strict transport as the target state rather than treating permissive mode as the fix.

## Official Documentation

- [Istio: PeerAuthentication](https://istio.io/latest/docs/reference/config/security/peer_authentication/)
- [Istio: Understanding TLS Configuration](https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/)
- [Istio: Authentication Policy](https://istio.io/latest/docs/tasks/security/authentication/authn-policy/)
- [Istio: Installing the Sidecar](https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/)
- [Istio: Security Model](https://istio.io/latest/docs/ops/deployment/security-model/)
- [Istio: Destination Rule](https://istio.io/latest/docs/reference/config/networking/destination-rule/)
- [Istio: Debugging Envoy and Istiod](https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/)
