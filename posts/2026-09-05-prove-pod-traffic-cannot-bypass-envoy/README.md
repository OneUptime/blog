# How to Prove Pod Traffic Cannot Bypass Envoy: Lock Down `NET_ADMIN`, Egress, and NetworkPolicy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, Envoy, Pod Security, Network Egress, Network Policy, Service Mesh Security, CNI, Security

Description: Define and test a defensible Istio traffic boundary using least privilege, capture checks, strict destination identity, egress gateways, and NetworkPolicy.

---

There is no honest single command that proves every process in an Istio sidecar Pod can never bypass Envoy. Istio's security guidance explicitly describes a minimal security boundary between an application and its sidecar: they share network context, workloads can be configured with capture exclusions, and a sufficiently privileged process may alter redirection or interfere with the proxy.

You can prove narrower, useful properties:

1. the deployed Pod has the expected capture configuration;
2. ordinary unprivileged application traffic is observed by its local Envoy;
3. workloads cannot modify the network stack or inject privileged debuggers;
4. destination sidecars reject plaintext under strict mTLS; and
5. external network policy allows workload egress only through controlled gateways.

The last two properties move enforcement outside the source Pod's weak trust boundary. That is what turns local capture from a convenience into part of a defensible system.

## Write the Threat Model First

Define what bypass means in this environment. Include at least:

- TCP, UDP, ICMP, IPv4, and IPv6;
- Service DNS names, ClusterIPs, Pod IPs, node ports, and external IPs;
- init, application, sidecar, and ephemeral containers;
- users with `pods/exec`, `pods/ephemeralcontainers`, or workload-update RBAC;
- privileged Pods, host networking, host PID, and added Linux capabilities;
- Istio capture exclusions and `outboundTrafficPolicy`; and
- compromise of the application versus compromise of a node administrator.

Istio sidecar redirection covers TCP, not every IP protocol. If the claim says all network traffic, it is already too broad. If node root and cluster-admin are in the attacker model, Kubernetes workload controls cannot provide an absolute guarantee.

A practical claim might be: an unprivileged application container cannot establish TCP egress to external networks except through the designated egress gateway, and protected destinations accept application traffic only after an Istio mTLS peer check.

## Inventory Capture Intent and Exceptions

Inspect the live Pod, not only installation defaults:

```bash
kubectl -n apps get pod checkout-7c8fdc7db9-p6k2m -o json |
  jq '{hostNetwork: .spec.hostNetwork,
       containers: [.spec.containers[] |
         {name, securityContext}],
       initContainers: [.spec.initContainers[]? |
         {name, securityContext}],
       captureAnnotations:
         (.metadata.annotations | with_entries(
           select(.key | test("traffic\\.sidecar\\.istio\\.io|sidecar\\.istio\\.io"))))}'
```

Review `includeOutboundIPRanges`, `excludeOutboundIPRanges`, `includeOutboundPorts`, `excludeOutboundPorts`, excluded interfaces, inbound exclusions, and interception mode. An exclusion may be legitimate for a node agent or init workflow, but it is a documented bypass and must narrow the assurance claim.

Confirm the Pod has `istio-proxy`, the expected revision, and a successful CNI or `istio-init` setup. With Istio CNI, check the DaemonSet on this node and any `istio-validation` repair events. With per-Pod initialization, verify `istio-init` completed. Do not grant a debug container `NET_ADMIN` just to inspect rules in a production Pod; that changes the very property being tested.

Use `istioctl proxy-config bootstrap` and supported proxy commands to review interception metadata without exposing the Envoy admin port. Store configuration dumps as sensitive artifacts.

## Remove Network-Administration Power from Workloads

Application, init, and ordinary helper containers should run with restricted security settings:

```yaml
securityContext:
  allowPrivilegeEscalation: false
  capabilities:
    drop:
    - ALL
  privileged: false
  runAsNonRoot: true
  seccompProfile:
    type: RuntimeDefault
```

Apply equivalent controls to every container, not just the first. Kubernetes Pod Security Standards' Restricted profile permits only a small capability exception and requires capabilities to be dropped; `NET_ADMIN` and `NET_RAW` should not be available to ordinary workloads.

Move Istio redirection setup to the Istio CNI node agent so workload authors do not need to create a privileged `istio-init` container. The node agent remains privileged and belongs in a tightly controlled system namespace on protected nodes. This consolidates privilege; it does not eliminate the need to secure the node.

Enforce these fields with Pod Security Admission and, where necessary, a validating admission policy. Also deny:

- `hostNetwork`, `hostPID`, and unapproved host paths;
- privileged or added-capability ephemeral containers;
- mutation of protected Istio injection and traffic-exclusion annotations; and
- images outside the approved registry and signature policy.

Restrict `pods/exec`, `pods/attach`, and `pods/ephemeralcontainers` RBAC. Anyone who can add a powerful debugger to the Pod can invalidate the workload-level proof.

## Verify Ordinary Traffic Traverses Envoy

Choose a dedicated, idempotent test endpoint and produce a correlation ID. From the application container, send one request through the Service name:

```bash
kubectl -n apps exec checkout-7c8fdc7db9-p6k2m -c checkout -- \
  curl -sS --connect-timeout 3 --max-time 10 \
  -H 'x-capture-test: test-20260905-001' \
  http://echo.test.svc.cluster.local:8080/ping
```

Correlate it in the source Envoy access log, destination Envoy access log, destination application log, and Istio request metrics. Verify source workload identity and selected upstream endpoint. A source access-log line proves this request traversed that Envoy; it does not prove every possible socket will.

Repeat for each declared TCP service port and for direct Pod IP tests in an isolated test environment. Istio may treat Service-addressed and original-destination traffic differently. Include IPv6 when the cluster is dual-stack.

