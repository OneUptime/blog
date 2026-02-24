# How to Configure Istio for UDP Traffic Considerations

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, UDP, Kubernetes, Service Mesh, Networking, Envoy

Description: Understanding Istio's limitations with UDP traffic and practical workarounds for running UDP-based services alongside your Istio service mesh deployment.

---

If you are running services that use UDP (DNS, SNMP, game servers, VoIP, or custom protocols), you need to understand a fundamental limitation of Istio: it does not proxy UDP traffic. Envoy, the proxy that powers Istio, is a TCP and HTTP proxy. It has no support for UDP at the proxy layer. This does not mean you cannot run UDP services in an Istio-enabled cluster, but it does mean you need to plan around this limitation.

## Why Istio Does Not Support UDP

Envoy was designed from the ground up as an L4/L7 proxy for TCP-based protocols. UDP is fundamentally different from TCP in several ways that make it difficult to proxy in the same manner:

- UDP is connectionless. There is no handshake, no connection state, and no guarantee of delivery.
- UDP packets can arrive out of order, be duplicated, or be lost entirely.
- Many UDP protocols are latency-sensitive (gaming, voice, video), and adding a proxy hop would introduce unacceptable delay.
- There is no clean way to do protocol-level load balancing for arbitrary UDP traffic.

Because of these characteristics, Envoy and by extension Istio simply pass UDP traffic through without interception.

## How Istio Sidecar Injection Affects UDP

When Istio injects a sidecar into your pod, it sets up iptables rules to redirect traffic through the Envoy proxy. These iptables rules only capture TCP traffic. UDP packets are not redirected and flow directly between your application and the network, bypassing the sidecar entirely.

This means that for UDP traffic:

- No mTLS encryption
- No telemetry or metrics collection
- No traffic management (routing, retries, circuit breaking)
- No authorization policies
- No tracing

Your UDP traffic goes out as if the sidecar were not there.

## Running UDP Services in an Istio Cluster

You can absolutely run UDP services in a cluster with Istio. Here is a typical deployment for a DNS server:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dns-server
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: dns-server
  template:
    metadata:
      labels:
        app: dns-server
    spec:
      containers:
        - name: dns
          image: coredns/coredns:1.11.1
          ports:
            - containerPort: 53
              protocol: UDP
            - containerPort: 53
              protocol: TCP
---
apiVersion: v1
kind: Service
metadata:
  name: dns-server
  namespace: default
spec:
  selector:
    app: dns-server
  ports:
    - name: udp-dns
      port: 53
      targetPort: 53
      protocol: UDP
    - name: tcp-dns
      port: 53
      targetPort: 53
      protocol: TCP
```

The UDP port works fine even with the sidecar injected. Traffic just bypasses Envoy. The TCP port (DNS over TCP) will go through the sidecar and benefit from all of Istio's features.

## Excluding UDP Pods from Sidecar Injection

If you want to be explicit about not running a sidecar on your UDP-only services, you can opt them out of injection:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: game-server
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: game-server
  template:
    metadata:
      labels:
        app: game-server
      annotations:
        sidecar.istio.io/inject: "false"
    spec:
      containers:
        - name: game
          image: my-game-server:v1
          ports:
            - containerPort: 7777
              protocol: UDP
```

The `sidecar.istio.io/inject: "false"` annotation prevents Istio from injecting the sidecar. This avoids the overhead of running an Envoy proxy that is not doing anything useful for your UDP traffic.

## Mixed TCP and UDP Services

Things get more interesting when you have a service that uses both TCP and UDP. A common example is DNS, which typically listens on both protocols on port 53. Another example is a game server that uses UDP for game data and TCP for authentication or chat.

In this case, you probably want the sidecar injected so that TCP traffic gets the benefits of the mesh. The UDP traffic will simply bypass the sidecar:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: game-server
  namespace: default
spec:
  selector:
    app: game-server
  ports:
    - name: tcp-auth
      port: 8080
      targetPort: 8080
      protocol: TCP
    - name: udp-game
      port: 7777
      targetPort: 7777
      protocol: UDP
```

Istio will manage and secure the TCP port while the UDP port operates outside the mesh.

## Securing UDP Traffic Without Istio

Since Istio cannot secure UDP traffic, you need alternative approaches:

### Network Policies

Use Kubernetes NetworkPolicy to restrict which pods can send UDP traffic to your service:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: dns-server-policy
  namespace: default
spec:
  podSelector:
    matchLabels:
      app: dns-server
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: default
      ports:
        - protocol: UDP
          port: 53
```

This restricts UDP access to the DNS server to pods in the default namespace.

### Application-Level Encryption

For UDP protocols that need encryption, implement it at the application level. DTLS (Datagram Transport Layer Security) is the UDP equivalent of TLS:

- WebRTC uses DTLS for secure communication
- Some VPN protocols use DTLS
- QUIC (used by HTTP/3) has built-in encryption

If your application supports DTLS or another encryption mechanism, use it. You cannot rely on Istio's mTLS for UDP.

### WireGuard or Calico Encryption

Some CNI plugins offer network-level encryption that covers both TCP and UDP:

```bash
# If using Calico, enable WireGuard encryption
kubectl patch felixconfiguration default --type='merge' \
  -p '{"spec":{"wireguardEnabled":true}}'
```

This encrypts all pod-to-pod traffic at the network level, including UDP, without requiring any application changes.

## Exposing UDP Services Externally

The Istio ingress gateway does not handle UDP traffic. If you need to expose a UDP service externally, use a regular Kubernetes Service of type LoadBalancer:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: game-server-external
  namespace: default
spec:
  type: LoadBalancer
  selector:
    app: game-server
  ports:
    - name: udp-game
      port: 7777
      targetPort: 7777
      protocol: UDP
```

This creates a cloud load balancer that forwards UDP traffic directly to your pods, completely bypassing the Istio ingress gateway.

## Monitoring UDP Services

Since Istio does not collect metrics for UDP traffic, you need to handle observability yourself:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: game-server
  namespace: default
spec:
  template:
    spec:
      containers:
        - name: game
          image: my-game-server:v1
          ports:
            - containerPort: 7777
              protocol: UDP
            - name: metrics
              containerPort: 9090
              protocol: TCP
```

Expose a TCP metrics endpoint from your application and scrape it with Prometheus. This way you get observability for your UDP service even though Istio cannot provide it.

Add a PodMonitor or ServiceMonitor to scrape the metrics:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: game-server-monitor
  namespace: default
spec:
  selector:
    matchLabels:
      app: game-server
  podMetricsEndpoints:
    - port: metrics
      interval: 15s
```

## Future Possibilities

There has been discussion in the Envoy and Istio communities about adding UDP support, particularly for QUIC/HTTP3. Envoy does have experimental QUIC support, and Istio may eventually leverage this for HTTP/3 traffic at the gateway level. However, general-purpose UDP proxying is not on the near-term roadmap.

## Summary

Istio does not proxy UDP traffic, and this is unlikely to change for general-purpose UDP in the near future. UDP packets bypass the Envoy sidecar entirely, which means no mTLS, no metrics, no routing, and no authorization from Istio. For UDP services, use Kubernetes NetworkPolicy for access control, application-level encryption for security, dedicated LoadBalancer Services for external exposure, and custom metrics endpoints for observability. If your service uses both TCP and UDP, keep the sidecar for TCP benefits and accept that UDP operates outside the mesh.
