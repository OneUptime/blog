# How to Handle Source IP Preservation with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Networking, Source IP, TPROXY, Kubernetes

Description: How to preserve the original client source IP address when using Istio service mesh, including TPROXY mode and externalTrafficPolicy configuration.

---

When Istio intercepts traffic, the default REDIRECT mode rewrites the source IP of incoming connections. Your application sees connections coming from 127.0.0.1 (localhost) instead of the actual client IP. For many applications this doesn't matter, but if you need the real client IP for logging, rate limiting, access control, or compliance, you need to take specific steps to preserve it.

## Why Source IP Gets Lost

Istio uses iptables REDIRECT rules to send traffic to the Envoy proxy. The REDIRECT target in iptables changes the destination address of the packet to localhost and the connection's source address is also rewritten. When Envoy forwards the connection to your application on localhost, the application sees the source as 127.0.0.1 or ::1.

Here's the problem illustrated:

```text
Client (10.0.1.5) -> Pod IP:8080 -> iptables REDIRECT -> Envoy:15006 -> App:8080
                                                          (source becomes 127.0.0.1)
```

Your app sees source IP as 127.0.0.1 instead of 10.0.1.5.

## Using HTTP Headers for Source IP

For HTTP traffic, the easiest solution is to use the `X-Forwarded-For` or `X-Real-IP` headers. Envoy automatically adds these headers to HTTP requests.

The `X-Forwarded-For` header contains the chain of IPs the request passed through:

```text
X-Forwarded-For: 10.0.1.5, 10.244.0.3
```

The `X-Envoy-Peer-Metadata` header also carries source workload information.

To configure your application to trust these headers, you need to know how many proxies sit between the client and your app. In a typical setup with an ingress gateway and a sidecar, there are two hops.

You can configure the number of trusted hops in the mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      gatewayTopology:
        numTrustedProxies: 2
```

This tells Envoy how many proxy hops to trust when reading X-Forwarded-For headers.

## Preserving Source IP at the Gateway

For traffic entering the mesh through the Istio ingress gateway, you need to configure the Kubernetes Service to preserve the source IP. By default, a LoadBalancer service uses `externalTrafficPolicy: Cluster`, which causes SNAT (Source NAT) and rewrites the client IP to the node IP.

Change it to `Local`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: istio-ingressgateway
  namespace: istio-system
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local
  ports:
  - name: http2
    port: 80
    targetPort: 8080
  - name: https
    port: 443
    targetPort: 8443
  selector:
    app: istio-ingressgateway
```

With `externalTrafficPolicy: Local`, the LoadBalancer sends traffic only to nodes that have the gateway pod running, and the node preserves the original source IP.

The downside is that traffic distribution may become uneven since only nodes with gateway pods receive traffic. You might need to run the gateway as a DaemonSet or ensure your load balancer handles this correctly.

## Using TPROXY Mode

For TCP traffic where HTTP headers aren't available, or when you need the source IP at the kernel level (not just in headers), Istio supports TPROXY (transparent proxy) mode.

TPROXY preserves the original source IP because it doesn't rewrite the packet headers. Instead, it uses a special socket option that lets Envoy bind to the original destination address.

Enable TPROXY mode for a specific pod:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/interceptionMode: TPROXY
    spec:
      containers:
      - name: my-app
        image: my-app:latest
```

Or set it globally in the mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      interceptionMode: TPROXY
```

With TPROXY, the traffic flow looks like:

```text
Client (10.0.1.5) -> Pod IP:8080 -> iptables TPROXY -> Envoy:15006 -> App:8080
                                                         (source stays 10.0.1.5)
```

Your application sees the real source IP without any header parsing.

## TPROXY Requirements

TPROXY has stricter requirements than the default REDIRECT mode:

- The kernel must have TPROXY support (`xt_TPROXY` module)
- The pod needs to run with `NET_ADMIN` capability for the proxy container (not just the init container)
- IP routing rules need to be set up correctly

The init container will configure additional iptables rules and routing policy for TPROXY:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- iptables -t mangle -L -v -n
```

You'll see rules in the mangle table (not just NAT) when TPROXY is active:

```text
Chain PREROUTING (policy ACCEPT)
target     prot opt source               destination
ISTIO_INBOUND  tcp  --  0.0.0.0/0            0.0.0.0/0

Chain ISTIO_INBOUND (1 references)
target     prot opt source               destination
TPROXY     tcp  --  0.0.0.0/0            0.0.0.0/0            TPROXY redirect 0.0.0.0:15006 mark 0x1/0x1
```

## Proxy Protocol

Another approach is to use the PROXY protocol at the load balancer level. The PROXY protocol is a simple text or binary header that the load balancer prepends to each connection, containing the original client IP and port.

If your cloud provider's load balancer supports PROXY protocol, you can configure the Istio gateway to accept it:

```yaml
apiVersion: networking.istio.io/v1
kind: EnvoyFilter
metadata:
  name: proxy-protocol
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      app: istio-ingressgateway
  configPatches:
  - applyTo: LISTENER
    match:
      context: GATEWAY
    patch:
      operation: MERGE
      value:
        listenerFilters:
        - name: envoy.filters.listener.proxy_protocol
          typedConfig:
            "@type": type.googleapis.com/envoy.extensions.filters.listener.proxy_protocol.v3.ProxyProtocol
```

This tells Envoy to parse the PROXY protocol header and extract the client IP from it.

## Verifying Source IP Preservation

Deploy a simple test application that echoes the source IP:

```bash
kubectl run echoserver --image=registry.k8s.io/echoserver:1.10
kubectl expose pod echoserver --port=8080
```

Then send a request through the mesh and check the response. The echoserver will show request headers including X-Forwarded-For.

For TPROXY mode, check the source IP directly:

```bash
kubectl exec -it echoserver -- ss -tnp
```

You should see connections from the actual client IPs rather than 127.0.0.1.

## Choosing the Right Approach

For HTTP workloads, using X-Forwarded-For headers is the simplest and most widely compatible option. Most web frameworks have built-in support for reading the client IP from these headers.

For TCP workloads or when you need kernel-level source IP visibility, TPROXY mode is the way to go. It requires more setup and has stricter kernel requirements, but it preserves the source IP for all protocols.

For ingress traffic, combine `externalTrafficPolicy: Local` on the gateway service with proper X-Forwarded-For handling or PROXY protocol. This covers the entire path from the client to your application.

Pick the approach that matches your requirements. If you just need the client IP for logging, headers are fine. If you need it for network-level access control or non-HTTP protocols, TPROXY is your best bet.
