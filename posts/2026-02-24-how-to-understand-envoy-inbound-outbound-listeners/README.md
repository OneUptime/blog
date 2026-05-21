# How to Understand Envoy Inbound/Outbound Listeners

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, Networking, Listeners, Kubernetes, Service Mesh

Description: A deep walkthrough of Envoy's inbound and outbound listener architecture in Istio, including how traffic flows through each listener type.

---

Envoy, the sidecar proxy that Istio deploys alongside your application, uses a concept called listeners to accept incoming connections. In the context of Istio, there are two main listeners you need to understand: the inbound listener on port 15006 and the outbound listener on port 15001. Getting a handle on how these work is fundamental to understanding Istio's traffic flow.

## The Two Main Listeners

When Istio configures a sidecar Envoy, it creates two catch-all listeners:

- **Port 15001 (outbound)**: Catches all outbound traffic from the application container that has been redirected by iptables.
- **Port 15006 (inbound)**: Catches all inbound traffic destined for the application container that has been redirected by iptables.

You can see these by running:

```bash
istioctl proxy-config listener <pod-name>
```

The output will show something like:

```text
ADDRESS      PORT  MATCH                                                       DESTINATION
0.0.0.0      15001 ALL                                                         PassthroughCluster
0.0.0.0      15006 Addr: *:15006                                               Non-HTTP/Non-TCP
0.0.0.0      15006 Trans: tls; App: istio-http/1.0,istio-http/1.1,istio-h2    InboundPassthroughCluster
0.0.0.0      15021 ALL                                                         Inline Route: /healthz/ready*
10.96.0.1    443   ALL                                                         Cluster: outbound|443||kubernetes.default.svc.cluster.local
10.96.0.10   53    ALL                                                         Cluster: outbound|53||kube-dns.kube-system.svc.cluster.local
10.96.45.100 8080  Trans: raw_buffer; App: http/1.1,h2c                        Route: 8080
```

## How the Outbound Listener Works

The outbound listener on port 15001 is a special "virtual" listener that uses the original destination address of the connection to figure out where the traffic should go. When your application makes a request to, say, `http://user-service:8080`, the iptables rules redirect that connection to Envoy on port 15001 in the pod.

Envoy on port 15001 looks at the original destination (the IP and port of user-service) and matches it against its listener table. If there's a listener for that destination, traffic goes there. If not, it falls back to the PassthroughCluster, which forwards the traffic directly to the original destination with limited Istio functionality for that unknown destination.

To see how the outbound listener is configured:

```bash
istioctl proxy-config listener <pod-name> --port 15001 -o json
```

The JSON output shows the original-destination setting set to true. Depending on the Istio and Envoy versions, this may appear as `useOriginalDst` or `hiddenEnvoyDeprecatedUseOriginalDst`, and it tells Envoy to hand redirected connections to the listener that matches the original destination:

```json
{
  "name": "virtualOutbound",
  "address": {
    "socketAddress": {
      "address": "0.0.0.0",
      "portValue": 15001
    }
  },
  "hiddenEnvoyDeprecatedUseOriginalDst": true,
  "filterChains": [
    {
      "filters": [
        {
          "name": "envoy.filters.network.tcp_proxy",
          "typedConfig": {
            "cluster": "PassthroughCluster",
            "statPrefix": "PassthroughCluster"
          }
        }
      ]
    }
  ]
}
```

## How the Inbound Listener Works

The inbound listener on port 15006 handles traffic arriving at the pod that Istio's iptables rules intercept. When traffic comes in on your application port (like 8080), iptables redirects it to Envoy on port 15006. Envoy then inspects the traffic, applies any inbound policies (like authentication and authorization), collects metrics, and forwards the request to the actual application.

```bash
istioctl proxy-config listener <pod-name> --port 15006 -o json
```

The inbound listener uses filter chain matching to determine how to handle the connection. It checks the destination port, the transport protocol (TLS or plaintext), and the application protocol to pick the right filter chain.

For example, if you have a service on port 8080:

```bash
istioctl proxy-config listener <pod-name> --port 15006 -o json | python3 -m json.tool | head -100
```

