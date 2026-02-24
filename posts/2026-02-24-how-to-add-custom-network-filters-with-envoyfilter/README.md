# How to Add Custom Network Filters with EnvoyFilter

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, EnvoyFilter, Network Filters, Envoy, TCP, Kubernetes

Description: Add custom network-level filters to Envoy proxies in Istio using EnvoyFilter for TCP-level processing including rate limiting, RBAC, and connection logging.

---

Network filters in Envoy operate at the TCP layer, processing raw bytes as they flow through the proxy. Unlike HTTP filters that work with requests and responses, network filters work with connections and byte streams. They are useful for protocols that Istio does not natively understand, for implementing TCP-level rate limiting, or for adding custom logging at the connection level.

## Network Filters vs HTTP Filters

The distinction is important. HTTP filters sit inside the `envoy.filters.network.http_connection_manager`, which is itself a network filter. HTTP filters only work for HTTP traffic.

Network filters sit at the listener level and process all traffic, regardless of protocol. The filter chain for a typical Istio listener looks like this:

```
Listener
  └── Filter Chain
        ├── Network Filter: envoy.filters.network.metadata_exchange (Istio metadata)
        ├── Network Filter: envoy.filters.network.http_connection_manager
        │     └── HTTP Filters: cors, fault, stats, router
        └── (or) Network Filter: envoy.filters.network.tcp_proxy
```

For HTTP ports, the HTTP connection manager is the main network filter. For TCP ports, the TCP proxy filter handles the traffic. You can add custom network filters before either of these.

## Adding a TCP Rate Limit Filter

Envoy's local rate limit filter works at the network level too. This limits the number of new TCP connections per time period:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: tcp-rate-limit
  namespace: default
spec:
  workloadSelector:
    labels:
      app: redis
  configPatches:
    - applyTo: NETWORK_FILTER
      match:
        context: SIDECAR_INBOUND
        listener:
          portNumber: 6379
          filterChain:
            filter:
              name: envoy.filters.network.tcp_proxy
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.filters.network.local_ratelimit
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.network.local_ratelimit.v3.LocalRateLimit
            stat_prefix: tcp_local_rate_limiter
            token_bucket:
              max_tokens: 50
              tokens_per_fill: 50
              fill_interval: 60s
```

This limits the Redis service to accept no more than 50 new connections per 60-second window. Existing connections are not affected by this limit. Only new connection attempts consume tokens from the bucket.

## Adding Network-Level RBAC

While Istio's AuthorizationPolicy handles most access control needs, you might want to add Envoy's built-in RBAC filter directly for cases where the Istio API is not flexible enough:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: network-rbac
  namespace: default
spec:
  workloadSelector:
    labels:
      app: database
  configPatches:
    - applyTo: NETWORK_FILTER
      match:
        context: SIDECAR_INBOUND
        listener:
          portNumber: 5432
          filterChain:
            filter:
              name: envoy.filters.network.tcp_proxy
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.filters.network.rbac
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.network.rbac.v3.RBAC
            stat_prefix: tcp_rbac
            rules:
              action: ALLOW
              policies:
                allow-backend:
                  permissions:
                    - any: true
                  principals:
                    - source_ip:
                        address_prefix: 10.244.0.0
                        prefix_len: 16
```

This allows TCP connections to the database only from the 10.244.0.0/16 CIDR range. Note that for most use cases, Istio's AuthorizationPolicy is simpler and more maintainable. Use the network RBAC filter only when you need features that AuthorizationPolicy does not support.

## Adding a Connection Logger

Create a custom connection logger that logs TCP connection events:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: connection-logger
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-tcp-service
  configPatches:
    - applyTo: NETWORK_FILTER
      match:
        context: SIDECAR_INBOUND
        listener:
          portNumber: 9000
          filterChain:
            filter:
              name: envoy.filters.network.tcp_proxy
      patch:
        operation: MERGE
        value:
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.network.tcp_proxy.v3.TcpProxy
            access_log:
              - name: envoy.access_loggers.file
                typed_config:
                  "@type": type.googleapis.com/envoy.extensions.access_loggers.file.v3.FileAccessLog
                  path: /dev/stdout
                  log_format:
                    json_format:
                      timestamp: "%START_TIME%"
                      source_address: "%DOWNSTREAM_REMOTE_ADDRESS%"
                      destination_address: "%UPSTREAM_HOST%"
                      bytes_sent: "%BYTES_SENT%"
                      bytes_received: "%BYTES_RECEIVED%"
                      duration: "%DURATION%"
                      connection_termination: "%CONNECTION_TERMINATION_DETAILS%"
