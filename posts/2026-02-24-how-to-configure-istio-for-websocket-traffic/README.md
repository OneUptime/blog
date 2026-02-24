# How to Configure Istio for WebSocket Traffic

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, WebSocket, Service Mesh, Kubernetes, Envoy

Description: Learn how to properly configure Istio to handle WebSocket traffic including VirtualService routing, connection upgrades, and timeout settings for persistent connections.

---

WebSocket support in Istio is something that works out of the box in most cases, but there are a handful of gotchas that can trip you up when you start adding routing rules, timeouts, or retries. If you've ever had a WebSocket connection drop unexpectedly after deploying Istio, this post will walk you through the configuration you need to get things running smoothly.

## How WebSockets Work Through Envoy

WebSocket connections start as regular HTTP/1.1 requests with an `Upgrade: websocket` header. The server responds with a `101 Switching Protocols` status, and from that point on the connection becomes a full-duplex TCP stream. Envoy (the proxy that Istio uses under the hood) handles this upgrade process automatically.

The important thing to understand is that once the connection upgrades, Envoy treats it as a raw TCP tunnel. This means HTTP-level features like retries, fault injection, and request-level load balancing no longer apply to that connection. The initial handshake goes through the HTTP filter chain, but everything after the upgrade is purely TCP.

## Basic VirtualService Configuration

If you are routing WebSocket traffic through a VirtualService, you need to be aware that Istio handles the upgrade automatically when the service port is named correctly. Here is a basic VirtualService for a WebSocket service:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: ws-app
  namespace: default
spec:
  hosts:
    - ws-app.default.svc.cluster.local
  http:
    - match:
        - uri:
            prefix: /ws
      route:
        - destination:
            host: ws-app.default.svc.cluster.local
            port:
              number: 8080
```

This works because Envoy will automatically detect the `Upgrade` header and allow the connection to switch protocols. You do not need any special annotation for WebSocket support.

## Naming Your Service Ports

One thing that catches people off guard is the port naming convention. Istio uses port names to determine the protocol. For WebSocket services, name your port with an `http` prefix:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: ws-app
  namespace: default
spec:
  selector:
    app: ws-app
  ports:
    - name: http-ws
      port: 8080
      targetPort: 8080
      protocol: TCP
```

If you name it something like `tcp-ws`, Istio will treat it as opaque TCP and you lose the ability to do HTTP-level routing on the initial handshake. The `http` prefix tells Istio to use the HTTP filter chain, which is what you want for WebSocket connections.

## Handling Idle Timeouts

The most common issue people hit with WebSockets in Istio is idle timeout. By default, Istio sets an idle timeout on HTTP connections. For regular request-response traffic this makes sense, but for WebSocket connections that might sit idle for minutes between messages, it causes premature disconnections.

You can adjust this with a DestinationRule:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: ws-app
  namespace: default
spec:
  host: ws-app.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        connectTimeout: 30s
      http:
        idleTimeout: 3600s
        h2UpgradePolicy: DO_NOT_UPGRADE
```

Setting `idleTimeout` to 3600s (one hour) gives your WebSocket connections plenty of breathing room. Adjust this based on your application needs. The `h2UpgradePolicy: DO_NOT_UPGRADE` is also important here because you do not want Envoy trying to upgrade your HTTP/1.1 connection to HTTP/2 before the WebSocket handshake happens. WebSocket upgrades only work over HTTP/1.1.

## Gateway Configuration for External WebSockets

If your WebSocket service is exposed through an Istio Gateway, the configuration is straightforward:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: ws-gateway
  namespace: default
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - ws.example.com
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: ws-app-external
  namespace: default
spec:
  hosts:
    - ws.example.com
  gateways:
    - ws-gateway
  http:
    - match:
        - uri:
            prefix: /
      route:
        - destination:
            host: ws-app.default.svc.cluster.local
            port:
              number: 8080
```

The Gateway itself does not need anything special for WebSocket support. The protocol is set to `HTTP` and Envoy handles the upgrade transparently.

## TLS-Terminated WebSockets (WSS)

For production environments, you will almost certainly want TLS. Here is how to configure the Gateway for secure WebSocket connections:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: wss-gateway
  namespace: default
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: ws-tls-cert
      hosts:
        - ws.example.com
```

The `credentialName` refers to a Kubernetes secret in the `istio-system` namespace that holds your TLS certificate and private key. You can create it like this:

```bash
kubectl create secret tls ws-tls-cert \
  --cert=path/to/cert.pem \
  --key=path/to/key.pem \
  -n istio-system
```

## Retries and WebSockets

One thing you should not do is configure retries on routes that serve WebSocket traffic. Retries only apply to the initial HTTP request, and once the connection upgrades, the retry configuration is meaningless. Worse, if the initial handshake fails and Envoy retries it, you might end up with confusing behavior on the client side.

If you have a VirtualService that handles both regular HTTP and WebSocket paths, split them into separate route rules:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: mixed-app
  namespace: default
spec:
  hosts:
    - mixed-app.default.svc.cluster.local
  http:
    - match:
        - uri:
            prefix: /ws
      route:
        - destination:
            host: mixed-app.default.svc.cluster.local
            port:
              number: 8080
    - match:
        - uri:
            prefix: /api
      retries:
        attempts: 3
        perTryTimeout: 2s
      route:
        - destination:
            host: mixed-app.default.svc.cluster.local
            port:
              number: 8080
```

This way retries only apply to the `/api` routes and not the WebSocket path.

## Debugging WebSocket Connection Issues

When things go wrong, start by checking if the upgrade is happening correctly. You can look at the Envoy access logs:

```bash
kubectl logs -l app=ws-app -c istio-proxy | grep "101"
```

If you see 101 responses, the upgrade is working. If you see 426 (Upgrade Required) or 400 errors, something is blocking the upgrade header.

You can also check the Envoy stats for upstream connection information:

```bash
kubectl exec -it deploy/ws-app -c istio-proxy -- pilot-agent request GET stats | grep downstream_cx_active
```

This shows you how many active connections exist, which is useful for verifying that WebSocket connections are actually staying open.

## Scaling Considerations

Keep in mind that WebSocket connections are persistent, so traditional request-based load balancing does not apply. Once a connection is established, it stays pinned to a single backend pod. If you scale up your backend, new connections will be distributed to the new pods, but existing connections will not rebalance.

If you need session affinity beyond what the default round-robin provides, you can configure consistent hashing in your DestinationRule:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: ws-app-sticky
  namespace: default
spec:
  host: ws-app.default.svc.cluster.local
  trafficPolicy:
    loadBalancer:
      consistentHashLB:
        httpHeaderName: x-user-id
```

This ensures that connections from the same user always land on the same backend, which can be useful if your application stores session state in memory.

## Summary

WebSocket support in Istio is mostly automatic, but getting the details right around timeouts, port naming, and retry configuration is what separates a smooth deployment from hours of debugging dropped connections. Make sure your ports are named with the `http` prefix, set reasonable idle timeouts, avoid retries on WebSocket routes, and you should be in good shape.
