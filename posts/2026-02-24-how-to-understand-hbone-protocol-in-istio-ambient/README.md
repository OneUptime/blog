# How to Understand HBONE Protocol in Istio Ambient

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mesh, HBONE, Protocol, Networking

Description: Understand the HBONE tunneling protocol used in Istio ambient mode, how it replaces sidecar proxies, and what it means for your network architecture.

---

Istio's ambient mode introduces a fundamentally different approach to mesh networking. Instead of injecting sidecar proxies into every pod, ambient mode uses a node-level proxy called ztunnel and optional waypoint proxies. At the heart of this architecture is a tunneling protocol called HBONE (HTTP-Based Overlay Network Encapsulation). Understanding HBONE is key to understanding how ambient mode works under the hood.

## What is HBONE

HBONE stands for HTTP-Based Overlay Network Encapsulation. It is a tunneling protocol that encapsulates mesh traffic inside HTTP/2 CONNECT requests. Think of it as creating a tunnel through an HTTP/2 connection, where the tunnel carries the actual service-to-service traffic.

The basic idea is straightforward: instead of having each pod run its own proxy (sidecar model), the ztunnel proxy on each node creates HBONE tunnels to ztunnel proxies on other nodes. Service traffic flows through these tunnels, getting encrypted and authenticated along the way.

Here is what a request looks like at the network level in ambient mode:

```text
App Pod (Node A)
    |
    v  [plaintext, captured by ztunnel]
ztunnel (Node A)
    |
    v  [HBONE tunnel: mTLS + HTTP/2 CONNECT]
ztunnel (Node B)
    |
    v  [plaintext, delivered to destination pod]
App Pod (Node B)
```

The application sends a normal request. The ztunnel on the source node intercepts it, wraps it in an HBONE tunnel to the destination node's ztunnel, and the destination ztunnel delivers it to the target pod.

## How HBONE Works Technically

An HBONE tunnel uses HTTP/2 CONNECT as the tunneling mechanism. When ztunnel on Node A wants to send traffic to a pod on Node B, it:

1. Establishes (or reuses) an mTLS connection to the ztunnel on Node B
2. Sends an HTTP/2 CONNECT request with the destination pod's address
3. The remote ztunnel accepts the CONNECT and creates a tunnel
4. The original TCP stream flows through the tunnel
5. The remote ztunnel delivers the traffic to the destination pod

The HTTP/2 CONNECT method is defined in RFC 7540 and is commonly used for proxying. What makes HBONE special is the combination of:

- **mTLS authentication**: Both ztunnels present Istio-issued certificates
- **SPIFFE identity**: The certificates carry SPIFFE identities for the source and destination workloads
- **Multiplexing**: Multiple tunnels share the same mTLS connection via HTTP/2 streams
- **Port 15008**: HBONE uses port 15008 as the default tunnel port

## Why HTTP/2 CONNECT Instead of Raw TLS

You might wonder why Istio chose HTTP/2 CONNECT instead of just using raw mTLS connections. There are several technical reasons:

**Multiplexing**: HTTP/2 supports multiplexing multiple streams over a single TCP connection. This means ztunnel can carry traffic for many pods over one connection to the remote ztunnel, reducing connection overhead.

**Metadata passing**: HTTP/2 headers can carry additional metadata like the destination address, SPIFFE identity, and other routing information. This is harder to do with raw TLS.

**Protocol detection**: The HBONE protocol makes it easier for intermediate infrastructure (firewalls, load balancers) to identify and handle mesh traffic without deep packet inspection.

**Connection management**: HTTP/2 has built-in flow control and connection management that works well for multiplexed tunnels.

## HBONE and Waypoint Proxies

When L7 processing is needed (HTTP routing, header-based authorization, retries), traffic flows through a waypoint proxy. The HBONE protocol is used for the entire path:

```text
App Pod (Node A)
    |
    v
ztunnel (Node A) --[HBONE]--> Waypoint Proxy --[HBONE]--> ztunnel (Node B)
    |
    v
App Pod (Node B)
```

