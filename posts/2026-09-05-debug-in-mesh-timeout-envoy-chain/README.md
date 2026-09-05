# Traffic Works Outside the Mesh but Times Out Inside: Walk Envoy's Listener-to-Cluster-to-Endpoint Chain

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, Envoy, Network Diagnostics, Traffic Routing, Service Mesh, Timeout, Endpoint Discovery, Troubleshooting

Description: Diagnose a mesh-only timeout by following the caller's DNS and Envoy listener, route, cluster, endpoint, transport, and destination path.

---

A successful request from outside the mesh proves that some path reaches the application. It does not prove that an injected caller selects the same DNS address, listener, route, endpoint, protocol, TLS policy, or NetworkPolicy path. The outside test may use an ingress gateway, node port, public load balancer, or direct Pod IP while the in-mesh request traverses two sidecars.

Treat the difference as a path-comparison problem:

```text
application DNS
  -> source capture and listener
  -> HTTP route or TCP filter chain
  -> upstream cluster and transport socket
  -> selected endpoint
  -> network path
  -> destination sidecar and policy
  -> application socket
```

Walk the chain in order. Changing retries or timeouts before locating the stalled hop usually makes the incident slower and noisier.

## Define Two Comparable Requests

Record the working and failing requests side by side:

| Property | Outside path | Inside path |
| --- | --- | --- |
| DNS name | public or Service name | exact Service FQDN |
| Resolved IP | load balancer | ClusterIP or Pod IP |
| Port | public listener | Service port |
| Protocol | HTTP/1.1, HTTP/2, TLS | detected or declared protocol |
| Authority/SNI | external hostname | internal or overridden hostname |
| Source identity | external | Kubernetes service account |

Use the same idempotent endpoint, method, payload, and timeout when possible. From the mesh caller, replace `test-client-POD` with one actual Pod name and use that same Pod throughout the source-side checks:

```bash
kubectl -n clients exec pod/test-client-POD -c app -- \
  curl -sv --connect-timeout 3 --max-time 10 \
  http://orders.orders.svc.cluster.local:8080/health -o /dev/null
```

Do not include credentials in verbose output. Capture start time, DNS answer, time to connect, time to first byte, and final error. `curl --max-time` is a client deadline; an Envoy route timeout or TCP connect timeout may expire earlier.

## Read the Source Envoy Access Log First

Correlate one request in the caller proxy:

```bash
kubectl -n clients logs pod/test-client-POD \
  -c istio-proxy --since=10m --timestamps
```

Record response code, response flags, response-code details, upstream cluster, upstream host, duration, and request ID. Common branches include:

- `NR`: no route matched, or at L4 no filter chain matched;
- `NC`: the chosen cluster does not exist;
- `UH`: no healthy upstream endpoint;
- `UF`: upstream connection establishment failed;
- `UR`: the remote upstream peer reset the connection or HTTP stream;
- `UT`: upstream request timeout; and
- `UO`: circuit-breaker overflow.

A plain application timeout with no source proxy log can mean traffic was not captured, DNS failed before a socket was opened, access logging is disabled, the wrong Pod was inspected, or the request or TCP connection has not yet ended and emitted its access log. Confirm capture intent rather than assuming Envoy saw it.

## Step 0: Verify Application DNS and Original Destination

The application resolves a hostname before opening a normal socket. Inspect from the application container or a vetted ephemeral debugger:

```bash
kubectl -n clients exec pod/test-client-POD -c app -- \
  getent ahosts orders.orders.svc.cluster.local
kubectl -n clients exec pod/test-client-POD -c app -- \
  cat /etc/resolv.conf
```

If tools are unavailable, use an approved digest-pinned debug image in the same Pod. Check A and AAAA results in dual stack. A ClusterIP or headless Service FQDN should resolve to the intended Service IP address(es) or endpoint set, respectively; an ExternalName Service instead returns a CNAME. An external DNS name may resolve differently inside split-horizon DNS.

Istio can route on the original destination and HTTP authority. Calling a Pod IP, ClusterIP, and external host can therefore enter different listeners and routes even when they ultimately reach the same application.

## Step 1: Find the Matching Listener

List the source proxy's listeners:

```bash
istioctl proxy-config listeners pod/test-client-POD.clients
```

Istio sidecars normally receive captured outbound traffic on virtual port `15001`, which selects a virtual listener based on the original destination. Inspect the destination Service port:

```bash
istioctl proxy-config listeners \
  pod/test-client-POD.clients --port 8080 -o json \
  > /tmp/orders-listener.json
```

