# Does Envoy Pull or Does Istiod Push? Trace the Long-Lived xDS Stream from Bootstrap to ACK and NACK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, Envoy, XDS, Dynamic Configuration, gRPC, Control Plane, Troubleshooting

Description: Understand who initiates each xDS exchange and trace Envoy bootstrap, subscriptions, Istiod responses, and ACK or NACK state safely.

---

Operators often say that Istiod pushes configuration to Envoy. That is useful shorthand, but it can mislead a network investigation. In generic xDS, the client initiates a long-lived bidirectional gRPC connection and sends discovery requests that establish subscriptions. In a current Istio sidecar there are normally two connected streams: Envoy connects to pilot-agent's local xDS proxy over a Unix-domain socket, and pilot-agent opens the TLS/gRPC connection to Istiod. The agent forwards ordinary Envoy discovery requests and Istiod responses between those streams.

So the accurate answer is both, with clear ownership:

```text
Envoy                 pilot-agent xDS proxy                 Istiod
  |--- gRPC over UDS -------->|                                |
  |                           |--- TLS/gRPC connection ------->|
  |--- DiscoveryRequest ----->|--- forwarded request -------->|
  |<-- DiscoveryResponse -----|<-- resources/version/nonce ----|
  |--- ACK or NACK request -->|--- forwarded request -------->|
  |<-- later response --------|<-- changed resources ----------|
```

Istiod does not open a new inbound connection to every workload. A firewall that permits Istiod-to-Pod initiation but blocks Pod egress to Istiod port `15012` will still break the upstream stream. The local Envoy-to-agent socket is a separate failure boundary.

## Start with the Bootstrap Contract

Envoy needs static bootstrap configuration before dynamic discovery can begin. In an Istio workload, inspect the effective bootstrap rather than an installation values file:

```bash
istioctl proxy-config bootstrap \
  pod/reviews-v2-6f9f8b8bcb-t5j7n.bookinfo \
  -o json > /tmp/reviews-bootstrap.json
```

Review only the fields needed for the investigation:

```bash
jq '{node: .bootstrap.node,
     dynamicResources: .bootstrap.dynamicResources,
     xdsClusters:
       [.bootstrap.staticResources.clusters[] |
        select(.name | test("xds|istio"; "i")) |
        {name, type, loadAssignment, transportSocket}]}' \
  /tmp/reviews-bootstrap.json
```

In the stock Istio 1.31 sidecar bootstrap, ADS uses the static `xds-grpc` cluster and that cluster points to pilot-agent's local `./etc/istio/proxy/XDS` Unix-domain socket. It does **not** identify the remote Istiod hostname or prove DNS and port `15012` are healthy. The bootstrap remains authoritative for Envoy's local xDS leg, node identity and metadata, and whether resources use ADS.

Read pilot-agent's effective upstream address from its startup and connection logs:

```bash
kubectl -n bookinfo logs reviews-v2-6f9f8b8bcb-t5j7n \
  -c istio-proxy --timestamps |
  grep -E 'Initializing with upstream address|connected to upstream XDS server|failed to connect to upstream'

kubectl -n bookinfo get pod reviews-v2-6f9f8b8bcb-t5j7n -o json |
  jq '{revision: .metadata.annotations["istio.io/rev"],
       proxyConfigOverride: .metadata.annotations["proxy.istio.io/config"],
       discoveryAddressOverride: .metadata.annotations["sidecar.istio.io/discoveryAddress"]}'
```

The injected `PROXY_CONFIG` environment value and those Pod annotations explain where the address came from; the `xdsproxy` initialization log is the clearest runtime value. If the startup line has rotated out, inspect previous logs and the configuration for the injector revision recorded on the Pod. External control planes and revisions can change the upstream address, trust roots, and metadata.

Treat the dump as sensitive operational data. Node metadata can reveal workload, cluster, and network identifiers. Never publish service-account tokens, workload private keys, or Secret volume contents alongside it.

## Follow Connection Establishment in the Correct Direction

For a standard in-cluster control plane, pilot-agent reaches Istiod's TLS/mTLS gRPC service on port `15012`. Confirm the Service and ready endpoints:

```bash
kubectl -n istio-system get service istiod -o wide
kubectl -n istio-system get endpointslice \
  -l kubernetes.io/service-name=istiod -o wide
kubectl -n istio-system get pods -l app=istiod -o wide
```

