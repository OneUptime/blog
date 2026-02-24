# How to Configure Envoy Proxy Idle Timeout

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, Timeout, Kubernetes, Performance

Description: Learn how to configure Envoy proxy idle timeout settings in Istio to manage long-lived connections, prevent resource leaks, and handle WebSocket and streaming workloads.

---

Idle timeouts control how long Envoy keeps a connection open when no data is flowing through it. Getting these right is important - too short and you'll break long-lived connections like WebSockets, too long and you'll accumulate stale connections that waste memory and file descriptors.

## Types of Idle Timeouts in Envoy

Envoy has several different idle timeout settings, and they apply at different levels:

**TCP idle timeout** - How long a TCP connection can sit with no data before Envoy closes it. This applies to raw TCP connections.

**HTTP idle timeout** - How long an HTTP connection (keep-alive) can sit with no active requests before Envoy closes it. This is the one you'll configure most often.

**Stream idle timeout** - How long an individual HTTP stream (request/response pair) can sit with no data before being closed. For HTTP/1.1, this is the same as the connection idle timeout since each connection handles one stream at a time. For HTTP/2, streams are multiplexed, so this is per-stream.

**Route idle timeout** - A per-route override for stream idle timeout.

## Default Values

Istio sets these defaults:

- HTTP idle timeout: 1 hour (controlled by the `idleTimeout` in the HTTP connection manager)
- Stream idle timeout: 5 minutes
- TCP idle timeout: 1 hour

For most REST API traffic, these defaults work fine. But they can cause issues with:

- WebSocket connections that are idle for more than 5 minutes (stream idle timeout kills them)
- gRPC streaming calls that have quiet periods
- Long polling connections
- Services behind load balancers that have their own idle timeouts

## Configuring HTTP Idle Timeout

To change the idle timeout for HTTP connections going to a specific service, use a DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service-timeouts
  namespace: production
spec:
  host: my-service.production.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        connectTimeout: 10s
        idleTimeout: 3600s
      http:
        idleTimeout: 1800s
```

The `http.idleTimeout` controls how long an HTTP keep-alive connection stays open when there are no active requests on it. Setting it to 1800 seconds (30 minutes) means connections are recycled every 30 minutes of inactivity.

## Configuring Stream Idle Timeout

The stream idle timeout is what usually causes problems with long-lived connections. The default 5-minute timeout means any HTTP stream (including WebSocket frames) that doesn't send data for 5 minutes gets terminated.

To change this, you need a VirtualService with a route-level timeout:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: websocket-service
  namespace: production
spec:
  hosts:
  - websocket-service
  http:
  - match:
    - uri:
        prefix: /ws
    route:
    - destination:
        host: websocket-service
    timeout: 0s
```

Setting `timeout: 0s` disables the request timeout entirely. But to specifically control the stream idle timeout, you need an EnvoyFilter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: stream-idle-timeout
  namespace: production
spec:
  workloadSelector:
    labels:
      app: websocket-service
  configPatches:
  - applyTo: NETWORK_FILTER
    match:
      context: SIDECAR_INBOUND
      listener:
        filterChain:
          filter:
            name: envoy.filters.network.http_connection_manager
    patch:
      operation: MERGE
      value:
        typedConfig:
          '@type': type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          streamIdleTimeout: 3600s
```

This sets the stream idle timeout to 1 hour for inbound traffic to the websocket-service.

## Disabling Stream Idle Timeout

For some workloads, you want to disable the stream idle timeout entirely. Setting it to 0s disables it:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: disable-stream-idle-timeout
  namespace: production
spec:
  workloadSelector:
    labels:
      app: long-polling-service
  configPatches:
  - applyTo: NETWORK_FILTER
    match:
      context: SIDECAR_INBOUND
      listener:
        filterChain:
          filter:
            name: envoy.filters.network.http_connection_manager
    patch:
      operation: MERGE
      value:
        typedConfig:
          '@type': type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          streamIdleTimeout: 0s
```

Be careful with this. Without a stream idle timeout, abandoned connections will never be cleaned up and you'll leak resources.

## Configuring TCP Idle Timeout

For raw TCP services (non-HTTP), configure the idle timeout through the TCP proxy filter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: tcp-idle-timeout
  namespace: production
spec:
  workloadSelector:
    labels:
      app: database-proxy
  configPatches:
  - applyTo: NETWORK_FILTER
    match:
      context: SIDECAR_OUTBOUND
      listener:
        filterChain:
          filter:
            name: envoy.filters.network.tcp_proxy
    patch:
      operation: MERGE
      value:
        typedConfig:
          '@type': type.googleapis.com/envoy.extensions.filters.network.tcp_proxy.v3.TcpProxy
          idleTimeout: 7200s
```

This sets a 2-hour idle timeout for outbound TCP connections, which is useful for database connections that might sit idle between queries.

## Per-Route Idle Timeout

You can set different idle timeouts for different routes within the same service:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: per-route-idle-timeout
  namespace: production
spec:
  workloadSelector:
    labels:
      app: api-gateway
  configPatches:
  - applyTo: ROUTE_CONFIGURATION
    match:
      context: SIDECAR_OUTBOUND
      routeConfiguration:
        vhost:
          name: "my-service.production.svc.cluster.local:80"
          route:
            name: default
    patch:
      operation: MERGE
      value:
        virtualHosts:
        - name: "my-service.production.svc.cluster.local:80"
          routes:
          - match:
              prefix: /api/stream
            route:
              idleTimeout: 3600s
```

## Coordinating with Load Balancers

If you have an external load balancer (like an AWS ALB or GCP HTTPS LB) in front of your Istio ingress gateway, make sure the timeouts are coordinated. AWS ALB has a default idle timeout of 60 seconds. If your Envoy idle timeout is 5 minutes but your ALB timeout is 60 seconds, the ALB will close the connection first.

Set the load balancer idle timeout higher than Envoy's, or set Envoy's timeout lower than the load balancer's:

```yaml
# For the Istio ingress gateway
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: gateway-idle-timeout
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
        filterChain:
          filter:
            name: envoy.filters.network.http_connection_manager
    patch:
      operation: MERGE
      value:
        typedConfig:
          '@type': type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          commonHttpProtocolOptions:
            idleTimeout: 55s
```

Setting the gateway's idle timeout to 55 seconds (slightly less than the ALB's 60 seconds) ensures Envoy closes idle connections before the ALB does, avoiding connection reset issues.

## Verifying Timeout Configuration

Check the current timeout settings on a specific pod:

```bash
# Check listener config
istioctl proxy-config listener <pod-name> -n <namespace> --port 80 -o json | python3 -m json.tool

# Check cluster config
istioctl proxy-config cluster <pod-name> -n <namespace> --fqdn my-service.production.svc.cluster.local -o json | python3 -m json.tool
```

Look for `idleTimeout` and `streamIdleTimeout` fields in the output.

## Monitoring Idle Connections

Track how connections are being closed:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- curl -s localhost:15000/stats | grep idle_timeout
```

Relevant metrics:
- `envoy_http_downstream_cx_idle_timeout` - Connections closed due to idle timeout
- `envoy_cluster_upstream_cx_idle_timeout` - Upstream connections closed due to idle timeout

If you see a lot of idle timeouts, your timeout might be too aggressive for your traffic pattern. If you see very few, you might have connections hanging around longer than necessary.

The right idle timeout depends entirely on your traffic patterns. Stateless REST APIs can use short idle timeouts (30-60 seconds) to free up resources quickly. WebSocket and streaming services need longer timeouts or need them disabled entirely. The trick is matching the timeout to the actual behavior of your clients and services.
