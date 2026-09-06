# Enable WebSockets and SignalR on One Contour Route

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Contour, HTTPProxy, WebSocket, SignalR, Envoy, Kubernetes

Description: Enable WebSocket upgrades only on a Contour hub route and account for SignalR fallback transports, timeouts, and scale-out.

---

Contour enables WebSocket upgrades per HTTPProxy route with `enableWebsockets: true`. Put that setting on the narrow route that owns the socket endpoint, not on every path for the virtual host.

SignalR needs a little more care than a plain WebSocket endpoint. A SignalR client can negotiate WebSockets, Server-Sent Events, or long polling. Enabling the Envoy upgrade path solves only the WebSocket part. Route matching, timeouts, session affinity, and multi-replica SignalR state still have to agree.

## Identify the Actual Socket Path

Start with the browser network inspector or the client configuration. ASP.NET Core SignalR normally performs a negotiate request below the hub path and then connects to that same hub path with a transport-specific query string. For a hub mapped as `/realtime`, expect traffic such as:

```text
POST /realtime/negotiate?negotiateVersion=1
GET /realtime?id=...
```

The query string does not participate in Contour path matching. A literal `prefix: /realtime` covers both requests, but also covers adjacent names such as `/realtime-admin`. Use a bounded regex when this route is a protocol or security boundary. Avoid guessing `/websocket` just because that path appears in a generic example.

Confirm the upstream Service port independently:

```bash
kubectl -n apps get service realtime-api -o yaml
kubectl -n apps get endpointslice \
  -l kubernetes.io/service-name=realtime-api -o wide
```

## Enable the Upgrade on Only That Route

This HTTPProxy keeps ordinary application paths on a normal route and enables WebSockets for the hub:

```yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: app
  namespace: apps
spec:
  virtualhost:
    fqdn: app.example.com
    tls:
      secretName: app-example-com-tls
  routes:
  - conditions:
    - regex: /realtime(/.*)?$
    enableWebsockets: true
    timeoutPolicy:
      response: 1h
      idle: 5m
    services:
    - name: realtime-api
      port: 80
  - conditions:
    - prefix: /
    services:
    - name: web-ui
      port: 80
```

Contour anchors an HTTPProxy regex path condition at the beginning. This expression matches `/realtime` and paths below `/realtime/`, but not `/realtime-admin`. Route order is not the safety mechanism.

The response and idle values are examples, not universal recommendations. Set them from the application's transport behavior and operational limits. `response` covers a complete upstream response and defaults to 15 seconds when omitted. `idle` measures periods with no request or response activity within the stream. A silent connection can still hit other limits, including Contour's global connection duration or a cloud load balancer's idle timeout.

Do not set every timeout to `infinity` to hide disconnects. Bound stale connections, have clients reconnect with jitter, and ensure ping or keepalive intervals are shorter than the smallest idle timeout in the path.

## Understand What SignalR Needs at Scale

With one application replica, a successful negotiate request followed by a WebSocket upgrade is straightforward. With multiple replicas, SignalR needs an appropriate scale-out design.

ASP.NET Core SignalR documents sticky sessions as necessary for most multi-server deployments unless all clients use WebSockets with negotiation skipped, or the deployment uses the Azure SignalR Service. A Redis backplane distributes messages, but it does not automatically remove every affinity requirement in the negotiation flow.

If your application design requires affinity, Contour can use cookie load balancing:

```yaml
  - conditions:
    - regex: /realtime(/.*)?$
    enableWebsockets: true
    loadBalancerPolicy:
      strategy: Cookie
    services:
    - name: realtime-api
      port: 80
```

Contour generates an `X-Contour-Session-Affinity` cookie for this strategy. Review its security attributes and Contour's cookie rewriting feature if browser policy requires `Secure` or a particular `SameSite` value. Do not add affinity reflexively when the SignalR topology does not need it, since it can make balancing less even.

## Test the Upgrade and the Fallbacks

First prove ordinary HTTPS routing and negotiation:

```bash
curl -sv --resolve app.example.com:443:203.0.113.20 \
  -X POST 'https://app.example.com/realtime/negotiate?negotiateVersion=1' \
  -H 'Content-Type: application/json' \
  -d ''
```

Use a real WebSocket client or the application's SignalR client for the upgraded connection. A raw curl request can confirm a `101 Switching Protocols` response for a simple WebSocket server, but it does not implement the SignalR framing protocol.

In a browser, verify:

- the negotiate request succeeds;
- the selected transport is the expected one;
- the WebSocket handshake returns 101 when WebSockets are selected;
- messages flow in both directions; and
- reconnect works after an intentional connection interruption.

Then deliberately test Server-Sent Events or long polling if clients are allowed to fall back. A deployment that works only when WebSockets are available can fail for users behind restrictive enterprise proxies.

## Diagnose Common Failures

Inspect the HTTPProxy and Envoy access log together:

```bash
kubectl -n apps describe httpproxy app
kubectl -n projectcontour logs daemonset/envoy -c envoy \
  --since=10m | grep 'app.example.com'
```

Typical patterns are:

| Symptom | Likely cause |
| --- | --- |
| Handshake returns 404 | Hub prefix or application base path is wrong |
| Handshake returns 426 or never upgrades | `enableWebsockets` is absent on the matched route |
| Connects, then drops at a fixed interval | An idle or maximum-duration limit exists in Envoy, the load balancer, or the app |
| Negotiate succeeds, connect intermittently fails | Multi-replica state or affinity is incorrect |
| WebSockets work but some clients fail | A fallback transport was not tested or has a shorter response timeout |
| HTTPProxy is invalid | Service name, Service port, TLS Secret, or route configuration does not resolve |

Check which route handled a request by enabling Contour's route-source metadata in structured access logs. That is more reliable than assuming the longest-looking prefix was selected.

## Keep the Security Boundary Intact

WebSocket upgrade does not bypass authentication by itself, but a long-lived connection changes when authorization is evaluated. Authenticate the handshake, validate the Origin in the application when browser cross-site access matters, and authorize individual SignalR hub methods as required. Do not rely on CORS alone as an access-control system.

Terminate TLS at Contour unless end-to-end passthrough is an explicit requirement. A TLS-terminating HTTPProxy lets Envoy inspect HTTP routing, apply external authorization, and enable upgrades on a specific route.

## Conclusion

For a focused Contour configuration, match the real hub prefix and add `enableWebsockets: true` only there. Then size timeouts for SignalR's WebSocket and fallback transports, and make an explicit scale-out choice about affinity and backplanes. Validate the protocol with a real SignalR client, not only a successful TCP connection.

## Official Documentation

- [Contour 1.33 WebSockets](https://projectcontour.io/docs/1.33/config/websockets/)
- [Contour 1.33 request routing and timeout policy](https://projectcontour.io/docs/1.33/config/request-routing/)
- [Contour 1.33 cookie rewriting](https://projectcontour.io/docs/1.33/config/cookie-rewriting/)
- [Microsoft: ASP.NET Core SignalR hosting and scaling](https://learn.microsoft.com/aspnet/core/signalr/scale)
- [Microsoft: ASP.NET Core SignalR configuration](https://learn.microsoft.com/aspnet/core/signalr/configuration)
- [Envoy WebSocket upgrades](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/http/upgrades)
