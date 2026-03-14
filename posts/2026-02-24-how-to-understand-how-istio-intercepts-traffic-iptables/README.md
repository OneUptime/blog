# How to Understand How Istio Intercepts Traffic (iptables)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Iptables, Traffic Interception, Networking, Kubernetes

Description: A detailed guide to how Istio uses iptables rules to intercept and redirect all pod traffic through the Envoy sidecar proxy transparently.

---

Traffic interception is the fundamental mechanism that makes Istio work transparently. Your application code does not need to know about Istio, sidecars, or proxies. It just makes normal network calls, and iptables rules silently redirect those calls through the Envoy sidecar. Understanding exactly how this works is essential for debugging networking issues in the mesh.

## The Big Picture

Every pod in the Istio mesh has iptables rules in its network namespace. These rules redirect:

- All outbound TCP traffic from the application to Envoy's outbound listener (port 15001)
- All inbound TCP traffic to the pod to Envoy's inbound listener (port 15006)
- Traffic from Envoy itself passes through without redirection (to prevent loops)

The result is that every TCP connection, both in and out, passes through Envoy. This is how Istio can apply routing rules, enforce mTLS, collect metrics, and implement authorization - all without modifying your application.

## Examining the iptables Rules

You can view the rules from inside the sidecar container:

```bash
kubectl exec deploy/my-app -c istio-proxy -- iptables -t nat -S
```

The output shows all the rules in the NAT table:

```text
-N ISTIO_INBOUND
-N ISTIO_IN_REDIRECT
-N ISTIO_OUTPUT
-N ISTIO_REDIRECT
-A PREROUTING -p tcp -j ISTIO_INBOUND
-A OUTPUT -p tcp -j ISTIO_OUTPUT
-A ISTIO_INBOUND -p tcp --dport 15008 -j RETURN
-A ISTIO_INBOUND -p tcp --dport 15090 -j RETURN
-A ISTIO_INBOUND -p tcp --dport 15021 -j RETURN
-A ISTIO_INBOUND -p tcp --dport 15020 -j RETURN
-A ISTIO_INBOUND -p tcp -j ISTIO_IN_REDIRECT
-A ISTIO_IN_REDIRECT -p tcp -j REDIRECT --to-ports 15006
-A ISTIO_OUTPUT -s 127.0.0.6/32 -o lo -j RETURN
-A ISTIO_OUTPUT ! -d 127.0.0.1/32 -o lo -m owner --uid-owner 1337 -j ISTIO_IN_REDIRECT
-A ISTIO_OUTPUT -o lo -m owner ! --uid-owner 1337 -j RETURN
-A ISTIO_OUTPUT -m owner --uid-owner 1337 -j RETURN
-A ISTIO_OUTPUT -m owner --gid-owner 1337 -j RETURN
-A ISTIO_OUTPUT -d 127.0.0.1/32 -j RETURN
-A ISTIO_OUTPUT -j ISTIO_REDIRECT
-A ISTIO_REDIRECT -p tcp -j REDIRECT --to-ports 15001
```

Let me break down each chain.

## The ISTIO_INBOUND Chain

This chain handles all traffic arriving at the pod:

```text
-A PREROUTING -p tcp -j ISTIO_INBOUND
```

Every TCP packet entering the pod hits the PREROUTING chain first, which jumps to ISTIO_INBOUND.

```text
-A ISTIO_INBOUND -p tcp --dport 15008 -j RETURN
-A ISTIO_INBOUND -p tcp --dport 15090 -j RETURN
-A ISTIO_INBOUND -p tcp --dport 15021 -j RETURN
-A ISTIO_INBOUND -p tcp --dport 15020 -j RETURN
```

These RETURN rules skip redirection for Istio's own ports:
- 15008: HBONE mTLS tunnel
- 15090: Envoy Prometheus metrics
- 15021: Sidecar health check
- 15020: Istio agent metrics

```text
-A ISTIO_INBOUND -p tcp -j ISTIO_IN_REDIRECT
-A ISTIO_IN_REDIRECT -p tcp -j REDIRECT --to-ports 15006
```

Everything else gets redirected to port 15006, where Envoy's inbound listener is waiting.

## The ISTIO_OUTPUT Chain

This chain handles all traffic leaving the application:

```text
-A OUTPUT -p tcp -j ISTIO_OUTPUT
```

Every outbound TCP packet from any process in the pod hits the OUTPUT chain, which jumps to ISTIO_OUTPUT.

Now the tricky part - preventing loops:

```text
-A ISTIO_OUTPUT -s 127.0.0.6/32 -o lo -j RETURN
```

