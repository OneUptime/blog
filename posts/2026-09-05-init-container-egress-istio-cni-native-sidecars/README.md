# Secure Init-Container Egress with Istio CNI or Native Sidecars

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, CNI, Native Sidecars, Pod Startup, Network Egress, Traffic Interception, Kubernetes, Security

Description: Secure network calls made by init containers by separating traffic capture from proxy startup and choosing CNI, native sidecars, or explicit isolation.

---

An application init container can make consequential network calls before the regular `istio-proxy` container starts. That creates two dangerous failure modes:

- if traffic redirection is not installed yet, the call can bypass Istio policy, mTLS, egress routing, and telemetry; or
- if redirection is installed but the proxy is not listening, the call is captured and fails rather than bypassing.

These outcomes are often confused. Istio CNI and Kubernetes native sidecars solve different parts of the lifecycle:

- Istio CNI programs traffic redirection during Pod network setup and removes the need for a privileged `istio-init` container in every workload.
- A native sidecar can start the proxy as a restartable init container before later application init containers.

For an init container whose traffic must both work and pass through Envoy, the complete design generally needs capture to be installed **and** the proxy to be started before that init container. CNI alone does not make a legacy regular sidecar start earlier.

## Inventory the Actual Pod Lifecycle

Inspect a failing Pod, not only the Deployment template:

```bash
kubectl -n bootstrap get pod api-setup-6bd8d695c8-7p9mt -o json |
  jq '{initContainers:
         [.spec.initContainers[]? |
          {name, restartPolicy, image, securityContext}],
       containers:
         [.spec.containers[] |
          {name, image, securityContext}],
       annotations: .metadata.annotations}'
```

Record the exact init-container order. In Kubernetes, ordinary init containers run sequentially and must complete before regular containers start. A native sidecar is represented inside `initContainers` with `restartPolicy: Always`; it remains running while later init containers and application containers execute.

Check whether Istio CNI is installed and ready on the Pod's node:

```bash
kubectl -n bootstrap get pod api-setup-6bd8d695c8-7p9mt -o wide
kubectl -n istio-system get daemonset istio-cni-node -o wide
kubectl -n istio-system get pods -l k8s-app=istio-cni-node -o wide
```

Labels vary by installation; read the DaemonSet selector rather than assuming the example. With Istio CNI, an injected `istio-validation` init container may deliberately block a Pod when redirection was not installed, allowing the repair controller to handle the race.

Without CNI, look for `istio-init`. It needs network capabilities to install rules before regular containers. Its completion proves a command exited successfully, not that every rule matches the current network mode; inspect events and logs when validation fails.

## Prove Whether the Init Call Was Captured

Use evidence from both ends for a harmless, uniquely identified request:

- init-container timestamped logs;
- source Pod proxy access log;
- egress-gateway access log, if required;
- destination log containing a one-time correlation header; and
- a short, filtered packet observation when authorized.

Example log collection:

```bash
kubectl -n bootstrap logs api-setup-6bd8d695c8-7p9mt \
  -c fetch-config --timestamps
kubectl -n bootstrap logs api-setup-6bd8d695c8-7p9mt \
  -c istio-proxy --timestamps
```

No proxy access-log line is evidence only when access logging is enabled for that protocol and time. A missing mTLS identity is meaningful only at a peer expected to authenticate the source workload, such as the egress gateway or a destination mesh proxy. An external destination does not normally see the source workload's mesh identity, even when traffic traverses Envoy. An immediate connection refusal while the proxy container is absent supports captured-but-not-serviceable traffic.

Do not use a production credential fetch as the test. Use an idempotent endpoint, bounded deadline, and non-secret correlation value.

## Understand What Istio CNI Guarantees

Istio CNI is a chained plugin invoked after the primary CNI. It configures redirection during Pod network setup, before containers run. This consolidates the elevated privilege in a node DaemonSet instead of granting `NET_ADMIN` and `NET_RAW` to an init container in each workload.

Its validation-and-repair mechanism mitigates a node-start race: without mitigation, a workload could start on a node before the Istio CNI agent is ready and have no redirection. Istio's validation-and-repair mechanism is enabled by default in current supported setups and blocks or repairs such Pods.

