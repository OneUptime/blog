# How to Understand Inbound and Outbound Traffic Flow in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Traffic Flows, Envoy, Kubernetes, Networking

Description: A detailed walkthrough of how inbound and outbound traffic flows through Istio's Envoy sidecar proxies in a Kubernetes service mesh.

---

When two services communicate in an Istio mesh, the traffic passes through four Envoy proxy instances - the sender's outbound proxy, the network, and the receiver's inbound proxy. Each step applies different policies, routing rules, and telemetry collection. Understanding this flow from end to end is the key to debugging connectivity problems and getting the most out of your mesh.

## The Two Envoy Listeners

Every Envoy sidecar in Istio has two main virtual listeners:

- **Port 15001 (virtualOutbound)** - Catches all outgoing traffic from the application container
- **Port 15006 (virtualInbound)** - Catches all incoming traffic to the application container

You can inspect these listeners with:

```bash
istioctl proxy-config listener my-pod --port 15001
istioctl proxy-config listener my-pod --port 15006
```

These aren't the only listeners - Envoy creates additional listeners for each port that the pod's service exposes. But these two are the entry points for all intercepted traffic.

## Outbound Traffic Flow

Let's trace what happens when `service-a` makes an HTTP request to `service-b:8080`.

### Step 1: Application Sends Request

Your application opens a connection to `service-b.default.svc.cluster.local:8080`. The DNS resolves to the ClusterIP, say `10.96.15.42`. The application creates a TCP socket and connects.

### Step 2: iptables Redirects to Envoy

The kernel's OUTPUT chain catches the packet and the `ISTIO_OUTPUT` chain redirects it to `127.0.0.1:15001` (the virtualOutbound listener). The original destination (`10.96.15.42:8080`) is preserved in the connection tracking table.

### Step 3: VirtualOutbound Listener

Envoy's virtualOutbound listener has `useOriginalDst: true`, which means it recovers the original destination address and looks for a matching listener. Since there's a listener configured for `0.0.0.0:8080` (matching the service port), Envoy hands the connection to that listener.

```bash
# See the listener that handles port 8080
istioctl proxy-config listener service-a-pod --port 8080
```

### Step 4: Route Selection

The port 8080 listener has an HTTP connection manager with routes. Envoy matches the request's Host header (`service-b.default.svc.cluster.local`) against the route configuration:

```bash
istioctl proxy-config route service-a-pod --name 8080 -o json
```

The route points to a cluster, like `outbound|8080||service-b.default.svc.cluster.local`.

### Step 5: Endpoint Selection

Envoy looks up the endpoints for the cluster. These are the actual pod IPs behind the service. The load balancing algorithm (round robin by default) picks one:

```bash
istioctl proxy-config endpoint service-a-pod \
  --cluster "outbound|8080||service-b.default.svc.cluster.local"
```

Say it picks `10.244.1.15:8080`.

### Step 6: mTLS Connection

If mTLS is enabled (it is by default in STRICT mode), Envoy establishes a TLS connection to the destination Envoy. The client Envoy sends its SPIFFE identity certificate, and the server Envoy validates it. This all happens transparently.

### Step 7: Request Forwarded

Envoy forwards the HTTP request to `10.244.1.15:8080` (the pod IP of service-b). From Envoy's perspective, it's connecting to the remote pod. The actual connection lands on port 15006 of the remote pod (due to iptables on the receiving side).

## Inbound Traffic Flow

Now let's follow that same request arriving at `service-b`.

### Step 1: iptables Redirects Inbound Traffic

On the receiving pod, the PREROUTING chain catches the incoming packet and the `ISTIO_INBOUND` chain redirects it to port 15006 (the virtualInbound listener).

### Step 2: VirtualInbound Listener

The virtualInbound listener on port 15006 has multiple filter chains. It matches the incoming connection against these chains based on:

- Destination port
- Transport protocol (TLS or plaintext)
- Application protocol (detected via ALPN)

```bash
istioctl proxy-config listener service-b-pod --port 15006 -o json
```

### Step 3: mTLS Termination

If the incoming connection is mTLS (which it will be from another mesh service), Envoy terminates the TLS connection. It validates the client's certificate and extracts the SPIFFE identity. This identity is used for authorization policies.

### Step 4: Authorization Policy Check

Before forwarding the request, Envoy checks any `AuthorizationPolicy` rules that apply to this workload:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: service-b-policy
spec:
  selector:
    matchLabels:
      app: service-b
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/default/sa/service-a"]
      to:
        - operation:
            methods: ["GET"]
            paths: ["/api/*"]
```

If the request passes the authorization check, it proceeds. Otherwise, Envoy returns a 403 Forbidden response.

### Step 5: Forward to Application

Finally, Envoy forwards the request to the application container on `127.0.0.1:8080`. The application receives a plain HTTP request and has no idea it went through an Envoy proxy with mTLS, authorization checks, and telemetry collection.

## Seeing the Full Picture

You can visualize the complete traffic flow using Envoy's access logs. Enable them in the mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON
```

Then check the logs on both sides:

```bash
# Outbound log on service-a
kubectl logs service-a-pod -c istio-proxy | grep "service-b"

# Inbound log on service-b
kubectl logs service-b-pod -c istio-proxy | grep "service-a"
```

The access logs show the upstream and downstream addresses, response codes, and timing - which helps you pinpoint exactly where in the flow a problem occurs.

## Traffic Flow for Passthrough

What about traffic to services outside the mesh? When `outboundTrafficPolicy` is set to `ALLOW_ANY`:

1. Your app connects to an external host (e.g., `api.stripe.com:443`)
2. iptables redirects to port 15001
3. VirtualOutbound finds no matching listener for the original destination
4. Traffic falls through to the `PassthroughCluster`
5. Envoy connects directly to the original destination without any mesh features

```bash
# Check the PassthroughCluster config
istioctl proxy-config cluster my-pod --fqdn PassthroughCluster -o json
```

## Traffic Flow for Headless Services

Headless services (ClusterIP: None) work differently because they don't have a virtual IP. DNS resolves directly to pod IPs. Istio handles this by creating EDS (Endpoint Discovery Service) entries for each pod:

```bash
# See endpoints for a headless service
istioctl proxy-config endpoint my-pod \
  --cluster "outbound|8080||my-headless-svc.default.svc.cluster.local"
```

The routing still works through Envoy, but the DNS resolution step returns actual pod IPs instead of a ClusterIP.

## Debugging Connection Issues

When a request fails, figure out where in the flow it breaks:

```bash
# Is the outbound proxy seeing the request?
istioctl proxy-config log service-a-pod --level debug
kubectl logs service-a-pod -c istio-proxy --tail=50

# Is the inbound proxy receiving it?
kubectl logs service-b-pod -c istio-proxy --tail=50

# Check for connection errors
kubectl exec service-a-pod -c istio-proxy -- \
  pilot-agent request GET stats | grep upstream_cx_connect_fail
```

Knowing which direction (inbound vs. outbound) and which step fails narrows down the problem significantly. A 503 on the outbound side usually means endpoint selection failed. A 403 on the inbound side means an authorization policy denied the request. A connection timeout could be a network issue or missing iptables rules.

The full picture of traffic flow through Istio is straightforward once you break it into these discrete steps. Every step is inspectable, loggable, and configurable.
