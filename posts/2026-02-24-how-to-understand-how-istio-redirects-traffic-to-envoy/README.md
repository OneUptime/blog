# How to Understand How Istio Redirects Traffic to Envoy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, Traffic Redirection, Kubernetes, Service Mesh

Description: Learn the mechanics of how Istio transparently redirects application traffic through Envoy sidecar proxies using iptables, CNI, and other methods.

---

One of the most powerful things about Istio is that your application doesn't need to know it exists. Your code makes a regular HTTP call to another service, and Istio intercepts that call, routes it through the Envoy sidecar, applies policies, collects telemetry, and forwards it - all without your app being aware. But how does this actually work?

The traffic redirection mechanism is the core plumbing that makes the entire service mesh possible. When you understand it, you understand why certain things break and how to fix them.

## The High-Level Flow

Here's what happens when your application makes an outbound request:

1. Your app opens a TCP connection to, say, `reviews:9080`
2. The kernel resolves this and tries to send the packet to the destination
3. iptables rules (or another interception method) catch the packet in the OUTPUT chain
4. The packet gets redirected to Envoy's outbound listener on port 15001
5. Envoy looks up the destination in its configuration, applies routing rules, and forwards it
6. On the receiving end, the same thing happens in reverse through port 15006

The beauty is that your application's socket still thinks it's connected to `reviews:9080`. The redirection happens at the kernel level, below the application layer.

## Traffic Interception Methods

Istio supports multiple methods for intercepting traffic. Each has trade-offs.

### Method 1: iptables with REDIRECT

This is the default method. The `istio-init` container sets up iptables REDIRECT rules. REDIRECT is a NAT target that changes the destination address to the local machine and the destination port to the specified port.

```bash
# This is what the REDIRECT rule effectively does
iptables -t nat -A ISTIO_REDIRECT -p tcp -j REDIRECT --to-ports 15001
```

When a REDIRECT happens, the original destination address is stored by the kernel. Envoy can retrieve it using the `SO_ORIGINAL_DST` socket option:

```bash
# Envoy uses getsockopt with SO_ORIGINAL_DST to find where the traffic was going
getsockopt(fd, SOL_IP, SO_ORIGINAL_DST, &addr, &len)
```

This is how Envoy knows where the traffic was actually headed, even though the packet arrived at Envoy's listener port.

### Method 2: iptables with TPROXY

TPROXY (transparent proxy) is an alternative iptables target that preserves the original destination address in the packet itself, rather than modifying it. This has some advantages:

```bash
iptables -t mangle -A ISTIO_INBOUND -p tcp -j TPROXY \
  --on-port 15006 --on-ip 0.0.0.0 --tproxy-mark 1337/0xffffffff
```

With TPROXY, Envoy can read the original destination directly from the packet headers. This is particularly useful for preserving the source IP address of incoming connections. You enable TPROXY mode with the `interceptionMode` field:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
spec:
  ingress:
    - port:
        number: 9080
        protocol: HTTP
      defaultEndpoint: 127.0.0.1:9080
      captureMode: TPROXY
```

### Method 3: Istio CNI Plugin

The CNI (Container Network Interface) plugin approach moves the iptables setup from an init container to a node-level CNI plugin. This is the recommended approach for production because it removes the need for `NET_ADMIN` and `NET_RAW` capabilities on the init container.

Install Istio with CNI enabled:

```bash
istioctl install --set components.cni.enabled=true
```

The CNI plugin runs as a DaemonSet and configures iptables rules when pods are created, before any containers start. The end result is the same iptables rules, but the security posture is better.

### Method 4: Ambient Mesh (ztunnel)

The newer ambient mesh mode takes a completely different approach. Instead of sidecar proxies and iptables in each pod, a node-level proxy called ztunnel handles Layer 4 traffic. For Layer 7 features, traffic gets routed through waypoint proxies.

In ambient mode, traffic interception uses eBPF or routing rules at the node level:

```bash
istioctl install --set profile=ambient
```

Pods in ambient mode don't get sidecars at all. The ztunnel uses Linux networking features like transparent proxying and routing rules to intercept traffic.

## Understanding the Envoy Listeners

Once traffic reaches Envoy, it hits one of two virtual listeners:

**VirtualOutbound (port 15001)** handles outgoing traffic. You can inspect it with:

```bash
istioctl proxy-config listener my-app-pod --port 15001 -o json
```

This listener uses the `useOriginalDst: true` setting, which tells Envoy to look at the original destination and find a matching listener or route for it. If no specific listener matches, traffic goes to the PassthroughCluster (which forwards it directly) or gets blocked (depending on your mesh outbound traffic policy).

**VirtualInbound (port 15006)** handles incoming traffic:

```bash
istioctl proxy-config listener my-app-pod --port 15006 -o json
```

This listener has filter chains that match on the destination port to determine how to handle the traffic. For example, traffic to port 9080 gets its own filter chain with the appropriate HTTP filters.

## Tracing the Full Path of a Request

Let's trace an outbound HTTP request step by step. Say your `productpage` pod calls `http://reviews:9080/reviews/1`:

```bash
# Step 1: Your app sends a SYN packet to reviews:9080
# The kernel processes this in the OUTPUT chain

# Step 2: iptables redirects to 127.0.0.1:15001
# You can see the NAT translation with conntrack
kubectl exec productpage-pod -c istio-proxy -- \
  conntrack -L -p tcp --dport 9080

# Step 3: Envoy receives the connection on the virtualOutbound listener
# Check the listener configuration
istioctl proxy-config listener productpage-pod --port 15001

# Step 4: Envoy looks up the original destination and finds a matching route
istioctl proxy-config route productpage-pod -o json | grep -A5 "reviews"

# Step 5: Envoy selects an endpoint from the cluster
istioctl proxy-config endpoint productpage-pod --cluster "outbound|9080||reviews.default.svc.cluster.local"

# Step 6: Envoy connects to the selected endpoint
# If mTLS is enabled, Envoy establishes a TLS connection to the remote Envoy
```

## Common Problems and Solutions

**Traffic not being intercepted:**

Check if the pod has the sidecar injected and the init container ran:

```bash
kubectl get pod my-pod -o jsonpath='{.spec.containers[*].name}'
kubectl logs my-pod -c istio-init
```

**Redirect loops:**

This usually means UID 1337 isn't being properly excluded. Check that Envoy is running as the correct user:

```bash
kubectl exec my-pod -c istio-proxy -- id
```

**External services timing out:**

By default, Istio may try to route traffic to external services through its mesh configuration. Check the outbound traffic policy:

```bash
kubectl get configmap istio -n istio-system -o yaml | grep outboundTrafficPolicy
```

Set it to `ALLOW_ANY` if you want traffic to external services to pass through:

```yaml
meshConfig:
  outboundTrafficPolicy:
    mode: ALLOW_ANY
```

## Performance Considerations

The iptables REDIRECT method adds a small amount of latency because of the extra network stack processing. In benchmarks, this overhead is typically under 1 millisecond per hop. For most applications, this is negligible.

If you're running a high-throughput system and concerned about overhead, consider the ambient mesh approach or using the CNI plugin with TPROXY mode, which reduces some of the NAT overhead.

The key takeaway is that Istio's traffic redirection is transparent but not magical. It relies on well-understood Linux networking primitives, and knowing how they work gives you the tools to debug and optimize your mesh.
