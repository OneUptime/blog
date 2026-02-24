# How to Set Up Istio for Non-HTTP TCP Services

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, TCP, Service Mesh, Kubernetes, Non-HTTP, Networking

Description: How to configure Istio for non-HTTP TCP services including databases, message queues, custom protocols, and legacy applications.

---

Not everything speaks HTTP. Databases, message brokers, custom binary protocols, and legacy applications often use raw TCP connections. Istio handles TCP traffic just fine, but the feature set is different from what you get with HTTP. Understanding those differences helps you configure your mesh correctly and avoid surprises.

When Istio identifies traffic as TCP (either through explicit port naming or because it couldn't detect HTTP), it applies TCP-level features: connection-based load balancing, mTLS, connection limits, and outlier detection based on connection errors. HTTP-level features like header-based routing, request retries, and fault injection are not available for TCP traffic.

## Configuring TCP Services

Tell Istio a port carries TCP traffic using the port naming convention:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: custom-tcp-service
  namespace: default
spec:
  selector:
    app: custom-app
  ports:
    - name: tcp-data
      port: 9000
      targetPort: 9000
    - name: tcp-control
      port: 9001
      targetPort: 9001
```

Any port name starting with `tcp-` tells Istio this is raw TCP traffic. Without this prefix, Istio tries to auto-detect the protocol, which adds latency and might guess wrong.

You can also use `appProtocol`:

```yaml
ports:
  - name: data
    port: 9000
    targetPort: 9000
    appProtocol: tcp
```

## TCP Routing with VirtualService

Istio supports routing for TCP traffic, but it's limited compared to HTTP routing. You can route based on the destination port and traffic source:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: tcp-routing
  namespace: default
spec:
  hosts:
    - custom-tcp-service.default.svc.cluster.local
  tcp:
    - match:
        - port: 9000
      route:
        - destination:
            host: custom-tcp-service.default.svc.cluster.local
            port:
              number: 9000
            subset: v1
          weight: 90
        - destination:
            host: custom-tcp-service.default.svc.cluster.local
            port:
              number: 9000
            subset: v2
          weight: 10
```

With the DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: tcp-service-dr
  namespace: default
spec:
  host: custom-tcp-service.default.svc.cluster.local
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
```

This splits TCP traffic 90/10 between v1 and v2 pods. Note that for TCP, the split is connection-based, not request-based. If a client opens 10 connections, roughly 9 will go to v1 and 1 to v2. But within a single connection, all data goes to the same backend.

## TCP Traffic Through the Gateway

Exposing TCP services through the Istio ingress gateway:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: tcp-gateway
  namespace: default
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 9000
        name: tcp-data
        protocol: TCP
      hosts:
        - "*"
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: tcp-gateway-vs
  namespace: default
spec:
  hosts:
    - "*"
  gateways:
    - tcp-gateway
  tcp:
    - match:
        - port: 9000
      route:
        - destination:
            host: custom-tcp-service.default.svc.cluster.local
            port:
              number: 9000
```

Make sure port 9000 is also exposed on the ingress gateway service. If you're using the default gateway, you need to add the port:

```bash
kubectl edit service istio-ingressgateway -n istio-system
```

Add the port to the service spec:

```yaml
ports:
  - name: tcp-data
    port: 9000
    targetPort: 9000
    protocol: TCP
```

## Connection Management for TCP Services

TCP connection management is configured through DestinationRules:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: tcp-connection-mgmt
  namespace: default
spec:
  host: custom-tcp-service.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 500
        connectTimeout: 10s
        tcpKeepalive:
          time: 300s
          interval: 75s
          probes: 9
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 60s
      maxEjectionPercent: 30
```

For TCP, outlier detection works based on connection-level errors. A "5xx error" in TCP context means a connection failure, reset, or timeout. If a backend pod has 5 consecutive connection failures, it gets ejected from the pool for 60 seconds.

## Handling Custom Binary Protocols

Many internal services use custom binary protocols. These are usually proprietary formats that Istio knows nothing about. The approach is straightforward: treat them as raw TCP.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: legacy-service
  namespace: default
spec:
  selector:
    app: legacy
  ports:
    - name: tcp-legacy
      port: 4567
      targetPort: 4567
```

Even though Istio doesn't understand the protocol, you still get:

- mTLS encryption between sidecars
- Connection-level load balancing
- Circuit breaking and outlier detection
- TCP-level metrics (bytes sent/received, connection count, duration)
- Authorization policies based on source identity

You lose:

- Request-level metrics (no request count, latency histograms)
- Request-level routing (no header matching)
- Request retries (can't retry individual requests in a TCP stream)
- Fault injection

## Multiple TCP Ports

Services that use multiple TCP ports need each port named:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: multi-port-service
  namespace: default
spec:
  selector:
    app: multi-port
  ports:
    - name: tcp-data
      port: 5000
      targetPort: 5000
    - name: tcp-control
      port: 5001
      targetPort: 5001
    - name: tcp-admin
      port: 5002
      targetPort: 5002
```

You can apply different policies to different ports:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: multi-port-dr
  namespace: default
spec:
  host: multi-port-service.default.svc.cluster.local
  trafficPolicy:
    portLevelSettings:
      - port:
          number: 5000
        connectionPool:
          tcp:
            maxConnections: 1000
      - port:
          number: 5001
        connectionPool:
          tcp:
            maxConnections: 100
      - port:
          number: 5002
        connectionPool:
          tcp:
            maxConnections: 10
```

This gives the data port 1000 connections, the control port 100, and the admin port 10. Different ports often have very different traffic patterns, so per-port settings make sense.

## TCP and Authorization Policies

You can restrict TCP service access using AuthorizationPolicies:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: tcp-access
  namespace: default
spec:
  selector:
    matchLabels:
      app: custom-app
  rules:
    - from:
        - source:
            principals:
              - cluster.local/ns/default/sa/client-app
      to:
        - operation:
            ports:
              - "9000"
    - from:
        - source:
            namespaces:
              - monitoring
      to:
        - operation:
            ports:
              - "9001"
```

For TCP, authorization rules can match on source identity (principals, namespaces, IP ranges) and destination ports. You can't match on any request-level attributes because there are no "requests" in raw TCP.

## Monitoring TCP Services

TCP metrics are available through Istio's telemetry:

```bash
kubectl exec -it <pod-name> -c istio-proxy -n default -- \
  pilot-agent request GET stats | grep "tcp\."
```

Key TCP metrics:

- `istio_tcp_connections_opened_total` - New connections opened
- `istio_tcp_connections_closed_total` - Connections closed
- `istio_tcp_sent_bytes_total` - Total bytes sent
- `istio_tcp_received_bytes_total` - Total bytes received

These are available in Prometheus format and can be used in Grafana dashboards.

## Debugging TCP Issues

```bash
# Check listener config for the TCP port
istioctl proxy-config listener <pod-name> -n default --port 9000 -o json

# Verify the filter chain uses tcp_proxy, not http_connection_manager
istioctl proxy-config listener <pod-name> -n default --port 9000 -o json | grep "filter_name\|@type"

# Check endpoint health
istioctl proxy-config endpoint <pod-name> -n default | grep custom-tcp-service

# Check cluster config
istioctl proxy-config cluster <pod-name> -n default --fqdn custom-tcp-service.default.svc.cluster.local -o json
```

If connections fail, check the sidecar logs:

```bash
kubectl logs <pod-name> -c istio-proxy -n default --tail=100
```

Look for connection errors, upstream failures, or circuit breaker trips.

TCP services in Istio don't get the full feature set that HTTP services enjoy, but the fundamentals - encryption, identity, access control, and connection management - are all there. Name your ports properly, set connection limits, and configure outlier detection. That covers the most important aspects of running non-HTTP services in an Istio mesh.
