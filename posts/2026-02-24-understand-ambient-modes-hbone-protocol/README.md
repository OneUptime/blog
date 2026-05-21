# How to Understand Ambient Mode's HBONE Protocol

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mode, HBONE, Protocol, Networking

Description: A technical explanation of the HBONE protocol used by Istio ambient mode for mTLS tunneling between ztunnel instances across nodes.

---

HBONE stands for HTTP-Based Overlay Network Environment. It is the tunneling protocol that Istio ambient mode uses to carry encrypted traffic between ztunnel instances. When a pod on one node talks to a pod on another node, ztunnel wraps the original TCP stream in an HBONE tunnel that provides mTLS encryption, identity authentication, and metadata propagation.

Understanding HBONE helps you debug connectivity issues, configure firewalls correctly, and appreciate why ambient mode works the way it does.

## Why Not Just Use Regular mTLS?

In sidecar mode, the Envoy sidecar terminates and originates mTLS connections directly. Each sidecar has the application pod's identity certificate, and the mTLS handshake happens between sidecars.

In ambient mode, ztunnel sits on the node, not in the pod. It needs to tunnel traffic for many different workload identities through a single connection point. HBONE solves this by using HTTP/2 CONNECT to multiplex multiple identity-authenticated streams over a shared transport connection.

Think of it this way: ztunnel on node A needs to send traffic on behalf of pod X (identity X) to pod Y on node B. HBONE lets ztunnel establish a tunnel that carries the right identity metadata along with the traffic.

## HBONE Protocol Details

### Transport Layer

HBONE uses HTTP/2 CONNECT over mTLS on port 15008. Ztunnel manages workload certificates on behalf of the pods it proxies, and the workload identities are used to establish the encrypted channel.

```text
Source Pod -> Source ztunnel -> [HBONE tunnel over mTLS on port 15008] -> Dest ztunnel -> Dest Pod
```

### The HTTP/2 CONNECT Method

HTTP/2 CONNECT creates a bidirectional byte stream tunnel. In HBONE, the CONNECT request includes metadata about the source and destination workloads:

```text
:method: CONNECT
:authority: 10.0.2.5:8080
```

The `:authority` field identifies the destination workload. Additional metadata like the source identity is carried through the mTLS certificate presented during the TLS handshake.

### Identity Propagation

Each HBONE tunnel carries the SPIFFE identity of the source workload. This is done through the TLS client certificate. When the source ztunnel establishes the HBONE connection, it presents a certificate that identifies the source workload:

```text
Subject: spiffe://cluster.local/ns/bookinfo/sa/productpage
```

The destination ztunnel validates this certificate against the Istio CA trust chain. If validation succeeds, it knows the traffic is authentic and authorized to use that identity.

## Port 15008

HBONE uses port 15008 by default. This is the port that ztunnel and other HBONE-capable proxies expose for incoming HBONE connections.

If you are running Istio ambient mode and have network policies or firewall rules between workloads or nodes, make sure port 15008 is open. For Kubernetes `NetworkPolicy`, add port 15008 to the policies that select ambient workloads receiving traffic:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: my-app-allow-ingress-web
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: my-app
  ingress:
    - ports:
        - port: 8080
          protocol: TCP
        - port: 15008
          protocol: TCP
```

On cloud providers with security groups:

```bash
# AWS example - allow HBONE between nodes

aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxx \
  --protocol tcp \
  --port 15008 \
  --source-group sg-xxxx