Check whether Envoy treats it as HTTP or opaque TCP, which filter chain matches the destination and transport, and whether an HTTP connection manager references RDS. The Kubernetes Service's port name or `appProtocol` influences classification. `appProtocol` takes precedence when both are present.

If the listener is missing, inspect Service visibility, Sidecar `egress.hosts`, `exportTo`, discovery selectors, and actual Istio revision. A timeout through `PassthroughCluster` can look like a backend failure when the real issue is that Istio did not know the service.

## Step 2: Find the Route

For HTTP, HTTP/2, or gRPC, list route configurations:

```bash
istioctl proxy-config routes pod/test-client-POD.clients
istioctl proxy-config routes pod/test-client-POD.clients -o json \
  > /tmp/client-routes.json
```

Match the actual request authority and path. Istio HTTP rules are ordered; the first matching rule wins. Check rewrites, redirects, timeouts, retries, destination host, subset, and port.

Common differences from the outside path include:

- the outside gateway rewrites `Host` while the internal client uses the Service FQDN;
- a VirtualService applies only to a named gateway and not `mesh`;
- a catch-all route precedes the intended internal match;
- a short destination name resolves relative to the rule's namespace; or
- the internal route chooses a canary subset with no ready endpoints.

If traffic is opaque TCP or passthrough TLS, there may be no RDS route. Inspect the listener's TCP proxy cluster or TLS/SNI filter chain instead.

## Step 3: Inspect the Chosen Cluster

Query by the exact destination FQDN and then copy the generated cluster name:

```bash
istioctl proxy-config clusters \
  pod/test-client-POD.clients \
  --fqdn orders.orders.svc.cluster.local -o json \
  > /tmp/orders-clusters.json
```

Inspect:

- cluster name and subset;
- HTTP/1.1 versus HTTP/2 protocol options;
- upstream TLS transport socket or auto-mTLS match;
- connect timeout;
- connection-pool and circuit-breaker limits;
- load-balancing policy; and
- EDS or DNS discovery type.

An outside ingress gateway may open plaintext HTTP/1.1 to the backend, while the source sidecar opens Istio mTLS with HTTP/2. Either can expose a server or policy mismatch. Do not remove the transport socket until you understand the destination's PeerAuthentication.

Check `istioctl proxy-status` if the cluster is absent or stale. A connected proxy can still have a deliberately scoped configuration that omits the service.

## Step 4: Inspect Every Endpoint and Health Flag

Use the exact cluster name:

```bash
istioctl proxy-config endpoints \
  pod/test-client-POD.clients \
  --cluster 'outbound|8080||orders.orders.svc.cluster.local'
```

Compare it with all Kubernetes EndpointSlices:

```bash
kubectl -n orders get endpointslice \
  -l kubernetes.io/service-name=orders -o yaml
kubectl -n orders get pods -l app=orders -o wide
```

Verify address family, endpoint readiness, target port, subset labels, locality, network, and health status. A Pod IP shown in Kubernetes may be excluded from a subset, marked unready, ejected as an outlier, or unreachable from the source network.

If only one endpoint fails, send enough controlled requests to identify the selected upstream host without creating load. Compare its node, zone, revision, proxy injection, and listening socket with healthy replicas.

## Step 5: Observe Envoy's Endpoint Connection

The source Envoy connects from the caller Pod network namespace to the selected endpoint, usually the destination Pod IP and workload port. Correlate one controlled request with the access log's upstream host, the exact cluster's connection counters, and a narrowly filtered packet capture. SYN retransmissions with no reply point below HTTP; a completed TCP handshake followed by a TLS alert points at transport security; response bytes followed by an Envoy-generated timeout point back toward protocol or timeout handling.

Do **not** call `nc 10.42.7.19 8080` from an ordinary application or ephemeral debug container and label it a direct Envoy-to-endpoint test. Its outbound socket is normally captured by the same sidecar, so the command can traverse Envoy again. Running a debug process as Istio's excluded proxy UID would bypass capture but grants that process a privileged escape path and changes the security model. A separate unmeshed debug Pod also has different identity and NetworkPolicy selection. Record the test's capture and policy context before drawing a network-layer conclusion.

Compare same-node and cross-node endpoints, address families, and zones. Outside traffic may land only on nodes reachable by a load balancer while Pod-to-Pod overlay traffic is broken. Inspect CNI health, routes, MTU, security groups, and NetworkPolicies. Do not use a blanket allow-all policy as diagnosis; create a narrow, time-bounded test in a non-production namespace.

A packet capture can locate retransmissions or the side sending a reset while preserving Envoy's real connection path. Scope it to source, destination, and port, cap duration and size, and treat it as sensitive. Mesh mTLS payloads should remain encrypted; do not extract private keys.

