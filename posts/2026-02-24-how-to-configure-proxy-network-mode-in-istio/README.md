# How to Configure Proxy Network Mode in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Network Mode, Traffic Interception, Iptables, Kubernetes

Description: How to configure the Istio sidecar proxy network interception mode including REDIRECT and TPROXY options for different networking requirements.

---

The Istio sidecar proxy intercepts all network traffic flowing in and out of your application containers. How it intercepts that traffic is controlled by the network mode (also called interception mode). Istio supports two modes: REDIRECT and TPROXY. Each has different trade-offs around source IP preservation, kernel requirements, and compatibility with various Kubernetes networking setups.

## How Traffic Interception Works

When a pod with an Istio sidecar starts, the init container (or CNI plugin) sets up iptables rules in the pod's network namespace. These rules redirect traffic so that it passes through the Envoy proxy instead of going directly to or from the application.

The interception happens at the kernel level using netfilter/iptables. There are two strategies:

**REDIRECT mode** uses iptables REDIRECT target, which changes the destination of packets to the local proxy. The original destination IP is preserved in the socket option `SO_ORIGINAL_DST`, which Envoy uses to determine where to forward the traffic.

**TPROXY mode** uses iptables TPROXY target, which transparently proxies traffic without modifying packet headers. The proxy binds to the original destination address, preserving both source and destination IPs.

## REDIRECT Mode (Default)

REDIRECT is the default and most widely compatible mode:

```yaml
metadata:
  annotations:
    sidecar.istio.io/interceptionMode: REDIRECT
```

Or set it mesh-wide:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      interceptionMode: REDIRECT
```

What REDIRECT does under the hood:

```bash
# Simplified iptables rules (set up by istio-init)
iptables -t nat -A PREROUTING -p tcp -j ISTIO_INBOUND
iptables -t nat -A ISTIO_INBOUND -p tcp --dport 8080 -j REDIRECT --to-port 15006
iptables -t nat -A OUTPUT -p tcp -j ISTIO_OUTPUT
iptables -t nat -A ISTIO_OUTPUT -p tcp -j REDIRECT --to-port 15001
```

Port 15006 is the inbound listener and port 15001 is the outbound listener on the Envoy proxy.

**Pros of REDIRECT:**
- Works on virtually all Linux kernels
- No special kernel modules needed
- Simpler iptables rules
- Compatible with all Kubernetes networking plugins

**Cons of REDIRECT:**
- The source IP seen by the application is always `127.0.0.6` (the proxy's loopback address)
- Cannot preserve the original client IP for inbound connections

## TPROXY Mode

TPROXY preserves the original source IP address:

```yaml
metadata:
  annotations:
    sidecar.istio.io/interceptionMode: TPROXY
```

Or mesh-wide:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      interceptionMode: TPROXY
```

TPROXY uses different iptables rules:

```bash
# Simplified TPROXY iptables rules
iptables -t mangle -A PREROUTING -p tcp -j ISTIO_INBOUND
iptables -t mangle -A ISTIO_INBOUND -p tcp --dport 8080 -j TPROXY --on-port 15006 --tproxy-mark 0x1/0x1
```

**Pros of TPROXY:**
- Preserves the original source IP address
- Applications can see the real client IP
- Better for IP-based access control at the application level

**Cons of TPROXY:**
- Requires kernel support for TPROXY (most modern kernels have it)
- Requires `NET_ADMIN` capability on the proxy container (not just the init container)
- More complex iptables rules
- Not compatible with all CNI plugins
- May not work with some cloud provider network configurations

## Checking the Current Interception Mode

Verify which mode a pod is using:

```bash
POD=$(kubectl get pod -l app=my-service -o jsonpath='{.items[0].metadata.name}')

# Check the iptables rules
kubectl exec $POD -c istio-proxy -- iptables -t nat -L -n -v 2>/dev/null
kubectl exec $POD -c istio-proxy -- iptables -t mangle -L -n -v 2>/dev/null

# Check the proxy configuration
kubectl exec $POD -c istio-proxy -- pilot-agent request GET /config_dump | jq '.configs[] | select(.["@type"] | contains("ListenersConfigDump"))' | head -20
```

