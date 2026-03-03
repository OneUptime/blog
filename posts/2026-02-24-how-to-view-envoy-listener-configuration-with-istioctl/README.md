# How to View Envoy Listener Configuration with istioctl

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, Listeners, istioctl, Kubernetes, Debugging

Description: A detailed guide to inspecting Envoy listener configuration in Istio to debug traffic interception, protocol detection, and connection handling.

---

Envoy listeners are the front door to the proxy. They define which ports the proxy accepts connections on, what protocols it expects, and how it processes incoming traffic. If traffic isn't reaching your service or is being handled incorrectly, the listener configuration is the first place to check.

## What Listeners Do

Every Envoy sidecar in Istio has two special listeners:

- **Port 15001** (outbound) - Catches all outbound traffic from the application container. The iptables rules redirect outgoing connections here.
- **Port 15006** (inbound) - Catches all inbound traffic to the application container. Incoming connections are redirected here.

In addition to these virtual listeners, Envoy creates per-port listeners for each service it knows about. A listener on port 9080 handles HTTP traffic to services running on that port.

## Viewing Listeners

```bash
istioctl proxy-config listeners productpage-v1-abc123.default
```

```text
ADDRESS       PORT  MATCH                                         DESTINATION
0.0.0.0       15006 ALL                                           Inline Route: /*
0.0.0.0       15006 Addr: *:15006                                 Non-HTTP/Non-TCP
0.0.0.0       15001 ALL                                           PassthroughCluster
0.0.0.0       9080  Trans: raw_buffer; App: http/1.1,h2c          Route: 9080
0.0.0.0       9090  Trans: raw_buffer; App: http/1.1,h2c          Route: 9090
10.96.0.1     443   ALL                                           Cluster: outbound|443||kubernetes.default.svc.cluster.local
10.96.0.10    53    ALL                                           Cluster: outbound|53||kube-dns.kube-system.svc.cluster.local
```

Each row represents a listener or a filter chain match within a listener. The columns tell you:

- **ADDRESS** - What IP the listener binds to. `0.0.0.0` means all interfaces. A specific IP means it only matches traffic to that IP (used for services with ClusterIPs).
- **PORT** - The port the listener accepts connections on.
- **MATCH** - How the listener decides to handle traffic (protocol sniffing, transport type, etc.).
- **DESTINATION** - Where matching traffic goes (a route table, a cluster directly, or passthrough).

## The Outbound Listener (15001)

Port 15001 is the virtual outbound listener. All traffic leaving the pod hits this listener first, then gets dispatched to the appropriate per-port listener:

```bash
istioctl pc listeners productpage-v1-abc123.default --port 15001 -o json
```

The virtual listener uses the `useOriginalDst` option, which means it inspects the original destination of the connection and forwards it to the matching listener. If no specific listener matches, traffic goes to PassthroughCluster (forwarded without proxy processing) or BlackHoleCluster (dropped), depending on your outbound traffic policy.

## The Inbound Listener (15006)

Port 15006 handles all incoming traffic:

```bash
istioctl pc listeners productpage-v1-abc123.default --port 15006 -o json
```

This listener has filter chains for each port your pod exposes. When traffic arrives, it matches the destination port and applies the appropriate filters (HTTP connection manager, TCP proxy, etc.).

## Per-Service Listeners

Listeners on ports like 9080, 9090, and 443 handle traffic to specific services:

```bash
istioctl pc listeners productpage-v1-abc123.default --port 9080
```

```text
ADDRESS   PORT  MATCH                                     DESTINATION
0.0.0.0   9080  Trans: raw_buffer; App: http/1.1,h2c      Route: 9080
0.0.0.0   9080  ALL                                       PassthroughCluster
```

The first match handles HTTP traffic and forwards it to the route table named `9080`. The second match is a fallback for non-HTTP traffic on the same port.

## JSON Deep Dive

The JSON output reveals the full listener configuration:

```bash
istioctl pc listeners productpage-v1-abc123.default --port 9080 -o json
```

A simplified version looks like:

```json
[
  {
    "name": "0.0.0.0_9080",
    "address": {
      "socketAddress": {
        "address": "0.0.0.0",
        "portValue": 9080
      }
    },
    "filterChains": [
      {
        "filterChainMatch": {
          "transportProtocol": "raw_buffer",
          "applicationProtocols": ["http/1.1", "h2c"]
        },
        "filters": [
          {
            "name": "envoy.filters.network.http_connection_manager",
            "typedConfig": {
              "statPrefix": "outbound_0.0.0.0_9080",
              "rds": {
                "configSource": { "ads": {} },
                "routeConfigName": "9080"
              },
              "httpFilters": [
                { "name": "istio.metadata_exchange" },
                { "name": "envoy.filters.http.cors" },
                { "name": "envoy.filters.http.fault" },
                { "name": "istio.stats" },
                { "name": "envoy.filters.http.router" }
              ],
              "tracing": { ... },
              "accessLog": [ ... ]
            }
          }
        ]
      }
    ],
    "listenerFilters": [
      { "name": "envoy.filters.listener.tls_inspector" },
      { "name": "envoy.filters.listener.http_inspector" }
    ]
  }
]
```