```

This modifies the existing TCP proxy filter to include custom access logging. It uses the `MERGE` operation instead of `INSERT_BEFORE` because we are modifying the existing tcp_proxy filter rather than adding a new one.

## Adding an SNI-Based Filter

For TLS traffic, you can add filters based on the SNI (Server Name Indication) header. This is useful for TLS passthrough scenarios:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: sni-logging
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
    - applyTo: NETWORK_FILTER
      match:
        context: GATEWAY
        listener:
          portNumber: 443
          filterChain:
            filter:
              name: envoy.filters.network.tcp_proxy
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.filters.network.sni_dynamic_forward_proxy
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.network.sni_dynamic_forward_proxy.v3.FilterConfig
            port_value: 443
            dns_cache_config:
              name: dynamic_forward_proxy_cache_config
              dns_lookup_family: V4_ONLY
```

## Modifying the TCP Proxy Filter

Sometimes you do not need to add a new filter but just need to modify the existing TCP proxy settings:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: tcp-proxy-tuning
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-tcp-service
  configPatches:
    - applyTo: NETWORK_FILTER
      match:
        context: SIDECAR_INBOUND
        listener:
          portNumber: 9000
          filterChain:
            filter:
              name: envoy.filters.network.tcp_proxy
      patch:
        operation: MERGE
        value:
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.network.tcp_proxy.v3.TcpProxy
            idle_timeout: 3600s
            max_downstream_connection_duration: 86400s
```

This sets the idle timeout to 1 hour and the maximum connection duration to 24 hours. Useful for long-lived TCP connections that should not live forever.

## Adding the Mongo Proxy Filter

Envoy has a built-in MongoDB protocol filter that can parse MongoDB wire protocol and collect protocol-specific metrics:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: mongo-stats
  namespace: default
spec:
  workloadSelector:
    labels:
      app: mongodb
  configPatches:
    - applyTo: NETWORK_FILTER
      match:
        context: SIDECAR_INBOUND
        listener:
          portNumber: 27017
          filterChain:
            filter:
              name: envoy.filters.network.tcp_proxy
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.filters.network.mongo_proxy
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.network.mongo_proxy.v3.MongoProxy
            stat_prefix: mongo_stats
            access_log: /dev/stdout
```

This inserts the MongoDB proxy filter before the TCP proxy. It parses MongoDB commands and generates metrics like operation counts and latencies. Note that this only works for unencrypted MongoDB connections. If MongoDB is using TLS, the filter cannot parse the encrypted traffic.

## Filter Chain Inspection

To see the current network filter chain for a specific port:

```bash
# View all listeners
istioctl proxy-config listeners deploy/my-tcp-service -n default

# View detailed listener config for a specific port
istioctl proxy-config listeners deploy/my-tcp-service -n default --port 9000 -o json | \
  jq '.[].filterChains[].filters[].name'
```

This shows you the list of network filters in order. Your custom filter should appear in the expected position.

## Matching on Specific Filter Chains

A listener can have multiple filter chains (for example, one for mTLS traffic and one for plain text). You can target specific filter chains using transport protocol matching:

```yaml
configPatches:
  - applyTo: NETWORK_FILTER
    match:
      context: SIDECAR_INBOUND
      listener:
        portNumber: 9000
        filterChain:
          transportProtocol: tls
          filter:
            name: envoy.filters.network.tcp_proxy
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.filters.network.local_ratelimit
        typed_config:
          # ...
```

The `transportProtocol: tls` match ensures the filter is only added to the TLS filter chain, not the plain text one (which would be `transportProtocol: raw_buffer`).

## Error Handling in Network Filters

Network filters that encounter errors typically close the connection. Unlike HTTP filters where you can return a 500 error, at the TCP level, the only options are:

- Continue processing (pass the data through)
- Close the connection

Keep this in mind when adding custom network filters. A misconfigured rate limit filter, for example, will simply close connections that exceed the limit rather than returning a friendly error message.

## Performance Considerations

Network filters run for every connection and sometimes for every byte of data. Keep these guidelines in mind:

- Avoid complex Lua processing at the network level (Lua network filters exist but are rare)
- Rate limit filters are lightweight and safe to use
- Access logging adds minimal overhead
- Protocol-specific filters (Mongo, MySQL, Redis) add some overhead for protocol parsing

```bash
# Monitor filter performance
kubectl exec deploy/my-tcp-service -c istio-proxy -- \
  pilot-agent request GET stats | grep "network_filter"
```

## Summary

Network filters in Istio work at the TCP layer and process all traffic regardless of protocol. Use them for TCP rate limiting, connection-level access control, custom connection logging, and protocol-specific processing. Add them with `applyTo: NETWORK_FILTER` and `INSERT_BEFORE` the tcp_proxy or http_connection_manager filter. Always scope with workloadSelector and verify installation with istioctl proxy-config listeners. For most HTTP-level needs, use HTTP filters instead. Reserve network filters for cases that genuinely require TCP-level processing.