You'll see filter chains for:
- mTLS traffic on port 8080
- Plaintext traffic on port 8080 (if permissive mode is enabled)
- A passthrough chain for unmatched traffic

## Outbound Service Listeners

Beyond the two main listeners, Istio creates virtual listeners for outbound destinations your pod might need to reach. For HTTP traffic, these are commonly wildcard listeners per port; for TCP and HTTPS traffic, they are commonly service-IP-specific listeners. These are the additional listeners you see in the `istioctl proxy-config listener` output.

```text
10.96.45.100 8080  Trans: raw_buffer; App: http/1.1,h2c    Route: 8080
10.96.45.100 8080  Trans: tls; App: istio-http/1.0          Route: 8080
```

Each of these listeners has routes configured that point to the appropriate upstream cluster. The route configuration handles things like virtual service rules, header-based routing, and weighted traffic splitting.

To see the routes for a specific listener:

```bash
istioctl proxy-config route <pod-name> --name 8080
```

This shows which backends traffic on port 8080 gets sent to and any routing rules applied.

## Filter Chains

Each listener has one or more filter chains. A filter chain is a sequence of network filters that process the connection. The most common filters are:

- **envoy.filters.network.http_connection_manager**: For HTTP/gRPC traffic. It handles HTTP routing, retries, timeouts, and more.
- **envoy.filters.network.tcp_proxy**: For raw TCP traffic. It just proxies bytes between upstream and downstream.

For HTTP traffic, the http_connection_manager filter has its own set of HTTP filters:

```bash
istioctl proxy-config listener <pod-name> --port 8080 -o json
```

You'll see filters like:
- `envoy.filters.http.fault`: For fault injection
- `envoy.filters.http.cors`: For CORS headers
- `envoy.filters.http.router`: For routing decisions
- `istio.metadata_exchange`: For workload metadata
- `istio.stats`: For metrics collection

## The PassthroughCluster

When Envoy can't match a connection to any known service and outbound traffic policy is `ALLOW_ANY`, it uses the PassthroughCluster. This cluster forwards traffic directly to the original destination IP. It's what allows pods in the mesh to reach external services that don't have a ServiceEntry defined, with reduced Istio traffic management and observability for those unknown destinations.

You can see the passthrough cluster configuration:

```bash
istioctl proxy-config cluster <pod-name> --fqdn PassthroughCluster -o json
```

If you set `outboundTrafficPolicy.mode` to `REGISTRY_ONLY` in the mesh config, unknown outbound traffic is dropped instead of being allowed through PassthroughCluster:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    outboundTrafficPolicy:
      mode: REGISTRY_ONLY
```

## Inspecting Listener Details

For deep debugging, you can dump the full Envoy configuration:

```bash
istioctl proxy-config all <pod-name> -o json > envoy-config.json
```

Or use the Envoy admin interface:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- curl localhost:15000/config_dump
```

Specific endpoints on the admin interface:

```bash
# List all listeners

kubectl exec -it <pod-name> -c istio-proxy -- curl localhost:15000/listeners

# Show cluster stats
kubectl exec -it <pod-name> -c istio-proxy -- curl localhost:15000/clusters

# Show server info
kubectl exec -it <pod-name> -c istio-proxy -- curl localhost:15000/server_info
```

## How Mutual TLS Affects Listeners

When mTLS is enabled, the inbound listener on port 15006 includes TLS transport socket configuration. The filter chain match includes:

```json
{
  "filterChainMatch": {
    "transportProtocol": "tls",
    "applicationProtocols": ["istio-peer-exchange", "istio"]
  }
}
```

This means the listener can distinguish between mTLS connections (from other mesh sidecars) and plaintext connections (from outside the mesh). In PERMISSIVE mode, both filter chains are present. In STRICT mode, only the mTLS chain exists, and plaintext connections are rejected.

Understanding Envoy's listener architecture gives you the ability to trace exactly how a request flows through the sidecar. When routing doesn't work as expected or policies aren't being applied, the listener configuration is usually where you'll find the answer.