However, official Istio CNI documentation explicitly calls out compatibility with application init containers. Under the legacy sidecar model:

1. primary CNI creates the network;
2. Istio CNI installs redirection;
3. application init containers run;
4. the regular Istio proxy starts with the application containers.

At step 3, redirected calls have no proxy to serve them. Istio documents exclusions or running an init container under the proxy UID as workarounds, but those deliberately bypass capture. They can restore connectivity, not mesh enforcement.

Use CNI when the requirement is to ensure redirection exists before any process and to remove per-workload network privileges. Pair it with native sidecar ordering when pre-application init traffic must traverse Envoy.

## Start Envoy as a Native Sidecar

Kubernetes first made native sidecars available behind an alpha gate in 1.28, enabled them by default as beta in 1.29, and made them stable in 1.33. Kubernetes warns that 1.28 had different termination behavior. Istio added its per-Pod selection annotation in 1.24, where the current annotation catalog still classifies it as alpha. On a supported combination with sidecar injection enabled, request native proxy injection on the Pod template. Merge this partial example into an existing Deployment; it omits the required selector, matching template labels, and container specification:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-setup
  namespace: bootstrap
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/nativeSidecar: "true"
```

The setting is an Istio feature-selection annotation; quoted YAML is intentional. It takes precedence over the injector's `ENABLE_NATIVE_SIDECARS` setting, whose documented default is `auto` in current Istio. Check the release-matched setting and every node Kubernetes version. Do not manually move `istio-proxy` into `initContainers` because injection also manages volumes, probes, security context, and shutdown behavior.

After a canary Pod is created, verify ordering:

```bash
kubectl -n bootstrap get pod api-setup-CANARY -o json |
  jq '.spec.initContainers[]? |
      {name, restartPolicy, startupProbe, readinessProbe}'
```

The proxy should be a restartable init container before `fetch-config`. Kubernetes waits for a sidecar's startup condition according to the native sidecar lifecycle; when a startup probe is present, later init progress waits for it to succeed. Confirm the generated Istio proxy has the expected probe for the deployed release.

Native sidecars also let Jobs complete without waiting for a forever-running regular proxy. Test termination because an init workflow that succeeds at startup can still hang or truncate telemetry at shutdown under a mismatched sidecar model.

## Treat Exclusions as Explicit Bypass

Istio documents three compatibility techniques for application init containers when CNI redirects traffic before a legacy proxy starts:

- run the init container with the proxy's excluded UID;
- add `traffic.sidecar.istio.io/excludeOutboundIPRanges`; or
- add `traffic.sidecar.istio.io/excludeOutboundPorts`.

These techniques tell capture rules not to send that traffic through Envoy. The IP/port exclusion annotations also apply to application-container traffic in the Pod, not just init containers. The UID workaround exempts traffic from that UID; application traffic under a different, non-exempt UID remains captured. Istio warns that an excluded IP or port remains a bypass after startup.

Do not copy `runAsUser: 1337` blindly. Some platforms assign a different proxy UID, and reusing the proxy identity can grant broader capture exemptions than intended. DNS capture adds another complication: the official CNI guide notes that hostname lookup from an init container may require the proxy-UID workaround in some configurations.

If a temporary exclusion is unavoidable:

- use the smallest fixed destination CIDR or port;
- ensure destination identity and TLS are enforced by the application protocol;
- restrict the same path with NetworkPolicy and external firewall policy;
- use destination-side authorization to limit access; NetworkPolicy cannot distinguish init and application containers within the same Pod; and
- give it an owner and removal date.

An exclusion is not a secure-mesh solution simply because the Pod is otherwise injected.

## Prefer Removing Network Work from Init When Possible

Many startup tasks can be redesigned:

- mount configuration through a ConfigMap, Secret, or CSI driver instead of fetching it over the network;
- have the main application perform a retryable initialization after its proxy is ready;
- use a controller or Job with an explicit mesh lifecycle for migrations;
- place large artifact downloads in an image or trusted node cache; or
- make readiness wait for initialization without making liveness depend on it.

This can avoid network calls before the mesh proxy is ready; init containers do not inherently require elevated privileges and can already have a Kubernetes service-account identity. When the task performs schema migration or a non-idempotent write, add locking and idempotency; sidecar ordering does not prevent several replicas from running it concurrently.

Never place long-lived credentials in init-container command arguments or logs. Use projected tokens with narrow audience and lifetime where supported.

## Enforce Egress Outside the Pod Boundary

Istio's security guidance is explicit that an application and its sidecar share a weak boundary. A sufficiently privileged workload can alter capture or otherwise bypass its own outbound sidecar. `REGISTRY_ONLY` is useful for dependency control but is not a hard egress security boundary.

For strong egress enforcement, route permitted destinations through an egress gateway and use NetworkPolicy or external network controls so workload Pods cannot reach external networks directly. A basic policy design is:

```text
workload Pod -> DNS
workload Pod -> Istiod for proxy configuration and certificates
workload Pod -> approved egress gateway
workload Pod -X-> arbitrary external IP
```

Implement the exact NetworkPolicy for the deployed CNI, accounting for node-local DNS, dual stack, gateway namespace labels, required internal dependencies, and provider behavior. Apply in a test namespace first; default-deny egress also blocks DNS unless it is explicitly allowed. NetworkPolicy controls network reachability, while Istio at the gateway supplies routing and telemetry, plus authenticated peer identity when mTLS is configured. L7 HTTP routing and visibility require access to HTTP rather than opaque TLS passthrough.

This defense remains effective when an init process or compromised application bypasses local Envoy.

## Remove Network Capabilities from Workloads

With Istio CNI operating correctly, ordinary workloads should not need `NET_ADMIN` or `NET_RAW` for Istio redirection. Enforce restricted Pod security and explicit capability drops for application and init containers:

```yaml
securityContext:
  allowPrivilegeEscalation: false
  capabilities:
    drop:
    - ALL
  runAsNonRoot: true
  seccompProfile:
    type: RuntimeDefault