```

## Traffic Flow: Step by Step

Here is exactly what happens when pod A (on node 1) sends an HTTP request to pod B (on node 2):

### 1. Application sends traffic
Pod A makes a normal TCP connection to pod B's service IP on port 8080. The application is completely unaware of ztunnel or HBONE.

### 2. Traffic intercepted
The istio-cni plugin has configured iptables/eBPF rules that redirect outbound traffic from ambient pods to the local ztunnel (listening on port 15001).

### 3. Source ztunnel processes
The ztunnel on node 1:
- Identifies pod A as the source workload
- Looks up pod A's SPIFFE identity (from its ServiceAccount)
- Resolves the destination service IP to pod B on node 2
- Checks if a waypoint proxy should be in the path

### 4. HBONE tunnel establishment
Source ztunnel initiates an HTTP/2 CONNECT to the destination ztunnel on node 2, port 15008. The TLS handshake uses the source workload's SPIFFE certificate.

### 5. Destination ztunnel processes
The ztunnel on node 2:
- Receives the HBONE connection
- Validates the source identity from the TLS handshake
- Checks L4 AuthorizationPolicies (destination-side)
- Extracts the destination address from the CONNECT request
- Forwards the decrypted traffic to pod B

### 6. Response follows the reverse path
Pod B's response flows back through the same HBONE tunnel to the source ztunnel and then to pod A.

## Same-Node Traffic

When both pods are on the same node, ztunnel still handles the traffic, but the traffic does not have to cross a node boundary:

```text
Pod A -> local ztunnel -> Pod B
```

The identity-based access control and L4 telemetry work the same way regardless of whether pods are on the same node or different nodes.

## HBONE vs Other Tunneling Protocols

| Protocol | Used By | Layer | Encryption | Identity |
|----------|---------|-------|------------|----------|
| HBONE | Istio Ambient | L4/HTTP/2 | mTLS | SPIFFE |
| WireGuard | Cilium | L3 | Symmetric | Node-level |
| IPsec | Various | L3 | Symmetric/Asymmetric | Node-level |
| Geneve/VXLAN | Overlay networks | L2 | Optional | None |

HBONE is unique in carrying workload-level (not node-level) identity. This means access control decisions can be made based on which specific workload is sending traffic, not just which node it is coming from.

## Debugging HBONE Traffic

### Check workload HBONE configuration

```bash
istioctl ztunnel-config workloads
```

### Look at ztunnel connection metrics

```bash
kubectl exec -n istio-system ztunnel-xxxxx -- curl -s localhost:15020/metrics | grep istio_tcp
```

### Capture HBONE traffic

To see HBONE tunnels on the wire:

```bash
kubectl debug node/node-1 -it --image=nicolaka/netshoot -- \
  tcpdump -i any port 15008 -c 20
```

You will see TLS-encrypted packets on port 15008. The content is not readable (that is the point), but you can verify that HBONE connections are being established.

### Check for HBONE connection failures

```bash
kubectl logs -l app=ztunnel -n istio-system --tail=100 | grep -i "hbone\|tunnel\|connect error"
```

## HBONE and Waypoint Proxies

When a waypoint proxy is in the traffic path, HBONE is used in two segments:

```text
Source Pod -> Source ztunnel -> [HBONE] -> Waypoint Proxy -> [HBONE] -> Dest ztunnel -> Dest Pod
```

The source ztunnel sends traffic to the waypoint via HBONE. The waypoint processes the L7 content (routing, authorization, etc.) and then sends it to the destination ztunnel via another HBONE tunnel. Both segments are mTLS-encrypted with the appropriate workload identities.

## Performance Characteristics

HBONE adds some overhead compared to direct connections:

- TLS handshake for new connections (amortized over connection lifetime)
- HTTP/2 framing overhead (minimal)
- Encryption/decryption CPU cost

In practice, the overhead is similar to regular mTLS. HTTP/2 connection multiplexing helps reduce handshake overhead when there are many connections between the same pair of nodes.

Istio's ambient performance benchmarks show ztunnel providing high encrypted throughput, but the exact overhead depends on workload shape, hardware, TLS libraries, and connection reuse. For most applications, the performance difference is not noticeable.

## Key Takeaways

HBONE is the networking foundation that makes ambient mode possible. It lets ztunnel tunnel traffic with workload-level identity across nodes using a standard HTTP/2 CONNECT mechanism over mTLS. The protocol is efficient, carries per-workload identity (not per-node), and integrates cleanly with Istio's existing certificate infrastructure.

When things go wrong with ambient mode connectivity, checking HBONE tunnel establishment (port 15008 accessibility, ztunnel logs) is usually the right place to start.
