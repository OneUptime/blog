# How to Understand Envoy Filter Chain in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, Filter Chain, Networking, Service Mesh

Description: A thorough explanation of how Envoy filter chains work in Istio, covering listener filters, network filters, and HTTP filters.

---

Every request that flows through Istio passes through a chain of Envoy filters. These filters are responsible for everything the proxy does - TLS termination, HTTP routing, load balancing, authorization, telemetry collection, and more. Understanding how the filter chain works is essential for debugging, customizing behavior with EnvoyFilter resources, and knowing why certain things happen in a certain order.

## Filter Chain Architecture

Envoy organizes its processing pipeline into three layers:

1. **Listener Filters** - Run when a new connection arrives, before any data is read
2. **Network Filters** - Process the raw byte stream of the connection
3. **HTTP Filters** - Process individual HTTP requests (only present when the network filter is the HTTP Connection Manager)

Each listener can have multiple filter chains, and Envoy selects which filter chain to use based on properties of the incoming connection.

## Inspecting Filter Chains

The best way to understand filter chains is to look at what Istio actually configures. Use `istioctl` to dump the full proxy config:

```bash
# List all listeners
istioctl proxy-config listener my-pod

# See detailed filter chain config for a specific port
istioctl proxy-config listener my-pod --port 15006 -o json
```

For a more readable overview:

```bash
# Show all filter chains with their match criteria
istioctl proxy-config listener my-pod --port 15006 -o json | \
  python3 -c "import json,sys; data=json.load(sys.stdin); \
  [print(f'Chain: {i}, Match: {fc.get(\"filterChainMatch\",{})}') \
  for i,fc in enumerate(data[0].get('filterChains',[]))]"
```

## Listener Filters

Listener filters run first, before Envoy decides which filter chain to use. They inspect the raw connection to extract metadata. Istio configures several listener filters:

```bash
istioctl proxy-config listener my-pod --port 15006 -o json | \
  python3 -c "import json,sys; data=json.load(sys.stdin); \
  [print(lf['name']) for lf in data[0].get('listenerFilters',[])]"
```

Common listener filters in Istio:

- **envoy.filters.listener.tls_inspector** - Peeks at the first bytes of the connection to detect if it's TLS. It reads the TLS ClientHello to extract the SNI (Server Name Indication) and ALPN (Application-Layer Protocol Negotiation) values.
- **envoy.filters.listener.http_inspector** - Detects if the connection is HTTP by looking at the first bytes. Used for protocol detection.
- **envoy.filters.listener.original_dst** - Retrieves the original destination address from the iptables REDIRECT (using SO_ORIGINAL_DST).

The order matters. TLS inspector must run before HTTP inspector because if the connection is TLS, you need to do TLS termination before you can detect the HTTP protocol inside.

## Filter Chain Selection

After listener filters run, Envoy selects a filter chain based on match criteria. The virtualInbound listener (port 15006) typically has multiple filter chains:

```json
{
  "filterChainMatch": {
    "destinationPort": 8080,
    "transportProtocol": "tls",
    "applicationProtocols": ["istio-peer-exchange", "istio"]
  }
}
```

This filter chain matches connections to port 8080 that are using TLS with Istio's ALPN protocols (indicating mTLS from another mesh service).

Another chain might match plaintext traffic to the same port:

```json
{
  "filterChainMatch": {
    "destinationPort": 8080,
    "transportProtocol": "raw_buffer"
  }
}
```

Envoy evaluates these matches in order and uses the most specific match. If no filter chain matches, the connection hits the default filter chain (if one exists) or gets rejected.

## Network Filters

Each filter chain contains a list of network filters that process the connection's byte stream. The most important network filter in Istio is the HTTP Connection Manager (HCM):

```json
{
  "name": "envoy.filters.network.http_connection_manager",
  "typedConfig": {
    "@type": "type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager",
    "statPrefix": "inbound_0.0.0.0_8080",
    "routeConfig": { ... },
    "httpFilters": [ ... ]
  }
}
```

Other network filters you might see:

- **envoy.filters.network.tcp_proxy** - For non-HTTP TCP traffic. Just forwards the byte stream to the upstream.
- **envoy.filters.network.rbac** - Network-level authorization (for TCP policies).
- **envoy.filters.network.metadata_exchange** - Istio-specific filter for exchanging workload metadata between proxies.

Network filters are processed in order. For example, the RBAC filter runs before the TCP proxy filter, so authorization is checked before traffic is forwarded.

## HTTP Filters

When the network filter is the HTTP Connection Manager, it contains its own chain of HTTP filters. These are where most of the Istio magic happens:

```bash
istioctl proxy-config listener my-pod --port 15006 -o json | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
for fc in data[0].get('filterChains', []):
  for nf in fc.get('filters', []):
    tc = nf.get('typedConfig', {})
    if 'httpFilters' in tc:
      for hf in tc['httpFilters']:
        print(hf['name'])
      break
"
```

Typical HTTP filters in Istio (in order):

1. **envoy.filters.http.wasm / istio.metadata_exchange** - Exchanges workload identity metadata between proxies
2. **envoy.filters.http.rbac** - HTTP-level authorization policy enforcement
3. **envoy.filters.http.jwt_authn** - JWT token validation (if configured)
4. **istio.stats** - Collects request-level telemetry
5. **envoy.filters.http.fault** - Fault injection (if configured)
6. **envoy.filters.http.cors** - CORS handling
7. **envoy.filters.http.router** - The final filter that performs routing and forwards the request upstream

The order is significant. Authorization (rbac) runs before the router, so unauthorized requests are rejected before any routing happens. Fault injection runs before routing so it can inject delays or aborts.

## The Router Filter

The last HTTP filter is always `envoy.filters.http.router`. This filter:

1. Matches the request against route configuration
2. Selects a cluster (upstream service)
3. Picks an endpoint using the load balancing algorithm
4. Forwards the request

```bash
# See the route configuration
istioctl proxy-config route my-pod --name "inbound|8080||"
```

## Customizing with EnvoyFilter

You can add, modify, or remove filters using the `EnvoyFilter` resource. Here's an example that adds a Lua filter for custom header manipulation:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: custom-header-filter
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-app
  configPatches:
    - applyTo: HTTP_FILTER
      match:
        context: SIDECAR_INBOUND
        listener:
          filterChain:
            filter:
              name: envoy.filters.network.http_connection_manager
              subFilter:
                name: envoy.filters.http.router
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.filters.http.lua
          typedConfig:
            "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
            defaultSourceCode:
              inlineString: |
                function envoy_on_request(request_handle)
                  request_handle:headers():add("x-custom-header", "my-value")
                end
```

The `INSERT_BEFORE` operation places the Lua filter right before the router filter, which is the standard position for custom HTTP filters.

## Debugging Filter Chain Issues

When things aren't working as expected, these commands help:

```bash
# Dump the entire proxy config
istioctl proxy-config all my-pod -o json > proxy-config.json

# Check for configuration errors
istioctl proxy-status my-pod

# Enable debug logging for specific components
istioctl proxy-config log my-pod --level connection:debug,http:debug,filter:debug
```

Look at the Envoy access logs to see which filter chain handled a request:

```bash
kubectl logs my-pod -c istio-proxy | tail -10
```

The access log includes the route name and other metadata that tells you which path through the filter chain the request took.

Understanding filter chains gives you a mental model for how every request is processed in Istio. When you know the order of operations - listener filter, filter chain selection, network filters, HTTP filters, routing - you can predict behavior and diagnose problems systematically.