```

Test application compatibility. The privileged CNI DaemonSet remains a trusted node component and needs separate admission, image, host-path, and node-access controls. Do not remove its required privileges piecemeal without the supported Istio deployment configuration.

## Verify the Full Lifecycle

Create one canary Pod and record:

1. CNI and validation success on its node;
2. native proxy startup and readiness;
3. start time of each subsequent init container;
4. one controlled init request in the source proxy and egress gateway logs;
5. source workload identity observed at the mTLS peer (the egress gateway or destination mesh proxy), plus the correlated request at the final destination; and
6. application and Job shutdown behavior.

Then run a negative test in an isolated environment: direct external egress that does not traverse the gateway should be denied. Verify both IPv4 and IPv6 if the cluster is dual-stack; an IPv4-only policy can leave an unintended IPv6 path.

Monitor CNI DaemonSet readiness, repair events, Pods stuck in `istio-validation`, init-container network failures, and application Pods carrying capture-exclusion annotations.

## Conclusion

Pre-proxy traffic is a lifecycle problem with two separate requirements: install capture before any process, and start a usable proxy before an init container that must use the mesh. Istio CNI addresses the first and reduces per-Pod privilege; native sidecars address ordered proxy startup. Treat UID and port exclusions as bypasses, and enforce sensitive egress at the gateway and network layer even when local capture appears correct.

## Official Documentation

- [Istio: Install the Istio CNI Node Agent](https://istio.io/latest/docs/setup/additional-setup/cni/)
- [Istio: Security Best Practices](https://istio.io/latest/docs/ops/best-practices/security/)
- [Istio: Security Model](https://istio.io/latest/docs/ops/deployment/security-model/)
- [Istio: Resource Annotations](https://istio.io/latest/docs/reference/config/annotations/)
- [Kubernetes: Sidecar Containers](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)
- [Kubernetes: Init Containers](https://kubernetes.io/docs/concepts/workloads/pods/init-containers/)
- [Kubernetes: Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Kubernetes: Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