If you see rules in the `mangle` table with TPROXY targets, the pod is using TPROXY. If you see rules in the `nat` table with REDIRECT targets, it's using REDIRECT.

## Source IP Preservation: The Key Difference

The main reason to use TPROXY is source IP preservation. Here is a practical example:

**With REDIRECT mode:**

```bash
# Inside the application container
kubectl exec my-pod -c my-app -- curl -s http://localhost:8080/client-ip
# Returns: 127.0.0.6
```

The application sees all requests coming from `127.0.0.6`, which is the address Envoy uses when forwarding requests in REDIRECT mode.

**With TPROXY mode:**

```bash
kubectl exec my-pod -c my-app -- curl -s http://localhost:8080/client-ip
# Returns: 10.244.1.15 (the actual client pod IP)
```

The application sees the real source IP of the calling pod.

## Using X-Forwarded-For Instead

A simpler alternative to TPROXY for getting the client IP is to use the `X-Forwarded-For` header. Envoy adds this header automatically in REDIRECT mode:

```yaml
apiVersion: networking.istio.io/v1
kind: EnvoyFilter
metadata:
  name: xff-config
spec:
  configPatches:
  - applyTo: NETWORK_FILTER
    match:
      listener:
        filterChain:
          filter:
            name: envoy.filters.network.http_connection_manager
    patch:
      operation: MERGE
      value:
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          use_remote_address: true
          xff_num_trusted_hops: 0
```

Your application can then read the `X-Forwarded-For` header to get the original client IP without needing TPROXY mode.

## Port Exclusions

Regardless of the interception mode, you can exclude specific ports from interception:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeInboundPorts: "8081,9090"
    traffic.sidecar.istio.io/excludeOutboundPorts: "5432,6379,9092"
```

Excluded ports bypass the proxy entirely. Traffic to these ports goes directly to/from the application. This is useful for:

- Database connections that don't need mesh features
- High-throughput streaming connections where proxy overhead is not acceptable
- Ports used by external monitoring agents

## IP Range Exclusions

You can also exclude IP ranges from interception:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeOutboundIPRanges: "169.254.169.254/32"
    traffic.sidecar.istio.io/includeOutboundIPRanges: "10.96.0.0/12"
```

A common exclusion is the cloud metadata service at `169.254.169.254`, which some applications need to access directly.

## Network Mode and Kubernetes Network Policies

Network policies interact with the interception mode. When using REDIRECT, the source IP of all mesh traffic appears to come from the node or proxy address, which can break network policies that match on source pod IPs.

With TPROXY, network policies based on source IP work correctly since the original IP is preserved.

If you must use REDIRECT with network policies, match on pod labels instead of IP addresses:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend
spec:
  podSelector:
    matchLabels:
      app: backend
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
```

## Performance Considerations

Both modes add some overhead to every connection:

- **REDIRECT** adds overhead from the NAT table modification and the extra connection hop
- **TPROXY** adds overhead from the mangle table processing

In practice, the performance difference between the two modes is negligible for most workloads. The proxy processing itself (TLS, routing, telemetry) dominates the overhead, not the interception mechanism.

## Debugging Network Interception Issues

When traffic isn't being intercepted correctly:

```bash
# Check iptables rules
POD=$(kubectl get pod -l app=my-service -o jsonpath='{.items[0].metadata.name}')
kubectl exec $POD -c istio-proxy -- iptables-save

# Check listening ports
kubectl exec $POD -c istio-proxy -- ss -tlnp

# Check if the proxy is receiving traffic
kubectl exec $POD -c istio-proxy -- pilot-agent request GET /stats | grep downstream_cx_total

# Look at proxy logs
kubectl logs $POD -c istio-proxy --tail=50
```

Choose REDIRECT for maximum compatibility and simplicity. Choose TPROXY only when you specifically need source IP preservation and have verified it works with your Kubernetes networking stack. For most use cases, REDIRECT with `X-Forwarded-For` header inspection gives you the client IP information you need without the complexity of TPROXY.