Key parts to understand:

### Filter Chains

Each listener can have multiple filter chains. The `filterChainMatch` determines which chain handles a connection based on:

- **transportProtocol** - `raw_buffer` for plaintext, `tls` for TLS connections
- **applicationProtocols** - What protocols the filter chain handles (`http/1.1`, `h2c`, `h2`)
- **serverNames** - SNI-based matching for TLS listeners

### HTTP Filters

The `httpFilters` array shows every HTTP filter applied to requests in order:

- **istio.metadata_exchange** - Exchanges workload metadata between proxies
- **envoy.filters.http.cors** - CORS handling
- **envoy.filters.http.fault** - Fault injection (if configured)
- **istio.stats** - Prometheus metrics collection
- **envoy.filters.http.router** - Final routing to the upstream cluster

If you've added AuthorizationPolicies, you'll see `envoy.filters.http.rbac` in this list. If you've added RequestAuthentication, you'll see `envoy.filters.http.jwt_authn`.

### Listener Filters

Listener filters run before filter chain selection:

- **tls_inspector** - Detects if the connection is TLS and extracts the SNI
- **http_inspector** - Detects if the connection is HTTP

These enable protocol sniffing, which is how Istio automatically detects whether traffic is HTTP or TCP.

## Debugging Protocol Detection

One of the most common issues is Istio incorrectly detecting the protocol. If your service uses HTTP but Envoy treats it as TCP, routing won't work properly.

Check the listener's filter chain match:

```bash
istioctl pc listeners my-pod.default --port 8080 -o json | \
  python3 -c "import sys,json; d=json.load(sys.stdin); [print(json.dumps(fc.get('filterChainMatch',{}), indent=2)) for l in d for fc in l.get('filterChains',[])]"
```

If you only see TCP proxy filters and no HTTP connection manager, Envoy is treating the port as TCP. Fix it by naming your Kubernetes Service port with a protocol prefix:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  ports:
  - name: http-web    # "http-" prefix tells Istio this is HTTP
    port: 8080
    targetPort: 8080
```

Valid prefixes: `http`, `http2`, `https`, `grpc`, `grpc-web`, `mongo`, `mysql`, `redis`, `tcp`, `tls`, `udp`.

## Debugging Missing Listeners

If a listener doesn't exist for a port you expect:

1. Check that the Kubernetes Service exists and has the port defined
2. Verify the Service is in a namespace that Istiod watches
3. If using a Sidecar resource, make sure it includes the service in its egress configuration

```bash
# Check Sidecar resource
kubectl get sidecar -n default -o yaml
```

A restrictive Sidecar resource can filter out services:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: default
spec:
  egress:
  - hosts:
    - "./*"  # Only services in the same namespace
```

With this configuration, services in other namespaces won't have listeners created.

## Debugging Inbound Listeners

For traffic coming into your pod, check the inbound listeners:

```bash
istioctl pc listeners my-pod.default --port 15006 -o json
```

Look for filter chains that match your application port. If your app runs on port 8080, there should be a filter chain with a destination port match for 8080.

If the inbound listener doesn't have your port, check that your pod has a container port defined:

```yaml
spec:
  containers:
  - name: app
    ports:
    - containerPort: 8080
      name: http
```

While Kubernetes doesn't strictly require containerPort declarations, Istio uses them for some inbound listener configuration.

## Comparing Listeners Across Pods

Different pods can have different listener configurations based on their Sidecar resources, namespace settings, or pod annotations. Compare listeners:

```bash
istioctl pc listeners pod-a.namespace -o json > listeners-a.json
istioctl pc listeners pod-b.namespace -o json > listeners-b.json
diff <(jq -S . listeners-a.json) <(jq -S . listeners-b.json)
```

## Summary

Envoy listeners control how traffic enters the proxy and which processing pipeline handles it. When traffic isn't being intercepted or is handled with the wrong protocol, the listener configuration tells you why. Start with the table view for an overview, then use JSON output to dig into filter chains, protocol detection, and HTTP filter ordering. Combined with route and cluster inspection, listeners complete the picture of how your traffic flows through Istio.