Traffic from 127.0.0.6 (Envoy's inbound to app forwarding) on loopback is allowed through.

```text
-A ISTIO_OUTPUT ! -d 127.0.0.1/32 -o lo -m owner --uid-owner 1337 -j ISTIO_IN_REDIRECT
```

Traffic from Envoy (UID 1337) going to a non-localhost destination on the loopback interface gets redirected to the inbound handler. This handles the case where Envoy sends traffic to the application.

```text
-A ISTIO_OUTPUT -o lo -m owner ! --uid-owner 1337 -j RETURN
```

Loopback traffic from the application (not UID 1337) passes through. This is for application-to-application communication within the pod.

```text
-A ISTIO_OUTPUT -m owner --uid-owner 1337 -j RETURN
-A ISTIO_OUTPUT -m owner --gid-owner 1337 -j RETURN
```

Any traffic from Envoy (UID or GID 1337) passes through without redirection. This is the key loop prevention rule.

```text
-A ISTIO_OUTPUT -d 127.0.0.1/32 -j RETURN
```

Traffic to localhost passes through. No need to proxy local connections.

```text
-A ISTIO_OUTPUT -j ISTIO_REDIRECT
-A ISTIO_REDIRECT -p tcp -j REDIRECT --to-ports 15001
```

Everything else gets redirected to Envoy's outbound listener on port 15001.

## Walking Through a Request

Let's trace a request from app-A calling app-B at 10.96.10.20:8080:

### On app-A's pod:

1. App-A sends a TCP SYN to 10.96.10.20:8080
2. OUTPUT chain matches, jumps to ISTIO_OUTPUT
3. Source is not UID 1337, destination is not 127.0.0.1
4. ISTIO_REDIRECT fires, redirecting to 127.0.0.1:15001
5. Envoy's outbound listener receives the connection
6. Envoy looks up the original destination (10.96.10.20:8080) using SO_ORIGINAL_DST
7. Envoy resolves this to app-B's actual pod IP (e.g., 10.244.2.8:8080)
8. Envoy establishes mTLS with app-B's sidecar
9. Since this new connection originates from UID 1337, ISTIO_OUTPUT returns it directly
10. The connection goes out to the network

### On app-B's pod:

1. The mTLS connection arrives from app-A's Envoy
2. PREROUTING chain matches, jumps to ISTIO_INBOUND
3. Destination port is 8080, not in the excluded list
4. ISTIO_IN_REDIRECT fires, redirecting to 127.0.0.1:15006
5. Envoy's inbound listener receives the connection
6. Envoy terminates mTLS, checks authorization policies
7. Envoy forwards the request to the application on 127.0.0.1:8080
8. App-B processes the request and responds

## The SO_ORIGINAL_DST Socket Option

When iptables REDIRECT changes the destination to 127.0.0.1:15001, the original destination address would normally be lost. Envoy recovers it using the `SO_ORIGINAL_DST` socket option:

```c
// Simplified - what Envoy does internally
struct sockaddr_in original_dst;
socklen_t len = sizeof(original_dst);
getsockopt(fd, SOL_IP, SO_ORIGINAL_DST, &original_dst, &len);
// original_dst now contains 10.96.10.20:8080
```

This is a Linux kernel feature specifically designed for transparent proxying.

## Debugging iptables Issues

### Check if rules are present:

```bash
kubectl exec deploy/my-app -c istio-proxy -- iptables -t nat -L -n -v --line-numbers
```

The `-v` flag adds packet counters, which tell you if traffic is actually hitting each rule.

### Check for dropped packets:

```bash
kubectl exec deploy/my-app -c istio-proxy -- iptables -t nat -L -n -v | grep -c "pkts"
```

If the ISTIO_REDIRECT rule shows 0 packets, outbound traffic is not being intercepted.

### DNS resolution issues:

UDP traffic (including DNS) is NOT redirected by the iptables rules (they only match TCP). DNS queries go directly to CoreDNS. If DNS is not working, it is not an iptables problem.

However, Istio can optionally intercept DNS using the Istio DNS proxy:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
        ISTIO_META_DNS_AUTO_ALLOCATE: "true"
```

### Connection timeouts:

If connections are timing out, check if the iptables rules are redirecting traffic but Envoy is not listening:

```bash
# Check if Envoy is listening on 15001 and 15006
kubectl exec deploy/my-app -c istio-proxy -- ss -tlnp | grep -E "15001|15006"
```

If Envoy is not listening on those ports, the sidecar is not running properly.

## Performance Impact of iptables

The iptables redirection adds some overhead:

- Each packet traverses the NAT table rules (a few microseconds per packet)
- REDIRECT creates a new socket pair, adding latency
- Connection tracking (conntrack) entries are created for each connection

For most workloads, this overhead is negligible. But for high-throughput services doing thousands of connections per second, it can add up.

You can see the conntrack table:

```bash
kubectl exec deploy/my-app -c istio-proxy -- cat /proc/net/nf_conntrack | wc -l
```

## Alternatives to iptables

Istio also supports other traffic interception methods:

**TPROXY** - Uses the TPROXY target instead of REDIRECT. Preserves source IP but requires additional kernel modules.

**Istio CNI** - Moves iptables setup from an init container to a node-level CNI plugin. Removes the need for NET_ADMIN capability in pods.

**eBPF-based interception** - Some implementations like Cilium can replace iptables with eBPF programs for lower overhead. Istio's ambient mode uses this approach.

Understanding iptables-based traffic interception is fundamental to understanding Istio. Every feature that Istio provides depends on traffic flowing through the sidecar, and iptables is the mechanism that makes it happen. When things go wrong at the networking level, the iptables rules are always one of the first things to check.