## Step 6: Follow Destination Sidecar to the Application

At the selected destination Pod, compare sidecar and application logs:

```bash
kubectl -n orders logs orders-POD -c istio-proxy \
  --since=10m --timestamps
kubectl -n orders logs orders-POD -c orders \
  --since=10m --timestamps
```

If packet captures or connection counters confirm that the destination proxy never sees the connection, stay on the network or source transport step. Missing access logs alone do not establish this, especially for TLS handshake failures or connections that are still open. If it reports TLS handshake or authorization failure, inspect PeerAuthentication, AuthorizationPolicy, workload certificates, and source identity. If it accepts the request but cannot connect to the application, verify the workload port and bind address.

For this Service path, the source selects an endpoint port resolved from `targetPort`, and the destination sidecar forwards to the application using its inbound configuration. A working outside path may use a different Service `targetPort` or backend. Compare those targets and the application bind address; a Kubernetes `containerPort` declaration does not itself create a port mapping.

Use:

```bash
istioctl x describe pod orders-POD.orders
istioctl proxy-config listeners pod/orders-POD.orders
```

Port-level PeerAuthentication uses the workload port, while DestinationRule port settings at the source use the Service port. Mixing these values is a common one-port failure.

## Step 7: Attribute the Timeout Layer

Record the failure duration and compare it with configured timers:

- application connect and total deadline;
- Envoy cluster connect timeout;
- route request and per-try timeout;
- retry attempts and backoff;
- stream idle and maximum duration;
- external load-balancer idle timeout; and
- server request or graceful-shutdown deadline.

If the failure always occurs at the same duration, inspect the matching timer in the effective Envoy route, cluster, or listener's HTTP connection manager or TCP proxy filter. Retries can make a five-second per-try failure appear as a longer application timeout and can multiply load.

Do not set every timeout to zero or a large value. A connect timeout protects capacity during unreachable endpoints, and an idle timeout reclaims abandoned streams. Tune only the timer shown to terminate a valid operation, and preserve bounded application deadlines.

## Compare the Paths at the First Divergence

Summarize the working and failing paths as concrete hops:

```text
outside: public DNS -> LB -> ingress Envoy -> endpoint A:8080 -> dest Envoy -> app
inside:  Service DNS -> source Envoy -> endpoint B:8080 -> dest Envoy -> app
```

Then test one variable at a time. If forcing endpoint A fixes the inside path, investigate endpoint B or its node. If both endpoints work through ingress but neither through source Envoy, compare source cluster transport and NetworkPolicy. If a mesh client using the external hostname works but Service FQDN does not, compare listeners, authority matches, and DNS.

Avoid calling the backend directly from the source application as the permanent fix. That may bypass mTLS, routing, telemetry, and authorization—the very differences the investigation needs to retain.

## Verify Recovery at Every Stage

After the narrow correction, confirm:

1. application DNS returns the intended address;
2. the source listener and route select the expected cluster;
3. the cluster has the intended protocol and mTLS transport;
4. all ready endpoints are usable, not only one;
5. destination policy accepts the intended identity;
6. the destination proxy reaches the application socket; and
7. the request completes below its normal deadline without unexpected retries.

Test during a backend rollout and from multiple source nodes. Monitor response flags, upstream endpoint, retry count, mTLS failures, and latency percentiles. One successful request after a long timeout can be a retry landing on a healthy endpoint, not a fixed path.

## Conclusion

Outside success and inside timeout compare different networks and policy stacks. Start with the exact inside request and its source Envoy log, then walk listener, route, cluster, endpoint, network, destination proxy, and application in order. The first stage whose observed state diverges from the intended path identifies the responsible configuration or infrastructure layer; timeout inflation only conceals it.

## Official Documentation

- [Istio: Debugging Envoy and Istiod](https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/)
- [Istio: Understanding Traffic Routing](https://istio.io/latest/docs/ops/configuration/traffic-management/traffic-routing/)
- [Istio: Protocol Selection](https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/)
- [Istio: Understanding TLS Configuration](https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/)
- [Istio: Configuration Scoping](https://istio.io/latest/docs/ops/configuration/mesh/configuration-scoping/)
- [Envoy: Substitution Formatter and Response Flags](https://www.envoyproxy.io/docs/envoy/latest/configuration/advanced/substitution_formatter.html)
- [Envoy: How to Configure Timeouts](https://www.envoyproxy.io/docs/envoy/latest/faq/configuration/timeouts.html)
- [Kubernetes: EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
