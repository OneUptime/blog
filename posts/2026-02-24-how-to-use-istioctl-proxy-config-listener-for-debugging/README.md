# How to Use istioctl proxy-config listener for Debugging

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Debugging, istioctl, Envoy, Listeners, Kubernetes

Description: A hands-on guide to inspecting Envoy listener configuration with istioctl proxy-config listener for debugging traffic routing in Istio.

---

Envoy listeners are the entry points for all traffic flowing through the proxy. They define what IP addresses and ports the proxy accepts connections on, and what happens to traffic on each port. When traffic is not being intercepted, is going to the wrong place, or is getting dropped entirely, the listener configuration is usually where you need to look.

The `istioctl proxy-config listener` command shows you the listener configuration for any proxy in the mesh.

## Basic Usage

```bash
istioctl proxy-config listener <pod-name>.<namespace>
```

Example:

```bash
istioctl proxy-config listener productpage-v1-6b746f74dc-9rlmh.bookinfo
```

Output:

```text
ADDRESSES      PORT  MATCH                                                           DESTINATION
10.96.0.1      443   ALL                                                             Cluster: outbound|443||kubernetes.default.svc.cluster.local
0.0.0.0        9080  ALL                                                             Inline Route: 9080
0.0.0.0        9080  Addr: *:9080                                                    Inline Route: inbound|9080||
0.0.0.0        15001 ALL                                                             PassthroughCluster
0.0.0.0        15001 Addr: *:15001                                                   Non-HTTP/Non-TCP
0.0.0.0        15006 Addr: *:15006                                                   Non-HTTP/Non-TCP
0.0.0.0        15006 Trans: tls; Addr: 0.0.0.0/0                                    InboundPassthroughCluster
0.0.0.0        15010 ALL                                                             Cluster: outbound|15010||istiod.istio-system.svc.cluster.local
0.0.0.0        15014 ALL                                                             Cluster: outbound|15014||istiod.istio-system.svc.cluster.local
0.0.0.0        15090 ALL                                                             Inline Route: 15090
```

## Understanding the Listener Architecture

Istio configures two main virtual listeners on the sidecar proxy:

**Port 15001 (Outbound)**: All outbound traffic from the application is redirected here by iptables. This listener then routes traffic based on the original destination.

**Port 15006 (Inbound)**: All inbound traffic to the pod is redirected here. This is where inbound policies (authentication, authorization) are applied.

The other listeners in the list are either specific service listeners or internal Envoy listeners.

## Debugging Inbound Traffic

When traffic to your pod is not working correctly, check the inbound listener:

```bash
istioctl proxy-config listener productpage-v1-6b746f74dc-9rlmh.bookinfo --port 15006
```

For detailed configuration:

```bash
istioctl proxy-config listener productpage-v1-6b746f74dc-9rlmh.bookinfo --port 15006 -o json
```

The inbound listener on port 15006 contains filter chains for each port your application exposes. If your app listens on port 9080, you should see a filter chain matching that port in the listener configuration.

## Debugging Outbound Traffic

Check the outbound listener to see how traffic to other services is handled:

```bash
istioctl proxy-config listener productpage-v1-6b746f74dc-9rlmh.bookinfo --port 15001 -o json
```

The outbound listener uses filter chain matching based on the original destination IP and port. When a request goes to `reviews:9080`, iptables redirects it to port 15001, and the listener matches it to the correct filter chain based on the original destination.

## Common Issues and How to Debug Them

### Port Conflict

If your application listens on a port that conflicts with Istio's internal ports (15000, 15001, 15006, 15020, 15021, 15090), traffic will not work correctly:

```bash
# Check what ports your listeners are on
istioctl proxy-config listener productpage-v1-6b746f74dc-9rlmh.bookinfo | awk '{print $2}' | sort -n | uniq
```

Make sure your application does not use any of these reserved ports.

### Missing Listener for a Port

If your service exposes port 8080 but there is no listener for it, the sidecar does not know about that port:

```bash
istioctl proxy-config listener productpage-v1-6b746f74dc-9rlmh.bookinfo | grep 8080
```

This usually means the Kubernetes Service does not have that port defined, or the Service port does not match what the pod is actually listening on.

### HTTP vs TCP Protocol Detection

Istio auto-detects whether traffic on a port is HTTP or TCP. If it gets this wrong, things break. Check the listener to see which protocol Envoy is expecting:

```bash
istioctl proxy-config listener productpage-v1-6b746f74dc-9rlmh.bookinfo \
  --port 9080 -o json | grep -A5 "filterChainMatch"
```

If you see `httpConnectionManager` in the filter chain, Envoy is treating this as HTTP. If you see `tcpProxy`, it is treating it as TCP.

To force HTTP protocol detection, name your Kubernetes Service port with an `http-` prefix:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  ports:
  - name: http-web   # "http-" prefix tells Istio this is HTTP
    port: 8080
    targetPort: 8080
```

### Passthrough Traffic

Traffic to unknown destinations (not in the mesh) goes through the PassthroughCluster by default. Check if passthrough is configured:

```bash
istioctl proxy-config listener productpage-v1-6b746f74dc-9rlmh.bookinfo | grep Passthrough
```

If you see `PassthroughCluster`, outbound traffic to unknown destinations is allowed. If you have set `outboundTrafficPolicy` to `REGISTRY_ONLY`, you will see `BlackHoleCluster` instead, which drops unknown traffic.

## Inspecting Filter Chains

Listeners contain filter chains that process traffic. View them in detail:

```bash
istioctl proxy-config listener productpage-v1-6b746f74dc-9rlmh.bookinfo \
  --port 9080 -o json
```

Look for the `filters` array within each filter chain. For HTTP traffic, you will see filters like:

- `envoy.filters.network.http_connection_manager`: The main HTTP processing filter
- `envoy.filters.http.fault`: Fault injection (if VirtualService has fault config)
- `envoy.filters.http.cors`: CORS handling
- `envoy.filters.http.router`: The final routing filter

For inbound traffic, you will also see:
- `envoy.filters.http.rbac`: Authorization policy enforcement
- `envoy.filters.http.jwt_authn`: JWT validation

## Checking mTLS on Listeners

Verify whether a listener requires mTLS for inbound connections:

```bash
istioctl proxy-config listener productpage-v1-6b746f74dc-9rlmh.bookinfo \
  --port 15006 -o json | grep -B5 -A10 "transportSocket"
```

If STRICT mTLS is configured, the inbound listener will only have filter chains that require TLS. If PERMISSIVE mode is configured, there will be filter chains for both TLS and plaintext.

## Filtering Listener Output

For specific debugging needs, use filters:

```bash
# Show only listeners on a specific address
istioctl proxy-config listener <pod>.<ns> --address 0.0.0.0

# Show only a specific port
istioctl proxy-config listener <pod>.<ns> --port 9080

# Output as JSON for detailed inspection
istioctl proxy-config listener <pod>.<ns> -o json

# Short output format
istioctl proxy-config listener <pod>.<ns> -o short
```

## Practical Debugging Workflow

When traffic to a service is not working:

1. Check if the listener exists for the target port
2. Check if the protocol (HTTP/TCP) is detected correctly
3. Check if the filter chain has the expected filters (RBAC, fault injection, etc.)
4. Check if TLS is configured correctly on the listener
5. Compare the listener config on the client and server proxies

```bash
# Client side - outbound listener
istioctl proxy-config listener client-pod.namespace --port 9080 -o json

# Server side - inbound listener
istioctl proxy-config listener server-pod.namespace --port 15006 -o json
```

Understanding listener configuration is fundamental to debugging Istio. Listeners are where the proxy decides how to handle traffic, so if they are misconfigured, everything downstream is affected. Make `proxy-config listener` one of the first commands you reach for when debugging traffic flow issues.