Check egress NetworkPolicy and node/firewall routing from the workload to those endpoints. A successful TCP probe is only one layer; xDS also depends on TLS, workload credentials, gRPC, and Istiod authorization. Port `15010` is plaintext and should not be introduced as an incident workaround in a production network.

The upstream connection is long-lived. Repeated TLS handshakes or frequent `StreamAggregatedResources` reconnects are not normal configuration pushes; they indicate transport churn, credential rotation problems, load-balancer idle timeout, Istiod restarts, or resource pressure. Correlate agent and Istiod logs by timestamp and proxy ID. Also distinguish an Envoy-to-agent UDS failure from an agent-to-Istiod network failure; current Istio re-establishes the upstream stream when Envoy makes a fresh downstream connection.

## Understand the First DiscoveryRequest

In state-of-the-world xDS, a stream begins with a `DiscoveryRequest` from the client. It identifies the resource type, subscribed resource names where applicable, the client's known version, and node identity. Only the first request on a stream is guaranteed to contain the node identifier, so a log snippet from later in the stream may legitimately omit it. For ordinary Envoy resource types, pilot-agent forwards this request upstream; it can also originate requests for Istio-internal resource types that the agent itself consumes.

With Aggregated Discovery Service, multiple xDS resource types share one gRPC stream. Common types include:

- CDS for clusters;
- EDS for cluster load assignments and endpoints;
- LDS for listeners; and
- RDS for HTTP route configurations.

Dependencies still matter. A listener can reference an RDS route, a route can reference a cluster, and a cluster can use EDS. Envoy initialization and warming prevent some resources from serving traffic until their dependencies arrive.

Istio can use delta xDS, where requests add or remove named subscriptions and responses carry changes, rather than sending the complete state for a type every time. Do not decode a delta exchange using state-of-the-world version assumptions. In both variants, Envoy initiates the downstream stream and pilot-agent initiates the corresponding upstream stream; subscription state flows toward Istiod.

## Interpret DiscoveryResponse, Version, and Nonce

Istiod sends a `DiscoveryResponse` when it has an initial answer or subscribed resources change. For state-of-the-world xDS, the response carries resources, a `version_info`, a type URL, and a nonce. Pilot-agent normally forwards responses for ordinary Envoy types onto the downstream stream. The nonce ties the next ACK or NACK to this specific response and is scoped to its stream; it does not survive a reconnect.

The server should not continuously resend identical resources just to poll the client. Envoy's protocol documentation warns that doing so creates needless work. Operationally, an Istio push means that Istiod wrote a response on an existing client-created stream after its computed configuration changed.

A response can be empty for a valid reason: the proxy may have no resources of that type in scope. `NOT SENT` in `istioctl proxy-status` similarly can mean Istiod had nothing to send. Always compare the missing type with the proxy's role; an ingress gateway and a sidecar do not require identical route sets.

## ACK Is Another Client Request

After validating a response, Envoy sends a `DiscoveryRequest` with the response nonce, and pilot-agent forwards it upstream for ordinary Envoy resources. For an ACK, it carries the accepted response version and no `error_detail`. For a NACK, `error_detail` is populated and the version represents the configuration the client is still using under the protocol's rules.

Do not assume every ACK or NACK visible at Istiod came from Envoy. Pilot-agent consumes some Istio-internal types and acknowledges them itself. It can also NACK an ECDS response if enabled remote-Wasm conversion fails before the response reaches Envoy. Correlate the type URL and agent log with the Envoy validation log before assigning ownership.

Three nuances prevent common misdiagnoses:

1. An ACK says the delivered resources were valid and Envoy intends to apply them. The xDS specification notes that this does not prove every resource was subsequently applied successfully.
2. A NACK means at least one resource in the response was invalid. Do not infer that every other resource in the response was discarded.
3. The response nonce, not a guessed version comparison, is the reliable way to correlate the acknowledgement with a server response.

For filesystem-delivered dynamic resources, Envoy has no wire-level ACK/NACK mechanism; logs and counters are the evidence. Keep that distinction when debugging a proxy that is not using gRPC for a particular configuration source.

## Read Istio's View of Sent and Acknowledged State

Use `proxy-status` for a summary:

```bash
istioctl proxy-status
istioctl proxy-status \
  reviews-v2-6f9f8b8bcb-t5j7n.bookinfo
```

Interpret the states carefully:

- `SYNCED` means Envoy acknowledged the last configuration Istiod sent for that type;
- `STALE` means Istiod sent an update but has not received its acknowledgement; and
- `NOT SENT` means Istiod has not sent that type, often because none is required.