For a negative local-capture test, use a destination specifically created to detect direct source connections. Do not use production databases or external Internet hosts. The test should fail closed when capture is removed or excluded under the lab's controlled mutation. Restore the Pod from its controller afterward; do not mutate iptables in a production namespace.

## Make Protected Destinations Reject Local Bypass

The stronger in-mesh boundary is at the **destination** sidecar. Apply `PeerAuthentication` in `STRICT` mode to protected workloads after confirming every legitimate source is meshed:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: protected
spec:
  mtls:
    mode: STRICT
```

Add AuthorizationPolicy for the specific service accounts allowed to call each workload. Strict mTLS authenticates the peer proxy; authorization decides which identity may use the service.

This changes the bypass result. Even if a compromised source process opens a direct TCP connection around its own Envoy, the destination's inbound capture still receives it and rejects plaintext. Istio's documented security boundary is that a client should not be able to bypass **another Pod's** sidecar.

Test this in a dedicated namespace:

- a meshed, authorized service account succeeds;
- a meshed but unauthorized identity is denied; and
- an unmeshed plaintext client is rejected.

Do not weaken the whole namespace to `PERMISSIVE` to accommodate a monitoring or health-check exception. Use supported probe rewriting, secure metrics, a gateway, or a tightly scoped workload-port policy whose exposure is separately constrained.

## Enforce External Egress Beyond the Source Pod

Istio's `REGISTRY_ONLY` outbound mode is not a security boundary. A process capable of bypassing its local proxy can ignore that proxy's registry decision. Use an egress gateway plus a NetworkPolicy-capable CNI or external firewall so workload Pods cannot reach arbitrary external destinations directly.

The intended graph is:

```text
application namespace -> cluster DNS
application namespace -> egress gateway ports
application namespace -X-> Internet and private external ranges
egress gateway -> approved external destinations
```

Start with a default-deny egress policy in a test namespace:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-egress
  namespace: apps
spec:
  podSelector: {}
  policyTypes:
  - Egress
```

Then add narrow allow policies for DNS, required Kubernetes APIs through approved paths, and the egress gateway namespace and ports. Do not copy a generic DNS rule: cluster DNS labels, ports, node-local caches, and policy semantics differ. A default deny without DNS allowance will break name resolution.

NetworkPolicy selects Pods, not individual containers in one Pod. It cannot distinguish the application process from its local sidecar. Its value here is blocking direct external reachability for the whole source Pod while allowing only the controlled gateway destination. The egress gateway then enforces L7 policy and upstream TLS.

Test the CNI implementation's behavior for Service translation, node traffic, host-network destinations, established connections, and dual stack. Istio notes that existing proxy connections may survive a policy change depending on the implementation; restart or drain them under a controlled test before declaring enforcement.

## Lock Down the Egress Gateway Too

Allowing workload Pods to connect to a gateway is not enough if the gateway forwards arbitrary original destinations. Configure explicit ServiceEntries, Gateway and VirtualService routes, TLS verification, and AuthorizationPolicy at the gateway. Restrict the gateway's own egress with firewall, network policy, or a provider control so it can reach only approved networks.

Keep application namespaces from creating or exporting arbitrary routing configuration that the shared gateway consumes. Istio resources are configuration authority; RBAC and `exportTo` scope are part of the security boundary.

Validate that:

- an approved host succeeds through the gateway;
- an unknown SNI or HTTP authority is rejected;
- direct destination IP access from the workload fails;
- DNS rebinding cannot redirect an approved hostname to a forbidden range; and
- gateway access logs show the authenticated source and verified upstream.

## Build Repeatable Evidence

A defensible verification report should include:

1. admitted Pod specs proving no network capabilities or privilege;
2. admission controls preventing later privilege and exclusion changes;
3. Istio CNI readiness and capture-validation evidence by node;
4. correlated positive flows through source and destination proxies;
5. strict mTLS and authorization negative tests;
6. NetworkPolicy and firewall negative tests for direct egress;
7. egress-gateway allow and deny cases; and
8. IPv4, IPv6, init-container, and ephemeral-container coverage.

Run these as conformance tests after Kubernetes, Istio, CNI, or admission-policy upgrades. Alert on privileged Pods, added `NET_ADMIN` or `NET_RAW`, capture exclusions, sidecarless Pods in enforced namespaces, CNI repair events, and direct egress denies.

Be precise in the final claim. For example: tested application TCP traffic cannot reach the defined external ranges except through the egress gateway under the current CNI and firewall configuration. Do not turn sampled evidence into a mathematical claim about all traffic and all attackers.

## Conclusion

A sidecar is not an isolation boundary against its own privileged application. Prove local capture for normal traffic, remove workload network capabilities, and prevent configuration escape hatches—but place the decisive controls elsewhere. Strict mTLS and authorization protect destination Pods, while NetworkPolicy, firewalls, and an egress gateway protect external boundaries. Together they support a testable, scoped non-bypass guarantee that local iptables alone cannot provide.

## Official Documentation

- [Istio: Security Best Practices](https://istio.io/latest/docs/ops/best-practices/security/)
- [Istio: Security Model](https://istio.io/latest/docs/ops/deployment/security-model/)
- [Istio: Accessing External Services](https://istio.io/latest/docs/tasks/traffic-management/egress/egress-control/)
- [Istio: Install the Istio CNI Node Agent](https://istio.io/latest/docs/setup/additional-setup/cni/)
- [Istio: PeerAuthentication](https://istio.io/latest/docs/reference/config/security/peer_authentication/)
- [Kubernetes: Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Kubernetes: Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [Kubernetes: Security Context](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/)