The waypoint proxy is a full Envoy proxy that can inspect HTTP traffic, apply L7 policies, and make routing decisions. Traffic arrives at the waypoint via HBONE, gets processed, and is forwarded via another HBONE tunnel to the destination.

## Seeing HBONE in Action

To observe HBONE traffic in your cluster, you can look at ztunnel logs. First, make sure a namespace is enrolled in ambient mode:

```bash
kubectl label namespace default istio.io/dataplane-mode=ambient
```

Deploy some test workloads:

```bash
kubectl apply -f samples/sleep/sleep.yaml
kubectl apply -f samples/helloworld/helloworld.yaml
```

Send a request:

```bash
kubectl exec deploy/sleep -- curl -s http://helloworld:5000/hello
```

Check the ztunnel logs on the source node:

```bash
kubectl logs -n istio-system -l app=ztunnel --tail=20
```

You will see log entries showing the HBONE tunnel being established:

```text
outbound tunnel request: src=10.244.1.5, dst=10.244.2.3:5000, via=10.244.2.1:15008
```

The `via` field shows the ztunnel address and port 15008, which is the HBONE tunnel endpoint.

## HBONE Port 15008

Port 15008 is the default HBONE tunnel port. This is the port that ztunnel listens on for incoming tunnel connections. You need to make sure this port is open in any network policies or firewall rules between your nodes:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-hbone
  namespace: istio-system
spec:
  podSelector:
    matchLabels:
      app: ztunnel
  ingress:
  - ports:
    - port: 15008
      protocol: TCP
```

If port 15008 is blocked between nodes, ambient mode traffic will fail.

## HBONE vs Sidecar Model

Here is a comparison of the two approaches:

| Aspect | Sidecar Model | HBONE (Ambient) |
|--------|---------------|-----------------|
| Proxy location | Per-pod sidecar | Per-node ztunnel |
| Connection model | Direct mTLS between sidecars | HBONE tunnel between ztunnels |
| Resource overhead | Per-pod CPU/memory | Shared per-node |
| L7 processing | Always available | Only with waypoint proxy |
| Traffic interception | iptables redirect to sidecar | ztunnel captures on node |
| Protocol | Raw mTLS | mTLS + HTTP/2 CONNECT |

## How HBONE Handles Different Protocols

HBONE is protocol-agnostic at the tunnel level. Since it encapsulates raw TCP streams:

- **HTTP/1.1 traffic**: Encapsulated as-is in the HBONE tunnel
- **HTTP/2 traffic**: The inner HTTP/2 is independent of the outer HTTP/2 CONNECT
- **gRPC**: Works through the tunnel since gRPC runs over HTTP/2
- **TCP (databases, etc.)**: Works because HBONE tunnels raw TCP
- **UDP**: Not supported through HBONE (TCP-based tunneling only)

## Security Properties of HBONE

HBONE provides the same security guarantees as the sidecar model:

- **Encryption**: All traffic through HBONE tunnels is encrypted with mTLS
- **Authentication**: Both endpoints present SPIFFE identity certificates
- **Authorization**: L4 authorization (source/destination identity) is enforced by ztunnel. L7 authorization requires a waypoint proxy.
- **Certificate rotation**: ztunnel handles certificate rotation just like sidecars do

## Troubleshooting HBONE

If ambient mode traffic is not working, check these things:

**Verify ztunnel is running on all nodes:**

```bash
kubectl get pods -n istio-system -l app=ztunnel -o wide
```

Each node should have one ztunnel pod.

**Check ztunnel health:**

```bash
kubectl logs -n istio-system -l app=ztunnel | grep "error\|warn" | tail -20
```

**Verify port 15008 connectivity between nodes:**

```bash
kubectl exec -n istio-system $(kubectl get pod -n istio-system -l app=ztunnel --field-selector spec.nodeName=node1 -o name | head -1) -- curl -s http://NODE2_IP:15008
```

**Check if the namespace is labeled correctly:**

```bash
kubectl get namespace default --show-labels | grep istio.io/dataplane-mode
```

HBONE is the networking foundation of Istio ambient mode. Understanding how it works helps you troubleshoot issues, plan network policies, and make informed decisions about adopting ambient mode in your infrastructure.