If the proxy is absent, it is not connected to an Istiod instance visible to the command. In a revisioned mesh, query the intended control plane explicitly when needed:

```bash
istioctl proxy-status --xds-label istio.io/rev=stable
```

Compare the desired namespace revision with the actual Pod revision annotation. A proxy can be perfectly synced to the wrong revision and therefore never see a resource installed only in another control plane's discovery scope.

For a suspected difference, request the proxy-status diff or inspect accepted configuration:

```bash
istioctl proxy-config listeners \
  pod/reviews-v2-6f9f8b8bcb-t5j7n.bookinfo
istioctl proxy-config routes \
  pod/reviews-v2-6f9f8b8bcb-t5j7n.bookinfo
istioctl proxy-config clusters \
  pod/reviews-v2-6f9f8b8bcb-t5j7n.bookinfo
istioctl proxy-config endpoints \
  pod/reviews-v2-6f9f8b8bcb-t5j7n.bookinfo
```

These commands answer a more useful question than whether a response crossed the wire: what configuration can this Envoy currently use?

## Diagnose a NACK Without Restarting Away the Evidence

Capture proxy logs around the update and search for the resource type, nonce/version context, and validation message:

```bash
kubectl -n bookinfo logs reviews-v2-6f9f8b8bcb-t5j7n \
  -c istio-proxy --since=30m --timestamps |
  grep -Ei 'nack|rejected|error_detail|lds|rds|cds|eds'
```

Then run static analysis against live and candidate configuration:

```bash
istioctl analyze --all-namespaces
istioctl analyze -f candidate-config.yaml
kubectl apply --dry-run=server -f candidate-config.yaml
```

Admission success is not proof that every proxy can accept the computed Envoy resource. Identify the smallest owning Istio or Kubernetes object, fix that declarative source, and observe a new version being ACKed. Avoid deleting broad sets of VirtualServices or DestinationRules just to force a push.

If state is `STALE` without a clear NACK, inspect network churn, Istiod load, Envoy resource pressure, and the exact control-plane replica. A response sent immediately before a stream reset may never receive an acknowledgement even if the next stream converges.

## Trace Safely at the Network Layer

A packet capture in the Pod network can prove that pilot-agent initiated the remote TCP connection and show its lifetime, retransmissions, resets, TLS records, and keepalives. It will not show the local Unix-socket leg as IP packets. Production upstream xDS is encrypted, so the capture will not reveal DiscoveryRequest resources without TLS session material. Do not extract credentials or disable transport security merely to decode it.

Use logs, `proxy-status`, config dumps, and metrics for protocol semantics. Use packet capture only to answer transport questions such as:

- Did pilot-agent initiate a connection to the expected IP and port?
- Which side sent the TCP reset?
- Does an intermediary close an otherwise idle long-lived stream?
- Are retransmissions specific to a node or endpoint?

Scope captures to the Istiod address and port, cap file size and duration, and store them as sensitive artifacts.

## Conclusion

Envoy pulls and Istiod pushes only in complementary senses. In current Istio sidecars, Envoy initiates a local gRPC stream to pilot-agent, pilot-agent initiates the remote TLS/gRPC stream to Istiod, and ordinary subscription requests, responses, and Envoy ACKs or NACKs are forwarded between them. Following both connection legs, nonce correlation, resource type, and accepted proxy configuration turns vague push failures into a precise transport, scope, or resource-validation diagnosis.

## Official Documentation

- [Envoy: xDS REST and gRPC Protocol](https://www.envoyproxy.io/docs/envoy/latest/api-docs/xds_protocol.html)
- [Envoy: Configuration Sources](https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/config_source.proto.html)
- [Envoy: Initialization](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/operations/init)
- [Istio: Debugging Envoy and Istiod](https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/)
- [Istio: istioctl Reference](https://istio.io/latest/docs/reference/commands/istioctl/)
- [Istio: Architecture](https://istio.io/latest/docs/ops/deployment/architecture/)
- [Istio: Application Requirements and Ports](https://istio.io/latest/docs/ops/deployment/application-requirements/)
- [Istio source: agent xDS proxy](https://github.com/istio/istio/blob/release-1.31/pkg/istio-agent/xds_proxy.go)
- [Istio source: Envoy bootstrap template](https://github.com/istio/istio/blob/release-1.31/tools/packaging/common/envoy_bootstrap.json)
